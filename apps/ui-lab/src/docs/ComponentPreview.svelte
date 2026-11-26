<script lang="ts">
	import type { Snippet } from "svelte";
	import { setCopyToClipboard } from "./copy-to-clipboard.svelte";
	import DemoCodeContainer from "./DemoCodeContainer.svelte";
	import DemoContainer from "./DemoContainer.svelte";

	let {
		preview,
		source,
		fileName,
		class: className,
		containerClass,
		size,
		name,
		variant = "collapsed",
	}: {
		fileName?: string;
		preview: Snippet;
		source: string;
		class?: string;
		containerClass?: string;
		size?: "xs" | "sm" | "default" | "lg";
		name: string;
		variant?: "preview" | "collapsed";
	} = $props();

	setCopyToClipboard();
</script>

<DemoContainer wrapperClass={containerClass} {size} {name}>
	{@render preview()}
</DemoContainer>
<DemoCodeContainer {variant} {fileName} class={className} {source} />
