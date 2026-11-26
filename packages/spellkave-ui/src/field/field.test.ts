import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Field from "./field.svelte";

describe("Field", () => {
	it("associates its label with the control and keeps the typed value", async () => {
		const { container } = render(Field, {
			label: "Slug",
			description: "World identity stem.",
		});

		const control = screen.getByRole("textbox", { name: "Slug" });
		expect(container.querySelector('[data-slot="field-control"]')).toBe(control);
		expect(screen.getByText("World identity stem.")).toBeTruthy();

		await fireEvent.input(control, { target: { value: "phobos" } });
		expect((control as HTMLInputElement).value).toBe("phobos");
	});

	it("renders recovery text and stays disabled when requested", async () => {
		render(Field, {
			label: "Owner sub",
			error: "Give the world an owner.",
			disabled: true,
		});

		const control = screen.getByRole("textbox", { name: "Owner sub" });
		expect(control.getAttribute("aria-invalid")).toBe("true");
		expect(control.getAttribute("disabled")).toBe("");
		expect(screen.getByText("Give the world an owner.")).toBeTruthy();
	});
});
