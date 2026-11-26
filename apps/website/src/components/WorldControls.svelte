<script lang="ts">
	import { Button } from "@spellkave/ui";

	let {
		busy = false,
		members = [],
		joinPolicy = "invite",
		onInvite,
		onRemove,
		onJoinPolicy,
		onReset,
	}: {
		busy?: boolean;
		members?: string[];
		joinPolicy?: "invite" | "open";
		onInvite: (sub: string) => void;
		onRemove: (sub: string) => void;
		onJoinPolicy: (next: "invite" | "open") => void;
		onReset: () => void;
	} = $props();

	let inviteSub = $state("");
	let removeSub = $state("");

	function submitInvite(): void {
		const sub = inviteSub.trim();
		if (sub === "") return;
		onInvite(sub);
		inviteSub = "";
	}

	function submitRemove(): void {
		const sub = removeSub.trim();
		if (sub === "") return;
		onRemove(sub);
		removeSub = "";
	}

	function confirmReset(): void {
		const ok =
			typeof window === "undefined"
				? true
				: window.confirm("resets every hero in this world");
		if (ok) onReset();
	}
</script>

<section class="mt-5 flex flex-col gap-3 border-t border-border pt-4" aria-label="Owner controls">
	<h3 class="text-sm font-semibold tracking-tight">Owner controls</h3>
	<p class="text-xs text-muted-foreground">
		Invite or remove members, toggle join policy, or reset this world. Reset wipes every hero seat.
	</p>

	<div class="flex flex-wrap items-end gap-2">
		<label class="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
			<span>Invite member (WorkOS sub)</span>
			<input
				class="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				data-testid="invite-sub"
				autocomplete="off"
				bind:value={inviteSub}
				disabled={busy}
			/>
		</label>
		<Button size="sm" disabled={busy || inviteSub.trim() === ""} onclick={submitInvite}>
			Invite
		</Button>
	</div>

	<div class="flex flex-wrap items-end gap-2">
		<label class="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs">
			<span>Remove member (WorkOS sub)</span>
			<input
				class="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
				data-testid="remove-sub"
				autocomplete="off"
				bind:value={removeSub}
				disabled={busy}
			/>
		</label>
		<Button
			size="sm"
			variant="outline"
			disabled={busy || removeSub.trim() === ""}
			onclick={submitRemove}
		>
			Remove
		</Button>
	</div>

	{#if members.length > 0}
		<ul class="text-xs text-muted-foreground" aria-label="Known members">
			{#each members as member (member)}
				<li><code class="font-mono">{member}</code></li>
			{/each}
		</ul>
	{/if}

	<div class="flex flex-wrap items-center gap-2">
		<span class="text-xs">Join policy</span>
		<Button
			size="sm"
			variant={joinPolicy === "invite" ? "default" : "outline"}
			disabled={busy || joinPolicy === "invite"}
			onclick={() => onJoinPolicy("invite")}
		>
			Invite only
		</Button>
		<Button
			size="sm"
			variant={joinPolicy === "open" ? "default" : "outline"}
			disabled={busy || joinPolicy === "open"}
			onclick={() => onJoinPolicy("open")}
		>
			Open
		</Button>
	</div>

	<div>
		<Button size="sm" variant="destructive" disabled={busy} onclick={confirmReset}>
			Reset world
		</Button>
	</div>
</section>
