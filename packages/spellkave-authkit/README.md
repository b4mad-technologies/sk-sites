# `@spellkave/authkit`

Shared WorkOS AuthKit public-SPA client (authorization code + PKCE S256).

Browser apps pass their own callback path and keep route constants local.
Play-only pending-world helpers stay in `apps/play`.

Every sign-in goes through the Spellkave login site (ADR-0161 D-1/D-2):
AuthKit sends each authorization to `login.spellkave.com`, which asks
"Continue as …" while its own session lives and shows the sign-in form
otherwise. There is no `prompt=none` silent login (D-9). An app without a
stored session shows its sign-in button; `startLogin` starts the PKCE flow.

Every app signs out through `endAuthSession(storage, config, returnTo)`. It
clears the tab and posts a plain form to `{loginOrigin}/logout` carrying
`return_to` and the stored access token, even an expired one, so the login
site knows the person without its cookie. `loginOrigin` comes from the build
variable `VITE_SPELLKAVE_LOGIN_ORIGIN` and has no default: a build aimed at
the wrong login site would revoke another environment's grants. Every app
adds `requireLoginOrigin()` from `@spellkave/authkit/vite` to its Vite
plugins, so any build except a `development` one fails without the variable,
and any build or dev server fails on an invalid value (https only; plain http
only on loopback). CI passes the repository variable of the same name. A dev
server without it signs out only the tab (`endAuthSession` returns false). The login site revokes every app
grant of the person on every device, ends the login session, writes the
`logout_after` cutoff and clears the `sk_signed_in` marker (contract:
`packages/spellkave-api/src/login/routes.ts`, `POST /logout`). It returns
only to an https page on the marker domain; any other `return_to` ends on
its "You are signed out" page. Do not call `clearSession` from a sign-out
control: it signs out only this tab.

`startSessionRenewal` follows that marker (`signed-in-marker.ts`). On a
visible-tab transition and every `MARKER_CHECK_INTERVAL_MS` (10 s) it reads
`document.cookie`. A tab that held a session while the marker was present
records that in sessionStorage; once the marker is gone, the owner clears the
stored session and reports `signed-out`, and the app closes its world
connection. A tab that never saw the marker (a loopback dev origin, where the
login site sets none) is not signed out by its absence. The marker is UX
only; the server-side `iat` cutoff and the 300 s token lifetime are the
boundary. `src/session-renewal.test.ts` covers the interval, the visibility
recheck, the loopback case and a reload after sign-out.

`readSession` returns only an unexpired access session. When an access token
expires, a stored refresh token is retained for `refreshSession`; this does not
authorize requests using the expired access token. Explicit `clearSession`
still removes the complete session.

`refreshSession` coalesces concurrent calls for the same Storage instance and
issuer/client/resource in this JavaScript realm. Successful rotation preserves
the prior ID token when no replacement is supplied. An intervening sign-out or
login prevents a late response from writing or deleting the new stored state.
OAuth `invalid_grant` and Connect `invalid_refresh_token` responses clear the
rejected session; network and
temporary HTTP failures retain it for retry and expose a bounded error reason.
The exchange has a15s deadline including response-body consumption. Timeout
aborts the request and prevents a late response from writing session state.
Tests in `src/index.test.ts` cover these storage and race boundaries.

`startSessionRenewal` owns the browser lifecycle: it checks stored credentials
at startup, schedules renewal60 seconds before expiry, and rechecks on focus,
pageshow and visible-tab transitions. Temporary failures retry with a capped
exponential delay; wake events respect that delay. Expired access tokens are
never returned in its state, even while a retained refresh grant is retrying.
An expiry timer also withdraws an access token while renewal is still pending;
wake events recheck expiry even when they join that in-flight request.
The owner reports ready/refreshing/retrying/signed-out and publishes the existing
auth-change event when the usable token changes. `stop()` removes its timers
and listeners. Fake-clock tests in `src/session-renewal.test.ts` cover expiry,
sleep, transient failure, rejection, logout and disposal.

Install one lifecycle owner per browser app, await its `ready` promise before
falling back to interactive sign-in, and use `onChange` to update consumers.
Website and Maps install that owner in their AuthBar; their app roots consume
the existing auth-change event. Component tests exercise recovery from expired
stored credentials. Play installs its owner in App, recovers credentials before
world bootstrap and passes renewed credentials to asset/API consumers. A world
action already in progress finishes before a healthy token rotation replaces
its connection; same-identity rotation preserves the mounted mosaic during
reconnection. `apps/play/src/App.auth.test.ts` covers those boundaries.
Account and Operator recover before their API gate, recheck access after token
rotation, and ignore a stale access-check response from the old token. Chat
retains its agent while the MCP transport obtains the current token for each
request. Those app gate tests and Chat's real-SDK transport test cover startup
recovery and credential propagation without dispatching real gameplay.

Where Web Locks are available, the lifecycle claims an origin-scoped lock
before using a renewable session. Its opaque grant identifier survives token
rotation. Same-document consumers share the lock; a copied tab that cannot
claim it clears only its copied session and uses the app's existing login
flow. No access or refresh token is broadcast to other tabs. Logout, disposal
and document destruction release ownership. A pending claim cannot erase an
intervening login. `src/grant-lease.test.ts` covers these ownership boundaries.
Browsers without Web Locks retain per-Storage renewal and terminal-rejection
handling, but cannot prevent copied-grant reuse. Failure of an available lock
API retries without exchanging credentials. Headed copied-tab and hosted
expiry evidence remain required by sk-7fxc and sk-jay0.1.8.34.10.

The fresh sim3 Connect probe sk-0m4.158 measured a3600s access lifetime,
rotation, replay success at9.688s with the same rotated refresh token, and
HTTP400 `invalid_refresh_token` at122.793s. The current access token and
rotated refresh token still worked afterward. This is provider-contract
evidence, not the required long-lived app acceptance. WorkOS's general
[session resilience guide](https://workos.com/docs/authkit/session-resilience)
describes a30s grace and `invalid_grant`; use the observed Connect code too.
The official authkit-js source reviewed at
[`d49d932`](https://github.com/workos/authkit-js/blob/d49d9322126c797a8ec261ba3281bd48f7e6dc5f/src/http-client.ts)
uses `/user_management/authenticate`, so adopting it directly would change
the endpoint/identity contract documented at the top of `src/index.ts`.
