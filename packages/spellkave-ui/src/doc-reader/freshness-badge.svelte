<script lang="ts">
	/**
	 * How long ago a document last changed, as a small pill: green up to a
	 * month, plain up to half a year, dashed after that. Hover shows the date
	 * and commit.
	 */
	import { cn } from "../lib/utils";
	import { freshness } from "./freshness";
	import { DOT_CLASSES, TONE_CLASSES } from "./tones";

	let {
		date,
		commit,
		href,
		now,
		class: className,
	}: {
		/** ISO date of the last commit; `null` shows "date unknown". */
		date: string | null;
		commit?: string;
		/** Where the commit can be read, e.g. on GitHub. */
		href?: string;
		now?: Date;
		class?: string;
	} = $props();

	const fresh = $derived(freshness(date, now));
	const title = $derived(
		fresh && date
			? `Last commit ${new Date(date).toISOString().slice(0, 10)}${commit ? ` (${commit.slice(0, 10)})` : ""}`
			: "No commit date: the file is new or not committed",
	);
	const tone = $derived(fresh?.tone ?? "muted");
</script>

<svelte:element
	this={href && fresh ? "a" : "span"}
	href={href && fresh ? href : undefined}
	target={href && fresh ? "_blank" : undefined}
	rel={href && fresh ? "noreferrer" : undefined}
	class={cn(
		"inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap",
		TONE_CLASSES[tone],
		href && fresh ? "hover:underline underline-offset-2" : "",
		className,
	)}
	{title}
	data-slot="freshness-badge"
	data-tone={tone}
>
	<span class={["size-1.5 rounded-full", DOT_CLASSES[tone]]} aria-hidden="true"></span>
	{fresh?.label ?? "date unknown"}
</svelte:element>
