<script lang="ts">
	import {
		type AuthConfig,
		type AuthSession,
		clearSession,
		completeLogin,
		endAuthSession,
		readAuthConfig,
		readSession,
		type SessionRenewalState,
		startLogin,
		startSessionRenewal,
	} from "@spellkave/authkit";
	import { Button, ProductMasthead, productNavigation } from "@spellkave/ui";
	import { initTheme } from "@spellkave/ui/theme";
	import { onMount } from "svelte";
	import AuthorObservability from "./components/AuthorObservability.svelte";
	import ConnectKey from "./components/ConnectKey.svelte";
	import Connectors from "./components/Connectors.svelte";
	import Heroes from "./components/Heroes.svelte";
	import Identity from "./components/Identity.svelte";
	import TokenBoard from "./components/TokenBoard.svelte";
	import {
		AccountApi,
		AccountApiError,
		type AccountGetResponse,
		formatAccountApiError,
	} from "./lib/account-api";
	import { ACCOUNT_PATH, CALLBACK_PATH } from "./lib/auth-routes";
	import { readPlayAppUrl } from "./lib/play";
	import { readSiteUrl } from "./lib/site";

	initTheme();

	type Gate = "loading" | "unconfigured" | "signed-out" | "checking" | "ready";

	let gate = $state<Gate>("loading");
	let session = $state<AuthSession | null>(null);
	let account = $state<AccountGetResponse | null>(null);
	let reloading = $state(false);
	let error = $state<string | null>(null);
	let config: AuthConfig | null = null;
	let authRenewal: ReturnType<typeof startSessionRenewal> | null = null;
	let renewalStatus: SessionRenewalState["status"] = "signed-out";

	/**
	 * Same-origin: the Worker proxies the allowlisted Account API paths.
	 * VITE_SPELLKAVE_API_URL is only for `vite dev`, where no Worker runs.
	 */
	const apiBaseUrl = import.meta.env.VITE_SPELLKAVE_API_URL?.trim() ?? "";
	const playAppUrl = readPlayAppUrl(import.meta.env as Record<string, string | undefined>);
	const publicSiteUrl = readSiteUrl(import.meta.env as Record<string, string | undefined>);

	let {
		createApi = (token: string): AccountApi => new AccountApi({ token, baseUrl: apiBaseUrl }),
	}: { createApi?: (token: string) => AccountApi } = $props();

	async function loadAccount(active: AuthSession): Promise<void> {
		error = null;
		const keepMounted = account !== null;
		if (keepMounted) {
			reloading = true;
		} else {
			gate = "checking";
		}
		try {
			const nextAccount = await createApi(active.access_token).getAccount();
			if (active.access_token !== session?.access_token) return;
			account = nextAccount;
			gate = "ready";
		} catch (cause) {
			if (active.access_token !== session?.access_token) return;
			if (cause instanceof AccountApiError && cause.code === "unauthorized") {
				clearSession(window.sessionStorage);
				session = null;
				account = null;
				gate = "signed-out";
				error = "That session expired. Please sign in again.";
				return;
			}
			if (!keepMounted) {
				gate = "signed-out";
			}
			error = formatAccountApiError(cause);
		} finally {
			reloading = false;
		}
	}

	function signIn(): void {
		if (config === null) return;
		error = null;
		void startLogin(
			config,
			window.location.origin,
			window.sessionStorage,
			(url) => {
				window.location.assign(url);
			},
			CALLBACK_PATH,
		);
	}

	function signOut(): void {
		// ADR-0161 D-7: the login site signs the person out of every app.
		endAuthSession(window.sessionStorage, config ?? {}, `${window.location.origin}/`);
		session = null;
		account = null;
		gate = "signed-out";
	}

	onMount(() => {
		let disposed = false;
		let bootstrapped = false;
		config = readAuthConfig(import.meta.env as Record<string, string | undefined>);
		if (config !== null) {
			authRenewal = startSessionRenewal({
				config, storage: window.sessionStorage, fetch, window, document,
				onChange: (next) => {
					const previousToken = session?.access_token;
					session = next.session;
					renewalStatus = next.status;
					if (next.session === null) {
						gate = next.status === "signed-out" ? "signed-out" : "loading";
					} else if (bootstrapped && previousToken !== next.session.access_token) {
						void loadAccount(next.session);
					}
				},
			});
		}
		void (authRenewal?.ready ?? Promise.resolve(null)).then(() => {
			if (disposed) return;
			bootstrapped = true;
			if (renewalStatus !== "retrying") initializeAuth();
		});
		return () => { disposed = true; authRenewal?.stop(); };
	});

	function initializeAuth(): void {
		config = readAuthConfig(import.meta.env as Record<string, string | undefined>);
		if (config === null) {
			gate = "unconfigured";
			return;
		}
		if (window.location.pathname === CALLBACK_PATH) {
			void (async () => {
				try {
					const active = await completeLogin(
						config as AuthConfig,
						window.location.href,
						window.sessionStorage,
						fetch.bind(window),
					);
					window.history.replaceState({}, "", ACCOUNT_PATH);
					session = active;
					void authRenewal?.check();
					await loadAccount(active);
				} catch (cause) {
					window.history.replaceState({}, "", ACCOUNT_PATH);
					gate = "signed-out";
					error = cause instanceof Error ? cause.message : String(cause);
				}
			})();
			return;
		}
		const existing = readSession(window.sessionStorage);
		if (existing === null) {
			// No silent login (ADR-0161 D-9): the sign-in button goes through the
			// login site, which asks "Continue as …" while its session lives.
			gate = "signed-out";
			return;
		}
		session = existing;
		void loadAccount(existing);
	}
</script>

<div class="min-h-screen bg-background text-foreground">
	<ProductMasthead
		brand="Spellkave Account"
		brandHref={null}
		contextText="account.spellkave.com"
		navigation={productNavigation("account")}
		signInHref={null}
		account={session ? { displayName: session.display_name } : null}
		onSignOut={signOut}
		accountLinks={[{ label: "Public site", href: publicSiteUrl }]}
	/>

	<main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
		{#if error !== null}
			<p
				class="rounded-[var(--radius)] border border-destructive bg-destructive/10 px-3 py-2 text-sm text-foreground"
				role="alert"
			>
				{error}
			</p>
		{/if}

		{#if gate === "loading"}
			<p class="text-sm text-muted-foreground">Loading your account…</p>
		{:else if gate === "unconfigured"}
			<div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-6">
				<h1
					class="[font-family:var(--font-display)] text-[1.5rem] font-medium leading-[1.25] tracking-[-0.025em]"
				>
					This page is not configured
				</h1>
				<p class="max-w-[65ch] text-sm text-muted-foreground">
					It was built without a WorkOS client ID or issuer, so it cannot sign anyone in. This is a
					deployment problem, not an account problem.
				</p>
			</div>
		{:else if gate === "signed-out"}
			<div class="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-6">
				<h1
					class="[font-family:var(--font-display)] text-[1.5rem] font-medium leading-[1.25] tracking-[-0.025em]"
				>
					Sign in to your account
				</h1>
				<p class="max-w-[65ch] text-sm text-muted-foreground">
					This page is yours: who you are, your API keys, and how to use them.
				</p>
				<div>
					<Button variant="woven-primary" onclick={signIn}>Sign in with WorkOS</Button>
				</div>
			</div>
		{:else if gate === "checking"}
			<p class="text-sm text-muted-foreground">Loading your account…</p>
		{:else if session !== null && account !== null}
			<Identity
				displayName={session.display_name}
				{account}
				{playAppUrl}
				{reloading}
				api={createApi(session.access_token)}
				onReleased={() => {
					const active = session;
					if (active === null) return;
					return loadAccount(active);
				}}
			/>
			<Heroes worlds={account.worlds} api={createApi(session.access_token)} {playAppUrl} />
			<AuthorObservability worlds={account.worlds} api={createApi(session.access_token)} />
			<TokenBoard {session} {createApi} />
			<Connectors api={createApi(session.access_token)} />
			<ConnectKey />
		{/if}
	</main>
</div>
