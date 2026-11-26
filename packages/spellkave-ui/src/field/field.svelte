<script lang="ts">
	import { useId } from "bits-ui";
	import { loomFocus } from "../lib/loom";
	import { cn } from "../lib/utils";
	import type { FieldProps } from "./types";

	let {
		class: className,
		id = useId(),
		label,
		description,
		error,
		value = $bindable(""),
		disabled = false,
		required = false,
		name,
		type = "text",
		placeholder,
		autocomplete,
		form,
		ref = $bindable(null),
		...restProps
	}: FieldProps = $props();

	const describedBy = $derived(
		[description ? `${id}-description` : null, error ? `${id}-error` : null]
			.filter(Boolean)
			.join(" ") || undefined,
	);
</script>

<div class={cn("flex min-w-[12rem] flex-1 flex-col gap-1", className)}>
	<label
		for={id}
		class={cn(
			"text-xs font-semibold tracking-[0.08em] text-muted-foreground",
			disabled && "opacity-60",
		)}>{label}</label
	>
	<input
		bind:this={ref}
		bind:value
		data-slot="field-control"
		{id}
		{name}
		{type}
		{placeholder}
		{autocomplete}
		{form}
		{disabled}
		{required}
		aria-invalid={error ? "true" : undefined}
		aria-describedby={describedBy}
		class={cn(
			loomFocus,
			"min-h-11 rounded-[var(--radius)] border border-input bg-background px-3 text-sm font-normal tracking-normal text-foreground disabled:opacity-50",
			"aria-[invalid=true]:border-destructive",
		)}
		{...restProps}
	/>
	{#if description}
		<p
			id={`${id}-description`}
			class="max-w-[42ch] text-sm leading-6 text-muted-foreground"
		>
			{description}
		</p>
	{/if}
	{#if error}
		<p id={`${id}-error`} class="max-w-[42ch] text-sm leading-6 text-destructive">{error}</p>
	{/if}
</div>
