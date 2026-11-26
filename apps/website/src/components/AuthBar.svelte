<script lang="ts">
	import {
		type AuthSession,
		endAuthSession,
		notifyAuthChanged,
		readAuthConfig,
		readSession,
		type SessionRenewalState,
		startLogin,
		startSessionRenewal,
	} from "@spellkave/authkit";
	import { Button } from "@spellkave/ui";
	import { onMount } from "svelte";
	import { CALLBACK_PATH } from "../lib/auth-routes";
	import {
		applyDevSession,
		isDevAuthEnabled,
		maybeAutoSeedDevToken,
		readDevTokenHint,
	} from "../lib/dev-auth";

	const env = import.meta.env as Record<string, string | undefined>;
	const config = readAuthConfig(env);
	const devAuth = isDevAuthEnabled();
	const devTokenHint = readDevTokenHint(env);

	let session = $state<AuthSession | null>(null);
	let error = $state<string | null>(null);
	let showDevPaste = $state(false);
	let devTokenDraft = $state("");
	let renewalStatus = $state<SessionRenewalState["status"]>("signed-out");

	function refreshSession(): void {
		if (typeof window === "undefined") return;
		session = readSession(window.sessionStorage);
	}

	onMount(() => {
		// DEV auto-seed once at mount (never in production bundles).
		if (devAuth && typeof window !== "undefined") {
			const existing = readSession(window.sessionStorage);
			if (existing === null) {
				maybeAutoSeedDevToken(window.sessionStorage, env, false);
			}
		}
		refreshSession();
		const renewal = config === null ? null : startSessionRenewal({
			config, storage: window.sessionStorage, fetch, window, document,
			onChange: (next) => { session = next.session; renewalStatus = next.status; },
		});

		const onAuth = () => refreshSession();
		window.addEventListener("spellkave-auth", onAuth);
		return () => {
			renewal?.stop();
			window.removeEventListener("spellkave-auth", onAuth);
		};
	});

	function login(): void {
		if (config === null) return;
		void startLogin(config, window.location.origin, window.sessionStorage, (url) => {
			window.location.assign(url);
		}, CALLBACK_PATH);
	}

	function logout(): void {
		session = null;
		endAuthSession(window.sessionStorage, config ?? {}, `${window.location.origin}/`);
		notifyAuthChanged();
	}

	function applyDevToken(): void {
		if (!devAuth || typeof window === "undefined") return;
		const ok = applyDevSession(window.sessionStorage, devTokenDraft, "dev-paste");
		if (!ok) {
			error = "Paste a non-empty play-stage token.";
			return;
		}
		session = readSession(window.sessionStorage);
		error = null;
		showDevPaste = false;
		devTokenDraft = "";
	}
</script>

<div class="flex flex-col items-end gap-2 text-sm">
	<div class="flex items-center gap-3">
		{#if session}
			<span class="text-muted-foreground">
				Signed in as <strong class="font-medium text-foreground">{session.display_name}</strong>
			</span>
			<Button variant="outline" size="sm" onclick={logout}>Log out</Button>
		{:else if renewalStatus === "refreshing" || renewalStatus === "retrying"}
			<span role="status">Reconnecting your session…</span>
		{:else if config !== null}
			<Button size="sm" onclick={login}>Log in</Button>
		{/if}
		{#if devAuth && !session}
			<Button
				variant="outline"
				size="sm"
				data-testid="dev-token-toggle"
				onclick={() => {
					showDevPaste = !showDevPaste;
				}}
			>
				Dev token
			</Button>
		{/if}
		{#if error}
			<span class="text-destructive">{error}</span>
		{/if}
	</div>

	{#if devAuth && showDevPaste && !session}
		<div
			class="flex w-full max-w-md flex-col gap-2 rounded-md border border-dashed border-amber-400 bg-amber-50 p-3 text-xs text-amber-950"
			data-testid="dev-token-panel"
		>
			<p>
				Local only (<code class="font-mono">import.meta.env.DEV</code>). Paste the staged hero token
				from
				<code class="font-mono">.local/player-credentials/…/candidate.token</code>
				{#if devTokenHint}
					— or set <code class="font-mono">VITE_SPELLKAVE_DEV_TOKEN_FILE</code> ({devTokenHint}).
				{/if}
			</p>
			<textarea
				class="min-h-16 w-full rounded border border-amber-300 bg-white p-2 font-mono text-xs text-foreground"
				data-testid="dev-token-input"
				placeholder="paste token"
				bind:value={devTokenDraft}
			></textarea>
			<Button size="sm" data-testid="dev-token-apply" onclick={applyDevToken}>Use token</Button>
		</div>
	{/if}
</div>
