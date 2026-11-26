# Spellkave public site

Static Svelte + Vite app built on the shared `@spellkave/ui` design system and
Bits UI primitives; no observer/runtime package.

The live hostname is the Spellkave Worker `spellkave` (custom domains
`spellkave.com` / `www`). This package owns the HTML. The Worker, its domains
and the DNS zone are managed by the Spellkave infrastructure code, which is
not part of this repository. Do not add custom-domain routes here — two
writers on one Worker is a bug.

## Data

After sign-in, the **Choose how you enter** section (`#connect`) is the
player-facing MCP guide:
one URL `https://mcp.spellkave.com/mcp`, Claude.ai / Claude Code / Codex /
ChatGPT (honest about Developer Mode), and 401 troubleshooting. It does not
publish login cards or OAuth secrets.

The signed-out page does not expose world data. It uses one explicitly labelled,
static example to explain how a place, its inhabitants, and its chronicle fit
together. After sign-in, the current world section lists catalog worlds and a
near-live tool transcript per world. The feed is `index.json` plus
`worlds/<slug>/agent-run-events.jsonl` on the Spellkave-owned R2 bucket
`spellkave-public-site` (r2.dev public URL, no custom domain). It does
**not** publish login cards or OAuth secrets. Signed-in
worlds may include `db` (SpacetimeDB database name on the shared play host).
Set `VITE_SPELLKAVE_PUBLIC_SITE_URL` at build time (CI: repo variable
`SPELLKAVE_PUBLIC_SITE_URL`). Unset ⇒ `public/demo-data` sample with a banner
after sign-in.
The operator guide for the demo worlds is not part of this repository.

## Account API (one call, then hand off)

This site is a **public entrance**, not a room. After login the browser makes a
single Account API call — `GET /v1/account` — and uses the answer to decide
where the visitor belongs (`src/lib/account-destination.ts`):

| Capability | Destination |
| --- | --- |
| `system.manage` | `https://admin.spellkave.com/` |
| a world it can play or oversee | `https://play.spellkave.com/?world=<slug>` |
| anything else | `https://play.spellkave.com/` |

It does **not** open a SpacetimeDB WebSocket or call reducers (ADR-0107 D-1),
and since 2026-08-27 it no longer renders a private hub of its own: seats are
claimed in Play, API keys are minted on `account.spellkave.com`, and the
operator catalog lives on `admin.spellkave.com` (ADR-0110). Those surfaces own
the seat, token and admin routes; this app only reads `/v1/account`.

Base URL: `VITE_SPELLKAVE_API_URL` (CI / deploy: repo variable
`SPELLKAVE_API_URL`). Default `https://api.spellkave.com`; when unset in dev
the client falls back to the mcp alias `https://mcp.spellkave.com` so local
builds work before the api hostname is live. The WorkOS JWT already held in
`sessionStorage` is the bearer token.

CI enforces the no-drift rule: `just check-website-no-stdb`
(`the website-no-stdb skgate registry gate (just check-website-no-stdb)`).

## Login

WorkOS AuthKit is a **public** SPA client on the **AuthKit-domain Connect
app** (`{VITE_WORKOS_ISSUER}/oauth2/authorize` + `/oauth2/token`, PKCE S256,
`token_endpoint_auth_method=none`). Same issuer as MCP clients, so
`Identity = BLAKE3(iss|sub)` matches a seat claimed in the browser when the
player later connects Claude.ai (ADR-0102 D-2). User Management
(`api.workos.com/user_management`, `iss=…/user_management/<client_id>`) is
the wrong path for this SPA: those tokens hash to a different world identity
and cannot see the claimed seat.

No Worker token route and no API key in the site. Tokens stay in
`sessionStorage`. Set `VITE_WORKOS_CLIENT_ID` and `VITE_WORKOS_ISSUER` (CI /
production deploy: GitHub repo variables of the same names; see
`.env.example`). An unset issuer or client id keeps the public sign-in path
visible but ends it with an honest availability error (fail closed) — there is
no built-in default tenant. Staging vs production AuthKit issuers are
different `BLAKE3(iss|sub)` identity domains; switching orphans durable seat
claims (docs/mcp.md §"Production issuer cutover",
`just player-mcp-issuer-plan <new-issuer>`). After merge, point
`VITE_WORKOS_CLIENT_ID` at the first-party Connect app (not the User
Management client). Redirects: `/auth/callback` on localhost, spellkave.com,
and www. `/auth/login` is the initiate-login URL.

## Shared reference matching

The documentation build emits a public, credential-free vocabulary consumed by
Play. Matching is shared with Markdown and HTML adapters in `@spellkave/ui-widgets`;
see [the vocabulary contract and release order](docs/reference-vocabulary.md).

## Local

```bash
just website-dev          # Vite at http://127.0.0.1:5173
just website-build        # typecheck + Vite production build
just website-preview      # wrangler dev against dist/
```

## Deploy

A merge to `main` that touches `apps/website/**` builds `dist/` and
`wrangler deploy`s it onto the existing Worker. Repository secrets:
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Wrangler owns the Worker assets; the `spellkave.com` and `www.spellkave.com`
custom-domain bindings are owned by the `spellkave-cloudflare` Pulumi stack.
The ownership map, credential permissions and token rotation procedure live
with that stack, outside this repository.

Manual: `just website-deploy` (same Worker name, no DNS changes).
