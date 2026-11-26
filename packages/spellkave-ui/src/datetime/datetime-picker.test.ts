import { CalendarDateTime } from "@internationalized/date";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DateTimePicker from "./datetime-picker.svelte";

describe("DateTimePicker", () => {
	it("renders a labelled UTC field and a calendar trigger", () => {
		const iso = new CalendarDateTime(2026, 8, 26, 7, 46).toString();
		render(DateTimePicker, {
			label: "From (UTC)",
			description: "Window start in coordinated universal time.",
			iso: `${iso}Z`,
		});

		expect(screen.getByText("From (UTC)")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Open calendar for From (UTC)" })).toBeTruthy();
		expect(screen.getByText("Window start in coordinated universal time.")).toBeTruthy();
		expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(3);
	});
});
