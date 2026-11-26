<script lang="ts">
	import { cn } from "./cn";
	import { useCopyToClipboard } from "./copy-to-clipboard.svelte";
	import DemoCodeTabs from "./DemoCodeTabs.svelte";
	import HighlightedCode from "./HighlightedCode.svelte";

	let {
		source,
		fileName = "Demo.svelte",
		class: className,
		variant = "collapsed",
	}: {
		source: string;
		fileName?: string;
		class?: string;
		variant?: "preview" | "collapsed";
	} = $props();

	let open = $state(false);
	const copyToClipboard = useCopyToClipboard();

	$effect(() => {
		open = variant === "preview";
	});

	$effect(() => {
		copyToClipboard?.setCodeString(source.trim());
	});
</script>

<div data-slot="code-panel">
	<DemoCodeTabs {fileName} bind:open>
		<div
			class={cn(
				"relative overflow-hidden rounded-b-[var(--radius)] border-x border-b border-[color:var(--border)] bg-[color:var(--background)]",
				open ? "max-h-[32rem] overflow-y-auto" : "",
				className,
			)}
		>
			<HighlightedCode {source} />
		</div>
	</DemoCodeTabs>
</div>
