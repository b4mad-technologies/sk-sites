<script lang="ts">
	import type { AuthSession } from "@spellkave/authkit";
	import { Button } from "@spellkave/ui";
	import {
		type AccountApi,
		type AccountToken,
		type CreatedAccountToken,
		formatAccountApiError,
	} from "../lib/account-api";
	import CopyField from "./CopyField.svelte";

	let {
		session,
		createApi,
	}: {
		session: AuthSession | null;
		createApi?: (token: string) => AccountApi;
	} = $props();

	let tokens = $state<AccountToken[]>([]);
	let status = $state<string | null>(null);
	let busy = $state(false);
	let name = $state("");
	let created = $state<CreatedAccountToken | null>(null);
	let confirmId = $state<string | null>(null);

	async function refresh(api: AccountApi): Promise<void> {
		tokens = await api.listTokens();
	}

	$effect(() => {
		const token = session?.access_token;
		const factory = createApi;
		if (token === undefined || factory === undefined) {
			tokens = [];
			created = null;
			confirmId = null;
			status = null;
			return;
		}
		const api = factory(token);
		let cancelled = false;
		void (async () => {
			try {
				const next = await api.listTokens();
				if (!cancelled) tokens = next;
			} catch (cause) {
				if (!cancelled) status = formatAccountApiError(cause);
			}
		})();
		return () => {
			cancelled = true;
		};
	});

	async function onCreate(): Promise<void> {
		const token = session?.access_token;
		if (token === undefined || createApi === undefined) return;
		const trimmed = name.trim();
		if (trimmed === "") {
			status = "Give the token a name.";
			return;
		}
		busy = true;
		status = null;
		try {
			const api = createApi(token);
			created = await api.createToken(trimmed);
			name = "";
			await refresh(api);
		} catch (cause) {
			status = formatAccountApiError(cause);
		} finally {
			busy = false;
		}
	}

	async function onRevoke(id: string): Promise<void> {
		const token = session?.access_token;
		if (token === undefined || createApi === undefined) return;
		busy = true;
		status = null;
		try {
			const api = createApi(token);
			await api.revokeToken(id);
			if (created?.id === id) created = null;
			confirmId = null;
			await refresh(api);
		} catch (cause) {
			status = formatAccountApiError(cause);
		} finally {
			busy = false;
		}
	}
</script>

{#if session !== null}
	<section id="tokens" class="flex flex-col gap-6" data-testid="token-board">
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-semibold tracking-tight">API tokens</h2>
			<p class="max-w-2xl text-sm text-muted-foreground">
				Mint a long-lived WorkOS user key for curl or agents. Use it as
				<code class="font-mono">Authorization: Bearer</code> on Account API routes. Seat claim and
				release still need this website login.
			</p>
		</div>

		{#if created}
			<div
				class="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950"
				data-testid="token-secret"
			>
				<p class="text-sm font-medium">This secret is shown once. Copy it now.</p>
				<CopyField label="Token secret" value={created.secret} secret />
			</div>
		{/if}

		<form
			class="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm"
			onsubmit={(event) => {
				event.preventDefault();
				void onCreate();
			}}
		>
			<label class="flex flex-col gap-1 text-xs">
				<span>Name</span>
				<input
					class="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
					data-testid="token-name"
					autocomplete="off"
					bind:value={name}
					disabled={busy}
					placeholder="ci laptop"
				/>
			</label>
			<div>
				<Button type="submit" size="sm" disabled={busy} data-testid="token-create">
					Create token
				</Button>
			</div>
		</form>

		{#if status}
			<p class="text-sm text-destructive" data-testid="token-status">{status}</p>
		{/if}

		<ul class="flex flex-col gap-2" data-testid="token-list">
			{#each tokens as token (token.id)}
				<li
					class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
				>
					<div class="flex min-w-0 flex-col">
						<span class="truncate text-sm font-medium">{token.name || token.id}</span>
						<span class="text-xs text-muted-foreground">
							created {token.created_at}{#if token.last_used_at}
								· last used {token.last_used_at}{/if}
						</span>
					</div>
					{#if confirmId === token.id}
						<div class="flex items-center gap-2">
							<span class="text-xs">Revoke this token?</span>
							<Button
								size="sm"
								variant="destructive"
								disabled={busy}
								data-testid={`token-revoke-confirm-${token.id}`}
								onclick={() => void onRevoke(token.id)}
							>
								Revoke
							</Button>
							<Button
								size="sm"
								variant="outline"
								disabled={busy}
								onclick={() => {
									confirmId = null;
								}}
							>
								Cancel
							</Button>
						</div>
					{:else}
						<Button
							size="sm"
							variant="outline"
							disabled={busy}
							data-testid={`token-revoke-${token.id}`}
							onclick={() => {
								confirmId = token.id;
							}}
						>
							Revoke
						</Button>
					{/if}
				</li>
			{:else}
				<li class="text-sm text-muted-foreground">No API tokens yet.</li>
			{/each}
		</ul>
	</section>
{/if}
