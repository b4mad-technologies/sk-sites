<script lang="ts">
	import { cn } from "../lib/utils";
	import type { CodeBlockProps } from "./types";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: CodeBlockProps = $props();
</script>

<pre
	bind:this={ref}
	data-slot="code-block"
	class={cn(
		"m-0 w-full overflow-x-auto whitespace-pre rounded-[var(--radius)] border border-border p-4 font-[family-name:var(--font-code)] text-[0.8125rem] leading-6 text-foreground",
		"bg-[color-mix(in_srgb,var(--foreground)_8%,var(--background))]",
		className,
	)}
	{...restProps}><code class="font-[inherit] text-[inherit]">{@render children?.()}</code></pre>
