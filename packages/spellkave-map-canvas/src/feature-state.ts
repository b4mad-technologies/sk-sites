/** MapLibre feature-state selection for Spellkave vector layers (sk-jay0.4.8). */

export const SPELLKAVE_VECTOR_SOURCE = "spellkave";

export const SELECT_SOURCE_LAYERS = ["spellkave_node", "spellkave_room"] as const;

export const SPELLKAVE_PROMOTE_ID = {
	spellkave_node: "spellkave:node_id",
	spellkave_room: "spellkave:node_id",
} as const;

export type FeatureStateMap = {
	setFeatureState: (
		target: { source: string; sourceLayer: string; id: string | number },
		state: Record<string, unknown>,
	) => void;
	removeFeatureState: (target: {
		source: string;
		sourceLayer: string;
		id: string | number;
	}) => void;
};

/** Clear previous selected state, then mark `nextId` on node + room layers. */
export function applyPlaceSelection(
	map: FeatureStateMap,
	previousId: string | null,
	nextId: string | null,
): void {
	if (previousId !== null && previousId !== nextId) {
		for (const sourceLayer of SELECT_SOURCE_LAYERS) {
			map.removeFeatureState({
				source: SPELLKAVE_VECTOR_SOURCE,
				sourceLayer,
				id: previousId,
			});
		}
	}
	if (nextId !== null && nextId !== previousId) {
		for (const sourceLayer of SELECT_SOURCE_LAYERS) {
			map.setFeatureState(
				{ source: SPELLKAVE_VECTOR_SOURCE, sourceLayer, id: nextId },
				{ selected: true },
			);
		}
	}
}
