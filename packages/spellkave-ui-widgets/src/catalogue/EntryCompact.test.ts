import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EntryCompact from "./EntryCompact.svelte";
import type { DocsRowEntryView } from "./types";

const row: DocsRowEntryView = {
	ref: "guide/focus",
	title: "Focus",
	href: "/docs/guide/rules/resource/guide%2Ffocus",
	kind_label: "Spellkave resource definition",
	description: "Attention available by default.",
	fields: [{ label: "Kind", value: "int" }],
};

describe("EntryCompact", () => {
	it("wraps ReferenceCard with the title, kind label, description, and facts", () => {
		render(EntryCompact, { row });
		expect(screen.getByRole("link", { name: "Focus" }).getAttribute("href")).toBe(row.href);
		expect(screen.getByText("Spellkave resource definition")).toBeTruthy();
		expect(screen.getByText("Attention available by default.")).toBeTruthy();
		expect(screen.getByText("Kind:")).toBeTruthy();
		expect(screen.getByText("int")).toBeTruthy();
	});

	it("degrades to an unlinked card when there is no href", () => {
		const { container } = render(EntryCompact, { row: { ...row, href: undefined } });
		expect(container.querySelector("a")).toBeNull();
		expect(screen.getByText("Focus").tagName.toLowerCase()).toBe("h2");
		expect(screen.getByText("Spellkave resource definition")).toBeTruthy();
	});
});
