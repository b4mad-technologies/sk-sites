/** Technical source-to-public asset mounts. No editorial content belongs here. */
export const DOCS_ART_ASSETS = [
	{ pathPrefix: "srd-art", source: "packages/spellkave-srd-cc/assets/srd-art", publicMount: "/srd-art", label: "SRD" },
	{ pathPrefix: "elven-mini-art", source: "packages/spellkave-adventure-elven-mini/assets/elven-mini-art", publicMount: "/compendium/adventures/elven-mini/art", label: "Elven Mini" },
];

export const DOCS_MODULE_ASSETS = [
	{ module: "ccc3-maps", pathPrefix: "maps", source: "packages/spellkave-adventure-elven-mini/assets/ccc3-maps/maps", publicMount: "/compendium/adventures/elven-mini/maps", label: "Elven Mini maps" },
];
