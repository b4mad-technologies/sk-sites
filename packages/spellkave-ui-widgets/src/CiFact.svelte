<script lang="ts">
	/**
	 * A fact about a job or check as a small label: an icon, a few words, and
	 * a tone that says whether it is good, a problem, or unknown. Hover or
	 * focus shows the longer explanation.
	 */
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import type { CiFactProps } from "./ci-types";

	let { icon, label, tone = "neutral", hint }: CiFactProps = $props();

	const TONES: Record<NonNullable<CiFactProps["tone"]>, string> = {
		neutral: "border-border text-foreground",
		good: "border-accent/40 bg-accent/10 text-foreground",
		info: "border-primary/40 bg-primary/10 text-foreground",
		alert: "border-destructive/40 bg-destructive/10 text-destructive",
		muted: "border-dashed border-border text-muted-foreground",
	};
	const ICON_TONES: Record<NonNullable<CiFactProps["tone"]>, string> = {
		neutral: "text-muted-foreground",
		good: "text-accent",
		info: "text-primary",
		alert: "text-destructive",
		muted: "text-muted-foreground",
	};
</script>

<span
	class={["inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", TONES[tone]]}
	title={hint}
	data-slot="ci-fact"
	data-tone={tone}
>
	<CiIconGlyph name={icon} class={["size-3.5", ICON_TONES[tone]].join(" ")} />
	{label}
</span>
