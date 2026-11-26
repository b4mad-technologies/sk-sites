<script lang="ts">
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { AppShellProps } from "./types";

	const MIN = 180;
	const MAX = 440;
	let {
		sidebar,
		topbar,
		children,
		dock,
		dockOpen = false,
		dockLabel = "Details",
		ondockclose,
		sidebarOpen = $bindable(true),
		sidebarWidth = $bindable(260),
		sidebarLabel = "Sidebar",
		class: className,
	}: AppShellProps = $props();

	const clamp = (px: number) => Math.min(MAX, Math.max(MIN, Math.round(px)));
	function drag(event: PointerEvent) {
		const handle = event.currentTarget as HTMLElement;
		handle.setPointerCapture(event.pointerId);
		const startX = event.clientX;
		const startWidth = sidebarWidth;
		const move = (e: PointerEvent) => (sidebarWidth = clamp(startWidth + e.clientX - startX));
		const up = () => {
			handle.removeEventListener("pointermove", move);
			handle.removeEventListener("pointerup", up);
		};
		handle.addEventListener("pointermove", move);
		handle.addEventListener("pointerup", up);
	}
	function key(event: KeyboardEvent) {
		if (event.key === "ArrowLeft") sidebarWidth = clamp(sidebarWidth - 16);
		else if (event.key === "ArrowRight") sidebarWidth = clamp(sidebarWidth + 16);
		else return;
		event.preventDefault();
	}
</script>

<div
	data-slot="app-shell"
	data-sidebar={sidebarOpen ? "open" : "closed"}
	data-dock={dock && dockOpen ? "open" : "closed"}
	class={cn("sk-shell", className)}
	style:--sk-sidebar-width={`${sidebarWidth}px`}
>
	<nav aria-label={sidebarLabel} class="sk-shell-sidebar" inert={!sidebarOpen || undefined}>
		{@render sidebar()}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize sidebar"
			aria-valuenow={sidebarWidth}
			aria-valuemin={MIN}
			aria-valuemax={MAX}
			tabindex="0"
			class={cn(loomFocus, "sk-shell-handle")}
			onpointerdown={drag}
			onkeydown={key}
		></div>
	</nav>
	<button
		type="button"
		class="sk-shell-backdrop"
		aria-label="Close sidebar"
		tabindex="-1"
		onclick={() => (sidebarOpen = false)}
	></button>
	<div class="sk-shell-main">
		<header class="sk-shell-topbar">
			<button
				type="button"
				class={cn(loomFocus, "sk-shell-toggle")}
				aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
				aria-expanded={sidebarOpen}
				onclick={() => (sidebarOpen = !sidebarOpen)}
			>
				<span aria-hidden="true">☰</span>
			</button>
			{#if topbar}<div class="min-w-0 flex-1">{@render topbar()}</div>{/if}
		</header>
		<div class="sk-shell-content">{@render children()}</div>
	</div>
	{#if dock && dockOpen}
		<aside class="sk-shell-dock" aria-label={dockLabel}>
			<div class="sk-shell-dock-head">
				<span class="text-xs font-semibold tracking-[0.1em] uppercase">{dockLabel}</span>
				{#if ondockclose}
					<button type="button" class={cn(loomFocus, "sk-shell-toggle")} aria-label={`Close ${dockLabel}`} onclick={ondockclose}>✕</button>
				{/if}
			</div>
			<div class="sk-shell-dock-body">{@render dock()}</div>
		</aside>
	{/if}
</div>

<style>
	.sk-shell {
		display: grid;
		grid-template-columns: var(--sk-sidebar-width) minmax(0, 1fr);
		height: var(--sk-shell-height, 100dvh);
		background: var(--background);
		color: var(--foreground);
	}
	.sk-shell[data-dock="open"] {
		grid-template-columns: var(--sk-sidebar-width) minmax(0, 1fr) minmax(280px, 26vw);
	}
	.sk-shell[data-sidebar="closed"] {
		grid-template-columns: 0 minmax(0, 1fr);
	}
	.sk-shell[data-sidebar="closed"][data-dock="open"] {
		grid-template-columns: 0 minmax(0, 1fr) minmax(280px, 26vw);
	}
	.sk-shell-sidebar {
		position: relative;
		min-width: 0;
		overflow: hidden auto;
		border-right: 1px solid var(--border);
		background: var(--muted-surface, var(--card));
	}
	.sk-shell[data-sidebar="closed"] .sk-shell-sidebar {
		visibility: hidden;
	}
	.sk-shell-handle {
		position: absolute;
		top: 0;
		right: 0;
		width: 6px;
		height: 100%;
		cursor: col-resize;
		touch-action: none;
	}
	.sk-shell-handle:hover {
		background: color-mix(in oklab, var(--primary) 30%, transparent);
	}
	.sk-shell-backdrop {
		display: none;
	}
	.sk-shell-main {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
	}
	.sk-shell-topbar {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 6px 16px;
		border-bottom: 1px solid var(--border);
	}
	.sk-shell-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		min-height: 36px;
		border-radius: var(--radius);
		color: var(--muted-foreground);
	}
	.sk-shell-toggle:hover {
		color: var(--foreground);
		background: color-mix(in oklab, var(--muted) 15%, transparent);
	}
	.sk-shell-content {
		display: flex;
		min-height: 0;
		flex: 1;
		flex-direction: column;
	}
	.sk-shell-dock {
		display: flex;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
		border-left: 1px solid var(--border);
		background: var(--muted-surface, var(--card));
	}
	.sk-shell-dock-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: 52px;
		padding: 6px 12px 6px 16px;
		border-bottom: 1px solid var(--border);
	}
	.sk-shell-dock-body {
		min-height: 0;
		flex: 1;
		overflow: auto;
		padding: 16px;
	}
	@media (max-width: 780px) {
		.sk-shell,
		.sk-shell[data-dock="open"],
		.sk-shell[data-sidebar="closed"],
		.sk-shell[data-sidebar="closed"][data-dock="open"] {
			grid-template-columns: minmax(0, 1fr);
		}
		.sk-shell-sidebar {
			position: fixed;
			inset: 0 auto 0 0;
			z-index: 40;
			width: min(85vw, 320px);
			transform: translateX(0);
			transition: transform 160ms ease;
		}
		.sk-shell[data-sidebar="closed"] .sk-shell-sidebar {
			transform: translateX(-100%);
		}
		.sk-shell-handle {
			display: none;
		}
		.sk-shell[data-sidebar="open"] .sk-shell-backdrop {
			display: block;
			position: fixed;
			inset: 0;
			z-index: 30;
			background: color-mix(in oklab, var(--background) 60%, transparent);
		}
		.sk-shell-dock {
			position: fixed;
			inset: 15dvh 0 0 0;
			z-index: 20;
			border-left: 0;
			border-top: 1px solid var(--border);
			border-radius: var(--radius) var(--radius) 0 0;
		}
	}
</style>
