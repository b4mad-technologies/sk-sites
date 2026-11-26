import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import ActivitySectionHeader from "./ActivitySectionHeader.svelte";

describe("ActivitySectionHeader", () => {
	it("reads as a heading at the given level, with no trailing detail by default", () => {
		render(ActivitySectionHeader, { props: { title: "Common Room", level: 4 } });
		const heading = screen.getByRole("heading", { level: 4, name: "Common Room" });
		expect(heading).toBeTruthy();
		expect(screen.queryByText(/is nearby/)).toBeNull();
	});

	it("shows the optional trailing detail beside the title", () => {
		render(ActivitySectionHeader, {
			props: {
				title: "Common Room",
				detail: "Aldwin, keeper of the hearth-ledger is nearby",
				level: 4,
			},
		});
		expect(screen.getByText("Aldwin, keeper of the hearth-ledger is nearby")).toBeTruthy();
	});

	it("defaults to a level-3 heading when none is given", () => {
		render(ActivitySectionHeader, { props: { title: "The Bar" } });
		expect(screen.getByRole("heading", { level: 3, name: "The Bar" })).toBeTruthy();
	});

	it("renders the detailContent snippet in place of the plain detail string when both are supplied", () => {
		// createRawSnippet: this test never needs the host's real markup (e.g.
		// Play's `ReferenceText`), only that the component prefers a supplied
		// snippet over the plain string it would otherwise show.
		const detailContent = createRawSnippet(() => ({
			render: () => `<a href="/docs/npc/aldwin">Aldwin, keeper of the hearth-ledger is nearby</a>`,
		}));
		render(ActivitySectionHeader, {
			props: {
				title: "Common Room",
				detail: "Aldwin, keeper of the hearth-ledger is nearby",
				detailContent,
				level: 4,
			},
		});
		const link = screen.getByRole("link", {
			name: "Aldwin, keeper of the hearth-ledger is nearby",
		});
		expect(link.getAttribute("href")).toBe("/docs/npc/aldwin");
		// The plain string never renders a second, un-linked copy alongside it.
		expect(screen.getAllByText("Aldwin, keeper of the hearth-ledger is nearby")).toHaveLength(1);
	});
});
