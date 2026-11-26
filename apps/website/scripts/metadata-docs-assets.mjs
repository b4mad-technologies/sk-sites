/** Technical source-to-public asset mounts. No editorial content belongs here. */
export const DOCS_ART_ASSETS = [
	{ pathPrefix: "srd-art", source: "packages/spellkave-srd-cc/assets/srd-art", publicMount: "/srd-art", label: "SRD" },
	{ pathPrefix: "kavemouth-art", source: "packages/spellkave-adventure-kavemouth/assets/kavemouth-art", publicMount: "/compendium/adventures/kavemouth/art", label: "Kavemouth" },
];

export const DOCS_MODULE_ASSETS = [
	{ module: "kavemouth-maps", pathPrefix: "maps", source: "packages/spellkave-adventure-kavemouth/assets/kavemouth-maps/maps", publicMount: "/compendium/adventures/kavemouth/maps", label: "Kavemouth maps" },
];
