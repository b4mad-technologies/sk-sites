<script lang="ts">
	import { AppShell, SidebarItem, SidebarSection } from "@spellkave/ui/app-shell";

	let active = $state("world-setup");
	let world = $state<string | null>("alpha");
	let sidebarOpen = $state(true);
</script>

<div class="w-full overflow-hidden rounded-[var(--radius)] border border-[color:var(--border)]" style="--sk-shell-height: 440px">
	<AppShell
		bind:sidebarOpen
		sidebarLabel="Coven"
		dockOpen={world !== null}
		dockLabel={`World ${world ?? ""}`}
		ondockclose={() => (world = null)}
	>
		{#snippet sidebar()}
			<SidebarSection title="Personas">
				<SidebarItem label="Player" detail="idle" mark="idle" active={active === "player"} onclick={() => (active = "player")} />
				<SidebarItem label="World setup" detail="working" mark="busy" active={active === "world-setup"} onclick={() => (active = "world-setup")} />
			</SidebarSection>
			<SidebarSection title="Worlds">
				<SidebarItem label="alpha" detail="playtest-mini" mark="ok" trailing="node" onclick={() => (world = "alpha")} />
				<SidebarItem label="elves" detail="elven-mini-npc" mark="failed" trailing="npc off" onclick={() => (world = "elves")} />
			</SidebarSection>
		{/snippet}
		{#snippet topbar()}<span class="text-sm font-medium">World setup</span>{/snippet}
		<div class="p-4 text-sm text-[color:var(--muted-foreground)]">Transcript and composer.</div>
		{#snippet dock()}<p class="text-sm">Node card of {world}.</p>{/snippet}
	</AppShell>
</div>
