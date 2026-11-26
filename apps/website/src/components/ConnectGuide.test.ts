import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import { CANONICAL_MCP_URL, CLAUDE_CODE_ADD, CODEX_ADD } from "../lib/connect";
import ConnectGuide from "./ConnectGuide.svelte";

describe("ConnectGuide", () => {
	it("shows one MCP URL and the four client paths", () => {
		render(ConnectGuide, { mcpUrl: CANONICAL_MCP_URL });
		expect(screen.getByText("Connect an AI")).toBeTruthy();
		expect(screen.getAllByText(CANONICAL_MCP_URL).length).toBeGreaterThan(0);
		expect(screen.getByText("Claude.ai (web / iOS / Android)")).toBeTruthy();
		expect(screen.getByText(/Settings → Connectors → Add custom connector/)).toBeTruthy();
		expect(screen.getByText(/Always required/)).toBeTruthy();
		expect(screen.getByText(/Use Anthropic's hosted client metadata/)).toBeTruthy();
		expect(screen.getByText(/same account you used on this website/)).toBeTruthy();
		expect(screen.getByText(/Where am I/)).toBeTruthy();
		expect(screen.getByText(CLAUDE_CODE_ADD)).toBeTruthy();
		expect(screen.getByText(CODEX_ADD)).toBeTruthy();
		expect(screen.getAllByText(/Developer Mode/).length).toBeGreaterThan(0);
		expect(screen.getByText(/availability depends on the/)).toBeTruthy();
		expect(screen.getByText(/401/)).toBeTruthy();
		expect(screen.getAllByText(/claim a hero/).length).toBeGreaterThan(0);
		expect(
			screen.getAllByRole<HTMLAnchorElement>("link", { name: "play.spellkave.com" })[0]?.href,
		).toBe("https://play.spellkave.com/");
		expect(screen.getByText(/never a Spellkave username or password/)).toBeTruthy();
	});
});
