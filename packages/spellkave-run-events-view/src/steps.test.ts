import { describe, expect, it } from "vitest";

import { parseRunEventsJsonl, stepHeadline, toolLabel } from "./steps.ts";

const sample = [
	JSON.stringify({
		v: "agent-run-events/v1",
		run_id: "mcp-1",
		run_kind: "mcp_tool_call",
		actor_id: "42",
		role: "PLAYER",
		controller_kind: "llm_player",
		driver: "remote-mcp",
		seed: "",
		ts: "2026-08-20T12:00:00.000Z",
		type: "run_start",
		data: { correlation_id: "c1", world_slug: "kavemouth-1", subject_prefix: "abcdef0123456789" },
	}),
	JSON.stringify({
		v: "agent-run-events/v1",
		run_id: "mcp-1",
		run_kind: "mcp_tool_call",
		actor_id: "42",
		role: "PLAYER",
		controller_kind: "llm_player",
		driver: "remote-mcp",
		seed: "",
		ts: "2026-08-20T12:00:01.000Z",
		type: "tool_call",
		data: {
			tool_name: "spellkave_scene",
			text: "You stand in the inn.",
			params: {},
			is_error: false,
			duration_ms: 12,
			correlation_id: "c1",
			world_slug: "kavemouth-1",
			subject_prefix: "abcdef0123456789",
		},
	}),
	JSON.stringify({
		v: "agent-run-events/v1",
		run_id: "mcp-1",
		run_kind: "mcp_tool_call",
		actor_id: "42",
		role: "PLAYER",
		controller_kind: "llm_player",
		driver: "remote-mcp",
		seed: "",
		ts: "2026-08-20T12:00:02.000Z",
		type: "run_end",
		data: { terminal: "completed", correlation_id: "c1" },
	}),
	'{"v":"spellkave-operator/v1","kind":"doctor_check"}',
].join("\n");

describe("parseRunEventsJsonl", () => {
	it("defaults to tool_call only (hides lifecycle brackets)", () => {
		const steps = parseRunEventsJsonl(sample);
		expect(steps).toHaveLength(1);
		expect(steps[0]?.type).toBe("tool_call");
		expect(steps[0]?.label).toBe("scene");
		expect(steps[0]?.actor_id).toBe("42");
		expect(steps[0]?.identity).toBe("abcdef0123456789");
		expect(steps[0]?.world_slug).toBe("kavemouth-1");
	});

	it("includeLifecycle keeps run_start/run_end", () => {
		const steps = parseRunEventsJsonl(sample, { includeLifecycle: true });
		expect(steps.map((s) => s.type)).toEqual(["run_start", "tool_call", "run_end"]);
	});

	it("labels tools and headlines prose", () => {
		expect(toolLabel("spellkave_scene")).toBe("scene");
		expect(stepHeadline({ text: "You stand in the inn.", observation: null })).toBe(
			"You stand in the inn.",
		);
	});
});
