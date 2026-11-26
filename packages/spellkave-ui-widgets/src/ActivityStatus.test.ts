import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ActivityStatus from "./ActivityStatus.svelte";

describe("ActivityStatus", () => {
	it("keeps a completed estimate separate from the reported phase and opens a reader", async () => {
		render(ActivityStatus, {
			label: "Ritual",
			phase: "waiting-on-external",
			progress: 100,
			fields: [{ label: "Observed world tick", value: "90071992547409931" }],
		});
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.getByText("Ritual: waiting-on-external")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "End turn" })).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "Ritual: waiting-on-external" }));
		expect(await screen.findByRole("dialog")).toBeTruthy();
		expect(screen.getByText("90071992547409931")).toBeTruthy();
		expect(screen.getByText("No description available.")).toBeTruthy();
	});
	it("does not draw invented progress when the estimate is unknown", () => {
		render(ActivityStatus, {
			label: "Activity",
			phase: "active",
			notice: "No newer world time observed.",
		});
		expect(screen.queryByRole("progressbar")).toBeNull();
		expect(screen.getByRole("status").textContent).toBe("No newer world time observed.");
	});
});
