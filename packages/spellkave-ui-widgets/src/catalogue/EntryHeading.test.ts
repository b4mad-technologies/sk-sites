import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EntryHeading from "./EntryHeading.svelte";
import type { DocsRowEntryView } from "./types";

const row: DocsRowEntryView = {
	ref: "guide/focus",
	title: "Focus",
	href: "/docs/guide/rules/resource/guide%2Ffocus",
	kind_label: "Spellkave resource definition",
	fields: [],
};

describe("EntryHeading", () => {
	it("renders title and kind label via DocsPageHeader, plus the ref, when chrome is on", () => {
		render(EntryHeading, { row });
		expect(screen.getByRole("heading", { level: 1, name: "Focus" })).toBeTruthy();
		expect(screen.getByText("Spellkave resource definition")).toBeTruthy();
		expect(screen.getByText("guide/focus")).toBeTruthy();
	});

	it("skips the duplicate title when chrome is off, keeping only the kind label and ref", () => {
		render(EntryHeading, { row, chrome: false });
		expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
		const caption = screen.getByTestId("entry-heading-ref");
		expect(caption.textContent).toBe("Spellkave resource definition · guide/focus");
	});
});
