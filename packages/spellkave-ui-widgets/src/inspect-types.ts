// Types shared by Inspect.svelte, PlaceInspect.svelte and the package index.
//
// They live in a plain .ts module on purpose: apps/ui-lab's build runs plain
// `tsc --noEmit`, whose ambient `*.svelte` shim exposes a default export only,
// so a named type re-export from a .svelte file fails there (sk-qd7a) while
// svelte-check happily resolves it.

export type InspectPeer = { id: string; name: string };

/** A carried item: peer identity plus stack count, equipped slot and an
 * optional locator link (Maps passes href so rows are shareable). */
export type InspectItem = InspectPeer & {
	quantity?: number;
	equipped?: string | null;
	href?: string;
};

export type InspectList = {
	heading: string;
	testId?: string;
	items: InspectPeer[];
	empty?: string;
	onSelect?: (id: string) => void;
};
