<script lang="ts">
	import MobileLink from "./MobileLink.svelte";
	import MobileMenuIcon from "./MobileMenuIcon.svelte";
	import { NAV_GROUPS } from "./pages";
	import { href, router } from "./router.svelte";

	let open = $state(false);

	function close() {
		open = false;
	}
</script>

<button
	type="button"
	class="mr-2 px-0 text-base md:hidden [&_svg]:size-6"
	aria-expanded={open}
	onclick={() => (open = !open)}
>
	<MobileMenuIcon {open} />
	<span class="sr-only">Toggle menu</span>
</button>

{#if open}
	<div
		class="fixed inset-x-0 top-[70px] z-50 h-[calc(100vh-70px)] overflow-y-auto border-t border-[color:var(--border)] bg-[color:var(--background)]/95 backdrop-blur md:hidden"
	>
		<div class="flex flex-col gap-2 pb-8">
			{#each NAV_GROUPS as navItem, index (navItem.title)}
				<div class="flex flex-col pt-3" data-index={index}>
					<h4 class="mb-2 px-5 text-sm font-medium uppercase text-[color:var(--muted-foreground)]">
						{navItem.title}
					</h4>
					<div class="flex flex-col">
						{#each navItem.items as item (item.path)}
							<MobileLink
								href={href(item.path)}
								data-active={item.path === router.path}
								onClose={close}
								class="px-5 py-1.5 text-[22px] font-normal text-[color:var(--foreground)] data-[active=true]:font-semibold"
							>
								{item.title}
							</MobileLink>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
