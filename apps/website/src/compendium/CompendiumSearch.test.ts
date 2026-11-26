import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CompendiumSearch from "./CompendiumSearch.svelte";
import type { DocsSearchEntry } from "./docs-types";

const rows: DocsSearchEntry[] = [
	{
		id: "srd/spell/fireball",
		name: "Fireball",
		kind: "spell",
		corpus_label: "SRD",
		ref: "srd/spell/fireball",
		href: "/docs/srd/spells/fireball",
		chapter: "spells",
		slug: "fireball",
		tags: [],
		search_text: "Fireball evocation",
		art_thumb: null,
		has_art: false,
	},
];

describe("CompendiumSearch", () => {
	afterEach(() => vi.unstubAllGlobals());
	it("opens a combobox results panel with a live match count", async () => {
		render(CompendiumSearch, { rows });
		const input = screen.getByTestId("compendium-search");
		expect(input.getAttribute("role")).toBe("combobox");
		await fireEvent.input(input, { target: { value: "fire" } });
		expect(screen.getByTestId("search-panel")).toBeTruthy();
		expect(screen.getByText("1 match")).toBeTruthy();
		expect(screen.getByRole("option", { name: /Fireball/ })).toBeTruthy();
		expect(screen.getByText("SRD")).toBeTruthy();
	});

	it("loads lazily and displays the authored page label", async () => {
		const other = {
			...rows[0]!,
			id: "guide:entry",
			ref: "guide/entry",
			name: "Lantern",
			corpus_label: "Third-party Guide",
			href: "/docs/guide/items/lantern",
			search_text: "lantern",
		};
		const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify([other])));
		vi.stubGlobal("fetch", fetchSpy);
		render(CompendiumSearch, { rows: [], searchHref: "/compendium/docs/search.json" });
		const input = screen.getByTestId("compendium-search");
		expect(fetchSpy).not.toHaveBeenCalled();
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: "lantern" } });
		await waitFor(() => expect(screen.getByText("Third-party Guide")).toBeTruthy());
	});

	it("reports an index load failure instead of a false empty result and retries", async () => {
		const fetchSpy = vi
			.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce(new Response("[]"));
		vi.stubGlobal("fetch", fetchSpy);
		render(CompendiumSearch, { rows: [], searchHref: "/compendium/docs/search.json" });
		const input = screen.getByTestId("compendium-search");
		await fireEvent.focus(input);
		await fireEvent.input(input, { target: { value: "anything" } });
		await waitFor(() => expect(screen.getByText(/search index could not be loaded/i)).toBeTruthy());
		await fireEvent.blur(input);
		await fireEvent.focus(input);
		await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
	});
});
