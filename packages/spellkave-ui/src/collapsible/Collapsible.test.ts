import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Collapsible from "./Collapsible.svelte";

const snippetButton = createRawSnippet(() => ({
	render: () => '<button type="button">Panel Action</button>',
}));

describe("Collapsible", () => {
	it("starts closed by default and reveals string content on trigger click", async () => {
		render(Collapsible, { title: "Adventures", content: "Elven Mini lives here." });

		const content = screen.getByText("Elven Mini lives here.");
		expect(content.closest("[hidden]")).not.toBeNull();
		const trigger = screen.getByRole("button", { name: /Adventures/ });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");

		await fireEvent.click(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(content.closest("[hidden]")).toBeNull();
	});

	it("honors an initial open prop and renders snippet content", () => {
		render(Collapsible, { title: "System reference", content: snippetButton, open: true });

		expect(
			screen.getByRole("button", { name: /System reference/ }).getAttribute("aria-expanded"),
		).toBe("true");
		const button = screen.getByRole("button", { name: "Panel Action" });
		expect(button).toBeTruthy();
		expect(button.tagName.toLowerCase()).toBe("button");
	});

	it("calls onOpenChange when toggled", async () => {
		const seen: boolean[] = [];
		render(Collapsible, {
			title: "Technical data",
			content: "Rows.",
			onOpenChange: (next: boolean) => seen.push(next),
		});

		await fireEvent.click(screen.getByRole("button", { name: /Technical data/ }));

		expect(seen).toEqual([true]);
	});
});
