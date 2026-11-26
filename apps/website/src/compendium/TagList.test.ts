import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import type { DocsTagLink } from "./docs-types";
import TagList from "./TagList.svelte";

const links: DocsTagLink[] = [
	{ tag: "srd.skill", href: "/docs/srd/tags/skill", display_name: "Skill" },
	{ tag: "srd.ability.dex" },
];

describe("TagList", () => {
	it("links a tag that has a page and shows a bare chip for one that does not", () => {
		render(TagList, { links });
		expect(screen.getByRole("link", { name: "Skill" }).getAttribute("href")).toBe(
			"/docs/srd/tags/skill",
		);
		// The undeclared half. A tag nobody authored still renders its id, because
		// hiding it would hide an authored row from the reader (sk-jay0.3.5.73).
		expect(screen.getByTestId("tag-chip").textContent).toBe("srd.ability.dex");
	});

	it("takes a heading, so the same block can say Tags or Granted by", () => {
		// The grant junction runs the other way (a tag hands out a capability), and
		// labelling it "Tags" on the capability's page would read as if the
		// capability wore the tag.
		render(TagList, { links, heading: "Granted by" });
		expect(screen.getByRole("heading", { name: "Granted by" })).toBeTruthy();
	});

	it("renders nothing at all when there are no tags", () => {
		// Callers include it unconditionally; an empty heading on every untagged
		// page would be worse than no section.
		render(TagList, { links: [] });
		expect(screen.queryByTestId("tag-list")).toBeNull();
	});
});
