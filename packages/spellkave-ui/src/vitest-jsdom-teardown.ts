/**
 * jsdom jar reset for suites that mount `@spellkave/ui`.
 *
 * Scroll locks are no longer this file's job: our Dialog wrapper defaults
 * bits-ui's body-scroll-lock OFF under jsdom (no layout engine — the lock
 * means nothing there, and its 24ms destroy-timer used to fire after Vitest
 * tore jsdom down, failing green suites with an unhandled
 * `document is not defined`: sk-jay0.7.144). If a suite ever needs a lock
 * again, keep it off in tests rather than re-adding a wait here.
 *
 * What remains: one macrotask drain so silent SSO/PKCE storage writes land
 * while jsdom still lives, then a clean jar for the next test
 * (Chat/Operator smoke: the verifier must stay null).
 */
import { afterEach } from "vitest";

const LATE_WRITE_DRAIN_MS = 50;

afterEach(async () => {
	if (typeof document === "undefined") return;
	await new Promise((resolve) => setTimeout(resolve, LATE_WRITE_DRAIN_MS));
	// Node 25 ships its own global `localStorage`, which shadows jsdom's and
	// is an object without methods unless `--localstorage-file` is given.
	// The repo pins Node 24 (`.node-version`); on a newer local Node this
	// teardown must not fail every test of every suite that imports it.
	if (typeof sessionStorage?.clear === "function") sessionStorage.clear();
	if (typeof localStorage?.clear === "function") localStorage.clear();
});
