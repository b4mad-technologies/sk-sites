import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Checkbox from "./checkbox.svelte";

describe("Checkbox", () => {
	it("toggles with its label and exposes state", async () => {
		const { container } = render(Checkbox, {
			label: "Accept launch notes",
			description: "Internal preview only.",
		});

		const control = screen.getByRole("checkbox", { name: "Accept launch notes" });
		expect(container.querySelector('[data-slot="checkbox-control"]')).toBe(control);
		expect(control.getAttribute("aria-checked")).toBe("false");

		await fireEvent.click(control);
		expect(control.getAttribute("aria-checked")).toBe("true");
	});

	it("renders an error message and stays disabled when requested", async () => {
		render(Checkbox, {
			label: "Agree to publish",
			error: "You need to confirm the launch notes.",
			disabled: true,
		});

		const control = screen.getByRole("checkbox", { name: "Agree to publish" });
		expect(control.getAttribute("aria-invalid")).toBe("true");
		expect(control.getAttribute("disabled")).toBe("");
		expect(screen.getByText("You need to confirm the launch notes.")).toBeTruthy();
	});
});
