# Website documentation metadata

This website export-profile convention drives generic documentation overview
pages and ordered section navigation without adding website concepts to the
server schema. Registered documentation roots must declare it; manifests not
registered as documentation roots may omit it. Refresh and validate the
generated site assets with:

```bash
pnpm --filter @spellkave/website run check:metadata-docs
pnpm --filter @spellkave/website run export-compendium
```

For another root, supply every dependency explicitly:

```bash
pnpm --filter @spellkave/website exec tsx scripts/validate-metadata-docs.mts \
  ../../path/to/root.toml --dependency core=../../path/to/core/manifest.toml
```

Version 1 uses a structured `docs` object in the root metadata. Keys outside
`metadata.docs` remain open; unknown keys inside it fail validation.
The object is optional, but `version`, `page_id`, `title`, `intro`, and
`sections` are required when present. `source_base` is an optional absolute
HTTPS base for relative links. Ordered `attributions` carry a Markdown body and
`{ path, anchor, license }` source and are rendered as page credits.
Legacy core metadata fields remain governed by the shared manifest contract.

```toml
[metadata.docs]
version = 1
page_id = "srd"
title = "System Reference"
intro = """Markdown introduction."""
source_base = "https://example.invalid/source/"
attributions = [{ body = "Source edition and creator credit.", source = { path = "NOTICE.md", anchor = "Credits", license = "CC-BY-4.0" } }]

[[metadata.docs.sections]]
id = "spells"
title = "Spells"
intro = "Spell rules and descriptions."

[[metadata.docs.sections.pages]]
id = "using-spells"
title = "Using Spells"
body = """Authored Markdown and allowlisted HTML tables."""
source = { path = "cache/markdown/spells.md", anchor = "Using Spells", license = "CC-BY-4.0" }

[[metadata.docs.sections.pages]]
id = "spell-resources"
title = "Spell Resources"
content = { source_path = "base/spells/resources.toml", namespace = "docs", id = "spell-resources" }

[[metadata.docs.sections.catalogue]]
kind = "entity_definition"
ref = "srd/spell/fireball"
family = "spell"
slug = "fireball"
facts = [{ label = "Level", value = "3" }]
source = { path = "base/spells.toml", anchor = "srd/spell/fireball", license = "CC-BY-4.0" }

[[metadata.docs.sections.documents]]
id = "quest-q1"
ref = "elven_mini/quest/Q1"
family = "quest"
slug = "Q1"
title = "Rats in the Cellar"
body = """Clear the inn cellar of giant rats and the swarm."""
relations = [{ kind = "entity_definition", ref = "srd/creature/giant-rat" }]
source = { path = "author/quests.ts", anchor = "QUESTS", license = "LicenseRef-Spellkave-Proprietary" }
```

`catalogue` is the ordered selection of real manifest rows for a section. Each
entry names the exact row `kind` and `ref`, a route `family`, and a unique
one-segment public `slug`. The projector reads presentation from the row;
`title` and `description` are explicit overrides for row kinds without readable
fields. `facts` are authored label/value pairs for readers and search, never
gameplay. Optional ordered `tags` add editorial search terms to the row's own
manifest tags; tag values are non-empty and unique. Large generated selections may use mutually exclusive
`catalogue_content`; its included-fragment value must contain only a
`catalogue` array. Optional `{ path, anchor, license }` `source` records the
authored source occurrence when the flattened manifest row cannot retain its
include path; the website never guesses that path from an identifier.

`documents` publishes authored pages not backed by a manifest row. Every
document has a stable public/search `ref`, strict internal `id`, route `family`,
unique public `slug`, and the same inline or content-locator choice as `pages`.
Documents may likewise carry optional ordered, unique, non-empty search `tags`.
Optional ordered `relations` contain exact typed `{kind,ref}` identities; every
relation must resolve to one published catalogue route before artifacts are
written.
Use `catalogue` instead when the subject has a typed manifest identity.

`pages` is optional. When present, its order is the reader order and each item
requires a route-safe lowercase-hyphen id and title. Content is either inline
`body` plus `source`, or an exact reference to metadata on a directly included
manifest fragment. These forms are mutually exclusive. A referenced fragment
authors real TOML metadata, for example:

```toml
[metadata.docs.spell-resources]
body = """
Rules prose.

::resource{ref="srd/spell-slots" view="compact"}
"""
source = { path = "cache/markdown/spells.md", anchor = "Spell Slots", license = "CC-BY-4.0" }
```

`source_path` must exactly match one declared include path in the same manifest;
projection resolves its `namespace` and `id` only from the already-loaded
fragment metadata envelope. It does not read an arbitrary filesystem path, and
absolute resolved paths are not published in the docs artifact.

Reader Markdown uses CommonMark plus GFM tables and sanitized raw HTML. The
closed directive profile includes top-level, unlabelled resource and subject
leaves:

```markdown
::resource{ref="srd/heroic_inspiration" view="compact"}
::subject{kind="entity_definition" ref="srd/armor/shield" view="compact"}
::subject{kind="entity" ref="elven_mini/adventure/innkeeper_1" view="full"}
```

Subject `kind` is limited to `entity_definition|entity`; the exact manifest row
family selects the view, never an ID prefix. Unknown directives,
attributes, views, ambiguous or missing fragment references, and unresolved
subjects or resource definitions fail projection before the artifact is replaced. Directive
text inside code fences remains literal; no JavaScript or MDsveX executes.
An embedded subject's `view` also decides what the delivery witness credits:
`view="full"` renders the whole `AttachmentBlock` list (`SubjectView.svelte`),
so `collectWitnesses` credits those `metadata_attachments` rows as shown;
`view="compact"` renders only a `ReferenceCard` thumbnail and credits nothing —
crediting attachments a reader never sees past a thumbnail would file the row
out of the overflow basin while hiding it from both halves.
Source Markdown may normalize a trailing-two-space hard break to CommonMark's
equivalent trailing backslash so TOML serialization and whitespace tooling do
not erase it; `docs-markdown.test.ts` proves the rendered result is unchanged.

An authored page can instead render several definitions as one compact table:

```markdown
:::resources{view="table" nameLabel="Ability" descriptionLabel="Score measures …"}
::resource{ref="srd/str"}
::resource{ref="srd/dex"}
:::
```

The container labels are required authored presentation strings. Its ordered,
non-empty children accept only `ref`; prose, nested containers, duplicate refs,
and child `view` attributes are invalid. The table shows each projected
definition's name and description and links to its full resource route. It does
not repeat definition defaults or ranges.

The projector derives one canonical route for each authored page. A standalone
page uses `/docs/<page_id>/<section_id>/<page-id>` (or the equivalent mounted
SRD/adventure path). A page with `featured_reference` shares the matched
catalogue entry's route instead of creating a second public page. Authors do not
store an `href`. Page ids, document slugs, and catalogue slugs must not collide
within a section.

An authored subject can join a section through a bundle-owned, registered
`<bundle>.docs.entry` metadata attachment. Its JSON payload is strict:

```toml
[[metadata_attachments]]
bundle_id = "srd"
namespace = "srd.docs.entry"
target_kind = "entity_definition"
target_ref = "srd/spell/fireball"
payload_json = '{"page_id":"srd","section_id":"spells"}'
source = "manifest"
```

The projector writes a compact `/compendium/docs/index.json` directly from
registered manifest roots and their explicit dependency paths. Article bodies,
render blocks, and subject snapshots live in lazy artifacts under
`/compendium/docs/articles/`; catalogue summaries and full entries live under
`/compendium/docs/catalogues/` and `/compendium/docs/catalogue/`. Technical tables likewise live under
`/compendium/docs/technical/` and carry the overflow: only those occurrences
from each unique registered manifest source that no rich artifact shows,
including rows without a `bundle_id`. The
navigation index contains authored page and section metadata, article summaries,
catalogue artifact links and counts, routes, and technical source summaries. All
public pages live below `/docs`; the website build registry may assign a normalized
`mount` such as `/docs/srd` or `/docs/adventures/elven-mini`.
The registry contains no titles, introductions, ordering, or other presentation
copy. The projector does not read or rewrite a compendium converter index, and
version 1 does not derive presentation counts from converter output.

To publish another documentation root, add its `rootManifestPath` and explicit
`dependencyPaths` to `scripts/metadata-docs-registry.mts`. Omit `mount` for the
default `/docs/<page_id>` route. Mount depth does not require a router adapter:
the runtime resolves the longest page and section href projected into the index.

## Authoring pattern docs (non-manifest root)

Not every documentation root is a bundle manifest. World-author's pattern
catalog (`packages/spellkave-world-author/docs/patterns/*.md`) documents how
to author worlds with the engine — it is not SRD or adventure content, so it
carries no manifest identity and used to be a byte-for-byte copy baked into
the SRD bundle (sk-jay0.3.5.80: "never copy, always reference"). It is instead
read directly from those Markdown files at build time by
[`project-authoring-docs.ts`](../src/compendium/project-authoring-docs.ts), a
small sibling projector to `project-metadata-docs.ts`, registered separately
as `MARKDOWN_DOCS_ROOTS` in `scripts/metadata-docs-registry.mts` (never as a
`DOCS_PROJECTION_ROOTS` entry — it has no `rootManifestPath`). It emits the
same `DocsPage`/`DocsIndexV1` shape a manifest-backed page does — one
`documents` section, one document per file, slugged from the filename — so
every existing router, sidebar, and reader component renders it unmodified;
`scripts/project-metadata-docs.mts` merges its page and search rows into the
already-projected `index.json`/`search.json` after the manifest projection
runs. A pattern-to-pattern relative link resolves to its own published route
the same way a manifest page's same-page links do; a link that leaves the
published set resolves against the root's own `sourceBase` instead of a
manifest `source_base` (`no-github.test.ts` is why that base lives in the
registry, not as a literal in `src/compendium/`). The retired
`/docs/srd/authoring-patterns[/<slug>]` route redirects client-side to
`/docs/authoring/patterns[/<slug>]` (`parse-path.ts`'s own redirect table).
Because this root has no manifest, it is invisible to the manifest-only
`docs-coverage-validator.ts` and `docs-census.ts` gates — their `rich_entries`/
`technical_rows`/census pins measure the manifest-backed roots only.

Standalone pages render the authored body independently of converter output;
featured page bodies render inside their canonical catalogue detail page.
Resource directives snapshot the referenced manifest resource definition, its
tags, and all matching metadata attachments into the static artifact. Compact
cards link to a section-scoped generic resource route. Resource defaults describe
the definition, not a character's current state. Attachment provenance is shown
only when authored, and the docs profile is deliberately not an audience
filter: every attachment renders, including a non-public one, and a non-public
`audience` (a `VisibilityClass` token, the strict owner token `owned`, or a
capability id — ADR-0130 D-3) instead earns a clearly visible, colour-coded
marker naming who may read it (`AttachmentBlock.svelte`,
`audience-label.ts`). A `public` audience carries no marker at all
(sk-jay0.3.5.77 closed the earlier proposal to hide non-public attachments
instead).
Chapter lists, search, and detail pages consume these manifest projections; the
website build does not run or copy the
retired SRD and Elven compendium converters. Static entity pages label
manifest values as seeded initial state rather than current live-world state.
Definition pages compose readable facets such as authored equipment modifiers;
rows that no page shows remain readable in the technical tables. Entity and
entity-definition subject pages derive their owned facets the same way every
other owner page does — `projectSubject` carries no hand-written join column
or facet-title table of its own — so a kind classified `owner =
"entity_definitions"`/`"entities"` in `row-kind-coverage.toml` reaches its
carrier's page without a second edit in the projection. A `place_edges` row
authored with an empty `place_graph_id` connects a node of one place graph to
a node of another; it renders as a "Connections to other maps" facet on BOTH
endpoint graphs' pages, derived from each end's own `place_nodes` row rather
than authored twice. `place_edge_affordance`/edge-keyed
`spatial_environment_state` rows ride beside whichever edge they name — in-graph
or cross-map — as "Edge offers"/"Edge state" facets on every page that shows
that edge. `spatial_environment_state` is three-way polymorphic (a row sets
exactly one of `place_node_id`/`place_edge_key`/`location_def_id`); its
classification authors `owner_candidates` — several `{owner, owner_field}`
pairs instead of one fixed pair — and a node-keyed row rides the same way as
the edge-keyed case, as a "Place node state" facet on the place graph page
that shows the node (a place node has no page of its own to land on). The
location-keyed candidate (owner `location_definitions`) has no authored rows
and no page kind renders one today, so a row naming one stays visibly in the
technical tables rather than being credited to a page that cannot show it.
`owner_candidates` generalizes to any owner-surfaced kind that belongs to
whichever of several fixed kinds it actually names — not only
`spatial_environment_state` — and is distinct from `owner = "*"`
(`metadata_attachments`), whose owner is resolved from generic target columns
rather than a small fixed set of typed ones. Each registered root's own docs
page carries an "About this bundle" block: its `[[bundles]]` row in full, the
rows classified `owner = "bundles"` (movement defaults, the metadata
namespaces it registers) and any page-less session a movement default names,
all read from that root's own manifest, never its dependency closure. A row
its owner points at rather than the other way round (a session naming its
turn scheduler) is classified with `named_by` in `row-kind-coverage.toml` and
joined from the owner's side. A facet's reader-facing title is likewise
authored data: an owner-surfaced kind's optional `label` in
`row-kind-coverage.toml` overrides the generic derived title (the owner
table's name stripped off the kind's own, title-cased) wherever that kind is
owner-surfaced, carrier page or not — never a label table in the projection.
What remains in the technical tables must be broken content: `basin-guard.test.ts`
fails for any basin row that does not name an id no registered bundle defines.
The website does not infer catalogue membership from technical rows:
registered roots publish every explicitly authored `catalogue` and `documents`
entry. A `docs.entry` attachment remains a section-membership convention for
older authored subjects, not catalogue authority.

Author the profile with `spellkave_set_metadata`. Root metadata is
replace-by-key, so a `docs` update supplies the complete profile while leaving
unrelated root keys untouched:

```json
{
  "target": "manifest",
  "key": "docs",
  "value": {
    "version": 1,
    "page_id": "my-world",
    "title": "My World",
    "intro": "Reader introduction.",
    "sections": [{
      "id": "places",
      "title": "Places",
      "intro": "Authored places.",
      "catalogue": [{
        "kind": "place_graph",
        "ref": "my-world/region",
        "family": "place",
        "slug": "region",
        "facts": [{ "label": "Scale", "value": "regional" }]
      }]
    }]
  }
}
```

This check validates only the website docs export profile: it does not replace
shared manifest validation, namespace registration, or target admission.
Documentation metadata is presentation input, never a completeness filter or
an audience/security boundary.
Shared manifest metadata stays open and may contain other root keys and nested
values. The website validator is deliberately closed only within
`metadata.docs`: it rejects unknown profile keys, colliding or unsafe routes,
unresolved typed references, ambiguous content locators, and missing readable
presentation before publishing. Shared manifest validation alone therefore
does not prove that a registered documentation profile projects successfully.

When a registered root lacks `metadata.docs`, projection fails before replacing
the static docs index. Invalid route-shaped page or section ids, contradictory
page ids, and colliding mounts also fail. Required intros must be non-empty.

## Publication coverage

The normal metadata-docs check also builds the registered projection in a
temporary directory and validates it through the same route resolver used by
the application. The implementation and its negative tests are
[`docs-coverage-validator.ts`](../src/compendium/docs-coverage-validator.ts)
and [`docs-coverage-validator.test.ts`](../src/compendium/docs-coverage-validator.test.ts).
They verify lazy artifact existence and membership, exact typed targets, search
routes, and metadata envelopes. The temporary projection is removed whether the
check passes or fails.

**Page or basin, never neither.** The technical tables are an overflow basin,
not a copy of the manifest: they carry exactly the row occurrences no rich
artifact shows. Every loaded row occurrence must therefore appear on a page or
in a technical table, never in both — the two halves are complementary and
together account for the whole loaded corpus. Both halves are asserted, because
they fail differently. A row in *neither* has silently left the site and looks
exactly like a row nobody ever authored, which is the trap this projection has
already fallen into twice. A row in *both* makes the basin meaningless: it grows
back into a copy of everything and its size stops measuring anything.

Basin membership is **measured, never derived from the classification**.
[`row-kind-coverage.toml`](https://github.com/b4mad-technologies/sk-content/blob/main/packages/spellkave-srd-cc/src/docs/row-kind-coverage.toml)
says where a kind *belongs*, and much of that is still a promise; a row whose
kind is classified as belonging on a page it never reached stays visibly in the
basin instead of falling between the two. `collectWitnesses` in
[`delivery.ts`](../src/compendium/delivery.ts) is the single rule that decides.
The projection applies it to the entries it is about to write; the validator
re-applies it to the artifacts read back off disk. A projection that filtered
too eagerly therefore surfaces as a row in neither half rather than passing
quietly.

The basin size is pinned as `technical_rows` in
[`docs-coverage-validator.test.ts`](../src/compendium/docs-coverage-validator.test.ts)
and is expected to FALL as owner rows and relation edges are delivered
(sk-jay0.3.5.71). A rise means pages stopped showing rows they used to show, so
either direction needs a deliberate edit to that number.

The publication boundary is exactly the closure loaded from the two registered
main manifests: the SRD `manifest.toml` and Elven Mini
`adventure.manifest.toml`, including their declared dependencies and includes.
Other TOMLs merely located beside those files are outside the publication
input, so the checker neither discovers nor diagnoses them. Adding content to
the website therefore requires linking it from a registered closure; deleting
an actually declared include still fails loading and publication. The CLI
boundary behavior is covered in
[`docs-coverage-validator.test.ts`](../src/compendium/docs-coverage-validator.test.ts).

This coverage check does not crawl arbitrary hyperlinks inside rendered
Markdown, and it does not judge whether a row *ought* to have a rich view — only
whether every authored row is accounted for by exactly one of the two halves.
How many rows still lack a page is what the basin's size reports.

## Content census (drift gate)

`docs-coverage-validator` proves every projected route, artifact, and typed
link is *structurally* sound; it does not notice a prose edit, a changed art
hash, or a lost tag. [`docs-census.ts`](../src/compendium/docs-census.ts)
covers that gap with a small, self-referential snapshot of today's own
projected content — not a comparison against any retired system.

For every page/section it walks each catalogue entry, document, and plain
page and reduces it to one sha256 digest over its identity-bearing fields
(ref, href, display name, and digests of description, facts, tags, and
attachments); the committed artifact
[`docs-census.json`](../src/compendium/docs-census.json) stores only
`{section id, entry_count, digest}` per section plus a grand total — a couple
of kilobytes, never per-entry rows.
[`docs-census.test.ts`](../src/compendium/docs-census.test.ts) re-runs the
projection, recomputes the census, and diffs it against the committed file;
on a mismatch the failure names the drifted section(s). The same file also
carries standalone self-consistency assertions (href uniqueness per page,
non-empty display names, resolvable art references, typed relations
resolving to a known entry) that do not depend on the snapshot at all.

After a deliberate content change, regenerate the snapshot and review the
diff before committing it:

```bash
just website-census
```

## Compendium census (frozen counts, one snapshot)

`docs-census.json` covers content drift; a sibling committed artifact,
[`compendium-census.json`](../src/compendium/compendium-census.json), covers
the absolute row-count literals that `manifest-coverage.test.ts`,
`docs-coverage-validator.test.ts`, `capability-grants.test.ts`, and
`bundle-info.test.ts` used to hand-bump on every content PR (sk-0ea.13) —
manifest row totals per registered closure, `modifier_target_definitions`
occurrences, the per-table occurrence counts named in `manifest-coverage.test.ts`,
`rich_entries`/`technical_rows`/`technical_metadata_envelopes` from
`docs-coverage-validator.ts`, the `tag_capability_grant` total, and the SRD/Elven
Mini "About this bundle" facet lengths. [`compendium-census.ts`](../src/compendium/compendium-census.ts)
defines the shape and the two counting helpers (`manifestRowCount`,
`projectedRows`) both the tests and the capture script share, so they can never
disagree about what a row is. Each test compares its own live-computed number
against the matching snapshot field and fails with `compendium census drift:
run \`just website-census\`` on a mismatch — never a bare number.

`just website-census` is the single regenerate entry point (sk-0ea.13): it
runs `scripts/capture-docs-census.mjs` (writes both `docs-census.json` and
`compendium-census.json`) and `scripts/capture-delivery.mjs` (writes
`delivery-report.json`, see `delivery.test.ts`'s own header) in one recipe.
Two concurrent content PRs that used to conflict on the hand-summed "+N
because" ledger in `manifest-coverage.test.ts` now conflict on the snapshot
JSON files instead, and the resolution is "run the recipe again", never
arithmetic. The "+N because" history that used to live as test comments now
belongs to the commit message that moved the number.

The `docs-census-pairing` skgate gate (not part of this repository)
enforces the pairing at `pre-push`/`ci`: any change under
`packages/spellkave-srd-cc/fixtures/`, an adventure package's own `fixtures/`
tree, or `packages/spellkave-srd-cc/authored/flavor/` must land in the same
range as `docs-census.json` or `compendium-census.json`, and its remedy names
`just website-census`.
