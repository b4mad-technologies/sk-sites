<script lang="ts">
	import {
		AUTH_CHANGED_EVENT,
		type AuthSession,
		completeLogin,
		notifyAuthChanged,
		readAuthConfig,
		readSession,
		startLogin,
	} from "@spellkave/authkit";
	import { Button, ProductMasthead, type ProductNavItem, productNavigation } from "@spellkave/ui";
	import { initTheme, isThemeId, setTheme } from "@spellkave/ui/theme";
	import { onMount } from "svelte";
	import CompendiumApp from "./compendium/CompendiumApp.svelte";
	import { parseCompendiumPath } from "./compendium/parse-path";
	import type { CompendiumRoute } from "./compendium/types";
	import AttributionPage from "./components/AttributionPage.svelte";
	import AuthBar from "./components/AuthBar.svelte";
	import ConnectGuide from "./components/ConnectGuide.svelte";
	import ImpressumPage from "./components/ImpressumPage.svelte";
	import SiteFooter from "./components/SiteFooter.svelte";
	import Landing from "./landings/Landing.svelte";
	import {
		createAccountApi,
		formatAccountApiError,
		readAccountApiUrl,
	} from "./lib/account-api";
	import { accountDestination, openAccountDestination } from "./lib/account-destination";
	import { isAttributionPath } from "./lib/attribution";
	import { CALLBACK_PATH, LOGIN_PATH } from "./lib/auth-routes";
	import { isImpressumPath } from "./lib/impressum";

	initTheme();
	// `?theme=<id>` opens a specific world directly (review links, docs). The
	// choice persists through the shared theme cookie like the footer switcher.
	if (typeof window !== "undefined") {
		const requested = new URLSearchParams(window.location.search).get("theme");
		if (requested && isThemeId(requested)) setTheme(requested);
	}

	const env = import.meta.env as Record<string, string | undefined>;
	const authConfig = readAuthConfig(env);
	const accountApiUrl = readAccountApiUrl(env, { dev: import.meta.env.DEV === true });
	const publicNavigation: ProductNavItem[] = [
		{ label: "Worlds", href: "#watch", icon: "worlds" },
		{ label: "Connect", href: "#connect", icon: "settings" },
		{ label: "Maps", href: "https://maps.spellkave.com", icon: "maps" },
		{ label: "Docs", href: "/docs", icon: "docs" },
	];

	let session = $state<AuthSession | null>(
		typeof window === "undefined" ? null : readSession(window.sessionStorage),
	);
	let authBusy = $state(false);
	let authError = $state<string | null>(null);
	let accountBusy = $state(false);
	let accountError = $state<string | null>(null);
	let accountRetry = $state(0);
	type LegalPage = "attribution" | "impressum" | null;
	function legalPageFromPath(pathname: string): LegalPage {
		if (isAttributionPath(pathname)) return "attribution";
		if (isImpressumPath(pathname)) return "impressum";
		return null;
	}
	let legalPage = $state<LegalPage>(
		typeof window === "undefined" ? null : legalPageFromPath(window.location.pathname),
	);
	/** `route.pathname` when canonical (possibly redirected), else the raw location — see `parseCompendiumPath`. */
	function pathnameForRoute(route: CompendiumRoute | null, fallback: string): string {
		return route?.page === "path" ? route.pathname : fallback;
	}
	const initialCompendiumRoute =
		typeof window === "undefined" ? null : parseCompendiumPath(window.location.pathname);
	let compendiumRoute = $state<CompendiumRoute | null>(initialCompendiumRoute);
	let routeSearch = $state(typeof window === "undefined" ? "" : window.location.search);
	let routePathname = $state(
		typeof window === "undefined"
			? "/"
			: pathnameForRoute(initialCompendiumRoute, window.location.pathname),
	);
	const onLegalPage = $derived(legalPage !== null);
	const onCompendiumPage = $derived(compendiumRoute !== null);

	function createApi(token: string) {
		return createAccountApi({ baseUrl: accountApiUrl, token });
	}

	onMount(() => {
		const refreshSession = () => {
			session = readSession(window.sessionStorage);
		};
		const syncRoute = () => {
			legalPage = legalPageFromPath(window.location.pathname);
			compendiumRoute = parseCompendiumPath(window.location.pathname);
			routePathname = pathnameForRoute(compendiumRoute, window.location.pathname);
			routeSearch = window.location.search;
			// A retired documentation path resolved to its current location
			// (`parseCompendiumPath`'s own redirect table) — reflect that in the
			// address bar too, so a shared old link becomes the canonical one.
			if (compendiumRoute?.page === "path" && routePathname !== window.location.pathname) {
				window.history.replaceState({}, "", `${routePathname}${window.location.search}`);
			}
		};
		window.addEventListener(AUTH_CHANGED_EVENT, refreshSession);
		window.addEventListener("popstate", syncRoute);
		syncRoute();

		const path = window.location.pathname;
		if (legalPageFromPath(path) !== null || parseCompendiumPath(path) !== null) {
			// Public legal / catalogue page — no auth redirect.
		} else if ((path === LOGIN_PATH || path === CALLBACK_PATH) && authConfig === null) {
			authError = "Sign-in is temporarily unavailable. Please try again later.";
			window.history.replaceState({}, "", "/");
		} else if (authConfig !== null && path === LOGIN_PATH) {
			authBusy = true;
			void startLogin(authConfig, window.location.origin, window.sessionStorage, (url) => {
				window.location.assign(url);
			}, CALLBACK_PATH).catch((cause: unknown) => {
				authError = cause instanceof Error ? cause.message : String(cause);
				authBusy = false;
			});
		} else if (authConfig !== null && path === CALLBACK_PATH) {
			authBusy = true;
			void completeLogin(authConfig, window.location.href, window.sessionStorage, fetch)
				.then((next) => {
					session = next;
					authError = null;
					notifyAuthChanged();
				})
				.catch((cause: unknown) => {
					authError = cause instanceof Error ? cause.message : String(cause);
				})
				.finally(() => {
					authBusy = false;
					window.history.replaceState({}, "", "/");
				});
		}

		return () => {
			window.removeEventListener(AUTH_CHANGED_EVENT, refreshSession);
			window.removeEventListener("popstate", syncRoute);
		};
	});

	$effect(() => {
		const token = session?.access_token;
		// Keep the explicit retry button on the same request path as first load.
		void accountRetry;
		if (token === undefined || onLegalPage || onCompendiumPage) {
			accountBusy = false;
			accountError = null;
			return;
		}

		let cancelled = false;
		accountBusy = true;
		accountError = null;
		void createApi(token)
			.getAccount()
			.then((next) => {
				if (cancelled) return;
				openAccountDestination(accountDestination(next), window.location);
			})
			.catch((cause: unknown) => {
				if (cancelled) return;
				accountError = formatAccountApiError(cause);
				accountBusy = false;
			});

		return () => {
			cancelled = true;
		};
	});
</script>

<main class="site-shell">
	{#if legalPage === "attribution"}
		<AttributionPage />
		<SiteFooter />
	{:else if legalPage === "impressum"}
		<ImpressumPage />
		<SiteFooter />
	{:else if compendiumRoute !== null}
		<CompendiumApp route={compendiumRoute} search={routeSearch} pathname={routePathname} />
	{:else if session === null}
		<ProductMasthead
			brandHref="#top"
			navigation={publicNavigation}
			signInLabel="Sign in"
			signInHref={LOGIN_PATH}
		/>

		{#if authBusy || authError}
			<p class:error={authError !== null} class="auth-route-status" role="status" aria-live="polite">
				{authBusy ? "Opening sign-in…" : authError}
			</p>
		{/if}

		<Landing signInHref={LOGIN_PATH} />
		<section class="product-surface surface-section surface-section--quiet">
			<ConnectGuide />
		</section>
	{:else}
		<ProductMasthead brandHref="#top" navigation={productNavigation()} signInHref={null}>
			{#snippet accountSnippet()}
				<AuthBar />
			{/snippet}
		</ProductMasthead>

		<div class="product-surface">
			{#if accountBusy}
				<section class="surface-section surface-section--route" aria-busy="true">
					<div class="section-heading">
						<h1>Finding your place…</h1>
						<p>Opening the world or system work connected to this sign-in.</p>
					</div>
				</section>
			{:else if accountError !== null}
				<section class="surface-section surface-section--route">
					<div class="section-heading">
						<h1>We could not open your place</h1>
						<p>{accountError} Check your connection, then try again.</p>
					</div>
					<Button onclick={() => (accountRetry += 1)}>Try again</Button>
				</section>
			{/if}
		</div>
	{/if}

	{#if session === null && !onLegalPage && !onCompendiumPage}
		<SiteFooter />
	{/if}
</main>
