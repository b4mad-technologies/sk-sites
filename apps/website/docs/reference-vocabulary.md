# Public reference vocabulary

The documentation build emits `/compendium/docs/references.json` beside its
index. It contains `{ version: 1, targets: [...] }`, derived from the existing
authored page link profiles, not another class/species/rules list. Each target
contains `label`, `kind`, `ref`, and a root-relative `/docs/` `href`.
Catalogue-backed targets also carry an optional `previewHref`, resolved from
that entry's existing `artifact_href`, not reconstructed from its name.
A target with `autolink: false` is lookup-only: a client may find it by `ref`
(for example the species Elf, or a skill), but the shared matcher never
matches its label in prose.
Play loads it only when its reference popover opens, caches the result, and
renders the title and description as escaped text in the shared ReferenceCard.
Hover previews become persistent on click/tap; keyboard Enter/Space opens,
and Escape or the Close control dismisses. The full documentation link remains
available when a preview is missing, malformed, or exceeds the two-second deadline.

`src/compendium/reference-vocabulary.ts` deduplicates identical targets and
omits labels which resolve to different references across profiles, including
case variants, and passes `autolink: false` through. Automatic matching
retains exact capitalization and skips lookup-only targets. This avoids
choosing between known homonyms; it does not infer the meaning of ordinary
language or guarantee that a capitalized word denotes a game concept.

The shared `@spellkave/ui-widgets/reference-matching` entry point supplies the
browser/Node-safe matcher and structural Markdown/HTML adapters. Consumers
choose how to display a match; a reference is a reading aid, not a game action.
Play fetches this vocabulary without credentials and keeps ordinary text when
the artifact is unavailable. Explanations never determine answer-slot meaning.

## Hosting and compatibility

The vocabulary contains only already-public documentation labels and links:
no live world data, dialogue, account state, or credentials. The narrowly scoped
`public/_headers` rules allow credential-free cross-origin reads of this file
and the existing `/compendium/docs/catalogue/*` artifacts
using [Workers static asset headers](https://developers.cloudflare.com/workers/static-assets/headers/).
No Worker code, authenticated endpoint, or infrastructure route is added.

Publish the website artifact before a Play release that consumes it. An older
website lacking it leaves Play usable without reference links. Removing the
feature is a static-app rollback; it preserves all world state and needs no
reset or migration. This change does not deploy either app.

The vocabulary unit tests cover deduplication, ambiguity, and URL restrictions;
the projection test proves the file is emitted. Run the website typecheck,
tests, and build when changing this contract, plus the shared matcher and Play
consumer checks.
