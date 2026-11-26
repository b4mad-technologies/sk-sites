<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "./cn";

	let {
		align = "center",
		size = "default",
		class: className,
		wrapperClass,
		name: _name,
		children,
	}: {
		align?: "start" | "center" | "end";
		size?: "xs" | "sm" | "default" | "lg";
		class?: string;
		wrapperClass?: string;
		name?: string;
		children: Snippet;
	} = $props();
</script>

<div
	class={cn(
		"relative mt-6 overflow-hidden rounded-t-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--muted-surface)]",
		wrapperClass,
	)}
	data-slot="component-preview"
>
	<div
		class={cn(
			"preview flex w-full justify-center p-8 sm:p-12",
			align === "center" && "items-center",
			align === "start" && "items-start",
			align === "end" && "items-end",
			size === "default" && "min-h-[280px]",
			size === "xs" && "min-h-[160px]",
			size === "sm" && "min-h-[220px]",
			size === "lg" && "min-h-[420px]",
			className,
		)}
	>
		<!--
		  Multi-root demos (a snippet whose root is several sibling elements)
		  land here as siblings of `.preview`'s single flex item unless we
		  give them one. `.preview` above is a row; without this wrapper,
		  each sibling root becomes its own flex item and the row splits
		  its width between them, squeezing every one (sk-jay0.7.33 fixed
		  this per demo file by adding `flex w-full flex-col` inside each
		  demo; this wrapper makes that the container's job so a future
		  demo can't reintroduce the squeeze). `items-center` is fixed
		  (not tied to `align`) because `align` has only ever controlled
		  the outer row's vertical placement via `items-{align}` above;
		  horizontal centering of a shrink-wrapped single child has always
		  come from `.preview`'s `justify-center`, unaffected by `align` —
		  keeping that split preserves `align`'s current meaning.
		-->
		<div class="flex w-full flex-col items-center">
			{@render children()}
		</div>
	</div>
</div>
