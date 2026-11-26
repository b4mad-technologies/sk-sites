import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ReferenceGroup from "./ReferenceGroup.svelte";
import type { DocsReferenceGroup } from "./types";

function entries(count: number): DocsReferenceGroup["entries"] {
	return Array.from({ length: count }, (_, index) => ({
		ref: `guide/tag-${index}`,
		title: `Tag ${index}`,
		href: `/docs/guide/tags/tag-${index}`,
	}));
}

describe("ReferenceGroup", () => {
	it("renders nothing for an empty group", () => {
		render(ReferenceGroup, { group: { label: "References", entries: [] } });
		expect(screen.queryByTestId("reference-group")).toBeNull();
	});

	it("renders a plain heading and every row when at or below the threshold", () => {
		render(ReferenceGroup, { group: { label: "References", entries: entries(20) } });
		expect(screen.getByRole("heading", { name: "References (20)" })).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.getByRole("link", { name: "Tag 0" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Tag 19" })).toBeTruthy();
	});

	// `srd/ac` is both a fact and a modifier target, and a predicate naming it
	// resolves to both. The reader must see both rows; keying the block on the
	// shared `ref` made Svelte abort the whole page render instead.
	it("renders both subjects that share one id", () => {
		render(ReferenceGroup, {
			group: {
				label: "Read by resolution predicate",
				entries: [
					{ ref: "srd/ac", title: "Armor Class", href: "/docs/srd/playing-the-game/ac" },
					{
						ref: "srd/ac",
						title: "Armor Class axis",
						href: "/docs/srd/mechanics/modifier-targets/ac",
					},
				],
			},
		});
		expect(screen.getByRole("link", { name: "Armor Class" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Armor Class axis" })).toBeTruthy();
	});

	it("collapses behind a trigger once past the threshold, revealing rows on click", async () => {
		const { fireEvent } = await import("@testing-library/svelte");
		render(ReferenceGroup, { group: { label: "Referenced by", entries: entries(21) } });
		const trigger = screen.getByRole("button", { name: /Referenced by \(21\)/ });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByRole("link", { name: "Tag 0" })).toBeNull();

		await fireEvent.click(trigger);

		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByRole("link", { name: "Tag 0" })).toBeTruthy();
	});

	it("hands onNavigate down to every row", async () => {
		const seen: string[] = [];
		render(ReferenceGroup, {
			group: { label: "Carrying", entries: entries(2) },
			onNavigate: (href: string, event: MouseEvent) => {
				event.preventDefault();
				seen.push(href);
			},
		});
		await fireEvent.click(screen.getByRole("link", { name: "Tag 1" }));
		expect(seen).toEqual(["/docs/guide/tags/tag-1"]);
	});
});
