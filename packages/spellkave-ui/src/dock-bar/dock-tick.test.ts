import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DockTick from "./dock-tick.svelte";

describe("dock status control", () => {
	it.each([
		"running",
		"waiting",
		"reconnecting",
		"disconnected",
	] as const)("opens %s details with Enter and restores focus with Escape", async (state) => {
		render(DockTick, {
			tick: 42,
			runningText: "42",
			state,
			connection: "Observed connection",
			action: "Observed action",
		});
		const label =
			state === "running"
				? "42"
				: state === "waiting"
					? "Waiting"
					: state === "reconnecting"
						? "Reconnecting"
						: "Disconnected";
		const trigger = screen.getByRole("button", { name: `Game status: ${label}` });
		trigger.focus();
		await fireEvent.keyDown(trigger, { key: "Enter" });
		const panel = await screen.findByRole("dialog", { name: "Game status" });
		expect(panel.textContent).toContain("Observed connection");
		expect(panel.textContent).toContain("Observed action");
		expect(panel.textContent).toContain("42");
		await fireEvent.keyDown(panel, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog", { name: "Game status" })).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});
});
