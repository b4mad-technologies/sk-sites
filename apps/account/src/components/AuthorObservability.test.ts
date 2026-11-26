import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { AccountApi } from "../lib/account-api";
import AuthorObservability from "./AuthorObservability.svelte";

function apiWith(overrides: Partial<AccountApi> = {}): AccountApi {
	return {
		getAuthorCycles: vi.fn(async () => ({
			slug: "demo1",
			window: "6h" as const,
			dropped_missing_world_slug: 1,
			seats: [
				{
					seat: "7",
					cycle_count: 4,
					error_count: 1,
					avg_duration_ms: 120,
					avg_queue_wait_ms: null,
					last_seen: "2026-09-01T12:00:00.000Z",
				},
			],
		})),
		getAuthorToolCalls: vi.fn(async () => ({
			slug: "demo1",
			window: "6h" as const,
			dropped_missing_world_slug: 0,
			tools: [{ tool_name: "spellkave_scene", ok: 3, error: 1 }],
		})),
		getAuthorEvents: vi.fn(async () => ({
			slug: "demo1",
			window: "6h" as const,
			dropped_missing_world_slug: 0,
			events: [
				{
					ts: "2026-09-01T12:00:00.000Z",
					event_type: "tool_call",
					actor_id: "7",
					run_id: "run-1",
					data: { cause_id: "cause-9", tool_name: "spellkave_scene" },
				},
			],
		})),
		...overrides,
	} as unknown as AccountApi;
}

describe("AuthorObservability", () => {
	it("renders nothing when the account owns no world", () => {
		render(AuthorObservability, {
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo",
					role: "member",
					capabilities: [],
				},
			],
			api: apiWith(),
		});
		expect(screen.queryByTestId("author-observability")).toBeNull();
	});

	it("renders cycle, tool, and event panels for an owned world", async () => {
		render(AuthorObservability, {
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo Vale",
					role: "owner",
					capabilities: [],
				},
			],
			api: apiWith(),
		});
		expect(await screen.findByTestId("author-observability")).toBeTruthy();
		await waitFor(() => {
			expect(screen.getAllByText("7").length).toBeGreaterThan(0);
			expect(screen.getByText("spellkave_scene")).toBeTruthy();
			expect(screen.getByText("cause-9")).toBeTruthy();
		});
		expect(screen.getByText("NPC cycle health")).toBeTruthy();
		expect(screen.getByText("Tool-call outcomes")).toBeTruthy();
		expect(screen.getByText("Recent run events")).toBeTruthy();
	});

	it("keeps tool and event panels when cycles fails", async () => {
		render(AuthorObservability, {
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo Vale",
					role: "owner",
					capabilities: [],
				},
			],
			api: apiWith({
				getAuthorCycles: vi.fn(async () => {
					throw new Error("Account API request failed (HTTP 502)");
				}),
			}),
		});
		expect(await screen.findByTestId("author-obs-cycles-error")).toBeTruthy();
		expect(screen.getByText("Account API request failed (HTTP 502)")).toBeTruthy();
		await waitFor(() => {
			expect(screen.getByText("spellkave_scene")).toBeTruthy();
			expect(screen.getByText("cause-9")).toBeTruthy();
		});
		expect(screen.queryByTestId("author-obs-tools-error")).toBeNull();
		expect(screen.queryByTestId("author-obs-events-error")).toBeNull();
	});
});
