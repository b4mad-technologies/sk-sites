<script lang="ts">
	import { Checkbox as BitsCheckbox, useId } from "bits-ui";
	import { cn } from "../lib/utils";
	import type { CheckboxProps } from "./types";

	let {
		class: className,
		id = useId(),
		label,
		description,
		error,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		disabled = false,
		required = false,
		name,
		value,
		form,
		ref = $bindable(null),
	}: CheckboxProps = $props();

	const describedBy = $derived(
		[
			description ? `${id}-description` : null,
			error ? `${id}-error` : null,
		].filter(Boolean).join(" ") || undefined,
	);
</script>

<div class={cn("group/checkbox grid gap-2 text-[color:var(--foreground)]", className)}>
	<div class="flex items-start gap-3">
		<BitsCheckbox.Root
			data-slot="checkbox-control"
			{id}
			bind:checked
			bind:indeterminate
			bind:ref
			{disabled}
			{required}
			{name}
			{value}
			{form}
			aria-invalid={error ? "true" : undefined}
			aria-describedby={describedBy}
			class={cn(
				"peer/checkbox mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[var(--radius)] border border-transparent text-[color:var(--primary)] outline-none transition-all duration-200 ease-out",
				"focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-0",
				"data-[state=checked]:text-[color:var(--primary-foreground)]",
				"data-[state=indeterminate]:text-[color:var(--primary-foreground)]",
				"aria-[invalid=true]:border-[color:var(--destructive)] aria-[invalid=true]:text-[color:var(--destructive)]",
				"disabled:pointer-events-none disabled:opacity-40",
			)}
		>
			{#snippet children({ checked: currentChecked, indeterminate: currentIndeterminate })}
				{#if currentIndeterminate}
					<svg viewBox="0 0 16 16" aria-hidden="true" class="size-3.5">
						<path d="M3 8h10" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" />
					</svg>
				{:else if currentChecked}
					<svg viewBox="0 0 16 16" aria-hidden="true" class="size-3.5">
						<path d="M12.5 4.5 6.6 10.4 3.5 7.3" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.1" />
					</svg>
				{/if}
			{/snippet}
		</BitsCheckbox.Root>

		<div class="grid gap-1">
			<label for={id} class={cn("text-sm font-medium tracking-[0.03em]", disabled && "opacity-60")}>{label}</label>
			{#if description}
				<p id={`${id}-description`} class="max-w-[42ch] text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
			{/if}
			{#if error}
				<p id={`${id}-error`} class="max-w-[42ch] text-sm leading-6 text-[color:var(--destructive)]">{error}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	:global([data-slot="checkbox-control"]) {
		background-color: var(--card);
		background-image: none;
		border: 1px solid var(--border);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 70%, var(--border));
	}

	:global([data-slot="checkbox-control"]:hover) {
		filter: brightness(1.18);
	}

	:global([data-slot="checkbox-control"][data-state="checked"]),
	:global([data-slot="checkbox-control"][data-state="indeterminate"]) {
		background-color: var(--primary);
		background-image: var(--weave-gold);
	}
</style>
