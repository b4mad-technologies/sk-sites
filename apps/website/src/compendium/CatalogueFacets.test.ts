import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import CatalogueFacets from "./CatalogueFacets.svelte";

describe("CatalogueFacets", () => {
	it("renders projected map assets lazily with their authored row context", () => {
		const { container } = render(CatalogueFacets, {
			facets: [
				{
					label: "Map layers",
					rows: [
						{
							asset_href: "/assets/elven/maps/inn.webp",
							layer_id: "ground",
							place_graph_id: "elven/inn",
						},
					],
				},
			],
		});
		const image = container.querySelector("img");
		expect(image?.getAttribute("src")).toBe("/assets/elven/maps/inn.webp");
		expect(image?.getAttribute("loading")).toBe("lazy");
		expect(screen.getByText("layer_id")).toBeTruthy();
		expect(screen.getByText("ground")).toBeTruthy();
	});

	it("keeps generic rows collapsed while preserving identifiers and typed values", () => {
		render(CatalogueFacets, {
			facets: [
				{
					label: "Initial state",
					rows: [{ entity_def_id: "other/mira", value_bool: false, value_int: 9 }],
				},
			],
		});
		const details = screen.getByText("Initial state (1)").closest("details");
		expect(details?.open).toBe(false);
		expect(screen.getByText("other/mira")).toBeTruthy();
		expect(screen.getByText("false")).toBeTruthy();
		expect(screen.getByText("9")).toBeTruthy();
	});

	it("renders nothing for an empty facet list", () => {
		const { container } = render(CatalogueFacets, { facets: [] });
		expect(container.querySelector("section")).toBeNull();
	});
});
