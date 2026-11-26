<script lang="ts">
	import { Button } from "@spellkave/ui";
	import {
		WovenCorner,
		WovenDivider,
		WovenIcon,
		type WovenIconName,
		wovenTextureUrls,
	} from "@spellkave/ui/woven";

	const wovenIcons: { name: WovenIconName; label: string }[] = [
		{ name: "enter", label: "Enter" },
		{ name: "observe", label: "Observe" },
		{ name: "worlds", label: "Worlds" },
		{ name: "maps", label: "Maps" },
		{ name: "docs", label: "Docs" },
		{ name: "sign-in", label: "Sign in" },
		{ name: "hero", label: "Hero" },
		{ name: "chronicle", label: "Chronicle" },
		{ name: "invite", label: "Invite" },
		{ name: "search", label: "Search" },
		{ name: "settings", label: "Settings" },
		{ name: "close", label: "Close" },
	];
</script>

<div
	class="relative isolate w-full overflow-hidden border border-[color:var(--border)] px-5 py-8 text-[color:var(--paper-ink)]"
	style={`background-color:var(--paper);background-image:linear-gradient(color-mix(in srgb, var(--paper) 82%, transparent),color-mix(in srgb, var(--paper) 82%, transparent)),url("${wovenTextureUrls.paper}");background-size:auto,13rem 13rem;`}
>
	<WovenCorner variant="branch" position="top-left" />
	<WovenCorner variant="stair" position="top-right" />
	<WovenCorner variant="ladder" position="bottom-left" />
	<WovenCorner variant="bloom" position="bottom-right" />

	<div class="relative z-10">
		<div class="flex flex-wrap items-center gap-4">
			<Button variant="woven-primary">Enter</Button>
			<Button variant="woven-secondary">Watch a world</Button>
			<Button variant="woven-icon" size="compact" aria-label="Open settings">
				<WovenIcon name="settings" size="sm" />
			</Button>
			<Button variant="woven-icon" size="seal" aria-label="Search worlds">
				<WovenIcon name="search" size="sm" />
			</Button>
		</div>
		<WovenDivider variant="knot" class="my-6" />
		<ul class="grid grid-cols-4 gap-4 sm:grid-cols-6" aria-label="Woven icon set">
			{#each wovenIcons as icon}
				<li class="grid justify-items-center gap-2 text-center">
					<WovenIcon name={icon.name} size="lg" />
					<span class="text-xs font-semibold tracking-[0.03em]">{icon.label}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>
