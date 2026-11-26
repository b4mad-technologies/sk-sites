import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { authoringDocMetadata, getAuthoringDoc } from "@spellkave/world-author/corpus";
import { expect, it } from "vitest";
import { resolveCompendiumRoute } from "./parse-path";
import type { MarkdownDocsRoot } from "./project-authoring-docs";
import { realMarkdownDocsProjection } from "./real-docs-projection";

const registry = (await import(
	/* @vite-ignore */ pathToFileURL(
		join(import.meta.dirname, "../../scripts/metadata-docs-registry.mts"),
	).href
)) as { MARKDOWN_DOCS_ROOTS: MarkdownDocsRoot[] };

it("registers Patternbook, supported guidance and explicit reference roots", () => {
	expect(registry.MARKDOWN_DOCS_ROOTS.map((root) => root.pageId)).toEqual(
		expect.arrayContaining(["authoring", "guidance", "guidance-references"]),
	);
});

it.each(
	registry.MARKDOWN_DOCS_ROOTS.map((root) => [root.pageId, root] as const),
)("web %s projects packaged identities/body bytes and separates unsupported references", (_pageId, root) => {
	const { page, search, outputRoot: output } = realMarkdownDocsProjection(root.pageId);
	for (const doc of page.sections[0]?.documents ?? []) {
		const resolved = resolveCompendiumRoute(doc.href ?? "", { pages: [page] });
		expect(resolved).toMatchObject({ page: "entry", slug: doc.slug });
	}
	for (const source of root.documents ?? []) {
		const artifact = JSON.parse(
			readFileSync(
				join(
					output,
					"documents",
					root.pageId,
					root.section.id,
					`${encodeURIComponent(source.id)}.json`,
				),
				"utf8",
			),
		);
		const doc = getAuthoringDoc(source.metadata.document_id);
		expect(artifact.body).toBe(doc?.body);
		expect(artifact.guidance).toEqual(authoringDocMetadata(source.metadata.document_id));
	}
	if (root.pageId === "guidance") {
		expect(
			page.sections[0]?.documents?.some((doc) => doc.guidance?.document_id === "cli/workflows"),
		).toBe(true);
		expect(
			page.sections[0]?.documents?.every((doc) => doc.guidance?.content_status === "implemented"),
		).toBe(true);
	}
	if (root.pageId === "guidance-references") {
		expect(search).toEqual([]);
		expect(
			page.sections[0]?.documents?.some(
				(doc) => doc.guidance?.document_id === "evidence/auth-56-installed-cli",
			),
		).toBe(true);
	}
	if (root.pageId === "guidance") {
		const guide = JSON.parse(
			readFileSync(
				join(output, "documents/guidance/guides/find-an-authoring-pattern.json"),
				"utf8",
			),
		);
		const html = guide.blocks
			.filter((block: { kind: string }) => block.kind === "html")
			.map((block: { html: string }) => block.html)
			.join("\n");
		expect(html).toContain("/docs/guidance-references/guides/evidence~auth-56-installed-cli");
		expect(html).toContain("/docs/authoring/patterns/container-with-loot");
	}
});
