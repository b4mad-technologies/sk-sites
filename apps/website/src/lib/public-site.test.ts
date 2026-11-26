import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	compactParams,
	fetchGatewayTranscript,
	fetchTranscript,
	joinUrl,
	mcpOriginFromIndexUrl,
	parsePublicSiteIndex,
	parseTranscriptJsonl,
	publicSiteBaseUrl,
	stepHeadline,
	toolLabel,
} from "./public-site";

const demoData = resolve(import.meta.dirname, "../../public/demo-data");

describe("public site base URL", () => {
	it("falls back to the checked-in sample and trims trailing slashes", () => {
		expect(publicSiteBaseUrl({})).toBe("/demo-data");
		expect(publicSiteBaseUrl({ VITE_SPELLKAVE_PUBLIC_SITE_URL: "" })).toBe("/demo-data");
		expect(publicSiteBaseUrl({ VITE_SPELLKAVE_PUBLIC_SITE_URL: "https://cdn.example/x/" })).toBe(
			"https://cdn.example/x",
		);
		expect(joinUrl("https://cdn.example/x/", "/worlds/a.jsonl")).toBe(
			"https://cdn.example/x/worlds/a.jsonl",
		);
	});
});

describe("public site index", () => {
	it("parses the checked-in sample (keeps sample + publisher shapes in sync)", () => {
		const raw = JSON.parse(readFileSync(resolve(demoData, "index.json"), "utf8"));
		const index = parsePublicSiteIndex(raw);
		expect(index.sample).toBe(true);
		expect(index.mcp.url).toMatch(/\/mcp$/);
		expect(index.worlds.map((w) => w.slug)).toEqual(["demo1", "demo2", "demo3", "demo4"]);
		expect(index.worlds[0]?.db).toBe("spellkave-demo1");
		expect(index.worlds[0]?.adventure).toBe("elven-mini");
		expect(index.worlds[1]?.db).toBeUndefined();
		expect(index.transcripts?.status).toBe("sample");
		expect(index.transcripts?.until).toBeUndefined();
	});

	it("rejects other versions and malformed worlds", () => {
		expect(() => parsePublicSiteIndex({ v: "nope" })).toThrow("spellkave-public-site/v1");
		expect(() =>
			parsePublicSiteIndex({
				v: "spellkave-public-site/v1",
				mcp: { url: "https://x/mcp" },
				worlds: [{ slug: 1 }],
			}),
		).toThrow("worlds[0]");
	});
});

describe("transcript JSONL", () => {
	it("keeps tool_call rows, tolerates junk, and falls back to a compact observation", () => {
		const jsonl = [
			"",
			"not json",
			JSON.stringify({ type: "run_start", ts: "2026-08-18T20:00:00.000Z", data: {} }),
			JSON.stringify({
				type: "tool_call",
				ts: "2026-08-18T20:00:01.000Z",
				data: {
					tool_name: "spellkave_scene",
					params: {},
					text: "You stand in the inn.\nExits: door.",
					observation: { rev: "r1" },
					is_error: false,
					duration_ms: 12,
					correlation_id: "c1",
				},
			}),
			JSON.stringify({
				type: "tool_call",
				ts: "2026-08-18T20:00:02.000Z",
				data: { tool: "spellkave_move", params: { to: "door" }, observation: { moved: true } },
			}),
		].join("\n");
		const steps = parseTranscriptJsonl(jsonl);
		expect(steps).toHaveLength(2);
		expect(steps[0]).toMatchObject({
			tool: "spellkave_scene",
			label: "scene",
			text: "You stand in the inn.\nExits: door.",
			duration_ms: 12,
			correlation_id: "c1",
			is_error: false,
		});
		expect(steps[1]).toMatchObject({
			label: "move",
			text: '{"moved":true}',
			duration_ms: null,
			correlation_id: null,
		});
		expect(compactParams(steps[1]?.params)).toBe('{"to":"door"}');
		expect(compactParams({})).toBe("");
		expect(toolLabel("spellkave_manipulate")).toBe("manipulate");
	});

	it("headlines JSON-shaped tool text from its first primitive leaves", () => {
		expect(stepHeadline({ text: "You stand in the inn.\nExits: door.", observation: null })).toBe(
			"You stand in the inn.",
		);
		const json = JSON.stringify(
			{
				self: {
					actor_id: "1",
					entity_name: "Renn the Roadwarden",
					conditions: { count: 0, items: [] },
				},
				hp: 10,
			},
			null,
			2,
		);
		expect(stepHeadline({ text: json, observation: null })).toBe(
			"self.actor_id: 1 · self.entity_name: Renn the Roadwarden · self.conditions.count: 0 · hp: 10",
		);
		expect(stepHeadline({ text: "{ not json", observation: { moved: true } })).toBe("moved: true");
		expect(stepHeadline({ text: "{}", observation: null })).toBe("{}");
	});

	it("parses the checked-in sample transcript", () => {
		const jsonl = readFileSync(resolve(demoData, "worlds/demo1/agent-run-events.jsonl"), "utf8");
		const steps = parseTranscriptJsonl(jsonl);
		expect(steps.length).toBeGreaterThan(0);
		expect(steps.every((s) => s.tool.startsWith("spellkave_"))).toBe(true);
	});

	it("treats a missing transcript as empty and surfaces other HTTP errors", async () => {
		const notFound = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
		expect(
			await fetchTranscript("/demo-data", { transcript_url: "worlds/x.jsonl" }, notFound),
		).toEqual([]);
		const broken = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
		await expect(
			fetchTranscript("/demo-data", { transcript_url: "worlds/x.jsonl" }, broken),
		).rejects.toThrow("HTTP 500");
	});
});

describe("gateway transcript fetch", () => {
	it("loads gateway transcripts with a bearer and maps login errors", async () => {
		const ok = async () =>
			new Response(
				'{"v":"agent-run-events/v1","ts":"t","type":"tool_call","data":{"tool_name":"spellkave_scene","text":"Inn"}}\n',
				{ status: 200 },
			);
		const steps = await fetchGatewayTranscript(
			"https://mcp.spellkave.com/mcp",
			"elven-mini-1",
			"tok",
			ok,
		);
		expect(steps.length).toBe(1);
		const denied = async () => new Response("nope", { status: 401 });
		await expect(
			fetchGatewayTranscript("https://mcp.spellkave.com", "elven-mini-1", "tok", denied),
		).rejects.toThrow(/login required/);
		expect(mcpOriginFromIndexUrl("https://mcp.spellkave.com/mcp")).toBe(
			"https://mcp.spellkave.com",
		);
	});
});
