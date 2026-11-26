<script lang="ts">
	import { Artwork } from "@spellkave/ui-widgets";
	import { loadWorldImage, WorldAssetError, type WorldAssetFailure } from "./world-assets";

	export type WorldArtworkState = "absent" | "loading" | "ready" | "error";

	type AssetReference = { path: string; hash: string };

	let {
		art = null,
		gatewayOrigin,
		slug,
		token,
		label,
		compact = false,
		onStateChange,
	}: {
		art?: AssetReference | null;
		gatewayOrigin: string;
		slug: string;
		token: string;
		label: string;
		compact?: boolean;
		onStateChange?: (state: WorldArtworkState) => void;
	} = $props();

	let src = $state<string | undefined>();
	let errorText = $state("Image unavailable");
	let imageState = $state<"loading" | "ready" | "error">("loading");
	const failureCopy: Record<WorldAssetFailure, string> = {
		connection: "Image connection unavailable",
		reference: "Image reference unavailable",
		missing: "Image missing from this world",
		access: "Image access denied",
		transport: "Image could not be loaded",
		media: "Image format unsupported",
		size: "Image too large",
		integrity: "Image does not match this world version",
	};
	const requestKey = $derived(JSON.stringify({ art, origin: gatewayOrigin, world: slug, access: token }));

	$effect(() => {
		const { art: reference, origin, world, access } = JSON.parse(requestKey) as {
			art?: AssetReference | null;
			origin: string;
			world: string;
			access: string;
		};
		const abort = new AbortController();
		let url: string | undefined;
		src = undefined;
		imageState = "loading";
		errorText = "Image unavailable";
		if (reference)
			void loadWorldImage(reference, origin, world, access, abort.signal)
				.then((blob) => {
					if (abort.signal.aborted) return;
					url = URL.createObjectURL(blob);
					src = url;
				})
				.catch((error) => {
					if (abort.signal.aborted) return;
					errorText = error instanceof WorldAssetError ? failureCopy[error.reason] : "Image could not be loaded";
					imageState = "error";
				});
		return () => {
			abort.abort();
			if (url) URL.revokeObjectURL(url);
		};
	});

	$effect(() => {
		onStateChange?.(art ? imageState : "absent");
	});
</script>

{#if art}
	<Artwork
		{src}
		alt={label}
		state={imageState}
		{errorText}
		{compact}
		onLoad={() => (imageState = "ready")}
		onError={() => {
			errorText = "Image could not be displayed";
			imageState = "error";
		}}
	/>
{/if}
