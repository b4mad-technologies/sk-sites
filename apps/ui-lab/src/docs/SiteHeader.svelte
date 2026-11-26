<script lang="ts">
	import { ThemeSwitcher } from "@spellkave/ui/theme";
	import MobileNav from "./MobileNav.svelte";
	import { href } from "./router.svelte";
</script>

<header
	aria-label="Site"
	class="sticky top-0 z-50 border-b border-[color:var(--border)] bg-[color:var(--background)]/75 backdrop-blur-md"
>
	<div class="px-4">
		<div class="flex h-[70px] items-center justify-between gap-3">
			<div class="flex w-full items-center gap-1.5 md:w-auto">
				<MobileNav />
				<a
					href={href("/")}
					class="ml-2 rounded-[var(--radius)] [font-family:var(--font-display)] text-lg tracking-[-0.02em] text-[color:var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]"
				>
					Spellkave UI
				</a>
			</div>
			<div class="flex items-center justify-end">
				<ThemeSwitcher compact />
			</div>
		</div>
	</div>
</header>
