import DocIndex from "./doc-index.svelte";
import FreshnessBadge from "./freshness-badge.svelte";
import ReadingPath from "./reading-path.svelte";

export { DocIndex, FreshnessBadge, ReadingPath };
export { FRESH_DAYS, type Freshness, freshness, STALE_DAYS } from "./freshness";
export { mermaidConfig, mermaidDiagrams, renderMermaid } from "./mermaid";
export type {
	DocIndexEntry,
	DocIndexGroup,
	DocIndexLink,
	DocNavigate,
	DocTone,
	ReadingRole,
	ReadingStep,
} from "./types";
