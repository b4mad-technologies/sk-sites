<script lang="ts" module>
	import type { ButtonProps } from "./variants";
</script>

<script lang="ts">
	import { cn } from "../lib/utils";
	import { buttonVariants } from "./variants";

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		target = undefined,
		rel = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();

	const wovenFrame = $derived(
		variant === "hero" || variant === "woven-primary"
			? "loom-fill"
			: variant === "hero-outline" || variant === "woven-secondary"
				? "loom-outline"
				: variant === "woven-icon"
					? size === "seal"
						? "seal"
						: "square"
					: undefined,
	);
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		{target}
		{rel}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
		data-woven-frame={wovenFrame}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
		data-woven-frame={wovenFrame}
	>
		{@render children?.()}
	</button>
{/if}

<style>
	/* Woven frames read their material from theme tokens (tokens/styles.css and
	 * tokens/themes/*.css): Living Grammar hatches and stitches, Loom Paper
	 * stamps and rules, Worlds in Motion bevels enamel. Markup stays the same. */
	:global([data-slot="button"][data-woven-frame]) {
		isolation: isolate;
		border-color: transparent;
		background-position: center;
		background-repeat: repeat;
		transition:
			filter 160ms ease-out,
			box-shadow 160ms ease-out,
			transform 120ms ease-out,
			background-color 160ms ease-out;
	}

	:global([data-slot="button"][data-woven-frame="loom-fill"]),
	:global([data-slot="button"][data-woven-frame="loom-outline"]) {
		border-radius: var(--radius);
	}

	:global([data-slot="button"][data-woven-frame="loom-fill"]) {
		border: 1px solid var(--control-fill-border);
		color: var(--primary-foreground);
		background-color: var(--primary);
		background-image: var(--control-fill-image);
		box-shadow: var(--control-fill-shadow), var(--control-shadow);
	}

	:global([data-slot="button"][data-woven-frame="loom-outline"]) {
		border: 1px solid var(--control-outline-border);
		color: var(--foreground);
		background-color: var(--background);
		background-image: var(--control-outline-image);
		box-shadow: var(--control-outline-shadow), var(--control-shadow);
	}

	:global([data-slot="button"][data-woven-frame="square"]),
	:global([data-slot="button"][data-woven-frame="seal"]) {
		position: relative;
		background-color: var(--background);
		background-image: var(--control-outline-image);
		box-shadow:
			inset 0 0 0 3px var(--background),
			inset 0 0 0 4px color-mix(in srgb, var(--primary) 70%, var(--border)),
			var(--control-shadow);
	}

	:global([data-slot="button"][data-woven-frame="square"]) {
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	:global([data-slot="button"][data-woven-frame="seal"]) {
		border: 1px solid var(--border);
		border-radius: 9999px;
	}

	:global([data-slot="button"][data-woven-frame="seal"]::before) {
		content: "";
		position: absolute;
		inset: 6px;
		border-radius: 9999px;
		border: 1px dotted color-mix(in srgb, var(--primary) 60%, transparent);
		pointer-events: none;
	}

	:global([data-slot="button"][data-woven-frame="loom-fill"]:hover),
	:global([data-slot="button"][data-woven-frame="loom-fill"][data-state-preview="hover"]) {
		filter: brightness(1.08) saturate(1.04);
		box-shadow: var(--control-fill-shadow), var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame="loom-outline"]:hover),
	:global([data-slot="button"][data-woven-frame="loom-outline"][data-state-preview="hover"]) {
		background-color: color-mix(in srgb, var(--muted-surface) 70%, var(--background));
		box-shadow: var(--control-outline-shadow), var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame="square"]:hover),
	:global([data-slot="button"][data-woven-frame="seal"]:hover),
	:global([data-slot="button"][data-woven-frame="square"][data-state-preview="hover"]),
	:global([data-slot="button"][data-woven-frame="seal"][data-state-preview="hover"]) {
		filter: brightness(1.16) saturate(1.06);
		box-shadow:
			inset 0 0 0 3px var(--background),
			inset 0 0 0 4px color-mix(in srgb, var(--primary) 70%, var(--border)),
			var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame]:focus-visible),
	:global([data-slot="button"][data-woven-frame][data-state-preview="focus"]) {
		outline: 2px solid var(--ring);
		outline-offset: 4px;
	}

	:global([data-slot="button"][data-woven-frame="loom-fill"]:focus-visible),
	:global([data-slot="button"][data-woven-frame="loom-fill"][data-state-preview="focus"]) {
		box-shadow:
			var(--control-fill-shadow),
			0 0 0 3px color-mix(in srgb, var(--ring) 24%, transparent),
			var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame="loom-outline"]:focus-visible),
	:global([data-slot="button"][data-woven-frame="loom-outline"][data-state-preview="focus"]) {
		box-shadow:
			var(--control-outline-shadow),
			0 0 0 3px color-mix(in srgb, var(--ring) 24%, transparent),
			var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame="square"]:focus-visible),
	:global([data-slot="button"][data-woven-frame="seal"]:focus-visible),
	:global([data-slot="button"][data-woven-frame="square"][data-state-preview="focus"]),
	:global([data-slot="button"][data-woven-frame="seal"][data-state-preview="focus"]) {
		box-shadow:
			inset 0 0 0 3px var(--background),
			inset 0 0 0 4px color-mix(in srgb, var(--primary) 70%, var(--border)),
			0 0 0 3px color-mix(in srgb, var(--ring) 24%, transparent),
			var(--control-shadow-hover);
	}

	:global([data-slot="button"][data-woven-frame]:active),
	:global([data-slot="button"][data-woven-frame][data-state-preview="pressed"]) {
		transform: translateY(1px) scale(0.985);
	}

	:global([data-slot="button"][data-woven-frame="loom-fill"]:active),
	:global([data-slot="button"][data-woven-frame="loom-fill"][data-state-preview="pressed"]) {
		filter: brightness(0.96);
		box-shadow: var(--control-fill-shadow), 0 0.2rem 0.4rem color-mix(in srgb, var(--background) 60%, transparent);
	}

	:global([data-slot="button"][data-woven-frame="loom-outline"]:active),
	:global([data-slot="button"][data-woven-frame="loom-outline"][data-state-preview="pressed"]) {
		box-shadow: var(--control-outline-shadow), 0 0.2rem 0.4rem color-mix(in srgb, var(--background) 60%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		:global([data-slot="button"][data-woven-frame]) {
			transition: none;
		}

		:global([data-slot="button"][data-woven-frame]:active),
		:global([data-slot="button"][data-woven-frame][data-state-preview="pressed"]) {
			transform: none;
		}
	}
</style>
