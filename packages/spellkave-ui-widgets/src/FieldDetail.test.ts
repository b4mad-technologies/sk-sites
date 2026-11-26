import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FieldDetail from "./FieldDetail.svelte";

describe("FieldDetail", () => {
	it("reads supplied values and plain text, closes with Escape and restores focus", async () => {
		render(FieldDetail, {
			label: "Focus",
			value: "12",
			description: "<b>Stay alert</b>",
			metadata: [{ label: "Modifier", value: "+1" }],
			valueSlot: "test-value",
		});
		const trigger = screen.getByRole("button", { name: "Focus" });
		trigger.focus();
		await fireEvent.click(trigger);
		await screen.findByRole("dialog", { name: "Focus" });
		expect(screen.getByText("12")).toBeTruthy();
		expect(screen.getByText("+1")).toBeTruthy();
		expect(screen.getByText("<b>Stay alert</b>")).toBeTruthy();
		expect(document.querySelector("b")).toBeNull();
		expect(
			document
				.querySelector('[data-field-description="test-value"]')
				?.getAttribute("data-field-disclosed"),
		).toBe("true");
		await fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});

	it.each([
		["ready", "No description available."],
		["loading", "Loading description…"],
		["failed", "Description could not be loaded."],
	] as const)("distinguishes %s descriptions", async (readState, expected) => {
		render(FieldDetail, { label: "Rank", readState });
		await fireEvent.click(screen.getByRole("button", { name: "Rank" }));
		expect(await screen.findByText(expected)).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Close" }));
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});
});
