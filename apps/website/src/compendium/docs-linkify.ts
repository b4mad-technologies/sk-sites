/**
 * Website compatibility wrapper around the shared reference matcher.
 *
 * Callers still resolve authored `(kind, ref)` targets to stable public URLs
 * here; matching and Markdown AST handling are shared with Play and generators.
 */
import {
	compileReferenceMatcher,
	linkifyMarkdownAst,
	type MarkdownNode,
	type ReferenceMatcher,
	type ReferenceTarget,
} from "@spellkave/ui-widgets/reference-matching";

export interface DocsLinkTarget extends ReferenceTarget {}

export interface DocsLinkSelf {
	kind: string;
	ref: string;
}

/** Mdast-compatible structural subset used by Remark without taking a runtime dependency on it. */
export interface DocsMarkdownNode extends MarkdownNode {
	children?: DocsMarkdownNode[];
}

function validateDocsTargets(targets: readonly DocsLinkTarget[]): void {
	const labels = new Set<string>();
	const looseLabels = new Set<string>();
	const foldedLabels = new Set<string>();
	for (const target of targets) {
		// A case-insensitive target owns every spelling of its label, preserving
		// the historical website guarantee that no display label is ambiguous.
		const key = target.ignoreCase ? target.label.toLowerCase() : target.label;
		if (
			labels.has(key) ||
			looseLabels.has(target.label.toLowerCase()) ||
			(target.ignoreCase && foldedLabels.has(target.label.toLowerCase()))
		) {
			throw new Error(`documentation link profile has duplicate label '${target.label}'`);
		}
		labels.add(key);
		if (target.ignoreCase) looseLabels.add(key);
		foldedLabels.add(target.label.toLowerCase());
	}
}

// Projection builds one immutable vocabulary array per documentation profile.
// Retaining that array identity avoids rebuilding an 1,800+ label trie for
// every attachment. Callers must pass a new array instead of mutating one.
const matcherByVocabulary = new WeakMap<
	readonly DocsLinkTarget[],
	ReferenceMatcher<DocsLinkTarget>
>();

function matcherFor(targets: readonly DocsLinkTarget[]): ReferenceMatcher<DocsLinkTarget> {
	const cached = matcherByVocabulary.get(targets);
	if (cached) return cached;
	validateDocsTargets(targets);
	const matcher = compileReferenceMatcher(targets);
	matcherByVocabulary.set(targets, matcher);
	return matcher;
}

/**
 * Adds at most one link for each ordered target in every Markdown paragraph
 * (or table). Existing links, code, HTML, and headings are left untouched.
 */
export function linkifyDocsMarkdown(
	tree: DocsMarkdownNode,
	targets: readonly DocsLinkTarget[],
	self?: DocsLinkSelf,
): DocsMarkdownNode {
	return linkifyMarkdownAst(tree, matcherFor(targets), { self }) as DocsMarkdownNode;
}
