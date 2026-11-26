<script lang="ts">
	import type { Snippet } from "svelte";
	import SidebarNav from "./SidebarNav.svelte";
	import SiteHeader from "./SiteHeader.svelte";

	let { children }: { children: Snippet } = $props();
</script>

<SiteHeader />
<div class="min-h-[calc(100vh-70px)]">
	<div
		class="flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10"
	>
		<SidebarNav />
		{@render children()}
	</div>
</div>
