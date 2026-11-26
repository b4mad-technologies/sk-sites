import { describe, expect, it, vi } from "vitest";
import { DOCS_INDEX_URL, filterSearch, loadDocsIndex, MissingJsonArtifactError } from "./load";
import type { CompendiumIndexEntry } from "./types";

const fireball: CompendiumIndexEntry = {
	id: "srd/spell/fireball",
	name: "Fireball",
	kind: "spell",
	chapter: "spells",
	slug: "fireball",
	tags: ["srd.spell.level.3", "srd.spell.school.evocation"],
	search_text: "Fireball evocation 8d6 fire",
	art_thumb: null,
	has_art: false,
};

describe("compendium export loader", () => {
	it("loads the independent manifest-projected docs index", async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						version: 1,
						pages: [
							{
								page_id: "other-rules",
								title: "Other Rules",
								intro: "",
								href: "/docs/other-rules",
								sections: [],
							},
						],
					}),
				),
		) as unknown as typeof fetch;
		const index = await loadDocsIndex(fetchImpl);
		expect(fetchImpl).toHaveBeenCalledWith(DOCS_INDEX_URL);
		expect(index.pages[0]?.page_id).toBe("other-rules");
	});

	it("distinguishes a missing JSON artifact from other fetch and parse failures", async () => {
		await expect(
			loadDocsIndex(async () => new Response("", { status: 404 }) as Response),
		).rejects.toBeInstanceOf(MissingJsonArtifactError);
		await expect(
			loadDocsIndex(async () => new Response("<!doctype html><html></html>") as Response),
		).rejects.toBeInstanceOf(MissingJsonArtifactError);
		await expect(loadDocsIndex(async () => new Response("not json") as Response)).rejects.toThrow(
			"compendium JSON parse failed",
		);
		await expect(
			loadDocsIndex(async () => new Response("", { status: 500 }) as Response),
		).rejects.toThrow("compendium fetch failed");
	});

	it("filters the in-memory search index by name, kind, and tags", () => {
		const bolt: CompendiumIndexEntry = {
			...fireball,
			id: "srd/spell/fire-bolt",
			name: "Fire Bolt",
			slug: "fire-bolt",
			search_text: "Fire Bolt cantrip",
			tags: ["srd.spell.level.0"],
		};
		expect(filterSearch([fireball, bolt], "fireball").map((row) => row.id)).toEqual([
			"srd/spell/fireball",
		]);
		expect(filterSearch([fireball, bolt], "cantrip").map((row) => row.slug)).toEqual(["fire-bolt"]);
		expect(filterSearch([fireball, bolt], "evocation")[0]?.id).toBe("srd/spell/fireball");
		expect(filterSearch([fireball], "")).toEqual([]);
	});
});
