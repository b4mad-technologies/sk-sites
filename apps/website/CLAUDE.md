# `apps/website/` — agent context

Public static site for `spellkave.com`. Svelte 5 + Vite. Build shared product
surfaces from `@spellkave/ui` and its Bits UI primitives; keep a component local
only when its meaning is genuinely website-specific. Not a game client.

## Binding invariants

- **Static SPA, no Worker backend.** Cloudflare Worker serves assets only.
  Never add `routes` / `custom_domain` to `wrangler.jsonc`. Worker + domains
  live in `infra/cloudflare` (Pulumi project `spellkave-cloudflare`), including
  the `spellkave.com` zone; do not add a second writer.
- **One browser data path after sign-in.** A single `GET /v1/account`
  (`src/lib/account-api.ts`, base `VITE_SPELLKAVE_API_URL`, default
  `https://api.spellkave.com`, dev fallback `https://mcp.spellkave.com`),
  whose answer chooses a destination in `src/lib/account-destination.ts`.
  **No** seat, claim, release, token or admin calls from here — those moved to
  Play, `account.spellkave.com` and `admin.spellkave.com` (ADR-0110). **No**
  SpacetimeDB SDK, module bindings, or reducer calls (`just
  check-website-no-stdb`). Do not add a Worker token-exchange.
  The catalog feed (`index.json` from `VITE_SPELLKAVE_PUBLIC_SITE_URL`, mirrored
  in `src/lib/public-site.ts`; unset ⇒ `public/demo-data` sample with a banner)
  is on its way out with `sk-sh3p`.
- **A public entrance, never a private hub** (`sk-jay0.5.1.11.4`). Signed-out
  visitors get the static, explicitly labelled curated example in
  `CuratedWorldPreview.svelte` plus the connection guide; do not fetch or
  expose catalog or transcript data before authentication. A signed-in visitor
  is **handed off**, not served a dashboard — do not reintroduce a seat board,
  a token minter, a transcript panel or an admin panel here.
  The page must never carry login cards, passwords, or OAuth client secrets
  (sk-c12f). Database names are not secrets. Player connection steps live in
  the **signed-out** `#connect` section (`src/lib/connect.ts` +
  `ConnectGuide.svelte`) — public MCP documentation a stranger may read.
- **Do not revive `archive/apps/*` or `archive/packages/spellkave-web`.**
  Prefer `@spellkave/ui` for shared primitive controls used by website, maps,
  or future apps; only keep a control local when it is genuinely website-only.
  Map rendering lives on `maps.spellkave.com` (`apps/maps`); do not re-add
  `MapPanel` / `@spellkave/map-view` here (archived under
  `archive/apps/website-map-panel` + `archive/packages/spellkave-map-view`).
- **No playable-world claims** in copy unless that is true at publish time.
- **English** in files.
- **AuthKit is client-only PKCE.** Public client, no secret, tokens in
  `sessionStorage`. Do not add a Worker token-exchange route unless WorkOS
  drops `token_endpoint_auth_methods_supported: none`.

## Verification

```
just check-website-no-stdb
just website-build
pnpm --filter @spellkave/website run test
pnpm --filter @spellkave/website run typecheck
```
