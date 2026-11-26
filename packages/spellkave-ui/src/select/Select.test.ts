import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Select from "./Select.svelte";

const items = [
	{ value: "a", label: "Adventure A" },
	{ value: "b", label: "Adventure B" },
];

describe("Select portal", () => {
	it("names its trigger for external field labels", () => {
		render(Select, { items, accessibleLabel: "Scene" });
		expect(screen.getByRole("button", { name: "Scene" })).toBeTruthy();
	});
	// The list normally portals to document.body. Inside a Dialog, bits-ui's
	// scroll-lock sets pointer-events:none on body, so a body-portalled list is
	// unclickable. portal={false} renders it in place instead (sk-jay0.5.1.8.13).
	it("portals the option list to body by default", () => {
		const { container } = render(Select, { items, open: true });
		expect(container.querySelector('[data-slot="select-content"]')).toBeNull();
		expect(document.body.querySelector('[data-slot="select-content"]')).toBeTruthy();
	});

	it("renders the option list in place when portal is false", () => {
		const { container } = render(Select, { items, open: true, portal: false });
		const content = container.querySelector('[data-slot="select-content"]');
		expect(content).toBeTruthy();
		// The options are queryable siblings of the trigger, not detached on body.
		expect(screen.getByText("Adventure A")).toBeTruthy();
	});
});
