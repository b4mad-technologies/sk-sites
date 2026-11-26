# `apps/account/` — agent context

Signed-in person's page for `account.spellkave.com`. Identity, API keys, and
the canonical MCP connect lines. Not a world directory, not an admin surface.

## Binding invariants

- **Login comes from `@spellkave/authkit`.** Do not add a local `authkit.ts`.
  App-owned route constants live in `src/lib/auth-routes.ts`. Sign-out posts
  to the login site (`endAuthSession`, ADR-0161 D-7); there is no silent
  login on load.
- **Heroes and connected apps (ADR-0161 D-6/D-7).** "Your heroes" lists every
  seat the person holds (`mine` rows of each world's seat board) and opens
  Play as one of them; "Connected apps" disconnects Claude, Codex and other
  connectors, which sign-out leaves working.
- **The Worker is a transport, never a principal (ADR-0110 D-2).** It forwards
  the caller's `Authorization` header unchanged and holds no credential.
- **Proxied paths are an explicit allowlist**, not a prefix catch-all:
  `GET /v1/account`, `GET|POST /v1/account/tokens`,
  `DELETE /v1/account/tokens/{id}`, `GET /v1/account/connectors`,
  `POST /v1/account/connectors/disconnect`, the seat board and release, and
  the author observability reads (`PROXY_ROUTES` in `src/worker.ts` is the
  list). Nothing under `/v1/admin/`. An unproxied
  `/v1/...` path must 404 rather than fall through to the SPA shell.
- **Same-origin only.** This hostname is not in
  `SPELLKAVE_MCP_ALLOWED_ORIGIN_HOSTNAMES`. Do not point the browser at
  `api.spellkave.com` in production.
- Tokens stay in `sessionStorage`. Never print a key, token, or bearer value.

## Verification

```bash
pnpm --filter @spellkave/account run typecheck
pnpm --filter @spellkave/account run test
pnpm --filter @spellkave/account run build
```
