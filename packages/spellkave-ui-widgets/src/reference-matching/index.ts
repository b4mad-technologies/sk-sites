/**
 * Browser- and Node-safe reference matching and AST adapters.
 *
 * The matcher returns offsets into the original string. It deliberately does
 * not know about routes, Markdown, DOM nodes, or a particular catalogue.
 */

export interface ReferenceTarget {
	label: string;
	kind: string;
	ref: string;
	href: string;
	ignoreCase?: boolean;
	/** Higher values win an overlap; equal values retain input order. */
	priority?: number;
	/**
	 * `false` marks a lookup-only target: a client may find it by `ref`, but
	 * the matcher never matches its label in prose (short labels such as
	 * "Elf", rules terms such as skills).
	 */
	autolink?: boolean;
}

export interface ReferenceMatch<T extends ReferenceTarget = ReferenceTarget> {
	start: number;
	end: number;
	target: T;
}

export interface ReferenceMatcher<T extends ReferenceTarget = ReferenceTarget> {
	match(text: string, options?: ReferenceMatchOptions<T>): ReferenceMatch<T>[];
}

/** Exclusions are applied before overlap selection, not after it. */
export interface ReferenceMatchOptions<T extends ReferenceTarget> {
	exclude?: (target: T) => boolean;
	oncePerTarget?: boolean;
}

interface IndexedTarget<T extends ReferenceTarget> {
	target: T;
	order: number;
}

interface TrieNode<T extends ReferenceTarget> {
	next: Map<string, TrieNode<T>>;
	targets?: IndexedTarget<T>[];
}

function node<T extends ReferenceTarget>(): TrieNode<T> {
	return { next: new Map() };
}

function isWordCodePoint(value: string | undefined): boolean {
	return value !== undefined && /[\p{L}\p{N}\p{M}_]/u.test(value);
}

function codePointBefore(value: string, end: number): string | undefined {
	if (end === 0) return undefined;
	const final = value.charCodeAt(end - 1);
	const start = final >= 0xdc00 && final <= 0xdfff ? end - 2 : end - 1;
	return codePointAt(value, start);
}

function codePointAt(value: string, start: number): string | undefined {
	const point = value.codePointAt(start);
	return point === undefined ? undefined : String.fromCodePoint(point);
}

function matchesBoundary(value: string, start: number, end: number): boolean {
	return (
		!isWordCodePoint(codePointBefore(value, start)) && !isWordCodePoint(codePointAt(value, end))
	);
}

function insert<T extends ReferenceTarget>(
	root: TrieNode<T>,
	label: string,
	entry: IndexedTarget<T>,
): void {
	let current = root;
	for (const char of label) {
		let next = current.next.get(char);
		if (!next) {
			next = node<T>();
			current.next.set(char, next);
		}
		current = next;
	}
	current.targets ??= [];
	current.targets.push(entry);
}

function candidateOrder<T extends ReferenceTarget>(
	a: ReferenceMatch<T> & { order: number },
	b: ReferenceMatch<T> & { order: number },
): number {
	return (
		(b.target.priority ?? 0) - (a.target.priority ?? 0) ||
		b.end - b.start - (a.end - a.start) ||
		a.order - b.order
	);
}

/** Unicode's locale-independent simple mapping. Do not use `toLocaleLowerCase`: a
 * browser's user locale must not change authored documentation links. */
function fold(characters: string): string {
	// Iterate separately so final sigma does not depend on neighbouring label
	// characters (`ΟΣ` and `οσ` resolve alike). This is a deterministic matching
	// fold, not locale-sensitive UI casing.
	return Array.from(characters, (character) => character.toLowerCase().replaceAll("ς", "σ")).join(
		"",
	);
}

/**
 * Compiles vocabulary into two prefix tries (exact and case-insensitive).
 * Matching is linear in input length plus the length of prefixes that actually
 * occur, rather than testing every label with a regular expression. It chooses
 * the leftmost non-overlapping match; candidates at that position are ordered
 * by priority, then label length, then vocabulary order.
 */
export function compileReferenceMatcher<T extends ReferenceTarget>(
	targets: readonly T[],
): ReferenceMatcher<T> {
	const exact = node<T>();
	const folded = node<T>();
	targets.forEach((target, order) => {
		if (!target.label.trim() || !target.kind.trim() || !target.ref.trim() || !target.href.trim()) {
			throw new Error("reference targets require non-empty label, kind, ref, and href");
		}
		if (target.autolink === false) return;
		const entry = { target, order };
		insert(
			target.ignoreCase ? folded : exact,
			target.ignoreCase ? fold(target.label) : target.label,
			entry,
		);
	});

	return {
		match(text, options = {}) {
			const candidates: Array<ReferenceMatch<T> & { order: number }> = [];
			for (let start = 0; start < text.length; ) {
				const first = codePointAt(text, start);
				if (first === undefined) break;
				for (const [root, foldCase] of [
					[exact, false],
					[folded, true],
				] as const) {
					let current: TrieNode<T> | undefined = root;
					let end = start + first.length;
					for (const character of foldCase ? fold(first) : first)
						current = current?.next.get(character);
					while (current) {
						if (current.targets && matchesBoundary(text, start, end)) {
							for (const entry of current.targets)
								if (!options.exclude?.(entry.target))
									candidates.push({ start, end, target: entry.target, order: entry.order });
						}
						const character = codePointAt(text, end);
						if (!character) break;
						for (const part of foldCase ? fold(character) : character)
							current = current?.next.get(part);
						end += character.length;
					}
				}
				start += first.length;
			}
			candidates.sort((a, b) => a.start - b.start || candidateOrder(a, b));
			const accepted: ReferenceMatch<T>[] = [];
			const acceptedTargets = new Set<T>();
			let occupiedUntil = -1;
			for (const candidate of candidates) {
				if (
					candidate.start < occupiedUntil ||
					(options.oncePerTarget && acceptedTargets.has(candidate.target))
				)
					continue;
				accepted.push({ start: candidate.start, end: candidate.end, target: candidate.target });
				acceptedTargets.add(candidate.target);
				occupiedUntil = candidate.end;
			}
			return accepted;
		},
	};
}

export interface MarkdownNode {
	type: string;
	value?: string;
	url?: string;
	children?: MarkdownNode[];
}

export interface MarkdownLinkifyOptions<T extends ReferenceTarget> {
	self?: Pick<T, "kind" | "ref">;
}

const MARKDOWN_UNSAFE_ANCESTORS = new Set([
	"link",
	"linkReference",
	"code",
	"inlineCode",
	"html",
	"heading",
]);

interface TextLocation {
	node: MarkdownNode;
	parent: MarkdownNode;
	index: number;
}

function markdownTextLocations(node: MarkdownNode): TextLocation[] {
	const locations: TextLocation[] = [];
	const walk = (
		current: MarkdownNode,
		parent: MarkdownNode | undefined,
		index: number,
		blocked: boolean,
	) => {
		const unsafe = blocked || MARKDOWN_UNSAFE_ANCESTORS.has(current.type);
		if (current.type === "text" && !unsafe && parent)
			locations.push({ node: current, parent, index });
		else
			for (const [childIndex, child] of (current.children ?? []).entries())
				walk(child, current, childIndex, unsafe);
	};
	walk(node, undefined, -1, false);
	return locations;
}

function containsRawHtml(node: MarkdownNode): boolean {
	return node.type === "html" || (node.children ?? []).some(containsRawHtml);
}

/** Adds each target at most once per paragraph/table, preserving existing Markdown structure. */
export function linkifyMarkdownAst<T extends ReferenceTarget>(
	tree: MarkdownNode,
	matcher: ReferenceMatcher<T>,
	options: MarkdownLinkifyOptions<T> = {},
): MarkdownNode {
	const blocks: MarkdownNode[] = [];
	const collect = (current: MarkdownNode) => {
		if (current.type === "paragraph" || current.type === "table") blocks.push(current);
		else for (const child of current.children ?? []) collect(child);
	};
	collect(tree);
	for (const block of blocks) {
		if (containsRawHtml(block)) continue;
		const used = new Set<T>();
		for (const location of markdownTextLocations(block)) {
			const value = location.node.value;
			if (!value) continue;
			const matches = matcher.match(value, {
				exclude: (target) =>
					!isSafeReferenceHref(target.href) ||
					used.has(target) ||
					(options.self?.kind === target.kind && options.self?.ref === target.ref),
				oncePerTarget: true,
			});
			if (!matches.length) continue;
			const replacement: MarkdownNode[] = [];
			let cursor = 0;
			for (const match of matches) {
				if (cursor < match.start)
					replacement.push({ type: "text", value: value.slice(cursor, match.start) });
				replacement.push({
					type: "link",
					url: match.target.href,
					children: [{ type: "text", value: value.slice(match.start, match.end) }],
				});
				used.add(match.target);
				cursor = match.end;
			}
			if (cursor < value.length) replacement.push({ type: "text", value: value.slice(cursor) });
			const currentIndex = location.parent.children?.indexOf(location.node) ?? -1;
			if (currentIndex >= 0) location.parent.children?.splice(currentIndex, 1, ...replacement);
		}
	}
	return tree;
}

export interface HtmlNode {
	type: string;
	tagName?: string;
	properties?: Record<string, unknown>;
	value?: string;
	children?: HtmlNode[];
}

const HTML_UNSAFE_ANCESTORS = new Set([
	"a",
	"code",
	"pre",
	"script",
	"style",
	"form",
	"button",
	"input",
	"select",
	"textarea",
	"option",
	"label",
	"summary",
]);
const INTERACTIVE_ROLES = new Set([
	"button",
	"checkbox",
	"combobox",
	"link",
	"menuitem",
	"option",
	"radio",
	"searchbox",
	"slider",
	"spinbutton",
	"switch",
	"tab",
	"textbox",
]);

/** Allows only root-relative anchors or absolute HTTP(S) destinations in AST adapters. */
export function isSafeReferenceHref(href: string): boolean {
	return (
		![...href].some(
			(char) => char === "\\" || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
		) &&
		!href.startsWith("//") &&
		(href.startsWith("/") || href.startsWith("#") || /^https?:\/\//i.test(href))
	);
}

/** Structurally linkifies a HAST-like tree without relying on DOMParser or Node APIs. */
export function linkifyHtmlAst<T extends ReferenceTarget>(
	tree: HtmlNode,
	matcher: ReferenceMatcher<T>,
): HtmlNode {
	const walk = (current: HtmlNode, blocked: boolean): void => {
		const role =
			typeof current.properties?.role === "string"
				? current.properties.role.toLowerCase()
				: undefined;
		const editable =
			current.properties?.contentEditable === true ||
			current.properties?.contenteditable === true ||
			current.properties?.contentEditable === "true" ||
			current.properties?.contenteditable === "true";
		const unsafe =
			blocked ||
			(current.type === "element" &&
				(HTML_UNSAFE_ANCESTORS.has(current.tagName?.toLowerCase() ?? "") ||
					INTERACTIVE_ROLES.has(role ?? "") ||
					editable));
		if (!current.children || unsafe) return;
		for (let index = 0; index < current.children.length; index++) {
			const child = current.children[index];
			if (!child) continue;
			if (child.type !== "text" || typeof child.value !== "string") {
				walk(child, unsafe);
				continue;
			}
			const matches = matcher.match(child.value, {
				exclude: (target) => !isSafeReferenceHref(target.href),
			});
			if (!matches.length) continue;
			const replacement: HtmlNode[] = [];
			let cursor = 0;
			for (const match of matches) {
				if (cursor < match.start)
					replacement.push({ type: "text", value: child.value.slice(cursor, match.start) });
				replacement.push({
					type: "element",
					tagName: "a",
					properties: { href: match.target.href },
					children: [{ type: "text", value: child.value.slice(match.start, match.end) }],
				});
				cursor = match.end;
			}
			if (cursor < child.value.length)
				replacement.push({ type: "text", value: child.value.slice(cursor) });
			current.children.splice(index, 1, ...replacement);
			index += replacement.length - 1;
		}
	};
	walk(tree, false);
	return tree;
}
