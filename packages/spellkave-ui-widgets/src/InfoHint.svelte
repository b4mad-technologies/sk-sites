<script lang="ts">
	/**
	 * A tiny "why" glyph for a line whose prose already said what happened but
	 * not the world's own raw reason (sk-j8e.4: a refusal code + optional
	 * `failure_detail` behind an act's rendered outcome). The reason opens as
	 * the design system's tooltip on hover or focus and is the trigger's
	 * accessible name, so a screen reader hears it without opening anything.
	 */
	import { Tooltip } from "@spellkave/ui";

	let { label, class: className }: { label: string; class?: string } = $props();
</script>

<Tooltip
	content={label}
	triggerAriaLabel={label}
	delayDuration={0}
	triggerClass={className ??
		"inline-flex cursor-help border-0 bg-transparent p-0 align-baseline text-muted-foreground leading-none"}
>
	ⓘ
</Tooltip>
