# Agent map

- [README.md](README.md): what is here, how to build, test and release.
- [PROVENANCE.md](PROVENANCE.md): what came from the Spellkave monorepo, and what the website still needs from sk-content and sk-sdk.
- [ART.md](ART.md) and [NOTICE](NOTICE): image licence and third-party material. Every image sidecar carries `"license": "CC-BY-4.0"`.
- [DESIGN.md](DESIGN.md): design language, read by ui-lab through `vendor/impeccable/design-parser.mjs`.
- `apps/website/CLAUDE.md`, `apps/account/CLAUDE.md`: app rules.
- [scripts/lib/npm-packages.mjs](scripts/lib/npm-packages.mjs): the packages released to npm. Add a package there, not in the workflows.

Rules:

- Workspace manifests stay `private` with `./src` exports. Published fields are written by `scripts/pack-npm.mjs`; check with `pnpm test:pack`.
- A runtime import in a published package must be a declared dependency or peer; the pack step fails otherwise.
- Releases go through a `vX.Y.Z` tag and `npm-release.yml`. The only manual publish is the one-time `scripts/npm-setup bootstrap`, run by the owner.
