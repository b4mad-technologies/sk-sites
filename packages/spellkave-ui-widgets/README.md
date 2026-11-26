# `@spellkave/ui-widgets`

Display-only product widgets for Play, Maps, and Docs. Play tiles and Maps
inspect live at the package root; catalogue kind views live at
`@spellkave/ui-widgets/catalogue`. They render props; they do not call the SDK
or mutate world state.

## Which interaction rules apply

Two apps mount these widgets with opposite rules. In `apps/play` a map or a
name only selects and the composer acts
(the Play interaction axioms).
In `apps/classic` a click acts
(the classic interaction rules).
A widget therefore decides neither: it reports a gesture through a callback
(`onSelect`, `onSelectCell`, `onTravel`, `onAct`) and the host app chooses
what follows. A change made for one app stays additive for the other: a new
optional prop, with the old behaviour when it is absent.

## Naming

Component filenames and exports name the shared tiles:

| Export | Player-facing heading |
| --- | --- |
| `Hero` | the self sheet |
| `Scene` | the current place |
| `Pack` | pack / inventory |
| `Occupants` | people and things here |
| `PlacePanel` | place description, grouped Here, Ways out, selected-entity detail |
| `EntityDetail` | shared selected-entity body (Place and Pack) |
| `PlaceMap` | map peek or full frame |
| `Actions` | offered actions |
| `ActivityStatus` | reported activity phase and detail reader |
| `Combat` | combat strip |
| `Speech` | dialog |

## Exports

Every widget and its props type is re-exported from `@spellkave/ui-widgets`.
Fixture *shapes* live in `src/types.ts`. Dummy fixture *data* stays in
`apps/ui-lab/src/play/fixtures.ts` and imports those types.

`CiMatrixRows` displays the host report's expanded job names, conclusion counts,
red rates, assigned-execution means and optional p95. It preserves the supplied
order and exposes each row's denominator texts on hover. It performs no query,
matching or metric calculation. `CiMatrixRow` and `CiMatrixRowsProps` live in
`src/ci-types.ts`; Spire's page parity test proves the rendered values against
the same report the CLI prints.

`@spellkave/ui-widgets/reference-matching` is the format-neutral reference
matcher for browser apps, static generation, and Node tooling. Compile a
catalogue vocabulary with `compileReferenceMatcher(targets)` and receive
original-text offsets through `match(text)`. It uses Unicode word boundaries,
locale-independent case folding, and a prefix trie; it does not make fuzzy
automatic links. The leftmost non-overlapping match wins, then higher
`priority`, longer labels, and vocabulary order. `linkifyMarkdownAst` and
`linkifyHtmlAst` are optional structural adapters: they protect existing links,
code, headings/interactive content and do not depend on a DOM implementation.
To compare matcher changes against the emitted real docs vocabulary, run
`pnpm exec tsx packages/spellkave-ui-widgets/scripts/reference-matching-benchmark.mts`.
It reports compilation and warm matching separately against the retired
per-target RegExp scan over both an emitted article and a synthetic
exact-name-heavy workload. It is informational, never a brittle timing gate.

`Occupants` accepts an optional `onSelect` callback. That is presentation-only
(selection highlight). It must not be wired to a world mutation. At stage it
groups by the authorized scene kind (`actor` → Characters, `entity` → Objects)
and preserves any other source kind, plus an Unknown group when classification
is absent.

`PlacePanel` composes the place description, grouped Here list, adjacent/below
entity detail, and explicit Go to Ways out. Selection never executes an offer.
Gated exits stay clickable; the world decides the attempt. Missing place prose
says "No description available."; a failed read is an error. Card density lists
the way-out names with their direction (the same name snippet as the stage
list) above the "N ways out" count; it never moves. With `onInsertMove` each
name is a button that only reports the exit id, the host builds the composer
sentence; without it the names are text. More than five ways out show the
first four and a "+N more" note. A gated way out carries the same visible
"may be blocked" label as its stage row, in the button and in the text form.
The card fills its host's height as a column and never clamps the description
by line count: the description (`Scene` marks it `.sk-stream-scroll` at card
density) is the one flexible, scrolling part, while the place name, the Here
line, the way-out rows and the count keep their size.

`EntityDetail` is the shared selected-entity body for Place and Pack. Inventory
handles and scene handles stay distinct in the host; the widget only renders
supplied name, prose, facts and offers.

At stage density, `Pack` fills a bounded flex host with independently scrolling
inventory and detail panes. Its own container width selects side-by-side or
stacked panes. Give the host a bounded height and `min-height: 0`; a normal
unbounded host still grows with content. Selecting another item resets the
detail pane to its title and preserves the list position. Item buttons and the
focusable detail region support keyboard access. The real-browser regression
uses Play's `demo.html?beat=pack-long` fixture; jsdom only covers scroll reset.

`Description` accepts optional plain `text`, a configurable summary `label`,
initial `open` state, and an optional `valueSlot` for host-side field counting.
Blank text renders nothing. It uses native `details`/`summary` for keyboard
access and has no action callback. `Pack` initially expands item descriptions;
`Actions` explanations start collapsed. Hosts
provide authored prose through props, without ruleset-specific lookup in widgets.

`FieldDetail` opens a reading dialog from a field label or custom trigger
snippet. The host supplies optional value, plain-text description, labeled
metadata and `readState` (`ready`, `loading`, `failed`). Missing prose is
explicit, and opening the dialog has no action callback. It uses the UI
package's Dialog for focus management and a bounded scrolling panel. Hero
identity, vital, ability and quest fields use it at stage density. Its optional
`valueSlot` exposes a structural description marker and disclosure state for
host telemetry, without exporting text or counting the portalled copy twice.

`ActivityStatus` accepts a label, reported phase, optional description, labeled
fields and an optional progress percentage. It reuses `FieldDetail` and the UI
package's `Progress`. Opening its reader does not execute an action. The phase
remains authoritative even when an estimate reaches 100%; missing estimates
have no progress bar. Hosts decide which authorized activity to display and
own refresh, selection and action admission.

`Artwork` accepts optional plain-text `errorText` from its host. Failed images
show that explanation in the normal size; compact images retain it in their
accessible label and title. The widget does not classify network failures or
resolve asset references. Hosts keep credentials and response details out of
the supplied copy.

## Colour

Tiles consume `@spellkave/ui` semantic tokens. `just check-ui-primitives`
Rule C scans this package the same way it scans `@spellkave/ui`.
