// Dummy copy for the Play widget catalog. Strings are taken from the recorded
// Elven Mini story fixture — packages/spellkave-srd-cc/fixtures/elven-mini/
// story/level-1/{01-wake-in-inn,02-common-room,03-cellar-rats}.md — so the lab
// shows what the world actually reports, not an invented inn. No live SDK here.
// Widget *shapes* live in @spellkave/ui-widgets; this file keeps the data.

export type {
	ActionVerb,
	CombatMode,
	CombatState,
	DialogChoice,
	Exit,
	MapFrame,
	Occupant,
	OccupantKind,
	OfferedAction,
	PackItem,
	Place,
	SelfState,
	SpeechState,
} from "@spellkave/ui-widgets";

import type {
	CombatState,
	MapFrame,
	Occupant,
	OfferedAction,
	PackItem,
	Place,
	SelfState,
	SpeechState,
} from "@spellkave/ui-widgets";

// Exits are compass labels, never "up"/"down" — the loft is elevation 3 and the
// cellar is -3, but the world still names both ways out by heading.
export const places = {
	loft: {
		id: "loft",
		name: "Loft",
		description:
			"Rafters slope low over a scatter of straw pallets, quiet enough this early to hear the whole inn settling beneath you.",
		exits: [{ id: "loft-north", label: "Stairs", direction: "north" }],
	},
	stairs: {
		id: "stairs",
		name: "Stairs",
		description:
			"The stairwell of the Mountain View Inn — three creaking floors of timber and lantern-light, tucked just off the hamlet square.",
		exits: [
			{ id: "stairs-nw-common", label: "Common Room", direction: "northwest" },
			{ id: "stairs-nw-foyer", label: "Foyer", direction: "northwest" },
			{ id: "stairs-se", label: "Cellar", direction: "southeast" },
		],
	},
	commonRoom: {
		id: "common-room",
		name: "Common Room",
		description:
			"Long trestle tables share the room with a low fire, the smell of woodsmoke and last night's stew going cold on the hearth.",
		exits: [
			{ id: "common-nw", label: "Foyer", direction: "northwest" },
			{ id: "common-east", label: "Bar", direction: "east" },
			{ id: "common-se", label: "Stairs", direction: "southeast" },
			{ id: "common-sw", label: "Creation station", direction: "southwest" },
		],
	},
	bar: {
		id: "bar",
		name: "Bar",
		description:
			"A short counter of scarred oak. Innkeeper Mira works behind it, within reach of every mug in the house.",
		exits: [{ id: "bar-west", label: "Common Room", direction: "west" }],
	},
	cellar: {
		id: "cellar",
		name: "Cellar",
		description:
			"A cold, low-ceilinged cellar stacked with barrels and root sacks, the only light spilling down from the stairs above.",
		exits: [{ id: "cellar-nw", label: "Stairs", direction: "northwest" }],
	},
} as const satisfies Record<string, Place>;

export const occupants = {
	aldwin: {
		id: "aldwin",
		name: "Aldwin, keeper of the hearth-ledger",
		kind: "person",
		note: "Common room · the DM's voice in the world",
	},
	caddoc: { id: "caddoc", name: "Brother Caddoc", kind: "person", note: "Common room" },
	hearth: { id: "hearth", name: "Hearth", kind: "thing", note: "A low fire, never out" },
	mira: { id: "mira", name: "Mira", kind: "person", note: "Innkeeper · behind the bar" },
	barCounter: { id: "bar-counter", name: "Bar Counter", kind: "thing", note: "Scarred oak" },
	rat1: { id: "rat-1", name: "Cellar Rat 1", kind: "creature", note: "Behind the barrels" },
	rat2: { id: "rat-2", name: "Cellar Rat 2", kind: "creature", note: "Behind the barrels" },
	rat3: { id: "rat-3", name: "Cellar Rat 3", kind: "creature", note: "Behind the barrels" },
	ratSwarm: {
		id: "rat-swarm",
		name: "Cellar Rat Swarm",
		kind: "creature",
		note: "Too many to count as one",
	},
} as const satisfies Record<string, Occupant>;

export const actions = {
	askAldwin: { id: "ask-aldwin", label: "Ask Aldwin About Advancement", verb: "speak" },
	speakMira: { id: "speak-mira", label: "Speak To Mira", verb: "speak" },
	speakAloud: { id: "speak-aloud", label: "Speak Aloud to Room", verb: "speak" },
	walkCellar: { id: "walk-cellar", label: "Walk to the Cellar", verb: "walk" },
	meleeRat: { id: "melee-rat-1", label: "Melee Attack — Cellar Rat 1", verb: "melee" },
	meleeSwarm: { id: "melee-rat-swarm", label: "Melee Attack — Cellar Rat Swarm", verb: "melee" },
	claimVictory: { id: "claim-rat-1", label: "Claim Victory — Cellar Rat 1", verb: "claim" },
} as const satisfies Record<string, OfferedAction>;

// Level 1 human fighter: hp 11, ac 12. The hero carries no name until Aldwin's
// creation station applies one, so `unnamed` is the honest first-beat state.
export const selves = {
	unnamed: { name: "Unnamed", level: 1, hp: 11, ac: 12, xp: 0, conditions: [] },
	healthy: { name: "Renn the Roadwarden", level: 1, hp: 11, ac: 12, xp: 0, conditions: [] },
	wounded: {
		name: "Renn the Roadwarden",
		level: 1,
		hp: 4,
		ac: 12,
		xp: 175,
		conditions: ["Bloodied"],
	},
	leveled: {
		name: "Renn the Roadwarden",
		level: 2,
		hp: 18,
		ac: 12,
		xp: 325,
		conditions: ["Heroic Inspiration"],
	},
} as const satisfies Record<string, SelfState>;

export const dialogs = {
	mira: {
		speaker: "Mira",
		prompt: "She wipes a mug behind the bar counter and waits for your answer.",
		choices: [
			{ slot: 1, text: "Any news from the road?" },
			{ slot: 2, text: "What is down in your cellar?" },
			{ slot: 3, text: "Just a drink tonight." },
		],
		sayEnabled: true,
		nameField: false,
	},
	aldwinAdvancement: {
		speaker: "Aldwin, keeper of the hearth-ledger",
		prompt: "He turns a page of the hearth-ledger. Ask him about advancement.",
		choices: [
			{ slot: 1, text: "Ask Aldwin About Advancement" },
			{ slot: 2, text: "Not today." },
		],
		sayEnabled: true,
		nameField: false,
	},
	creation: {
		speaker: "Aldwin, keeper of the hearth-ledger",
		prompt: "Take a name and an ability array, then confirm. Free text never picks a class.",
		choices: [
			{ slot: 1, text: "Adopt the name Renn the Roadwarden" },
			{ slot: 2, text: "Adopt the recommended array" },
			{ slot: 3, text: "Confirm character creation" },
			{ slot: 4, text: "Discard the drafted character" },
		],
		sayEnabled: false,
		nameField: true,
	},
} as const satisfies Record<string, SpeechState>;

// The field kit is inventory, not a scene occupant — it never shows up in Occupants.
export const packs = {
	fieldKit: [
		{ id: "torch", name: "Torch", detail: "A pitch-wrapped brand. Lights one dark stair." },
		{ id: "rations", name: "Rations", detail: "Three days of dried bread and hard cheese." },
	],
	empty: [] as PackItem[],
};

export const maps = {
	peek: {
		mode: "peek",
		placeName: "The Mountain View Inn · Common Room",
		caption: "Current place peek. Loft and cellar sit off the z=0 slice and stay unnamed.",
	},
	full: {
		mode: "full",
		placeName: "Thornwick valley",
		caption: "Full-map frame. Placeholder only — no MapLibre.",
	},
} as const satisfies Record<string, MapFrame>;

export const combats = {
	click: {
		mode: "click",
		enemy: "Cellar Rat 1",
		status: "No session. One melee hit can end this.",
	},
	yourTurn: {
		mode: "your-turn",
		enemy: "Cellar Rat Swarm",
		status: "Your turn. Step or attack, then end the turn.",
	},
	waiting: {
		mode: "waiting",
		enemy: "Cellar Rat Swarm",
		status: "Not your turn. The swarm acts.",
	},
} as const satisfies Record<string, CombatState>;

// The loft is genuinely empty: no actors, no entities, no offered actions.
// The only way on is the exit north, which Place renders.
export const loftOccupants: Occupant[] = [];
export const loftActions: OfferedAction[] = [];
export const commonRoomOccupants: Occupant[] = [
	occupants.aldwin,
	occupants.caddoc,
	occupants.hearth,
];
export const commonRoomActions: OfferedAction[] = [actions.askAldwin, actions.walkCellar];
export const barOccupants: Occupant[] = [occupants.mira, occupants.barCounter];
export const barActions: OfferedAction[] = [actions.speakMira, actions.speakAloud];
export const cellarOccupants: Occupant[] = [
	occupants.rat1,
	occupants.rat2,
	occupants.rat3,
	occupants.ratSwarm,
];
export const cellarActions: OfferedAction[] = [actions.meleeRat, actions.meleeSwarm];
