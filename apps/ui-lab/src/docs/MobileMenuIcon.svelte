<script lang="ts">
	let { open }: { open: boolean } = $props();
</script>

<svg
	width="24"
	height="24"
	viewBox="0 0 24 24"
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	aria-hidden="true"
>
	<line
		class="origin-center transition-transform {open ? 'translate-y-[4px] rotate-45' : ''}"
		x1="3"
		y1="6"
		x2="21"
		y2="6"
	></line>
	<line class="origin-left {open ? 'opacity-0' : ''}" x1="3" y1="12" x2="12" y2="12"></line>
	<line class="origin-right {open ? 'opacity-0' : ''}" x1="12" y1="12" x2="21" y2="12"></line>
	<line
		class="origin-center transition-transform {open ? '-translate-y-[4.5px] -rotate-45' : ''}"
		x1="3"
		y1="18"
		x2="21"
		y2="18"
	></line>
</svg>
