import GithubSlugger from "github-slugger";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import { type DocsLinkSelf, type DocsLinkTarget, linkifyDocsMarkdown } from "./docs-linkify";

export type DocsBodyBlock =
	| { kind: "html"; html: string }
	| { kind: "resource"; ref: string; view: "compact" | "full" }
	| {
			kind: "subject";
			subjectKind: "entity_definition" | "entity";
			ref: string;
			view: "compact" | "full";
	  }
	| {
			kind: "resource-table";
			refs: string[];
			nameLabel: string;
			descriptionLabel: string;
	  };

interface AstNode {
	type: string;
	depth?: number;
	name?: string;
	attributes?: Record<string, string | null>;
	children?: AstNode[];
	url?: string;
	value?: string;
	data?: { hProperties?: Record<string, string> };
}

export interface DocsMarkdownContext {
	/** Package product prose uses ordinary Markdown, without manifest directives. */
	directives?: boolean;
	sourcePath: string;
	sourceBase?: string;
	publishedSources: ReadonlyMap<string, string>;
	headingOffset?: number;
	linkTargets?: readonly DocsLinkTarget[];
	self?: DocsLinkSelf;
}

const parser = remark().use(remarkDirective).use(remarkGfm);
const plainParser = remark().use(remarkGfm);
const attachmentParser = remark().use(remarkGfm);
const docsSanitizeSchema = {
	...defaultSchema,
	tagNames: defaultSchema.tagNames?.filter((tag) => tag !== "img"),
};
const htmlCompiler = remark()
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeSlug)
	.use(rehypeSanitize, docsSanitizeSchema)
	.use(rehypeStringify);

function requiredAttribute(attributes: Record<string, string | null>, key: string): string {
	const value = attributes[key];
	if (typeof value !== "string" || value.trim() === "") {
		throw new Error(`resources table requires a non-empty ${key}`);
	}
	return value;
}

function resourceDirective(node: AstNode, parent: AstNode | undefined): DocsBodyBlock | null {
	if (!node.type.endsWith("Directive")) return null;
	if (node.name === "resource" && (node.type !== "leafDirective" || parent?.type !== "root")) {
		throw new Error("resource directives must be top-level leaf blocks");
	}
	if (node.type !== "leafDirective" || node.name !== "resource") {
		throw new Error(`unsupported documentation directive '${node.name ?? node.type}'`);
	}
	const attributes = node.attributes ?? {};
	const unknown = Object.keys(attributes).filter((key) => key !== "ref" && key !== "view");
	if (unknown.length > 0) {
		throw new Error(`resource directive has unknown attribute '${unknown[0]}'`);
	}
	const ref = attributes.ref;
	const view = attributes.view;
	if (typeof ref !== "string" || ref.trim() === "") {
		throw new Error("resource directive requires a non-empty ref");
	}
	if (view !== "compact" && view !== "full") {
		throw new Error("resource directive view must be 'compact' or 'full'");
	}
	if ((node.children?.length ?? 0) > 0) {
		throw new Error("resource directive does not accept label content");
	}
	return { kind: "resource", ref, view };
}

function subjectDirective(node: AstNode, parent: AstNode | undefined): DocsBodyBlock | null {
	if (!node.type.endsWith("Directive") || node.name !== "subject") return null;
	if (node.type !== "leafDirective" || parent?.type !== "root") {
		throw new Error("subject directives must be top-level leaf blocks");
	}
	const attributes = node.attributes ?? {};
	const unknown = Object.keys(attributes).find(
		(key) => key !== "kind" && key !== "ref" && key !== "view",
	);
	if (unknown !== undefined)
		throw new Error(`subject directive has unknown attribute '${unknown}'`);
	const kind = attributes.kind;
	if (kind !== "entity_definition" && kind !== "entity") {
		throw new Error("subject directive kind must be 'entity_definition' or 'entity'");
	}
	const ref = attributes.ref;
	if (typeof ref !== "string" || ref.trim() === "") {
		throw new Error("subject directive requires a non-empty ref");
	}
	const view = attributes.view;
	if (view !== "compact" && view !== "full") {
		throw new Error("subject directive view must be 'compact' or 'full'");
	}
	if ((node.children?.length ?? 0) > 0)
		throw new Error("subject directive does not accept label content");
	return { kind: "subject", subjectKind: kind, ref, view };
}

function resourceTable(node: AstNode, parent: AstNode | undefined): DocsBodyBlock | null {
	if (node.type !== "containerDirective" || node.name !== "resources") return null;
	if (parent?.type !== "root") throw new Error("resources tables must be top-level blocks");
	const attributes = node.attributes ?? {};
	const allowed = new Set(["view", "nameLabel", "descriptionLabel"]);
	const unknown = Object.keys(attributes).find((key) => !allowed.has(key));
	if (unknown !== undefined) throw new Error(`resources table has unknown attribute '${unknown}'`);
	if (attributes.view !== "table") throw new Error("resources table view must be 'table'");
	const nameLabel = requiredAttribute(attributes, "nameLabel");
	const descriptionLabel = requiredAttribute(attributes, "descriptionLabel");
	const refs = (node.children ?? []).map((child) => {
		if (child.type !== "leafDirective" || child.name !== "resource") {
			throw new Error("resources tables accept only resource leaf children");
		}
		if ((child.children?.length ?? 0) > 0) {
			throw new Error("resources table resource children do not accept label content");
		}
		const childAttributes = child.attributes ?? {};
		const childUnknown = Object.keys(childAttributes).find((key) => key !== "ref");
		if (childUnknown !== undefined) {
			throw new Error(`resources table resource has unknown attribute '${childUnknown}'`);
		}
		const ref = childAttributes.ref;
		if (typeof ref !== "string" || ref.trim() === "") {
			throw new Error("resources table resource requires a non-empty ref");
		}
		return ref;
	});
	if (refs.length === 0) throw new Error("resources table must contain at least one resource");
	if (new Set(refs).size !== refs.length)
		throw new Error("resources table contains duplicate refs");
	return { kind: "resource-table", refs, nameLabel, descriptionLabel };
}

function compileHtml(children: AstNode[], definitions: AstNode[]): string {
	if (children.length === 0) return "";
	const hast = htmlCompiler.runSync({
		type: "root",
		children: [...children, ...definitions],
	} as never);
	return htmlCompiler.stringify(hast).trim();
}

/**
 * Parse `body` and annotate heading ids + link targets/schemes. Shared by
 * `renderDocsMarkdown` (full HTML render) and `docsDirectives` (directive
 * scan only) so a body is parsed exactly once per call site instead of the
 * two callers each running their own `fromMarkdown` pass.
 */
function parseDocsTree(body: string, context?: DocsMarkdownContext): AstNode {
	const parsed = (context?.directives === false ? plainParser : parser).parse(body) as AstNode;
	const tree = context?.linkTargets
		? (linkifyDocsMarkdown(parsed, context.linkTargets, context.self) as AstNode)
		: parsed;
	const slugger = new GithubSlugger();
	const plainText = (node: AstNode): string =>
		typeof node.value === "string" ? node.value : (node.children ?? []).map(plainText).join("");
	visit(tree as never, (node: AstNode) => {
		if (node.type !== "heading") return;
		if (context?.headingOffset && typeof node.depth === "number")
			node.depth = Math.min(6, node.depth + context.headingOffset);
		node.data = {
			...(node.data ?? {}),
			hProperties: { ...(node.data?.hProperties ?? {}), id: slugger.slug(plainText(node)) },
		};
	});
	visit(tree as never, (node: AstNode) => {
		if ((node.type !== "link" && node.type !== "definition") || typeof node.url !== "string")
			return;
		if (node.url.startsWith("#")) {
			node.url = `#user-content-${node.url.slice(1)}`;
			return;
		}
		if (/^(?:https:\/\/|\/)/.test(node.url)) return;
		if (/^[a-z][a-z0-9+.-]*:/i.test(node.url))
			throw new Error(`documentation link '${node.url}' uses an unsupported scheme`);
		// Directive extraction intentionally parses without publication context.
		// Relative links are resolved during the later artifact-rendering pass.
		if (!context) return;
		const resolved = new URL(node.url, `https://spellkave.invalid/${context.sourcePath}`);
		const sourcePath = decodeURIComponent(resolved.pathname.slice(1));
		const published = context.publishedSources.get(sourcePath);
		if (published) {
			node.url = `${published}${resolved.hash ? `#user-content-${resolved.hash.slice(1)}` : ""}`;
			return;
		}
		if (!context.sourceBase)
			throw new Error(
				`relative documentation link '${node.url}' has no published target or source_base`,
			);
		const base = new URL(
			context.sourcePath,
			context.sourceBase.endsWith("/") ? context.sourceBase : `${context.sourceBase}/`,
		);
		const external = new URL(node.url, base);
		if (external.protocol !== "https:")
			throw new Error(`documentation link '${node.url}' must resolve to HTTPS`);
		node.url = external.href;
	});
	return tree;
}

/** Walk an already-parsed tree once and collect its directive nodes (resource/subject/table). */
function collectDirectiveBlocks(tree: AstNode): Map<AstNode, DocsBodyBlock> {
	const resources = new Map<AstNode, DocsBodyBlock>();
	visit(tree as never, (node: AstNode, _index, parent: AstNode | undefined) => {
		const table = resourceTable(node, parent);
		if (table) {
			resources.set(node, table);
			return;
		}
		if (node.type === "leafDirective" && node.name === "resource" && parent?.name === "resources") {
			return;
		}
		const subject = subjectDirective(node, parent);
		if (subject) {
			resources.set(node, subject);
			return;
		}
		const resource = resourceDirective(node, parent);
		if (resource) resources.set(node, resource);
	});
	return resources;
}

/** Parse the closed documentation Markdown profile into sanitized HTML/resource blocks. */
export function renderDocsMarkdown(body: string, context?: DocsMarkdownContext): DocsBodyBlock[] {
	const tree = parseDocsTree(body, context);
	const resources = collectDirectiveBlocks(tree);

	const blocks: DocsBodyBlock[] = [];
	const definitions = (tree.children ?? []).filter((child) => child.type === "definition");
	let prose: AstNode[] = [];
	for (const child of tree.children ?? []) {
		if (child.type === "definition") continue;
		const resource = resources.get(child);
		if (!resource) {
			prose.push(child);
			continue;
		}
		const html = compileHtml(prose, definitions);
		if (html) blocks.push({ kind: "html", html });
		blocks.push(resource);
		prose = [];
	}
	const html = compileHtml(prose, definitions);
	if (html) blocks.push({ kind: "html", html });
	return blocks;
}

/**
 * Scan a body for `resource`/`subject` directives without compiling any HTML.
 * Parses the body once and returns both directive kinds together: the two
 * previous single-purpose exports (`docsResourceDirectives`,
 * `docsSubjectDirectives`) each ran the full `renderDocsMarkdown` pipeline —
 * parse, AST walk, *and* the sanitize/stringify HTML compile — purely to
 * filter its block list, so a single validator call site paid for two full
 * renders of the same body just to read its directives.
 */
export function docsDirectives(body: string): {
	resources: Array<{ ref: string }>;
	subjects: Array<{ kind: "entity_definition" | "entity"; ref: string }>;
} {
	const tree = parseDocsTree(body);
	const resources: Array<{ ref: string }> = [];
	const subjects: Array<{ kind: "entity_definition" | "entity"; ref: string }> = [];
	for (const block of collectDirectiveBlocks(tree).values()) {
		if (block.kind === "resource") resources.push({ ref: block.ref });
		else if (block.kind === "resource-table") for (const ref of block.refs) resources.push({ ref });
		else if (block.kind === "subject") subjects.push({ kind: block.subjectKind, ref: block.ref });
	}
	return { resources, subjects };
}

/**
 * Render untrusted attachment prose (catalogue entry and resource descriptions).
 * Directives are never parsed here: the parser has `remark-directive` disabled, so
 * `:name` / `:::name` syntax renders as literal text instead of being interpreted
 * or rejected.
 */
export function renderAttachmentMarkdown(
	body: string,
	targets: readonly DocsLinkTarget[] = [],
	self?: DocsLinkSelf,
): string {
	const tree = linkifyDocsMarkdown(
		attachmentParser.parse(body) as AstNode,
		targets,
		self,
	) as AstNode;
	return compileHtml(tree.children ?? [], []);
}
