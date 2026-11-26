import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import DemoContainer from "./DemoContainer.svelte";

const child = createRawSnippet(() => ({
	render: () => '<button type="button">Demo child</button>',
}));

describe("DemoContainer", () => {
	it("keeps align's current meaning: vertical placement on .preview, not horizontal", () => {
		// `align` has never been forwarded by any current caller (ComponentPreview
		// doesn't pass it through), but its documented meaning is vertical-only:
		// `items-{align}` on the outer `.preview` row. The inner stacking wrapper
		// (sk-jay0.7.37) must not let `align` also drive its own horizontal
		// centering — that would silently redefine what `align` means.
		const { container } = render(DemoContainer, {
			name: "align-start",
			align: "start",
			children: child,
		});
		const preview = container.querySelector(".preview") as HTMLElement;
		expect(preview.className).toContain("items-start");
		expect(preview.className).toContain("justify-center");

		const wrapper = preview.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("flex-col");
		expect(wrapper.className).toContain("w-full");
		expect(wrapper.className).toContain("items-center");
	});

	it("defaults align to center", () => {
		const { container } = render(DemoContainer, { name: "align-default", children: child });
		const preview = container.querySelector(".preview") as HTMLElement;
		expect(preview.className).toContain("items-center");
	});
});
