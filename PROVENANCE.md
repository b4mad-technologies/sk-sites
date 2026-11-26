# Source and dependency provenance

The initial source was copied with Git archive from Spellkave
`e9e078d5bb8290c2d985c42bfa0dc8164df5542a` (`origin/main`, 2026-11-26).
The copy forms a fresh history; the first commit holds the files unchanged.

## Paths taken

| Monorepo path | Here |
| --- | --- |
| `apps/website` | same |
| `apps/ui-lab` | same |
| `apps/account` | same |
| `packages/spellkave-ui` | same |
| `packages/spellkave-ui-widgets` | same |
| `packages/spellkave-authkit` | same |
| `packages/spellkave-map-canvas` | same |
| `packages/spellkave-run-events-view` | same |
| `packages/spellkave-design-gen` | same (second import, same commit) |
| `patches/@pixellab-code__pixellab@1.0.2.patch` | same |
| `tsconfig.base.json`, `.node-version` | same |
| `DESIGN.md` | same |
| `.agents/skills/impeccable/scripts/lib/design-parser.mjs` | `vendor/impeccable/design-parser.mjs` |

Test data for design-gen, copied from the monorepo root into
`packages/spellkave-design-gen/test/repo-root` at the same relative paths
(the originals stay in the monorepo):

- `scripts/design-assets/prompt-templates.placeholder.json`,
  `woven-example.blueprint.json`, `entity-art-v1.sample.art-manifest.json`
- `.impeccable/style-packs/entity-art-v1/manifest.json`, `palette.png`,
  `prompt-templates.json`

The monorepo also keeps copies of the PixelLab API documents under
`docs/references/`. They are not copied here. The four files of that name in
`test/repo-root/docs/references/` are small hand-written stubs with matching
checksums, enough for the checksum test.

`package.json`, `pnpm-workspace.yaml` and `.gitignore` are new and small.
The monorepo `mise.toml`, Nx `project.json` files and the authoring corpus
generator calls were removed. design-gen lost its Nx project file and the
monorepo `tsc-with-cache` wrapper; its behaviour suite (`behaviour/`) and
guide drift test stay in the tree but do not run, because
`@spellkave/behaviour` (moved to sk-sdk) is not on npm.
`apps/*/app.toml` (Cloudflare publication inventory) and `wrangler.jsonc`
stay as copied.

## Published dependencies

| Package | Source |
| --- | --- |
| `@spellkave/tool-contracts@0.1.2` | npm |
| `@spellkave/world-author@0.1.2` | npm |
| `@spellkave/validate-wasm@0.1.0` | npm, aliased as `spellkave-validate-wasm` |
| `@spellkave/behaviour` | not on npm (sk-sdk); design-gen behaviour suite waits for it |

## Needed from other repositories

The website still imports `@spellkave/srd-cc` and reads content files by
monorepo path (`REPO_ROOT/packages/...`). Until these are published, the
website does not typecheck, test or build here. ui-lab and ui-widgets no
longer depend on sk-content.

`@spellkave/srd-cc` (sk-content, today `private`, version 0.0.0):

| Export or file | Used for |
| --- | --- |
| `./docs/row-kind-coverage`: `CatalogueIdentityShape`, `POLYMORPHIC_OWNER`, `catalogueIdentities`, `entryKindForTable`, `ownerCandidates`, `pagedRowKinds`, `rowCompositeColumns`, `rowIdentityColumns`, `rowKindCoverage`, `rowKindCoverageFor`, `unclassifiedRowKinds` | compendium projection, validators, 2 capture scripts, tests |
| `./docs/catalogue`: `catalogueEntriesFromManifest`, `publishedRowKinds` | metadata docs validator, reader coverage test |
| `fixtures/manifest.toml`, `fixtures/dm/manifest.toml`, `fixtures/base/**` | docs projection roots |
| `src/docs/row-kind-coverage.toml`, `src/docs/sections.toml` | read beside the code exports |
| `assets/srd-art/**` (1,441 WebP + sidecars) | compendium art mount `/srd-art`; not in sk-content yet |

The two code exports point at TypeScript source. A published package needs
built JavaScript, or the website keeps compiling it through Vite and tsx.

`@spellkave/adventure-elven-mini` (sk-content, today `private`, version 0.0.0):

| File | Used for |
| --- | --- |
| `fixtures/adventure.manifest.toml` and `fixtures/**` | docs projection root `/docs/adventures/elven-mini` |
| `assets/elven-mini-art/**` (50 WebP) | compendium art mount; not in sk-content yet |
| `assets/ccc3-maps/maps/**` | compendium map module |

`@spellkave/world-author` (sk-sdk, npm 0.1.2): the package ships `dist`
only. The website also reads `docs/patterns/**`, `docs/**` and
`docs/metadata-attachments.md` from disk, so the package must add `docs/`
to its files, or the website must use the `./corpus` export only.

After publishing, `apps/website/scripts/metadata-docs-registry.mts`,
`metadata-docs-assets.mjs`, `copy-compendium.mjs` and the two capture
scripts must resolve these paths from `node_modules` instead of `REPO_ROOT`.
