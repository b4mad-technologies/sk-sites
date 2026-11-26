// This package imports no .webp assets itself, but `@spellkave/ui`'s barrel
// (`export * from "./woven"` etc.) does, and its own ambient declaration for
// `*.webp` only applies inside spellkave-ui's own tsconfig program — not ours.
// TypeScript ambient module declarations are program-wide once the .d.ts is
// part of the program's root files, so re-declaring it here (same shape as
// packages/spellkave-ui-widgets/src/assets.d.ts) is what lets svelte-check
// resolve those transitively-reached imports instead of reporting them as
// missing modules.
declare module "*.webp" {
	const src: string;
	export default src;
}
