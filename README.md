# Spellkave sites

The Spellkave web apps and the design system they share: the public website,
the account page, the ui-lab component catalogue, and the Svelte packages
behind them.

| Path | What it is | npm |
| --- | --- | --- |
| `apps/website` | spellkave.com, static Svelte site | no |
| `apps/account` | account.spellkave.com, signed-in person's page | no |
| `apps/ui-lab` | design system catalogue and demos | no |
| `packages/spellkave-ui` | `@spellkave/ui`, Svelte primitives, tokens, themes | planned |
| `packages/spellkave-ui-widgets` | `@spellkave/ui-widgets`, display-only product widgets | planned |
| `packages/spellkave-map-canvas` | `@spellkave/map-canvas`, MapLibre world map widget | planned |
| `packages/spellkave-run-events-view` | `@spellkave/run-events-view`, agent run events list | planned |
| `packages/spellkave-authkit` | `@spellkave/authkit`, WorkOS AuthKit PKCE client | planned |
| `packages/spellkave-design-gen` | `@spellkave/design-gen`, design-time `skgen` CLI | no |

None of the five packages marked `planned` is on npm yet. The first tagged
release publishes them.

## Build and test

Use Node 24.22.1 or later within Node 24 and pnpm 11.13.1.

```sh
pnpm install --frozen-lockfile
pnpm -r --filter '!@spellkave/website' run typecheck
pnpm -r --filter '!@spellkave/website' run test
pnpm -r --filter '!@spellkave/website' run build
pnpm test:pack
```

The account build reads `VITE_*` settings; CI uses placeholders (see
[ci.yml](.github/workflows/ci.yml)). The website does not build here yet: it
needs packages from sk-content and sk-sdk that are not on npm. See
[PROVENANCE.md](PROVENANCE.md).

The `wrangler.jsonc` files carry no Cloudflare account. A deploy
(`pnpm --filter <app> run deploy`) reads the account from the
`CLOUDFLARE_ACCOUNT_ID` environment variable, or from the Wrangler login.

## npm releases

The workspace manifests stay `private` and point at source, so the apps use
the packages directly. `scripts/pack-npm.mjs` builds each package with
`svelte-package` into a staging copy and writes the published manifest
there. `pnpm test:pack` packs all five, checks the tarball content, installs
them in an empty project from a local registry, imports the Node-safe entry
points and compiles every shipped component.

A tag `vX.Y.Z` that matches the root `package.json` version runs
[npm-release.yml](.github/workflows/npm-release.yml), which publishes the
tested tarballs with provenance through npm Trusted Publishing. First-time
setup uses `scripts/npm-setup bootstrap` and `scripts/npm-setup trust`, as
in sk-sdk.

## Licence

Code uses [PolyForm Shield 1.0.0](LICENSE). First-party images use CC BY 4.0;
see [ART.md](ART.md). [NOTICE](NOTICE) lists third-party material.
