<script lang="ts">
	import { CI_ICONS, type CiIcon } from "./ci-icons";

	let { name, class: className = "size-3.5" }: { name: CiIcon; class?: string } = $props();
</script>

<svg
	viewBox="0 0 20 20"
	fill="none"
	stroke="currentColor"
	stroke-width="1.6"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class={["shrink-0", className]}
>
	<path d={CI_ICONS[name]} />
</svg>
