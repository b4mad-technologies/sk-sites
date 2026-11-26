<script lang="ts">
	import { Button, Dialog } from "@spellkave/ui";
	import {
		type AccountApi,
		type AccountGetResponse,
		formatAccountApiError,
		HELD_HERO_FALLBACK_NAME,
		heldHeroNameFromBoard,
	} from "../lib/account-api";
	import { playHrefForWorld } from "../lib/play";

	let {
		displayName,
		account,
		playAppUrl,
		reloading = false,
		api,
		onReleased,
	}: {
		displayName: string;
		account: AccountGetResponse;
		playAppUrl: string;
		reloading?: boolean;
		api: AccountApi;
		onReleased: () => void | Promise<void>;
	} = $props();

	let confirmOpen = $state(false);
	let releasing = $state(false);
	let releaseError = $state<string | null>(null);
	let resolvedHeroName = $state<string | null>(null);
	const actionsBusy = $derived(releasing || reloading);

	const seat = $derived(account.seat);
	const worldName = $derived.by(() => {
		if (seat === null) return null;
		return account.worlds.find((world) => world.slug === seat.slug)?.display_name ?? seat.slug;
	});
	const heroName = $derived(seat === null ? null : (resolvedHeroName ?? HELD_HERO_FALLBACK_NAME));
	const enterHref = $derived(seat === null ? null : playHrefForWorld(seat.slug, playAppUrl));

	$effect(() => {
		const held = seat;
		const client = api;
		if (held === null) {
			resolvedHeroName = null;
			return;
		}
		let cancelled = false;
		resolvedHeroName = null;
		void client.getSeats(held.slug).then(
			(rows) => {
				if (!cancelled) resolvedHeroName = heldHeroNameFromBoard(rows);
			},
			() => {
				if (!cancelled) resolvedHeroName = HELD_HERO_FALLBACK_NAME;
			},
		);
		return () => {
			cancelled = true;
		};
	});

	async function releaseHero(): Promise<void> {
		if (seat === null || releasing) return;
		releasing = true;
		releaseError = null;
		try {
			await api.releaseSeat(seat.slug);
			confirmOpen = false;
			await onReleased();
		} catch (cause) {
			releaseError = formatAccountApiError(cause);
		} finally {
			releasing = false;
		}
	}
</script>

<section
	class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-6"
	data-testid="who-i-am"
	aria-busy={actionsBusy}
>
	<h1
		class="[font-family:var(--font-display)] text-[1.5rem] font-medium leading-[1.25] tracking-[-0.025em]"
	>
		Who I am
	</h1>
	{#if seat === null}
		<p class="max-w-[65ch] text-sm text-muted-foreground">
			{displayName}. You are not currently playing a hero.
		</p>
		<div>
			<Button href={playAppUrl} variant="woven-primary" disabled={reloading}>Play</Button>
		</div>
	{:else}
		<p class="max-w-[65ch] text-sm">
			{displayName}. Currently playing {heroName} in {worldName}.
		</p>
		<div class="flex flex-wrap items-center gap-2">
			{#if enterHref !== null}
				<Button href={enterHref} variant="woven-primary" data-testid="enter-world" disabled={reloading}
					>Enter this world</Button
				>
			{/if}
			<Dialog
				bind:open={confirmOpen}
				title="Release {heroName}?"
				description="You give up {heroName} in {worldName}. Anyone may claim it next; you can claim a free hero again from Play."
				triggerLabel="Release this hero"
				closeLabel="Keep playing"
				disabled={actionsBusy}
			>
				<Button
					variant="woven-secondary"
					disabled={actionsBusy}
					aria-busy={actionsBusy}
					data-testid="release-hero-submit"
					onclick={() => void releaseHero()}
				>
					Release hero
				</Button>
				{#if releaseError !== null}
					<p class="basis-full text-sm text-foreground" role="alert">{releaseError}</p>
				{/if}
			</Dialog>
		</div>
	{/if}
</section>
