import { MARKER_SEEN_STORAGE_KEY, PKCE_STORAGE_KEY, SESSION_STORAGE_KEY } from "@spellkave/authkit";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, expect, it, vi } from "vitest";
import AuthBar from "./AuthBar.svelte";

afterEach(() => {
	cleanup();
	sessionStorage.clear();
	document.cookie = "sk_signed_in=; max-age=0";
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it("recovers an expired session through shared renewal and updates the auth bar", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WORKOS_CLIENT_ID", "test-client");
	vi.stubEnv("VITE_WORKOS_ISSUER", "https://issuer.example");
	sessionStorage.setItem(
		SESSION_STORAGE_KEY,
		JSON.stringify({
			access_token: "expired",
			refresh_token: "refresh",
			id_token: "",
			display_name: "Ada",
			expires_at: 1,
		}),
	);
	const fetch = vi
		.fn<typeof globalThis.fetch>()
		.mockResolvedValue(new Response(JSON.stringify({ access_token: "renewed", expires_in: 3600 })));
	vi.stubGlobal("fetch", fetch);
	render(AuthBar);
	await waitFor(() => expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy());
	expect(fetch).toHaveBeenCalledTimes(1);
	expect(String(fetch.mock.calls[0]?.[0])).toBe("https://issuer.example/oauth2/token");
	expect(
		new URLSearchParams(fetch.mock.calls[0]?.[1]?.body as URLSearchParams).get("grant_type"),
	).toBe("refresh_token");
	expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}").access_token).toBe(
		"renewed",
	);
});

function storeSession(): void {
	sessionStorage.setItem(
		SESSION_STORAGE_KEY,
		JSON.stringify({
			access_token: "test-token",
			id_token: "",
			display_name: "Ada",
			expires_at: Date.now() + 60_000,
		}),
	);
}

it("shows Log in without navigating when nobody is signed in", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WORKOS_CLIENT_ID", "test-client");
	vi.stubEnv("VITE_WORKOS_ISSUER", "https://issuer.example");
	render(AuthBar);
	expect(await screen.findByRole("button", { name: "Log in" })).toBeTruthy();
	expect(sessionStorage.getItem(PKCE_STORAGE_KEY)).toBeNull();
});

it("logs out by POSTing a form to the login site", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WORKOS_CLIENT_ID", "test-client");
	vi.stubEnv("VITE_WORKOS_ISSUER", "https://issuer.example");
	vi.stubEnv("VITE_SPELLKAVE_LOGIN_ORIGIN", "http://127.0.0.1:18081");
	storeSession();
	let form: HTMLFormElement | undefined;
	vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (
		this: HTMLFormElement,
	) {
		form = this;
	});
	render(AuthBar);
	(await screen.findByRole("button", { name: "Log out" })).click();
	await waitFor(() => expect(form).toBeDefined());
	expect(form?.method.toLowerCase()).toBe("post");
	expect(form?.action).toBe("http://127.0.0.1:18081/logout");
	const fields = Object.fromEntries(
		Array.from(form?.querySelectorAll("input") ?? []).map((i) => [i.name, i.value]),
	);
	expect(fields).toEqual({ return_to: `${window.location.origin}/`, token: "test-token" });
	expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
	expect(await screen.findByRole("button", { name: "Log in" })).toBeTruthy();
});

// No live connection to tear down: this app opens no SpacetimeDB or MCP connection
// (HTTP only), so signed-out means the sign-in UI shows and session storage is cleared.
it("drops the session when the sign-in marker disappears", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WORKOS_CLIENT_ID", "test-client");
	vi.stubEnv("VITE_WORKOS_ISSUER", "https://issuer.example");
	document.cookie = "sk_signed_in=1";
	storeSession();
	render(AuthBar);
	await screen.findByRole("button", { name: "Log out" });
	await waitFor(() => expect(sessionStorage.getItem(MARKER_SEEN_STORAGE_KEY)).toBe("1"));
	document.cookie = "sk_signed_in=; max-age=0";
	window.dispatchEvent(new Event("focus"));
	expect(await screen.findByRole("button", { name: "Log in" })).toBeTruthy();
	expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
});
