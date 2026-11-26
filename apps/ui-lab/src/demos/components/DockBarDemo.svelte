<script lang="ts">
	import type { DockBarSection } from "@spellkave/ui";
	import {
		Button,
		DockBar,
		DockBarAction,
		DockBarDivider,
		DockBarMenu,
		DockBarText,
		DockBarZone,
		DockHelpLine,
		DockNotice,
		DockStatusBar,
		DockTick,
	} from "@spellkave/ui";

	let lastPick = $state("");
	let demoTick = $state(42);
	let noticeDismissed = $state(false);
	let offerDismissed = $state(false);

	function pick(id: string) {
		lastPick = id;
	}

	const exitSections: DockBarSection[] = [
		{
			entries: [
				{ id: "exit:square", label: "Village Square", hint: "north" },
				{ id: "exit:stair", label: "Cellar Stair", hint: "down" },
			],
		},
		{ entries: [{ id: "exit:portal", label: "Shimmering Portal" }] },
	];

	const moreSections: DockBarSection[] = [
		{
			entries: [
				{
					id: "group:aldwin",
					label: "Aldwin",
					submenu: [
						{ id: "a:ask", label: "Ask about advancement" },
						{ id: "a:trade", label: "Trade" },
					],
				},
				{
					id: "group:cellar-rat",
					label: "Cellar Rat",
					submenu: [{ id: "a:attack", label: "Attack" }],
				},
			],
		},
	];
</script>

<div class="grid w-full max-w-3xl gap-4">
	<div
		class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1"
	>
		<DockBar class="sk-label">
			<DockBarZone>
				<DockBarText>HP 32{" "}·{" "}AC 15</DockBarText>
				<DockBarText tone="chip">Poisoned</DockBarText>
			</DockBarZone>

			<DockBarDivider />

			<DockBarZone>
				<DockBarText>Hamlet Gate</DockBarText>
				<DockBarMenu label="Ways out" sections={exitSections} onSelect={pick} />
			</DockBarZone>

			<DockBarDivider />

			<DockBarZone>
				<DockBarAction key={1} label="Attack" onclick={() => pick("a:1")} />
				<DockBarAction key={2} label="Defend" pending onclick={() => pick("a:2")} />
				<DockBarAction key={3} label="Rest" disabled onclick={() => pick("a:3")} />
				<DockBarMenu
					label="More…"
					accessibleLabel="More actions"
					sections={moreSections}
					onSelect={pick}
				/>
			</DockBarZone>

			<DockBarDivider />

			<DockBarZone end>
				<DockBarMenu
					accessibleLabel="Seat menu"
					sections={[{ entries: [{ id: "sign-out", label: "Sign out" }] }]}
					onSelect={pick}
				>
					{#snippet trigger()}
						<span
							class="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--border)] text-xs"
							>R</span
						>
					{/snippet}
					{#snippet header()}
						<div class="px-3 py-1.5 text-xs text-[color:var(--muted-foreground)]">
							Rowan · Fighter 1
						</div>
					{/snippet}
				</DockBarMenu>
			</DockBarZone>
		</DockBar>
	</div>

	<p class="text-xs text-[color:var(--muted-foreground)]">
		Plain muted text is info, a chip is a fact, a title followed by ▴ opens a menu, and a
		bordered pill is a one-click action. "2 Defend" is pending: it looks pressed and ignores
		clicks, with no dimming and no size change.
	</p>

	<p data-testid="dock-bar-demo-result" class="text-sm text-[color:var(--muted-foreground)]">
		{#if lastPick}Last selected: <code>{lastPick}</code>{:else}Nothing selected yet.{/if}
	</p>

	<div class="relative">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1"
		>
			<DockBar class="sk-label">
				<DockBarZone>
					<DockBarText>HP 32{" "}·{" "}AC 15</DockBarText>
				</DockBarZone>
			</DockBar>
		</div>
		{#if !noticeDismissed}
			<DockNotice
				text="It is not your turn."
				tone="warn"
				onDismiss={() => (noticeDismissed = true)}
			/>
		{/if}
	</div>

	<div class="relative mt-10">
		<div
			class="rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-1"
		>
			<DockBar class="sk-label">
				<DockBarZone>
					<DockBarText>HP 32{" "}·{" "}AC 15</DockBarText>
				</DockBarZone>
			</DockBar>
		</div>
		{#if !offerDismissed}
			<DockNotice
				text="Fight begins."
				action={{ label: "Map view", onSelect: () => ((lastPick = "offer:map-view"), (offerDismissed = true)) }}
				onDismiss={() => (offerDismissed = true)}
			/>
		{/if}
	</div>

	<p class="text-xs text-[color:var(--muted-foreground)]">
		With `action`, a notice makes one offer (a layout hint): the app never changes the layout on
		its own, the player takes the offer or dismisses it.
	</p>

	<p class="text-xs text-[color:var(--muted-foreground)]">
		A `DockNotice` is the one surface above a dock host for a state message the bar itself has
		no room for — reconnecting, a slow pending act, or (shown here, "warn" tone) a refusal —
		dismissible with the × when the caller gives `onDismiss`.
	</p>
</div>

{#snippet sampleYou()}<DockBarText>HP 32 · AC 15</DockBarText><DockBarText>Poisoned</DockBarText>{/snippet}
{#snippet samplePlace()}<DockBarText>Hamlet Gate</DockBarText><DockBarMenu label="3 ways out" sections={exitSections} onSelect={pick} />{/snippet}
{#snippet sampleTick()}<DockTick tick={demoTick} />{/snippet}
<Button type="button" variant="outline" size="sm" onclick={() => demoTick++}>Advance status tick</Button>
<section aria-label="Compact status and help" class="grid w-full gap-2">
 <DockHelpLine message="The latest prompt or outcome stays on one line, even with long authored text." keys="Tab complete · Enter attempt" />
 <DockStatusBar groups={[{id:"you",label:"You",content:sampleYou},{id:"place",label:"Place",content:samplePlace}]} trailing={sampleTick} />
</section>

<section aria-label="Game status states" class="flex flex-wrap gap-4">
	<DockTick tick={demoTick} runningText={String(demoTick)} connection="Connected" action="Last action received." />
	<DockTick tick={demoTick} state="waiting" connection="Connected" action="Example action pending for more than two seconds." />
	<DockTick tick={demoTick} state="reconnecting" connection="Reconnecting" action="Last action received." />
	<DockTick tick={demoTick} state="disconnected" connection="Disconnected" action="Last action received." />
</section>
