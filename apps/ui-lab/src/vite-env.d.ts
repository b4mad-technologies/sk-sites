/// <reference types="vite/client" />

declare module "virtual:spellkave-design-md" {
	import type { ParsedDesignMd } from "./primitives/design-catalog";
	const parsed: ParsedDesignMd;
	export default parsed;
}
