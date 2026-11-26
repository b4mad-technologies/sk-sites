import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Tabs from "./Tabs.svelte";

const items = [
	{ value: "tokens", label: "Tokens", content: "Token atlas" },
	{ value: "buttons", label: "Buttons", content: "Button gallery" },
	{ value: "disabled", label: "Disabled", content: "Disabled panel", disabled: true },
];

describe("Tabs", () => {
	it("switches panels and skips disabled triggers", async () => {
		render(Tabs, { items, defaultValue: "tokens" });

		expect(screen.getByText("Token atlas")).toBeTruthy();
		await fireEvent.click(screen.getByRole("tab", { name: "Buttons" }));
		expect(screen.getByText("Button gallery")).toBeTruthy();
		const disabled = screen.getByRole("tab", { name: "Disabled" });
		expect(disabled.getAttribute("disabled")).toBe("");
	});

	it("supports keyboard navigation", async () => {
		const { container } = render(Tabs, { items, defaultValue: "tokens" });
		const first = screen.getByRole("tab", { name: "Tokens" });
		expect(container.querySelector('[data-slot="tabs"]')).toBeTruthy();
		first.focus();
		await fireEvent.keyDown(first, { key: "ArrowRight" });
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Buttons" }));
	});

	it("renders snippet content containing a queryable button", async () => {
		const snippetButton = createRawSnippet(() => ({
			render: () => '<button type="button">Tab Action</button>',
		}));
		const snippetItems = [{ value: "action", label: "Action", content: snippetButton }];

		render(Tabs, { items: snippetItems, defaultValue: "action" });

		const button = screen.getByRole("button", { name: "Tab Action" });
		expect(button).toBeTruthy();
		expect(button.tagName.toLowerCase()).toBe("button");
	});
});
