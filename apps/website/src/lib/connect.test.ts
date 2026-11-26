import { describe, expect, it } from "vitest";

import { CANONICAL_MCP_URL, CLAUDE_CODE_ADD, CODEX_ADD, resolveMcpUrl } from "./connect";

describe("connect an AI", () => {
	it("is one https MCP URL for every client", () => {
		expect(CANONICAL_MCP_URL).toBe("https://mcp.spellkave.com/mcp");
		expect(resolveMcpUrl(undefined)).toBe(CANONICAL_MCP_URL);
		expect(resolveMcpUrl("")).toBe(CANONICAL_MCP_URL);
		expect(resolveMcpUrl("https://mcp.spellkave.com/mcp")).toBe(CANONICAL_MCP_URL);
	});

	it("documents the Claude Code and Codex add commands against that URL", () => {
		expect(CLAUDE_CODE_ADD).toContain("--transport http");
		expect(CLAUDE_CODE_ADD).toContain(CANONICAL_MCP_URL);
		expect(CODEX_ADD).toBe("codex mcp add spellkave --url https://mcp.spellkave.com/mcp");
		expect(CODEX_ADD).toContain("--url");
	});
});
