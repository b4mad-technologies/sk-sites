import { describe, expect, it } from "vitest";

import {
	buildNodeIdQuery,
	flyTargetFromHits,
	placeNodeForEntities,
	uniqueOccupancyPlaceIds,
} from "./seat-location";

describe("seat → node_id → fly-to", () => {
	it("dedupes occupancy place ids in first-seen order", () => {
		expect(
			uniqueOccupancyPlaceIds([
				{ entityId: "1", placeNodeId: "a", name: "A" },
				{ entityId: "2", placeNodeId: "b", name: "B" },
				{ entityId: "3", placeNodeId: "a", name: "C" },
				{ entityId: "4", placeNodeId: "", name: "skip" },
			]),
		).toEqual(["a", "b"]);
	});

	it("picks the place node for a claimed entity", () => {
		expect(
			placeNodeForEntities(
				[
					{ entityId: "10", placeNodeId: "elven_mini/hamlet/inn_front" },
					{ entityId: "99", placeNodeId: "other" },
				],
				["10"],
			),
		).toBe("elven_mini/hamlet/inn_front");
		expect(placeNodeForEntities([{ entityId: "1", placeNodeId: "x" }], ["2"])).toBeNull();
	});

	it("builds Overpass node id query", () => {
		expect(buildNodeIdQuery("elven_mini/inn/foyer")).toBe(
			`[out:json][timeout:25];nwr["spellkave:node_id"="elven_mini/inn/foyer"];out center;`,
		);
	});

	it("maps Overpass hits to a fly target", () => {
		const target = flyTargetFromHits("elven_mini/inn/foyer", [
			{
				id: "1",
				osmType: "node",
				name: "Foyer",
				kind: "place",
				graph: "elven_mini/inn",
				lon: -122.3,
				lat: 47.5,
				tags: {
					"spellkave:node_id": "elven_mini/inn/foyer",
					name: "Foyer",
					level: "0",
					indoor: "room",
				},
			},
		]);
		expect(target).toEqual({
			placeNodeId: "elven_mini/inn/foyer",
			lon: -122.3,
			lat: 47.5,
			name: "Foyer",
			graph: "elven_mini/inn",
			level: "0",
			indoor: true,
		});
	});
});
