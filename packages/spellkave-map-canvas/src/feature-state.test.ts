import { describe, expect, it, vi } from "vitest";

import {
	applyPlaceSelection,
	SELECT_SOURCE_LAYERS,
	SPELLKAVE_VECTOR_SOURCE,
} from "./feature-state";

function fakeMap() {
	const setFeatureState = vi.fn();
	const removeFeatureState = vi.fn();
	return { setFeatureState, removeFeatureState };
}

describe("applyPlaceSelection", () => {
	it("sets selected on node and room for a new id", () => {
		const map = fakeMap();
		applyPlaceSelection(map, null, "elven_mini/cursed_crypt/entrance");
		expect(map.removeFeatureState).not.toHaveBeenCalled();
		expect(map.setFeatureState).toHaveBeenCalledTimes(SELECT_SOURCE_LAYERS.length);
		for (const sourceLayer of SELECT_SOURCE_LAYERS) {
			expect(map.setFeatureState).toHaveBeenCalledWith(
				{ source: SPELLKAVE_VECTOR_SOURCE, sourceLayer, id: "elven_mini/cursed_crypt/entrance" },
				{ selected: true },
			);
		}
	});

	it("clears the previous id before selecting another", () => {
		const map = fakeMap();
		applyPlaceSelection(map, "a", "b");
		expect(map.removeFeatureState).toHaveBeenCalledTimes(2);
		expect(map.removeFeatureState).toHaveBeenCalledWith({
			source: SPELLKAVE_VECTOR_SOURCE,
			sourceLayer: "spellkave_node",
			id: "a",
		});
		expect(map.setFeatureState).toHaveBeenCalledWith(
			{ source: SPELLKAVE_VECTOR_SOURCE, sourceLayer: "spellkave_room", id: "b" },
			{ selected: true },
		);
	});

	it("is a no-op when the id does not change", () => {
		const map = fakeMap();
		applyPlaceSelection(map, "same", "same");
		expect(map.setFeatureState).not.toHaveBeenCalled();
		expect(map.removeFeatureState).not.toHaveBeenCalled();
	});

	it("clears selection when next is null", () => {
		const map = fakeMap();
		applyPlaceSelection(map, "a", null);
		expect(map.setFeatureState).not.toHaveBeenCalled();
		expect(map.removeFeatureState).toHaveBeenCalledTimes(2);
	});
});
