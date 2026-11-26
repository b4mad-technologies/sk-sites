import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import ActivityRow from "./ActivityRow.svelte";
import { activitySummary, elapsed } from "./activity";
import ChatEntry from "./ChatEntry.svelte";
import ThoughtRow from "./ThoughtRow.svelte";

const body = createRawSnippet(() => ({ render: () => "<p>World alpha is up.</p>" }));

describe("chat pieces", () => {
	// keep(K1): enumerates the elapsed/summary wording of a pure function.
	it("words elapsed time and run summaries", () => {
		expect(elapsed(4_900)).toBe("4s");
		expect(elapsed(65_000)).toBe("1m 05s");
		expect(activitySummary(1)).toBe("1 step");
		expect(activitySummary(3, 2_100)).toBe("3 steps · 2s");
	});

	it("marks a failed host report with its outcome", () => {
		const { container } = render(ChatEntry, {
			tone: "host",
			label: "Host",
			outcome: "failed",
			children: body,
		});
		const entry = container.querySelector("[data-slot=chat-entry]");
		expect(entry?.getAttribute("data-outcome")).toBe("failed");
		expect(screen.getByText("World alpha is up.")).toBeTruthy();
	});

	it("collapses a thought to its first line and opens on click", async () => {
		const { container } = render(ThoughtRow, { text: "Check the registry.\nThen report." });
		expect(screen.getByText("Thought")).toBeTruthy();
		const details = container.querySelector("details");
		expect(details?.open).toBe(false);
		await fireEvent.click(container.querySelector("summary") as HTMLElement);
		expect(details?.open).toBe(true);
	});

	it("summarises a finished run and opens its steps", async () => {
		const onopen = vi.fn();
		render(ActivityRow, {
			steps: [
				{ id: "1", label: "world_list", status: "done" },
				{ id: "2", label: "world_status", status: "error" },
			],
			working: false,
			startedAt: 1_000,
			endedAt: 3_500,
			onopen,
		});
		const row = screen.getByRole("button");
		expect(row.textContent).toContain("2 steps · 2s");
		expect(row.textContent).toContain("1 failed");
		await fireEvent.click(row);
		expect(onopen).toHaveBeenCalledOnce();
	});

	it("names the running step while working", () => {
		render(ActivityRow, {
			steps: [{ id: "1", label: "world_request", status: "running" }],
			working: true,
		});
		expect(screen.getByText("world_request")).toBeTruthy();
	});
});
