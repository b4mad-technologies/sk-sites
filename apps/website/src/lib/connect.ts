/** One public MCP URL for every world (ADR-0102 D-1). */
export const CANONICAL_MCP_URL = "https://mcp.spellkave.com/mcp";

export const CLAUDE_CODE_ADD =
	"claude mcp add --transport http spellkave https://mcp.spellkave.com/mcp";

export const CODEX_ADD = "codex mcp add spellkave --url https://mcp.spellkave.com/mcp";

export function resolveMcpUrl(indexUrl: string | undefined): string {
	const trimmed = indexUrl?.trim() ?? "";
	return trimmed === "" ? CANONICAL_MCP_URL : trimmed;
}
