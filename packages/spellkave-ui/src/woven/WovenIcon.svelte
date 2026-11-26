<script lang="ts">
	import { cn } from "../lib/utils";
	import { wovenIconUrls } from "./assets";
	import type { WovenIconProps } from "./types";

	const sizes = {
		xs: "size-4",
		sm: "size-6",
		md: "size-8",
		lg: "size-12",
		xl: "size-16",
	} as const;

	let { name, label, size = "md", class: className }: WovenIconProps = $props();
</script>

<img
	data-slot="woven-icon"
	src={wovenIconUrls[name]}
	alt={label ?? ""}
	aria-hidden={label ? undefined : "true"}
	class={cn("inline-block shrink-0 object-contain [image-rendering:pixelated]", sizes[size], className)}
/>
