import {
	AUTH_CHANGED_EVENT,
	MARKER_CHECK_INTERVAL_MS,
	PKCE_STORAGE_KEY,
	SESSION_STORAGE_KEY,
} from "@spellkave/authkit";
import { PRODUCT_APP_URLS } from "@spellkave/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";
import { type AccountApi, AccountApiError, type AccountGetResponse } from "./lib/account-api";

function signIn(): void {
	window.sessionStorage.setItem(
		SESSION_STORAGE_KEY,
		JSON.stringify({
			access_token: "test-token",
			id_token: "",
			expires_at: Date.now() + 60_000,
			display_name: "Test Player",
		}),
	);
}

function apiWith(overrides: Partial<AccountApi> = {}): (token: string) => AccountApi {
	return () =>
		({
			getAccount: vi.fn(async () => ({
				sub: "user_a",
				capabilities: [],
				worlds: [
					{
						slug: "demo1",
						display_name: "Demo Vale",
						role: "owner",
						capabilities: ["world.play"],
					},
				],
				seat: { slug: "demo1", actor_id: "7", role: "primary" },
			})),
			listTokens: vi.fn(async () => []),
			createToken: vi.fn(),
			revokeToken: vi.fn(),
			getSeats: vi.fn(async () => [{ actor_id: "7", name: "Renn", claimed: true, mine: true }]),
			listConnectors: vi.fn(async () => []),
			disconnectConnectors: vi.fn(async () => {}),
			getAuthorCycles: vi.fn(async () => ({
				slug: "demo1",
				window: "6h",
				dropped_missing_world_slug: 0,
				seats: [],
			})),
			getAuthorToolCalls: vi.fn(async () => ({
				slug: "demo1",
				window: "6h",
				dropped_missing_world_slug: 0,
				tools: [],
			})),
			getAuthorEvents: vi.fn(async () => ({
				slug: "demo1",
				window: "6h",
				dropped_missing_world_slug: 0,
				events: [],
			})),
			...overrides,
		}) as unknown as AccountApi;
}

afterEach(async () => {
	// Drain pending storage writes (PKCE after a sign-in click) while
	// document still exists, THEN clear — so no late write survives into the
	// next test. The bits-ui scroll-lock timer is gone from jsdom suites entirely:
	// sk-jay0.7.144 defaults the lock off under jsdom at the Dialog wrapper.
	await new Promise((resolve) => setTimeout(resolve, 50));
	window.sessionStorage.clear();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("account page gate", () => {
	it("ignores a stale unauthorized account response after token replacement", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		let rejectOld!: (error: Error) => void;
		const base = apiWith()("test-token");
		const getAccount = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise((_resolve, reject) => {
						rejectOld = reject;
					}),
			)
			.mockImplementation(() => base.getAccount());
		render(App, { createApi: apiWith({ getAccount }) });
		await waitFor(() => expect(getAccount).toHaveBeenCalledTimes(1));
		const stored = JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}");
		window.sessionStorage.setItem(
			SESSION_STORAGE_KEY,
			JSON.stringify({ ...stored, access_token: "replacement" }),
		);
		window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
		await waitFor(() => expect(getAccount).toHaveBeenCalledTimes(2));
		rejectOld(new AccountApiError("unauthorized", 401, "expired"));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(
			JSON.parse(window.sessionStorage.getItem(SESSION_STORAGE_KEY) ?? "{}").access_token,
		).toBe("replacement");
	});
	it("renews an expired stored session before loading the account", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		window.sessionStorage.setItem(
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
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ access_token: "renewed", expires_in: 3600 })),
			);
		vi.stubGlobal("fetch", fetch);
		const createApi = vi.fn(apiWith());
		render(App, { createApi });
		await waitFor(() => expect(createApi).toHaveBeenCalledWith("renewed"));
		expect(createApi.mock.calls.every(([token]) => token !== "expired")).toBe(true);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
	it("shows Play · Chat · Account · Admin · Maps with Account current", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		render(App, { createApi: apiWith() });
		const nav = await screen.findByRole("navigation", { name: "Spellkave product navigation" });
		const links = Array.from(nav.querySelectorAll("a"));
		expect(links.map((link) => link.textContent?.replaceAll("◆", "").trim())).toEqual([
			"Play",
			"Chat",
			"Account",
			"Admin",
			"Maps",
		]);
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			PRODUCT_APP_URLS.play,
			PRODUCT_APP_URLS.chat,
			PRODUCT_APP_URLS.account,
			PRODUCT_APP_URLS.admin,
			PRODUCT_APP_URLS.maps,
		]);
		expect(links[2]?.getAttribute("aria-current")).toBe("page");
		for (const [index, link] of links.entries()) {
			if (index !== 2) expect(link.getAttribute("aria-current")).toBeNull();
		}
	});

	it("points Public site at spellkave.com and ignores the R2 data-feed URL", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		vi.stubEnv(
			"VITE_SPELLKAVE_PUBLIC_SITE_URL",
			"https://pub-ea8569d32ce14599a073902fa19300fb.r2.dev",
		);
		render(App, { createApi: apiWith() });
		const site = await screen.findByRole("link", { name: /public site/i });
		expect(site.getAttribute("href")).toBe("https://spellkave.com");
	});

	it("offers sign-in when nobody is signed in", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		render(App, { createApi: apiWith() });
		expect(await screen.findByRole("button", { name: /sign in/i })).toBeTruthy();
	});

	it("says so plainly when the build has no WorkOS configuration", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "");
		vi.stubEnv("VITE_WORKOS_ISSUER", "");
		render(App, { createApi: apiWith() });
		expect(await screen.findByText(/not configured/i)).toBeTruthy();
		expect(screen.queryByRole("button", { name: /sign in/i })).toBeNull();
	});

	it("shows the three page blocks to a signed-in person", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		render(App, { createApi: apiWith() });
		expect(await screen.findByTestId("who-i-am")).toBeTruthy();
		expect(await screen.findByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		expect(screen.getByTestId("token-board")).toBeTruthy();
		expect(screen.getByTestId("how-to-use")).toBeTruthy();
		expect(screen.getByText("Test Player")).toBeTruthy();
	});

	it("shows the sign-in button on an unsigned load without any silent redirect", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		render(App, { createApi: apiWith() });
		expect(await screen.findByRole("button", { name: /sign in/i })).toBeTruthy();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(window.sessionStorage.getItem(PKCE_STORAGE_KEY)).toBeNull();
	});

	it("lists held heroes with a Play link per hero", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		render(App, {
			createApi: apiWith({
				getSeats: vi.fn(async () => [
					{ actor_id: "7", name: "Renn", claimed: true, mine: true },
					{ actor_id: "9", name: "Isk", claimed: true, mine: true },
					{ actor_id: "11", name: "Free", claimed: false, mine: false },
				]),
			}),
		});
		const board = await screen.findByTestId("seat-board");
		expect(board.textContent).toContain("Renn");
		expect(board.textContent).toContain("Isk");
		expect(board.textContent).not.toContain("Free");
		expect(screen.getByRole("button", { name: "Play Isk in Demo Vale" })).toBeTruthy();
	});

	it("disconnects all connected apps from the account page", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		const disconnectConnectors = vi.fn(async () => {});
		const listConnectors = vi
			.fn()
			.mockResolvedValueOnce([{ client_id: "client_claude", name: "Claude" }])
			.mockResolvedValue([]);
		render(App, { createApi: apiWith({ listConnectors, disconnectConnectors }) });
		await fireEvent.click(await screen.findByRole("button", { name: "Disconnect all connectors" }));
		expect(disconnectConnectors).not.toHaveBeenCalled();
		await fireEvent.click(await screen.findByRole("button", { name: "Disconnect all" }));
		await waitFor(() => expect(disconnectConnectors).toHaveBeenCalledWith(undefined));
		expect(await screen.findByText("No connected apps.")).toBeTruthy();
	});

	// No live connection to tear down: this app opens no SpacetimeDB or MCP connection
	// (HTTP only), so signed-out means the sign-in UI shows and session storage is cleared.
	it("signs out when the login site's marker disappears (another tab signed out)", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		document.cookie = "sk_signed_in=1; path=/";
		signIn();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		try {
			render(App, { createApi: apiWith() });
			expect(await screen.findByTestId("who-i-am")).toBeTruthy();
			document.cookie = "sk_signed_in=; path=/; max-age=0";
			await vi.advanceTimersByTimeAsync(MARKER_CHECK_INTERVAL_MS);
			expect(await screen.findByRole("button", { name: /sign in/i })).toBeTruthy();
			expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
		} finally {
			vi.useRealTimers();
			document.cookie = "sk_signed_in=; path=/; max-age=0";
		}
	});

	it("shows world observability panels for an owned world", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		render(App, { createApi: apiWith() });
		expect(await screen.findByTestId("author-observability")).toBeTruthy();
		expect(await screen.findByText(/World observability/i)).toBeTruthy();
	});

	it("signs out through the login site's POST /logout with the app token", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		vi.stubEnv("VITE_SPELLKAVE_LOGIN_ORIGIN", "https://login.example");
		signIn();
		const submitted: HTMLFormElement[] = [];
		const submit = vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function (
			this: HTMLFormElement,
		) {
			submitted.push(this);
		});
		try {
			render(App, { createApi: apiWith() });
			expect(await screen.findByTestId("who-i-am")).toBeTruthy();
			screen.getByRole("button", { name: /sign out/i }).click();
			await waitFor(() => expect(submitted).toHaveLength(1));
			const form = submitted[0] as HTMLFormElement;
			expect(form.method).toBe("post");
			expect(form.action).toBe("https://login.example/logout");
			const fields = new FormData(form);
			expect(fields.get("token")).toBe("test-token");
			expect(fields.get("return_to")).toBe(`${window.location.origin}/`);
			expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
		} finally {
			submit.mockRestore();
		}
	});

	it("keeps Who I am mounted while the account refetches after a release", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		const seated = {
			sub: "user_a",
			capabilities: [] as string[],
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo Vale",
					role: "owner" as const,
					capabilities: ["world.play"],
				},
			],
			seat: { slug: "demo1", actor_id: "7", role: "primary" },
		};
		let finishReload: (value: AccountGetResponse) => void = () => {};
		const getAccount = vi
			.fn()
			.mockResolvedValueOnce(seated)
			.mockImplementationOnce(
				() =>
					new Promise<AccountGetResponse>((resolve) => {
						finishReload = resolve;
					}),
			);
		const releaseSeat = vi.fn(async () => undefined);
		render(App, { createApi: apiWith({ getAccount, releaseSeat }) });
		expect(await screen.findByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		await fireEvent.click(screen.getByTestId("release-hero-submit"));
		await waitFor(() => expect(releaseSeat).toHaveBeenCalledWith("demo1"));
		await waitFor(() => expect(getAccount).toHaveBeenCalledTimes(2));
		expect(screen.getByTestId("who-i-am")).toBeTruthy();
		expect(screen.getByTestId("who-i-am").getAttribute("aria-busy")).toBe("true");
		expect(screen.queryByText(/Loading your account/)).toBeNull();
		expect(screen.getByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		finishReload({ ...seated, seat: null });
		await waitFor(() =>
			expect(screen.getByText(/You are not currently playing a hero/)).toBeTruthy(),
		);
		expect(screen.queryByText(/Loading your account/)).toBeNull();
		expect(screen.getByTestId("who-i-am").getAttribute("aria-busy")).toBe("false");
	});

	it("releases the held hero after confirm and reloads the account", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		const seated = {
			sub: "user_a",
			capabilities: [] as string[],
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo Vale",
					role: "owner" as const,
					capabilities: ["world.play"],
				},
			],
			seat: { slug: "demo1", actor_id: "7", role: "primary" },
		};
		const getAccount = vi
			.fn()
			.mockResolvedValueOnce(seated)
			.mockResolvedValue({ ...seated, seat: null });
		const releaseSeat = vi.fn(async () => undefined);
		render(App, { createApi: apiWith({ getAccount, releaseSeat }) });
		expect(await screen.findByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		expect(screen.getByRole("heading", { name: "Release Renn?" })).toBeTruthy();
		expect(screen.getByText(/You give up Renn in Demo Vale/)).toBeTruthy();
		await fireEvent.click(screen.getByTestId("release-hero-submit"));
		await waitFor(() => expect(releaseSeat).toHaveBeenCalledWith("demo1"));
		await waitFor(() =>
			expect(screen.getByText(/You are not currently playing a hero/)).toBeTruthy(),
		);
		const playLinks = screen.getAllByRole("link", { name: /^Play$/i });
		expect(playLinks.some((link) => link.closest("nav") !== null)).toBe(true);
		expect(playLinks.some((link) => link.getAttribute("data-slot") === "button")).toBe(true);
	});

	it("keeps the hero when the player cancels release", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		const releaseSeat = vi.fn(async () => undefined);
		render(App, { createApi: apiWith({ releaseSeat }) });
		expect(await screen.findByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		await fireEvent.click(screen.getByRole("button", { name: /Keep playing/i }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(releaseSeat).not.toHaveBeenCalled();
		expect(screen.getByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
	});

	it("keeps the dialog open when release fails so the player can retry", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		const releaseSeat = vi.fn(async () => {
			throw new AccountApiError("forbidden", 403, "You do not have access.");
		});
		render(App, { createApi: apiWith({ releaseSeat }) });
		expect(await screen.findByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		await fireEvent.click(screen.getByTestId("release-hero-submit"));
		await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
		expect(screen.getByRole("alert").textContent).toMatch(/You do not have access/);
		expect(screen.getByRole("dialog")).toBeTruthy();
		expect(screen.getByText(/Currently playing Renn in Demo Vale/)).toBeTruthy();
	});

	it("drops an expired session and asks for a fresh sign-in", async () => {
		vi.stubEnv("VITE_WORKOS_CLIENT_ID", "client_test");
		vi.stubEnv("VITE_WORKOS_ISSUER", "https://tenant.authkit.app");
		signIn();
		render(App, {
			createApi: apiWith({
				getAccount: vi.fn(async () => {
					throw new AccountApiError("unauthorized", 401, "expired");
				}),
			}),
		});
		expect(await screen.findByRole("button", { name: /sign in/i })).toBeTruthy();
		await waitFor(() => {
			expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
		});
	});
});
