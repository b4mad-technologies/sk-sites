import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Accordion from "./Accordion.svelte";

const snippetButton = createRawSnippet(() => ({
	render: () => '<button type="button">Accordion Action</button>',
}));

describe("Accordion", () => {
	it("renders string content and expands items", async () => {
		const items = [
			{ value: "place", title: "Place", content: "The current room is the home surface." },
			{ value: "people", title: "People", content: "Named bodies in this room are tappable." },
			{ value: "disabled", title: "Later", content: "Hidden until next rung.", disabled: true },
		];

		render(Accordion, { items, value: "place" });

		expect(screen.getByText("The current room is the home surface.")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: /People/ }));
		expect(screen.getByText("Named bodies in this room are tappable.")).toBeTruthy();
	});

	it("renders snippet content containing a queryable button", async () => {
		const items = [{ value: "interactive", title: "Interactive", content: snippetButton }];

		render(Accordion, { items, value: "interactive" });

		const button = screen.getByRole("button", { name: "Accordion Action" });
		expect(button).toBeTruthy();
		expect(button.tagName.toLowerCase()).toBe("button");
	});
});
