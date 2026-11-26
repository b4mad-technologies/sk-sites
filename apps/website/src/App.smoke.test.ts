import { SESSION_STORAGE_KEY } from "@spellkave/authkit";
import { PRODUCT_APP_URLS } from "@spellkave/ui";
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";
import type { AccountGetResponse } from "./lib/account-api";
import {
	DEFAULT_ACCOUNT_APP_URL,
	DEFAULT_OPERATOR_APP_URL,
	DEFAULT_PLAY_APP_URL,
} from "./lib/account-destination";
import { ATTRIBUTION_PATH, SRD_5_2_1_CREDIT } from "./lib/attribution";
import { IMPRESSUM_PATH, IMPRESSUM_TELEPHONE } from "./lib/impressum";

const hubAccount: AccountGetResponse = {
	sub: "user_a",
	capabilities: [],
	worlds: [
		{
			slug: "demo1",
			display_name: "Demo 1",
			role: "owner",
			capabilities: ["world.observe", "world.manage"],
		},
	],
	seat: null,
};

const playAccount: AccountGetResponse = {
	sub: "user_a",
	capabilities: [],
	seat: { slug: "claimed-world", actor_id: "hero_7", role: "primary" },
	worlds: [
		{
			slug: "claimed-world",
			display_name: "Claimed World",
			role: "member",
			capabilities: ["world.observe", "world.play"],
		},
	],
};

const projectedResource = {
	ref: "guide/focus",
	bundle_id: "guide",
	display_name: "Focus",
	description: "Attention available by default.",
	value_kind: "int",
	initial_value: 2,
	min_value: 0,
	max_value: 4,
	recovery_rule: "persistent",
	href: "/docs/other-rules/safety/resource/guide%2Ffocus",
	tags: ["guide.attention"],
	attachments: [],
};

const projectedCharisma = {
	...projectedResource,
	ref: "srd/cha",
	bundle_id: "srd",
	display_name: "Charisma",
	description: "Confidence, poise, and charm",
	href: "/docs/srd/playing-the-game/cha",
};

const projectedSubject = {
	kind: "entity" as const,
	ref: "other/mira",
	bundle_id: "other",
	display_name: "Mira",
	description: "A seeded person.",
	definition_ref: "other/commoner",
	href: "/docs/other-rules/safety/subject/entity/other%2Fmira",
	tags: [],
	attachments: [],
	facets: [{ label: "Instance record", rows: [{ entity_key: "other/mira" }] }],
};

const docsIndex = {
	version: 1,
	pages: [
		{
			page_id: "srd",
			title: "System Reference",
			intro: "",
			nav_group: "reference",
			href: "/docs/srd",
			attributions: [
				{
					body: SRD_5_2_1_CREDIT,
					source: { path: "NOTICE.md", anchor: "SRD", license: "CC-BY-4.0" },
					blocks: [{ kind: "html", html: `<p data-testid="srd-credit">${SRD_5_2_1_CREDIT}</p>` }],
				},
			],
			sections: [
				{
					id: "playing-the-game",
					title: "Playing the Game",
					intro: "",
					href: "/docs/srd/playing-the-game",
					pages: [
						{
							id: "abilities",
							title: "Abilities",
							body: '::resource{ref="srd/cha" view="compact"}',
							blocks: [{ kind: "resource", ref: "srd/cha", view: "compact" }],
							href: "/docs/srd/playing-the-game/abilities",
							artifact_href: "/compendium/docs/articles/srd/playing-the-game/abilities.json",
							resource_routes: [{ ref: "srd/cha", href: "/docs/srd/playing-the-game/cha" }],
							source: { path: "rules.md", anchor: "Abilities", license: "CC-BY-4.0" },
							resources: [projectedCharisma],
						},
					],
				},
				{
					id: "spells",
					title: "Spells",
					intro: "",
					href: "/docs/srd/spells",
					pages: [
						{
							id: "casting",
							title: "Casting Spells",
							body: "Casting body.",
							blocks: [{ kind: "html", html: "<p>Casting body.</p>" }],
							href: "/docs/srd/spells/casting",
							artifact_href: "/compendium/docs/articles/srd/spells/casting.json",
							source: { path: "spells.md", anchor: "Casting Spells", license: "CC-BY-4.0" },
						},
					],
				},
			],
		},
		{
			page_id: "other-rules",
			title: "Other Rules",
			intro: "An independently projected bundle.",
			nav_group: "adventure",
			href: "/docs/other-rules",
			sections: [
				{
					id: "safety",
					title: "Safety",
					intro: "No converter required.",
					href: "/docs/other-rules/safety",
					pages: [
						{
							id: "consent",
							title: "Consent",
							body: "Consent body.",
							blocks: [{ kind: "html", html: "<p>Consent body.</p>" }],
							resources: [projectedResource],
							subjects: [projectedSubject],
							href: "/docs/other-rules/safety/consent",
							artifact_href: "/compendium/docs/articles/other-rules/safety/consent.json",
							resource_routes: [{ ref: "guide/focus", href: projectedResource.href }],
							subject_routes: [{ kind: "entity", ref: "other/mira", href: projectedSubject.href }],
							source: { path: "rules.md", anchor: "Consent", license: "CC-BY-4.0" },
						},
					],
				},
			],
		},
		{
			page_id: "kavemouth",
			title: "Kavemouth",
			intro: "A manifest-backed adventure.",
			nav_group: "adventure",
			href: "/docs/adventures/kavemouth",
			sections: [
				{
					id: "adventure-subjects",
					title: "Adventure subjects",
					intro: "Manifest-backed subjects.",
					href: "/docs/adventures/kavemouth/adventure-subjects",
					pages: [
						{
							id: "installed-subjects",
							title: "Installed subjects",
							body: "Installed subject body.",
							blocks: [{ kind: "html", html: "<p>Installed subject body.</p>" }],
							href: "/docs/adventures/kavemouth/adventure-subjects/installed-subjects",
							artifact_href:
								"/compendium/docs/articles/kavemouth/adventure-subjects/installed-subjects.json",
							source: { path: "guide.md", anchor: "Installed subjects", license: "Proprietary" },
							resources: [],
							subjects: [
								{
									...projectedSubject,
									kind: "entity_definition" as const,
									ref: "srd/armor/shield",
									display_name: "Shield",
									href: "/docs/adventures/kavemouth/adventure-subjects/subject/entity_definition/srd%2Farmor%2Fshield",
								},
								{
									...projectedSubject,
									ref: "kavemouth/adventure/innkeeper_1",
									display_name: "Mira",
									href: "/docs/adventures/kavemouth/adventure-subjects/subject/entity/kavemouth%2Fadventure%2Finnkeeper_1",
								},
							],
							subject_routes: [
								{
									kind: "entity_definition",
									ref: "srd/armor/shield",
									href: "/docs/adventures/kavemouth/adventure-subjects/subject/entity_definition/srd%2Farmor%2Fshield",
								},
								{
									kind: "entity",
									ref: "kavemouth/adventure/innkeeper_1",
									href: "/docs/adventures/kavemouth/adventure-subjects/subject/entity/kavemouth%2Fadventure%2Finnkeeper_1",
								},
							],
						},
					],
				},
			],
		},
	],
};

function docsArticleResponse(url: string): Response | null {
	for (const page of docsIndex.pages) {
		for (const section of page.sections) {
			for (const article of section.pages ?? []) {
				if (url.endsWith(article.artifact_href)) return new Response(JSON.stringify(article));
			}
		}
	}
	return null;
}

function sampleFetch(account: AccountGetResponse = hubAccount): typeof fetch {
	return (async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.endsWith("/v1/account")) {
			return new Response(JSON.stringify(account), { status: 200 });
		}
		return new Response("", { status: 404 });
	}) as unknown as typeof fetch;
}

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

function stubLocationAssign(): ReturnType<typeof vi.fn> {
	const assign = vi.fn();
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { ...window.location, assign, hash: "" },
	});
	return assign;
}

function expectSignedInWaysOut(): void {
	const nav = screen.getByRole("navigation", { name: "Spellkave product navigation" });
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
	for (const link of links) {
		expect(link.getAttribute("aria-current")).toBeNull();
	}
}

function expectPrivateHubAbsent(): void {
	expect(screen.queryByRole("heading", { name: "Your place in the world" })).toBeNull();
	expect(screen.queryByRole("navigation", { name: "Playable worlds" })).toBeNull();
	expect(screen.queryByRole("heading", { name: "API tokens" })).toBeNull();
	expect(screen.queryByText(/Live transcript/)).toBeNull();
	expect(screen.queryByRole("navigation", { name: "Published worlds" })).toBeNull();
	expect(screen.queryByTestId("admin-panel")).toBeNull();
}

describe("website App (smoke)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		window.sessionStorage.clear();
		window.history.replaceState({}, "", "/");
	});

	it("shows the approved guest composition and two honest entry paths", () => {
		const fetchSpy = vi.fn(sampleFetch());
		vi.stubGlobal("fetch", fetchSpy);
		render(App);

		expect(
			screen.getByRole("heading", { level: 1, name: /world understands what you mean/i }),
		).toBeTruthy();
		expect(
			screen.getAllByRole<HTMLAnchorElement>("link", { name: /enter spellkave/i })[0]?.href,
		).toBe("http://localhost:3000/auth/login");
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: /watch a world/i }).hash).toBe(
			"#watch",
		);
		expect(screen.getByText("The kave where spells never end.")).toBeTruthy();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Attribution" }).pathname).toBe(
			ATTRIBUTION_PATH,
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Impressum" }).pathname).toBe(
			IMPRESSUM_PATH,
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Maps" }).href).toBe(
			"https://maps.spellkave.com/",
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Docs" }).pathname).toBe("/docs");
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Connect" }).hash).toBe("#connect");
		expect(screen.getByText("Connect an AI")).toBeTruthy();
		expectPrivateHubAbsent();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("opens the public attribution page without a session", () => {
		window.history.replaceState({}, "", ATTRIBUTION_PATH);
		const fetchSpy = vi.fn(sampleFetch());
		vi.stubGlobal("fetch", fetchSpy);
		render(App);

		expect(screen.getByRole("heading", { level: 1, name: "Attribution" })).toBeTruthy();
		expect(document.body.textContent).toContain(SRD_5_2_1_CREDIT);
		expect(screen.queryByRole("heading", { name: /world understands what you mean/i })).toBeNull();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("opens the public impressum page without a session", () => {
		window.history.replaceState({}, "", IMPRESSUM_PATH);
		const fetchSpy = vi.fn(sampleFetch());
		vi.stubGlobal("fetch", fetchSpy);
		render(App);

		expect(screen.getByRole("heading", { level: 1, name: "Impressum" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Angaben gemäß § 5 DDG" })).toBeTruthy();
		expect(screen.getByTestId("impressum-address").textContent).toContain("Britzweg 51");
		expect(screen.queryByRole("heading", { name: /world understands what you mean/i })).toBeNull();
		expect(document.body.textContent).not.toMatch(/USt-IdNr/i);
		expect(document.body.textContent).toMatch(/Telefon/);
		expect(document.body.textContent).toContain(IMPRESSUM_TELEPHONE);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it("opens /srd from the export without talking to SpacetimeDB or the account API", async () => {
		window.history.replaceState({}, "", "/docs/srd");
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/compendium/docs/index.json"))
				return new Response(JSON.stringify(docsIndex));
			const article = docsArticleResponse(url);
			if (article) return article;
			if (url.endsWith("/compendium/srd/search.json")) {
				return new Response(JSON.stringify([]));
			}
			return new Response("", { status: 404 });
		});
		vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "System Reference" })).toBeTruthy(),
		);
		expect(
			screen
				.getAllByRole<HTMLAnchorElement>("link", { name: "Spells" })
				.some((link) => link.pathname === "/docs/srd/spells"),
		).toBe(true);
		expect(document.body.textContent).toContain(SRD_5_2_1_CREDIT);
		expect(screen.queryByRole("heading", { name: /world understands what you mean/i })).toBeNull();
	});

	it("opens /docs as the public documentation overview", async () => {
		window.history.replaceState({}, "", "/docs");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				const article = docsArticleResponse(url);
				if (article) return article;
				if (url.endsWith("/compendium/adventures/kavemouth/index.json")) {
					return new Response(
						JSON.stringify({
							generated_at: "deterministic",
							entry_count: 1,
							corpus: "kavemouth",
							chapters: [{ id: "cast", name: "Cast", count: 1 }],
						}),
					);
				}
				if (url.endsWith("search.json") || url.endsWith("maps.json")) {
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				}
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Documentation" })).toBeTruthy(),
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: /System Reference/ }).pathname).toBe(
			"/docs/srd",
		);
		expect(screen.getByRole("navigation", { name: "Documentation" })).toBeTruthy();
	});

	it("updates the SPA route when documentation navigation is clicked", async () => {
		window.history.replaceState({}, "", "/docs/srd");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				if (url.endsWith("/compendium/adventures/kavemouth/index.json")) {
					return new Response(
						JSON.stringify({
							generated_at: "deterministic",
							entry_count: 0,
							corpus: "kavemouth",
							chapters: [],
						}),
					);
				}
				if (url.endsWith("search.json") || url.endsWith("maps.json"))
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "System Reference" })).toBeTruthy(),
		);
		const [documentationLink] = screen.getAllByRole("link", { name: "All documentation" });
		if (!documentationLink) throw new Error("documentation navigation is missing");
		await fireEvent.click(documentationLink);
		await waitFor(() => expect(window.location.pathname).toBe("/docs"));
		expect(screen.getByTestId("docs-overview")).toBeTruthy();
	});

	it("renders an arbitrary docs page and section without old converter requests", async () => {
		window.history.replaceState({}, "", "/docs/other-rules/safety");
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/compendium/docs/index.json"))
				return new Response(JSON.stringify(docsIndex));
			const article = docsArticleResponse(url);
			if (article) return article;
			if (url.endsWith("search.json") || url.endsWith("maps.json"))
				return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
			return new Response("", { status: 404 });
		});
		vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Safety" })).toBeTruthy(),
		);
		expect(screen.getByText("No converter required.")).toBeTruthy();
		expect(fetchSpy.mock.calls.map(([input]) => String(input))).not.toContain(
			"/compendium/srd/index.json",
		);
		expect(fetchSpy.mock.calls.map(([input]) => String(input))).not.toContain(
			"/compendium/srd/chapters/safety.json",
		);
	});

	it("renders a lazy section catalogue whose description contains colon-prefixed source references", async () => {
		window.history.replaceState({}, "", "/docs/srd/playing-the-game");
		const index = structuredClone(docsIndex);
		const section = index.pages[0]?.sections[0];
		if (!section || section.id !== "playing-the-game") {
			throw new Error("fixture is missing the playing-the-game section");
		}
		// The section overview shows its catalogue only when it has no articles
		// of its own to lead with — this test is about the lazily fetched
		// catalogue, so the fixture's single article goes.
		Object.assign(section, {
			catalogue_href: "/compendium/docs/catalogues/srd/playing-the-game.json",
			pages: [],
		});
		const catalogueEntry = {
			kind: "resource_definition",
			ref: "srd/xp",
			family: "abilities",
			slug: "xp",
			display_name: "Experience Points",
			description:
				'SRD: "XP is awarded for defeating the monster." (monsters.md:203-209 (§ Challenge Rating > Experience Points)) Gates the srd/advancement/level-up action.',
			href: "/docs/srd/playing-the-game/xp",
			artifact_href: "/compendium/docs/catalogue/srd/playing-the-game/xp.json",
			facts: [],
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json")) return new Response(JSON.stringify(index));
				if (url.endsWith("/compendium/docs/catalogues/srd/playing-the-game.json"))
					return new Response(JSON.stringify([catalogueEntry]));
				if (url.endsWith("search.json")) return new Response(JSON.stringify([]));
				if (url.endsWith("maps.json")) return new Response(JSON.stringify({}));
				return new Response("", { status: 404 });
			}),
		);
		render(App);

		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Playing the Game" })).toBeTruthy(),
		);
		expect(
			screen.getByRole<HTMLAnchorElement>("link", { name: "Experience Points" }).pathname,
		).toBe("/docs/srd/playing-the-game/xp");
		expect(screen.getByText(/monsters\.md:203-209/)).toBeTruthy();
		expect(screen.queryByText("Loading catalogue…")).toBeNull();
	});

	it("routes a generic article without converter requests and rejects an unknown page", async () => {
		window.history.replaceState({}, "", "/docs/other-rules/safety/consent");
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/compendium/docs/index.json"))
				return new Response(JSON.stringify(docsIndex));
			const article = docsArticleResponse(url);
			if (article) return article;
			if (url.endsWith("search.json") || url.endsWith("maps.json"))
				return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
			return new Response("", { status: 404 });
		});
		vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Consent" })).toBeTruthy(),
		);
		expect(screen.getByText("Consent body.")).toBeTruthy();
		expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("chapters"))).toBe(false);

		window.history.replaceState({}, "", "/docs/other-rules/safety/unknown");
		window.dispatchEvent(new PopStateEvent("popstate"));
		await waitFor(() => expect(screen.getByTestId("compendium-404")).toBeTruthy());
	});

	it("does not let a deferred article response overwrite a newer route", async () => {
		window.history.replaceState({}, "", "/docs/other-rules/safety/consent");
		let releaseArticle: ((response: Response) => void) | undefined;
		const deferredArticle = new Promise<Response>((resolve) => {
			releaseArticle = resolve;
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				if (url.endsWith("/compendium/docs/articles/other-rules/safety/consent.json")) {
					return deferredArticle;
				}
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() => expect(releaseArticle).toBeTypeOf("function"));

		window.history.pushState({}, "", "/docs/other-rules/safety");
		window.dispatchEvent(new PopStateEvent("popstate"));
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Safety" })).toBeTruthy(),
		);

		releaseArticle?.(new Response(JSON.stringify(docsIndex.pages[1]?.sections[0]?.pages?.[0])));
		await Promise.resolve();
		await Promise.resolve();
		expect(screen.getByRole("heading", { level: 1, name: "Safety" })).toBeTruthy();
		expect(screen.queryByRole("heading", { level: 1, name: "Consent" })).toBeNull();
		expect(screen.queryByText("Consent body.")).toBeNull();
	});

	it("routes an SRD article at its canonical section slug", async () => {
		window.history.replaceState({}, "", "/docs/srd/spells/casting");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				const article = docsArticleResponse(url);
				if (article) return article;
				if (url.endsWith("search.json") || url.endsWith("maps.json"))
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Casting Spells" })).toBeTruthy(),
		);
		expect(screen.getByText("Casting body.")).toBeTruthy();
		expect(document.body.textContent).toContain(SRD_5_2_1_CREDIT);
	});

	it("routes projected generic and legacy SRD resources without fetching converter entries", async () => {
		for (const [path, heading] of [
			["/docs/other-rules/safety/resource/guide%2Ffocus", "Focus"],
			["/docs/other-rules/safety/subject/entity/other%2Fmira", "Mira"],
			["/docs/srd/playing-the-game/cha", "Charisma"],
		] as const) {
			window.history.replaceState({}, "", path);
			const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				const article = docsArticleResponse(url);
				if (article) return article;
				if (url.endsWith("search.json") || url.endsWith("maps.json"))
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				return new Response("", { status: 404 });
			});
			vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
			const rendered = render(App);
			await waitFor(() =>
				expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy(),
			);
			expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("/entries/"))).toBe(
				false,
			);
			rendered.unmount();
		}
	});

	it("uses the manifest docs index for SRD chapters without requesting legacy exports", async () => {
		window.history.replaceState({}, "", "/docs/srd/spells");
		const fetchSpy = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/compendium/docs/index.json"))
				return Promise.resolve(new Response(JSON.stringify(docsIndex)));
			if (url.endsWith("search.json") || url.endsWith("maps.json"))
				return Promise.resolve(new Response(JSON.stringify(url.endsWith("maps.json") ? {} : [])));
			return Promise.resolve(new Response("", { status: 404 }));
		});
		vi.stubGlobal("fetch", fetchSpy as unknown as typeof fetch);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Spells" })).toBeTruthy(),
		);
		expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("/compendium/srd/"))).toBe(
			false,
		);
	});

	it("renders an authored SRD section when Vite falls back to the SPA shell for its absent converter file", async () => {
		window.history.replaceState({}, "", "/docs/srd/authored-section");
		const srdPage = docsIndex.pages.find((page) => page.page_id === "srd");
		if (!srdPage) throw new Error("SRD docs page is missing from test fixture");
		const indexWithMetadataOnlySection = {
			...docsIndex,
			pages: [
				{
					...srdPage,
					sections: [
						...srdPage.sections,
						{
							id: "authored-section",
							title: "Authored Section",
							intro: "This needs no converter file.",
							href: "/docs/srd/authored-section",
						},
					],
				},
				...docsIndex.pages.slice(1),
			],
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(indexWithMetadataOnlySection));
				if (url.endsWith("/compendium/srd/chapters/authored-section.json"))
					return new Response("<!doctype html><html></html>");
				if (url.endsWith("search.json") || url.endsWith("maps.json"))
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Authored Section" })).toBeTruthy(),
		);
		expect(screen.getByText("This needs no converter file.")).toBeTruthy();
	});

	it("returns the catalogue 404 for unknown generic docs pages and sections", async () => {
		window.history.replaceState({}, "", "/docs/other-rules/unknown-section");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith("/compendium/docs/index.json"))
					return new Response(JSON.stringify(docsIndex));
				if (url.endsWith("search.json") || url.endsWith("maps.json"))
					return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
				return new Response("", { status: 404 });
			}),
		);
		render(App);
		await waitFor(() => expect(screen.getByTestId("compendium-404")).toBeTruthy());
	});

	it("opens /adventures and Kavemouth from the adventure export", async () => {
		window.history.replaceState({}, "", "/docs/adventures");
		const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
			const url = String(input);
			if (url.endsWith("/compendium/docs/index.json"))
				return new Response(JSON.stringify(docsIndex));
			if (url.endsWith("/compendium/adventures/kavemouth/index.json")) {
				return new Response(
					JSON.stringify({
						generated_at: "deterministic",
						entry_count: 102,
						corpus: "kavemouth",
						chapters: [
							{ id: "cast", name: "Cast", count: 10 },
							{ id: "places", name: "Places", count: 4 },
						],
					}),
				);
			}
			if (url.endsWith("search.json") || url.endsWith("maps.json")) {
				return new Response(JSON.stringify(url.endsWith("maps.json") ? {} : []));
			}
			return new Response("", { status: 404 });
		}) as unknown as typeof fetch;
		vi.stubGlobal("fetch", fetchSpy);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { level: 1, name: "Adventures" })).toBeTruthy(),
		);
		expect(screen.getAllByRole("heading", { name: "Kavemouth" }).length).toBeGreaterThan(0);
		expect(screen.queryByTestId("srd-credit")).toBeNull();
	});

	it("routes emitted adventure sections, articles, and typed subjects through the docs app", async () => {
		for (const [path, heading] of [
			["/docs/adventures/kavemouth/adventure-subjects", "Adventure subjects"],
			["/docs/adventures/kavemouth/adventure-subjects/installed-subjects", "Installed subjects"],
			[
				"/docs/adventures/kavemouth/adventure-subjects/subject/entity_definition/srd%2Farmor%2Fshield",
				"Shield",
			],
			[
				"/docs/adventures/kavemouth/adventure-subjects/subject/entity/kavemouth%2Fadventure%2Finnkeeper_1",
				"Mira",
			],
		] as const) {
			window.history.replaceState({}, "", path);
			vi.stubGlobal(
				"fetch",
				vi.fn(async (input: RequestInfo | URL) => {
					const url = String(input);
					if (url.endsWith("/compendium/docs/index.json"))
						return new Response(JSON.stringify(docsIndex));
					const article = docsArticleResponse(url);
					return article ?? new Response("", { status: 404 });
				}),
			);
			const rendered = render(App);
			await waitFor(() =>
				expect(screen.getByRole("heading", { level: 1, name: heading })).toBeTruthy(),
			);
			rendered.unmount();
		}

		window.history.replaceState({}, "", "/docs/adventures/kavemouth/not-authored");
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL) =>
				String(input).endsWith("/compendium/docs/index.json")
					? new Response(JSON.stringify(docsIndex))
					: new Response("", { status: 404 }),
			),
		);
		render(App);
		await waitFor(() => expect(screen.getByTestId("compendium-404")).toBeTruthy());
		expect(screen.queryByRole("heading", { name: /world understands what you mean/i })).toBeNull();
	});

	it("opens a curated place, inhabitant, and chronicle example without a live feed", () => {
		vi.stubGlobal("fetch", vi.fn(sampleFetch()));
		render(App);

		expect(screen.getByRole("heading", { name: "Watch one choice become history" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Place" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Inhabitants" })).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Chronicle" })).toBeTruthy();
		expect(screen.getByText("Illustrative example")).toBeTruthy();
		expect(screen.queryByRole("navigation", { name: "Published worlds" })).toBeNull();
	});

	it("hands a signed-in visitor onward instead of rendering the private hub", async () => {
		signIn();
		const assign = stubLocationAssign();
		vi.stubGlobal("fetch", sampleFetch());
		render(App);

		expect(screen.queryByRole("heading", { name: /world understands what you mean/i })).toBeNull();
		expect(screen.queryByText("The kave where spells never end.")).toBeNull();
		expectSignedInWaysOut();
		await waitFor(() => expect(assign).toHaveBeenCalledWith(DEFAULT_PLAY_APP_URL));
		expectPrivateHubAbsent();
		expect(screen.queryByRole("heading", { name: "Connect an AI" })).toBeNull();
	});

	it("hands a player with a claimed world to Play", async () => {
		signIn();
		const assign = stubLocationAssign();
		vi.stubGlobal("fetch", sampleFetch(playAccount));
		render(App);

		await waitFor(() =>
			expect(assign).toHaveBeenCalledWith("https://play.spellkave.com/?world=claimed-world"),
		);
		expectPrivateHubAbsent();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Play" }).href).toBe(
			DEFAULT_PLAY_APP_URL,
		);
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Account" }).href).toBe(
			DEFAULT_ACCOUNT_APP_URL,
		);
	});

	it("shows an honest signed-in error when the account cannot be loaded", async () => {
		signIn();
		stubLocationAssign();
		vi.stubGlobal(
			"fetch",
			(async () => new Response("nope", { status: 503 })) as unknown as typeof fetch,
		);
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "We could not open your place" })).toBeTruthy(),
		);
		expectPrivateHubAbsent();
		expectSignedInWaysOut();
	});

	it("hands an operator off to the console instead of rendering it here", async () => {
		signIn();
		const assign = stubLocationAssign();
		vi.stubGlobal(
			"fetch",
			sampleFetch({ ...hubAccount, capabilities: ["future.capability", "system.manage"] }),
		);
		render(App);

		await waitFor(() => expect(assign).toHaveBeenCalledWith(DEFAULT_OPERATOR_APP_URL));
		// The public entrance keeps no operator surface of its own (ADR-0110 D-1),
		// and must not fall through to the personal hub on the way out either.
		expectPrivateHubAbsent();
		expect(screen.queryByRole("heading", { name: "Keep Spellkave running" })).toBeNull();
		expect(screen.getByRole<HTMLAnchorElement>("link", { name: "Admin" }).href).toBe(
			DEFAULT_OPERATOR_APP_URL,
		);
	});
});
