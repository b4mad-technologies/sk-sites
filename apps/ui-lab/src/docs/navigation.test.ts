import { describe, expect, it } from "vitest";
import { findPage, NAV_GROUPS, PAGES } from "./pages";
import { href, routeFromHash } from "./router.svelte";
import { headingsToToc } from "./toc";

describe("Lab navigation contracts", () => {
	it("round-trips section permalinks without confusing them with page routes", () => {
		for (const path of ["/", "/components/reference-card", "/docs/entry-compact"]) {
			expect(routeFromHash(href(path, "facts & images"))).toEqual({
				path,
				section: "facts & images",
			});
		}
		expect(routeFromHash("#/play/combat/")).toEqual({ path: "/play/combat", section: "" });
		expect(routeFromHash("#/docs/action?other=x")).toEqual({ path: "/docs/action", section: "" });
	});
	it("keeps every sidebar and documented relationship linked to a registered page", () => {
		expect(new Set(PAGES.map((page) => page.path)).size).toBe(PAGES.length);
		for (const item of NAV_GROUPS.flatMap((group) => group.items))
			expect(findPage(item.path)).toBeDefined();
		for (const page of PAGES)
			for (const related of page.contract?.related ?? [])
				expect(findPage(related.path), related.path).toBeDefined();
		expect(PAGES[0]?.path).toBe("/");
	});
	it("keeps widget headings out of the documentation outline", () => {
		const root = document.createElement("main");
		root.innerHTML =
			'<h2 id="preview">Preview</h2><div data-slot="component-preview"><h2 id="fighter">Fighter</h2><h3 id="rat">Rat</h3></div><h2 id="relationships">Relationships</h2>';
		expect(headingsToToc(root)).toEqual([
			{ title: "Preview", url: "#preview" },
			{ title: "Relationships", url: "#relationships" },
		]);
	});
});
