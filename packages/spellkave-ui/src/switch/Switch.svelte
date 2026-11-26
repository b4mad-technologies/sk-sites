<script lang="ts">
	import { Switch as BitsSwitch, useId } from "bits-ui";
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { SwitchProps } from "./types";

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		name,
		onCheckedChange,
		class: className,
	}: SwitchProps = $props();

	const id = useId();
</script>

<div class={cn("grid gap-2 text-[color:var(--foreground)]", className)}>
	<div class="flex items-start gap-3">
		<BitsSwitch.Root
			{id}
			bind:checked
			{disabled}
			{name}
			{onCheckedChange}
			data-slot="switch"
			class={cn(
				loomFocus,
				"inline-flex h-7 w-12 shrink-0 items-center rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--muted)] p-0.5",
				"data-[state=checked]:bg-[color:var(--primary)] disabled:opacity-40",
			)}
		>
			<BitsSwitch.Thumb
				class="block size-5 rounded-[var(--radius)] bg-[color:var(--foreground)] motion-safe:transition-transform motion-reduce:transition-none data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-[color:var(--primary-foreground)]"
			/>
		</BitsSwitch.Root>
		<div class="grid gap-1">
			<label for={id} class={cn("text-sm font-medium tracking-[0.03em]", disabled && "opacity-60")}>{label}</label>
			{#if description}
				<p class="max-w-[42ch] text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
			{/if}
		</div>
	</div>
</div>
