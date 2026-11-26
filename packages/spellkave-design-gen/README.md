# `@spellkave/design-gen`

Design-time generation CLI (`skgen`). **Not a runtime dependency.** Analogous
to `skop` (`@spellkave/ops`) in shape: plan is free, paid work needs
`--confirm-paid`, and committed artefacts are the contract.

`skgen image` owns the provider-agnostic image engine. Art manifests retain
their plan, paid-confirmation, provenance, and resume behavior for PixelLab
and OpenAI Image. `scripts/design-assets` retains manifests, preview helpers,
and compatibility entry points only.

What each verb does, proven by offline scenarios: [`docs/guide.md`](docs/guide.md)
(generated from `behaviour/*.feature`; transcripts in [`docs/scenarios.md`](docs/scenarios.md)).

`skgen` reads and writes paths relative to the current directory, so run
it from the directory that holds the manifests and style packs (for example
the monorepo or sk-content root), through the launcher in this package:

```bash
SKGEN=<sk-sites>/packages/spellkave-design-gen/bin/skgen.js
<sk-sites>/node_modules/.bin/tsx "$SKGEN" prose plan fixtures/barbarian.prose-manifest.json
<sk-sites>/node_modules/.bin/tsx "$SKGEN" image plan <art-manifest.json> --only class-emblem-barbarian
```

The tests read a small copy of monorepo data from `test/repo-root`. The
behaviour suite (`behaviour/`) and the guide drift test need
`@spellkave/behaviour` from sk-sdk, which is not on npm yet, so they do not
run here.

`skgen prose generate` is the only paid-provider verb (`--provider pi-ai|fake`).
When no provider credential is available — notably inside an agentic coding
session — `skgen prose prompt <manifest> [--only <id>] [--format json|text]`
prints the exact system/user prompt `generate` would send (free, no network,
same render call as `generate`), and `skgen prose ingest <manifest> --only
<id> --text-file <path> --author <text>` writes a hand-written candidate to
the same `run.json` `generate` writes, running the same hygiene scoring. The
written cell is honest about its origin — `provider: "agent-session"`, the
`author` string, and a `prompt_hash` of the exact prompt it answers — and
never sets `model` (no model call happened). Consumers that read `run.json`
cells and assume every cell carries a `model` (e.g. `flavor-ingest.ts` in
srd-cc, which currently does `` `openai/${cell.model...}` `` unconditionally)
need a one-line branch on `cell.provider === "agent-session"` to emit
`provider`/`author` frontmatter instead of a fabricated `model:` line.

`skgen image generate <manifest> --confirm-paid` is the only image-generation
verb. `skgen image plan` is free and reports provider route plus estimated
usage without contacting a provider. The legacy `just art-batch` recipe is a
compatibility shim to `skgen image batch`, preserving existing arguments and
its explicit confirmation behavior.

For an already-reviewed overlay manifest, `skgen image batch <manifest>
--confirm-paid --compose-only` selects only entries with `overlay_of` and
`overlay_template`. It performs deterministic local composition from the
declared base and badge inputs and makes no image-provider request.

Use `skgen image pixellab <command...>` and `skgen image openai-image
<command...>` for the retained blueprint-oriented workflows. The corresponding
`just pixellab` and `just openai-image` recipes are compatibility shims.

Sample bake-offs (prompt, then `skgen`, then model text) live in
[`samples/`](samples/README.md). Live re-exec is paid; do not verify in CI.

`sk` and `skop` are the wrong homes (world tools / live ops). `srd-cc generate`
stays deterministic.
