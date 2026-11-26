import type { ReferenceTarget } from "@spellkave/ui-widgets/reference-matching";
import type { DocsIndexV1 } from "./docs-types";

/** Public reading aids only: no world data or second authored catalogue. */
export function buildReferenceVocabulary(index: DocsIndexV1): {
	version: 1;
	targets: (ReferenceTarget & { previewHref?: string })[];
} {
	const groups = new Map<string, ReferenceTarget[]>();
	for (const page of index.pages) {
		for (const link of page.links ?? []) {
			if (!link.href.startsWith("/docs/") || /[\\\s]/u.test(link.href)) {
				throw new Error(`Reference vocabulary requires a local docs URL: ${link.href}`);
			}
			const key = link.label.toLowerCase();
			const group = groups.get(key) ?? [];
			group.push(link);
			groups.set(key, group);
		}
	}
	const previews = new Map(
		index.pages.flatMap((page) =>
			page.sections.flatMap((section) =>
				(section.catalogue ?? []).map((entry) => [entry.href, entry.artifact_href] as const),
			),
		),
	);
	const targets: (ReferenceTarget & { previewHref?: string })[] = [];
	for (const group of groups.values()) {
		const first = group[0];
		if (!first) continue;
		// An unscoped client cannot choose between page-specific homonyms.
		if (
			group.some(
				(link) => link.kind !== first.kind || link.ref !== first.ref || link.href !== first.href,
			)
		)
			continue;
		const seen = new Set<string>();
		for (const link of group) {
			if (seen.has(link.label)) continue;
			seen.add(link.label);
			// Preserve case-sensitive proper nouns for automatic prose linking.
			const previewHref = previews.get(link.href);
			targets.push({
				label: link.label,
				kind: link.kind,
				ref: link.ref,
				href: link.href,
				...(link.autolink === false ? { autolink: false } : {}),
				...(previewHref ? { previewHref } : {}),
			});
		}
	}
	targets.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
	return { version: 1, targets };
}
