import type { Occupant } from "./types";

export type OccupantGroup = {
	key: string;
	label: string;
	items: Occupant[];
};

function groupRank(key: string): number {
	if (key === "actor") return 0;
	if (key === "entity") return 1;
	if (key === "") return 3;
	return 2;
}

function groupLabel(key: string): string {
	if (key === "actor") return "Characters";
	if (key === "entity") return "Objects";
	if (key === "") return "Unknown";
	return key;
}

/** Group occupants by the authorized scene kind, preserving unknown kinds. */
export function groupOccupants(occupants: Occupant[]): OccupantGroup[] {
	const map = new Map<string, Occupant[]>();
	for (const occupant of occupants) {
		const key = occupant.sceneKind?.trim() ?? "";
		const items = map.get(key);
		if (items) items.push(occupant);
		else map.set(key, [occupant]);
	}
	return [...map.keys()]
		.sort((a, b) => {
			const rank = groupRank(a) - groupRank(b);
			return rank !== 0 ? rank : a.localeCompare(b);
		})
		.map((key) => ({ key, label: groupLabel(key), items: map.get(key) ?? [] }));
}
