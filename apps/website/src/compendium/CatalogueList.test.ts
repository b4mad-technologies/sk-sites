import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CatalogueList from "./CatalogueList.svelte";
import type { DocsCatalogueEntrySummary } from "./docs-types";

function entries(count: number, prefix = "Entry"): DocsCatalogueEntrySummary[] {
	return Array.from({ length: count }, (_, index) => ({
		kind: "entity_definition",
		ref: `example/item/${index}`,
		family: "item",
		slug: `item-${index}`,
		display_name: `${prefix} ${index + 1}`,
		description: `Description ${index + 1}`,
		href: `/docs/example/items/item-${index}`,
		artifact_href: `/compendium/docs/catalogue/example/items/item-${index}.json`,
		facts: [],
	}));
}

describe("CatalogueList", () => {
	it("pages large catalogues and resets when the section entries change", async () => {
		const view = render(CatalogueList, { entries: entries(51) });
		expect(screen.getByText("Entry 1")).toBeTruthy();
		expect(screen.queryByText("Entry 51")).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getByText("Entry 51")).toBeTruthy();

		await view.rerender({ entries: entries(2, "Replacement") });
		expect(screen.getByText("Replacement 1")).toBeTruthy();
		expect(screen.queryByText(/Page 2/)).toBeNull();
	});

	it("keeps modified link clicks native", async () => {
		render(CatalogueList, { entries: entries(1) });
		const link = screen.getByRole("link", { name: "Entry 1" });
		let componentPrevented = true;
		link.addEventListener(
			"click",
			(event) => {
				componentPrevented = event.defaultPrevented;
				event.preventDefault();
			},
			{ once: true },
		);
		const event = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true });
		link.dispatchEvent(event);
		expect(componentPrevented).toBe(false);
	});

	it("defaults to the generic reference-entry wording, singular at a count of one", () => {
		render(CatalogueList, { entries: entries(1) });
		expect(screen.getByText("1 reference entry")).toBeTruthy();
	});

	it("uses an authored noun for the count phrase, singular vs. plural by count (sk-jay0.3.5.64 round 2)", async () => {
		const view = render(CatalogueList, {
			entries: entries(1),
			noun: { singular: "class feature", plural: "class features" },
		});
		expect(screen.getByText("1 class feature")).toBeTruthy();

		await view.rerender({
			entries: entries(2),
			noun: { singular: "class feature", plural: "class features" },
		});
		expect(screen.getByText("2 class features")).toBeTruthy();
	});

	it("renders compact catalogue descriptions with the safe Markdown profile", () => {
		const [entry] = entries(1);
		if (!entry) throw new Error("catalogue fixture is missing");
		const { container } = render(CatalogueList, {
			entries: [{ ...entry, description: "A **compact** description.<br>Next line." }],
		});
		expect(container.querySelector("strong")?.textContent).toBe("compact");
		expect(container.querySelector("br")).toBeTruthy();
	});
});
