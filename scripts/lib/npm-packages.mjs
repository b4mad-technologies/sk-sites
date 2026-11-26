// The workspace packages released to npm, in dependency order.
// `nodeEntries` are the exports a plain Node process can import; the others
// load `.svelte` files and need a Svelte-aware bundler.
export const npmPackages = [
	{ name: "ui", nodeEntries: ["./tokens", "./vite"], art: true },
	{ name: "ui-widgets", nodeEntries: ["./ci-format", "./catalogue/first-sentence", "./reference-matching"] },
	{ name: "map-canvas", nodeEntries: ["./world-assets"] },
	{ name: "run-events-view", nodeEntries: [] },
	{ name: "authkit", nodeEntries: [".", "./vite"] },
];
