/**
 * Group a subject's own resource values the way its family's printed source
 * presents them.
 *
 * A creature's numbers reach the page as resource relations carrying the
 * creature's authored value. Rendered in the order the projection produced
 * them, that is alphabetical by id, which is the order a Map iterates and not
 * one any reader expects: the printed stat block opens with Armor Class and
 * Hit Points, then speed, then the six ability scores in their fixed order.
 *
 * Pure and browser-safe, and deliberately so: the order itself is authored in
 * srd-cc's `sections.toml`, which only `srd-sections.ts` reads, through
 * `node:fs`, at build time. `project-metadata-docs.ts` projects the authored
 * rows for a family onto the entry as `resource_block`, and this module only
 * ever receives that already-projected plain data — the same division
 * `srd-catalogue-groups.ts` explains in its own header, and for the same
 * reason: importing the sections reader into a Svelte component pulls
 * `node:fs` into the browser bundle and the page dies on load.
 *
 * Nothing is dropped: a value no group names falls into the trailing group, so
 * a newly authored resource reaches the reader on the day it is authored,
 * whether or not anyone remembers to name it in `sections.toml`.
 */
import type { DocsResourceBlock } from "./docs-types";

export interface ResourceBlockGroup<T> {
	title: string;
	entries: readonly T[];
}

export interface ResourceBlockView<T> {
	heading: string;
	groups: readonly ResourceBlockGroup<T>[];
}

export function resourceBlock<T extends { ref: string }>(
	block: DocsResourceBlock | undefined,
	relations: readonly T[],
): ResourceBlockView<T> | undefined {
	if (block === undefined) return undefined;
	// An id can name more than one relation only if the projection emitted a
	// duplicate; keeping every occurrence is the honest reading, so placement is
	// tracked per relation, not per id.
	const placed = new Set<number>();
	const groups: ResourceBlockGroup<T>[] = [];
	for (const rule of block.groups) {
		const entries: T[] = [];
		for (const ref of rule.resources)
			relations.forEach((relation, index) => {
				if (relation.ref !== ref || placed.has(index)) return;
				placed.add(index);
				entries.push(relation);
			});
		if (entries.length > 0) groups.push({ title: rule.title, entries });
	}
	const rest = relations.filter((_, index) => !placed.has(index));
	if (rest.length > 0) groups.push({ title: block.rest_title, entries: rest });
	return groups.length === 0 ? undefined : { heading: block.heading, groups };
}
