/**
 * How much of a widget's content shows. `strip` is a glance row (glyph,
 * label, one datum); `card` is today's summary, tighter; `stage` is the
 * full content. Additive on every widget — absent ⇒ `card`, so an existing
 * caller keeps rendering unchanged.
 */
import type { ActionMenuEntry } from "@spellkave/ui";
import type { Snippet } from "svelte";
export type PlayDensity = "strip" | "card" | "stage";

/**
 * `"frame"` (default) draws the widget's own bordered card and title row.
 * `"bare"` drops both — a mosaic tile already draws a border and a head; a
 * widget mounted inside one goes bare so the tile's frame is the only one
 * (sk-jay0.1.8.5 finding 1). Additive: every widget defaults to `"frame"`,
 * so an existing caller (ui-lab, a standalone mount) keeps rendering
 * unchanged.
 */
export type PlayChrome = "frame" | "bare";

export type Exit = {
	id: string;
	label: string;
	direction: string | null;
	/**
	 * Traversal gates standing on the edge (advisory, never a permission
	 * verdict — the world answers the attempt). A gated exit renders as such.
	 */
	gated?: boolean;
};

export type Place = {
	id: string;
	name: string;
	description: string;
	exits: Exit[];
};

export type PlaceReadState = "ready" | "loading" | "failed" | "missing";

export type OccupantKind = "person" | "thing" | "creature";

export type Occupant = {
	id: string;
	name: string;
	kind: OccupantKind;
	note: string;
	/** Explicitly marks a generic presence note as redundant in grouped lists. */
	noteIsPresence?: boolean;
	/**
	 * Authorized scene listing kind (`actor`, `entity`, or any other source
	 * kind the tool supplied). Grouping uses this value, never the glyph
	 * `kind`. Absent/empty is an explicit Unknown group.
	 */
	sceneKind?: string;
	/** Condition ids the world reports on this occupant (e.g. `srd/condition/dead`). */
	conditions?: string[];
};

/**
 * The catalog's short verb palette, kept for the lab fixtures. A live host
 * passes the world's own `verb_class` (`communicate`, `manipulate`, `sensing`,
 * …) — any string renders; the glyph falls back to a generic one.
 */
export type ActionVerb = "speak" | "walk" | "melee" | "claim" | (string & {});

export type OfferedAction = {
	/** Structured authored classifications, preserved without label inference. */
	groups?: string[];
	id: string;
	label: string;
	/** Optional world-authored explanation; opening it never executes the action. */
	description?: string;
	verb: ActionVerb;
	/** Bundle-authored group (`ui.affordance_group`), e.g. `combat`. */
	group?: string;
	/** The action carries words (`utterance`); it renders with a field, not a bare button. */
	takesWords?: boolean;
	/** Where the words go, when `takesWords` — shown as the field's placeholder. */
	target?: string;
	/**
	 * The full, unambiguous label to use as the rendered button's own
	 * accessible name (`aria-label`/`title`) when a caller shows a shorter
	 * `label` than usual — e.g. Combat's turn-bar verb row (S3,
	 * sk-jay0.1.8.39/40), which drops the already-selected target from the
	 * visible text (`play-table.ts`'s `verbName`) but must keep the world's
	 * own target-qualified string ("Melee Attack — Cellar Rat 1")
	 * reachable by name. Absent ⇒ `label` is also the accessible name,
	 * matching every existing caller unchanged (`Actions.svelte` never
	 * reads this field).
	 */
	accessibleLabel?: string;
};

/**
 * There is deliberately NO maximum. The substrate exposes `srd/hp` (current),
 * `srd/ac`, `srd/xp`, `srd/level` and the abilities — but no per-creature
 * `srd/hp_max`: a per-creature maximum is character-creation / statblock
 * material the playing-the-game chapter does not own, recorded as a substrate
 * gap rather than invented (`packages/spellkave-srd-cc/src/chapters/`
 * `playing-the-game/hp-units.ts`, the `bloodiedExpr` note).
 *
 * So a dummy showing "4 of 11 · wounded" teaches a shape the world cannot
 * supply. Hurt is legible here the way the world makes it legible: through
 * conditions.
 *
 * Every figure is optional: a live world reports only the states a hero
 * actually carries (a fresh candidate has no armor class yet).
 */
/**
 * One of the six SRD abilities, from `spellkave_self_states` (`kind: "state"`).
 * The substrate persists only the raw score (`srd/str`, `srd/dex`, …) — the
 * modifier is never its own stored state (deliberately: "no modifier is
 * persisted as derived state",
 * `packages/spellkave-srd-cc/src/chapters/playing-the-game/modifier-units.ts`)
 * — so `modifier` here is the SRD's own published formula
 * (`floor((score - 10) / 2)`) applied to the reported score, not a value the
 * world invented on our behalf.
 */
export type Ability = {
	id: string;
	label: string;
	description?: string;
	score: number;
	modifier: number;
};

/** A capability chip (a skill proficiency or a weapon mastery), from
 * `spellkave_self_states` (`kind: "capability"`). */
export type CapabilityChip = {
	id: string;
	label: string;
};

export type SelfState = {
	descriptionReads?: {
		values?: "ready" | "loading" | "failed";
		identity?: "ready" | "loading" | "failed";
		conditions?: "ready" | "loading" | "failed";
	};
	name: string;
	/** Full-sheet values in caller-defined order. Labels and values are
	 * presentation data; the widget does not interpret resource ids. */
	sheetVitals?: { id: string; label: string; value: string; description?: string }[];
	identityDetails?: { id: string; label: string; description: string }[];
	quest?: { id: string; label: string; value: string; description?: string }[];
	conditionDetails?: {
		id: string;
		label: string;
		description?: string;
		stackCount?: number;
		expiresAtTick?: number;
	}[];
	/** Authored identity facets (`self_summary`'s `identity` glance), when the
	 * world tags them (`srd.species.*`/`srd.class.*`/`srd.background.*`). */
	species?: string;
	className?: string;
	background?: string;
	level?: number;
	hp?: number;
	ac?: number;
	xp?: number;
	/** `srd/proficiency_bonus` — the one modifier the substrate DOES persist
	 * (a baked per-entity stat, not a live macro result). */
	proficiency?: number;
	/**
	 * The six abilities, in SRD order, from `spellkave_self_states`. Optional
	 * (unlike `conditions`) so a caller predating this bead — a hand-built
	 * fixture, `apps/ui-lab`'s dummy copy — keeps compiling unchanged;
	 * absent ⇒ treated as empty, same as `[]`.
	 */
	abilities?: Ability[];
	skills?: CapabilityChip[];
	masteries?: CapabilityChip[];
	conditions: string[];
	/** Public appearance prose (`srd/appearance`); shown as the sheet's own
	 * labeled section at stage. */
	appearance?: string;
	/** Owner-only backstory prose (`srd/backstory`); shown as the sheet's own
	 * labeled section at stage. */
	backstory?: string;
	/** One line under the name (species · class · background), when known. */
	subtitle?: string;
};

export type DialogChoice = {
	slot: number;
	text: string;
};

export type SpeechState = {
	speaker: string;
	prompt: string;
	choices: DialogChoice[];
	sayEnabled: boolean;
	nameField: boolean;
};

export type PackItem = {
	id: string;
	name: string;
	detail: string;
	quantity?: number;
	/** Equipment slot the item sits in, when equipped. */
	equipped?: string | null;
	/** Containment depth (0 = carried directly); deeper rows indent under
	 * the container above them so a flat list still reads as a pack. */
	depth?: number;
};

/**
 * On-demand rich detail for the pack's currently-SELECTED item
 * (`spellkave_item_detail` plus the caller's factual manipulation context,
 * read on selection — never on every view refresh). Absent while nothing is
 * selected or the read is still in flight; `id` gates a stale detail from a
 * previous selection rendering against the new one.
 *
 * Description and fact labels are authored presentation data supplied by
 * the caller. Missing prose is omitted; the widget invents no item text.
 */
export type PackItemDetail = {
	id: string;
	description?: string;
	/** Equipment slot label, when equipped; null otherwise. */
	slot?: string | null;
	facts: { id: string; label: string; value: string }[];
	/** Item action facts, composed through the same direct `onAct` path as
	 * every other attempt. */
	verbs: OfferedAction[];
	/** The on-demand read for this item errored (a rejected tool call, not
	 * an honest empty answer) — the "Do" panel shows a distinct failed
	 * state instead of staying on "Loading" forever (sk-jay0.1.8.11 item
	 * 7). Absent or `false` is the ordinary path, unchanged. */
	failed?: boolean;
};

export type MapFrame = {
	mode: "peek" | "full";
	placeName: string;
	caption: string;
	state?: "loading" | "ready" | "empty" | "failed";
	description?: string;
	nearby?: string[];
	focusNodeId?: string;
	nearbyNodeIds?: string[];
	/**
	 * The world's own rendering (`spellkave_map`, `output_type: "svg"`),
	 * already sanitised by the host. Absent ⇒ supplied place context.
	 */
	svg?: string;
};

export type CombatMode = "click" | "your-turn" | "waiting";

export type CombatRosterEntry = {
	name: string;
	ordinal: number;
	isMe: boolean;
	isCurrent: boolean;
	/**
	 * This roster member's own `PlayAction.targetRef` (`entity:<actorId>`),
	 * when the fight offers at least one action against it (S3,
	 * sk-jay0.1.8.39/40). Absent for a roster member nothing currently
	 * targets (the hero, a dead rat). Lets the tracker chip double as the
	 * matching `CombatTarget`'s selector instead of drawing the same name
	 * twice (design doc §9 row S3: "the cross product of buttons is gone").
	 */
	targetRef?: string;
	/**
	 * This roster member's co-located `spellkave_scene` occupant carries a
	 * `…/dead` condition (S5, sk-jay0.1.8.41, design doc §9/§10 row S5).
	 * Rendered as a struck-through name, not a glyph token, mirroring the
	 * Occupants widget's own "Dead" wording. Absent/false for a roster
	 * member with no matching occupant (not co-located, or the scene read
	 * never disclosed it) or one that is simply alive — never inferred by
	 * the widget itself.
	 */
	dead?: boolean;
	/**
	 * Every OTHER condition the co-located occupant discloses (S5) —
	 * "dead" is pulled out into `dead` above instead of duplicated here.
	 * `label` is the caller's own player-facing text (`play-table.ts`'s
	 * `conditionLabel`, the same map `play-view.ts` and the Occupants
	 * widget's note already use); the widget renders exactly what it is
	 * given, it never derives a condition of its own. Absent/empty ⇒ no
	 * tokens render, matching every other roster member.
	 */
	conditions?: { id: string; label: string }[];
};

export type CombatState = {
	mode: CombatMode;
	enemy: string;
	status: string;
	/** Turn order as the world reports it (`spellkave_session_status.roster`). */
	roster?: CombatRosterEntry[];
};

/**
 * One target's own row in the turn bar (`play-table.ts`'s `TargetGroup`,
 * re-exported here as the widget's own input shape so `ui-widgets` does
 * not import the app's `play-table.ts`). `targetRef` is the exact
 * `PlayAction.targetRef` the world sent (or `""` for the untargeted group,
 * `play-table.ts`'s `UNTARGETED_TARGET_REF`) — never invented by the
 * widget. `actions` reuses `OfferedAction`, the same row shape `Actions.svelte`
 * already renders buttons from.
 */
export type CombatTarget = {
	targetRef: string;
	label: string;
	actions: OfferedAction[];
};

/**
 * One action-economy channel's current-window standing, from
 * `spellkave_self_states` (`kind: "economy"`). Presentation-mapped from the
 * app's own read (`play-view.ts`'s `economyFromPayload`): `channelId` is the
 * full server id (e.g. `srd/economy_channel/primary`), never a shortened or
 * guessed form — this widget's own label map keys off the exact string.
 */
export type EconomyChannel = {
	channelId: string;
	spentMs: number;
	windowStartMs: number;
};

export type EconomyProps = {
	/**
	 * Every channel to draw, one pip each, in this exact order. Only
	 * channels the world's own read returned belong here — a channel this
	 * actor's world has not bound (e.g. Movement, before `sk-0m4.123`) must
	 * be omitted by the caller rather than passed as a zero-spend row.
	 */
	channels: EconomyChannel[];
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type HeroProps = {
	self: SelfState;
	density?: PlayDensity;
	chrome?: PlayChrome;
	/**
	 * The play host owns the shared standard info-card provider. Standalone
	 * widget consumers retain the self-contained field readers instead.
	 */
	infoCards?: boolean;
};

export type SceneProps = {
	place: Place;
	/** Walk through an exit. Absent ⇒ exits render as inert labels (the catalog). */
	onMove?: (exitId: string) => void;
	/** Disables every exit while an action is in flight. */
	busy?: boolean;
	/** Distinct from a missing description: a failed read is an error. */
	readState?: Exclude<PlaceReadState, "missing">;
	/** When false, the host owns Ways out and this widget does not render exits. */
	showExits?: boolean;
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type PackProps = {
	/** Select items for an external action dock; details remain informational. */
	selectionOnly?: boolean;
	renderProse?: Snippet<[string]>;
	reference?: Snippet<[string]>;
	/** Host-supplied navigation to currently offered actions on other targets. */
	otherActions?: { label: string; onOpen: () => void };
	/** Consumer-owned media for the selected subject; no game-specific lookup. */
	artwork?: Snippet<[string]>;
	items: PackItem[];
	/** Controlled selection, mirroring `OccupantsProps.selectedId` — absent ⇒
	 * the first item, same as before this was lifted to the caller. */
	selectedId?: string | null;
	/**
	 * Presentation-only selection highlight. Callers must not use this to
	 * mutate world state.
	 */
	onSelect?: (id: string) => void;
	/** Rich detail for the selected item, read on demand by the caller. */
	detail?: PackItemDetail | null;
	/** Fire an item verb; `words` carries the utterance of a takesWords verb. */
	onAct?: (id: string, words?: string) => void;
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type SpeechProps = {
	dialog: SpeechState;
	label: string;
	/** Pick a numbered answer. Absent ⇒ the catalog's inert buttons. */
	onChoose?: (slot: number) => void;
	/** Say free words to the speaker (parse-to-propose, never a commit). */
	onSay?: (text: string) => void;
	busy?: boolean;
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type CombatProps = {
	combat: CombatState;
	/**
	 * The fight's offered actions, regrouped by target (S3, sk-jay0.1.8.39/40
	 * `PlayTable.svelte`'s `targetsFromView(view)`). Absent or empty ⇒ no
	 * chips or verb row render (an older caller, or outside a live fight),
	 * matching every other widget's additive-prop convention.
	 */
	targets?: CombatTarget[];
	/** The chip currently showing its verb row. Absent/unmatched ⇒ the first
	 * group in `targets`, mirroring `PlayTable.svelte`'s own fallback. */
	selectedTargetRef?: string | null;
	/** A chip (tracker or standalone) was picked. Presentation-only: never
	 * dispatches a world action by itself. */
	onSelectTarget?: (targetRef: string) => void;
	/** A verb button in the selected target's row was pressed. */
	onAct?: (id: string) => void;
	onAttack?: () => void;
	onStep?: () => void;
	onEndTurn?: () => void;
	/**
	 * Action-economy channels for the turn bar's own pip strip (S4,
	 * sk-jay0.1.8.40 mount step). Absent or empty ⇒ no strip renders — the
	 * turn bar never shows the standalone widget's "No action economy
	 * reported yet." placeholder; that copy belongs to the standalone card,
	 * not this compact mount.
	 */
	economy?: EconomyChannel[] | null;
	/**
	 * The Table now acts, the map/turn-bar only select (sk-jay0.1.8.63.13,
	 * user ruling 2026-09-19): true drops the per-target verb row and the
	 * standalone-target chip row (a `SelectionRow` renders their content
	 * instead), and makes EVERY roster chip with a `targetRef` clickable —
	 * not just one `targets` currently offers a live verb for, since a dead
	 * or unengaged combatant is still a legitimate thing to select. Also
	 * drops `selectedTargetRef`'s fallback to the first `targets` group: with
	 * nothing selected, nothing highlights. Absent/false ⇒ unchanged legacy
	 * behaviour (`targets`/`onAct` still drive an inline verb row).
	 */
	selectionMode?: boolean;
	busy?: boolean;
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type PlaceMapProps = {
	frame: MapFrame;
	density?: PlayDensity;
	chrome?: PlayChrome;
	/**
	 * Neighbouring places this plate can offer a one-hop travel to, matched
	 * against the plate's own `data-node-id` marks (same contract as
	 * `BattleMapExit`, reused here rather than duplicated). Absent, or no
	 * `onTravel`, leaves the plate exactly as inert as before.
	 */
	exits?: BattleMapExit[];
	/** Fire an offered travel; `handle` is the exit's own `s:exit:*` id. */
	onTravel?: (handle: string) => void;
	/**
	 * The exit currently being resolved. Its matching node goes
	 * `aria-busy="true"` with a muted look, and no travel target activates
	 * while this is set.
	 */
	pendingHandle?: string | null;
	/** Blocks all activation but keeps the marked nodes visible as targets. */
	disabled?: boolean;
};

export type OccupantsProps = {
	occupants: Occupant[];
	selectedId?: string | null;
	/**
	 * Presentation-only selection highlight. Callers must not use this to
	 * mutate world state.
	 */
	onSelect?: (id: string) => void;
	/**
	 * An optional shared information-card reference for a compact roster name.
	 * The host still owns selection through `onSelect`; this never creates an
	 * action surface in the Place tile.
	 */
	infoRefFor?: (occupant: Occupant) => string | undefined;
	density?: PlayDensity;
	chrome?: PlayChrome;
};

export type EntityDetailBody = {
	id: string;
	description?: string;
	/** Equipment slot label, when equipped; null otherwise. */
	slot?: string | null;
	facts: { id: string; label: string; value: string }[];
	verbs: OfferedAction[];
	failed?: boolean;
};

export type EntityDetailProps = {
	name: string;
	selectedId: string;
	/** The reference card's small kind label ("Person", "Creature",
	 * "Object"); the hearth read as a "Person" while it was hardcoded. */
	kindLabel?: string;
	/** Rich detail for `selectedId`; a mismatched or null id is loading unless failed. */
	detail?: EntityDetailBody | null;
	lead?: string;
	renderProse?: Snippet<[string]>;
	reference?: Snippet<[string]>;
	artwork?: Snippet<[string]>;
	onAct?: (id: string, words?: string) => void;
	busy?: boolean;
	/** Presentation shortcut (e.g. Talk in Table). Must not execute an offer. */
	otherActions?: { label: string; onOpen: () => void };
	actionsTitle?: string;
	loadingText?: string;
	failedText?: string;
	emptyText?: string;
	showMissingDescription?: boolean;
	showHeading?: boolean;
	/** Render the Maps/Doku reference-card presentation while retaining live actions. */
	referencePresentation?: boolean;
	/** Read-only renderings (Maps' drawer) hide the actions block entirely. */
	showActions?: boolean;
	ariaLabel?: string;
	/**
	 * Host-supplied secondary-verb classification (sk-jay0.1.8.63.9): a verb
	 * this returns `true` for renders inside the ONE closed-by-default
	 * disclosure instead of the flat primary list — a scene offering ~20
	 * ability/skill checks alongside a handful of meaningful verbs (attack,
	 * speak, take…) otherwise buries the latter in a wall of buttons. This
	 * widget never inspects a verb's label or id to decide — the host owns
	 * the semantic classification (e.g. a descriptor family) and supplies it
	 * here. Absent ⇒ every verb renders primary, unchanged from before this
	 * prop existed.
	 */
	isSecondaryVerb?: (verb: OfferedAction) => boolean;
	/** Disclosure summary text before the "(<count>)" suffix. Default: "More". */
	secondaryVerbsLabel?: string;
};

/**
 * A NAME rendered inline (a company sentence, a speech burst's own heading)
 * that doubles as the trigger for that entity's own detail reader
 * (sk-jay0.1.8.63.7): the visible text stays the plain name, styled as a
 * reading-aid link, but its accessible name adds "…, details" and activating
 * it opens `EntityDetail` in a dialog instead of navigating. Wraps
 * `@spellkave/ui`'s `Dialog` (bits-ui underneath) rather than inventing a
 * second reader, so focus return, Escape-to-close and the dialog's own
 * accessible name (the entity's name, via the dialog's title) are the same
 * contract every other reader in this app already has.
 */
export type EntityReaderDialogProps = {
	open?: boolean;
	name: string;
	selectedId: string;
	kindLabel?: string;
	detail?: EntityDetailBody | null;
	artwork?: Snippet<[string]>;
	onAct?: (id: string, words?: string) => void;
	busy?: boolean;
	/** Fires on every open/close transition (mirrors `Dialog`'s own prop) —
	 * the host's own hook to (re)request `selectedId`'s detail the moment the
	 * reader opens, deduped exactly like any other on-demand selection read. */
	onOpenChange?: (open: boolean) => void;
	/**
	 * The host's own public-reference presentation for this entity (Play owns
	 * the vocabulary fetch/catalogue path — `apps/play/CLAUDE.md`'s "Public
	 * reference links" — this package never fetches network data). Rendered
	 * below the world detail when supplied; entirely absent otherwise, so a
	 * disabled or unavailable reference feed never leaves a placeholder.
	 */
	reference?: Snippet;
	class?: string;
	/** See `EntityDetailProps.isSecondaryVerb` — forwarded verbatim. */
	isSecondaryVerb?: (verb: OfferedAction) => boolean;
	/** See `EntityDetailProps.secondaryVerbsLabel` — forwarded verbatim. */
	secondaryVerbsLabel?: string;
};

export type PlaceProps = {
	/** Select occupants/exits for an external action dock; hide local actions. */
	selectionOnly?: boolean;
	/** A host without structured composer facts can keep historical read-only details. */
	showDetailActions?: boolean;
	onSelectExit?: (exitId: string) => void;
	selectedExitId?: string | null;
	/** Explicit composer insertion, distinct from selection or dispatch. */
	onInsertMove?: (exitId: string) => void;
	renderProse?: Snippet<[string]>;
	reference?: Snippet<[string]>;
	place: Place | null;
	placeState?: PlaceReadState;
	occupants: Occupant[];
	selectedId?: string | null;
	onSelect?: (id: string) => void;
	/**
	 * One standard information-card ref for each compact Place roster name.
	 * The host still owns selection through `onSelect`; this only supplies the
	 * presentation card for a hovered or clicked name.
	 */
	infoRefFor?: (occupant: Occupant) => string | undefined;
	detail?: EntityDetailBody | null;
	artwork?: Snippet<[string]>;
	onAct?: (id: string, words?: string) => void;
	onMove?: (exitId: string) => void;
	busy?: boolean;
	otherActions?: { label: string; onOpen: () => void };
	environmentActions?: OfferedAction[];
	density?: PlayDensity;
	chrome?: PlayChrome;
	/** See `EntityDetailProps.isSecondaryVerb` — forwarded to the selected
	 * occupant's own `EntityDetail` verbatim. */
	isSecondaryVerb?: (verb: OfferedAction) => boolean;
	/** See `EntityDetailProps.secondaryVerbsLabel` — forwarded verbatim. */
	secondaryVerbsLabel?: string;
};

export type ActionsProps = {
	actions: OfferedAction[];
	/** Fire an action; `words` carries the utterance of a `takesWords` action. */
	onAct?: (id: string, words?: string) => void;
	busy?: boolean;
	/** Heading override (the page groups actions under several frames). */
	title?: string;
	/** Optional count when the list shown is a slice of a longer offer. */
	total?: number;
	/** Optional reader-facing replacement for the default `<count> offered` meta. */
	meta?: string;
	/** Hide the frame's visual label when a host supplies an obvious, fixed action dock. */
	showHeader?: boolean;
	density?: PlayDensity;
	chrome?: PlayChrome;
};
export interface ActivityStatusProps {
	/** Optional caller-observed status, separate from authored description. */
	notice?: string;
	label: string;
	phase: string;
	description?: string | null;
	progress?: number | null;
	fields?: { label: string; value: string }[];
}

/**
 * One adjacent cell the world offers a step onto (one hop only —
 * `spellkave_scene.exits`, filtered to the tactical grid). `handle` is the
 * offered `s:exit:*` id passed back through `onStep`; `toNodeId` matches a
 * plate cell's `data-node-id` (render-svg.ts); `label` is the world's own
 * exit label, shown as the cell's accessible name.
 */
export type BattleMapExit = {
	handle: string;
	toNodeId: string;
	label: string;
};

/**
 * One occupant token drawn as an overlay disc on a battle-map cell (user
 * ruling 2026-09-19: "The map only ever SELECTS. Actions happen only on the
 * Table."). `nodeId` matches a plate cell's `data-node-id`, same contract as
 * `BattleMapExit.toNodeId`. Several tokens may share one `nodeId`.
 */
export type BattleMapToken = {
	nodeId: string;
	actorId: string;
	name: string;
	/** This token is the viewing player's own actor. Takes visual precedence
	 * over `tone`. */
	isMe?: boolean;
	tone?: "ally" | "foe" | "neutral";
	/**
	 * Optional picture for this token (a URL the host resolved; the widget
	 * does no game-specific lookup). Drawn on the disc, whose rim keeps the
	 * tone. Absent, or failing to load, leaves the initials disc.
	 */
	image?: string;
};

export type BattleMapProps = {
	/** The world's own rendering (`spellkave_map`, `output_type: "svg"`),
	 * already sanitised by the host (same contract as `MapFrame.svg`). */
	plate: string;
	/** The player's current cell (`view.place.id` on the tactical grid). */
	ownNodeId: string | null;
	exits: BattleMapExit[];
	/**
	 * Step onto an offered neighbour cell. Only ever fires when `onSelectCell`
	 * is absent (legacy mode) — once a host supplies `onSelectCell`, a click
	 * always selects, never steps, per the "map only ever selects" ruling.
	 */
	onStep: (handle: string) => void;
	/** One line under the plate for a rejected step (occupied-cell refusal,
	 * `failure_detail`), rendered instead of the world's honest silence.
	 * Absent ⇒ nothing renders. */
	refusal: string | null;
	/**
	 * Controlled selection (the map only ever selects; the Table acts).
	 * Absent/null ⇒ no cell is marked selected.
	 */
	selectedNodeId?: string | null;
	/**
	 * Presence of this callback switches the whole widget into selection
	 * mode: a click, Enter, or Space on ANY cell calls this with the cell's
	 * `data-node-id` and never calls `onStep`, even for an offered neighbour.
	 * Absent ⇒ legacy mode, unchanged from before this prop existed.
	 */
	onSelectCell?: (nodeId: string) => void;
	/** Occupant tokens to draw as an overlay, keyed by cell. Absent/empty ⇒
	 * the plate's own anonymous count badge (`.actor`/`.actor-label`) shows
	 * as before. */
	tokens?: BattleMapToken[];
	/**
	 * Which cells respond to selection. `"all"` (the default whenever
	 * `onSelectCell` is supplied) makes every cell selectable — free,
	 * occupied, own, or out of reach — because selecting is information, not
	 * action. A specific list restricts which cells actually fire
	 * `onSelectCell`; every cell still renders its own visual truth (own
	 * mark, reachable tint, tokens) regardless of this restriction.
	 */
	selectableNodeIds?: readonly string[] | "all";
	/** Keeps pan and zoom across a remount: a host that drops and re-mounts
	 * the map (a plate reload on every step and turn) passes one stable key
	 * per fight, and the reader's view survives. Absent → the view starts
	 * fresh on every mount, as before. "Reset view" still returns to full. */
	viewKey?: string;
};

/** One key-pilled, immediately-actionable offer on a `SelectionRow` subject. */
export type SelectionRowAction = {
	id: string;
	/** The pill's own visible text — kept short since the subject it
	 * belongs to already names the target. */
	label: string;
	/**
	 * The full, unambiguous name for the pill's `aria-label`/`title` (e.g.
	 * "Melee Attack — Cellar Rat 1") — two different subjects can offer a
	 * pill with the identical visible `label` ("Melee Attack"), so the
	 * accessible name must not collide. Absent ⇒ `label` is already
	 * unambiguous on its own (an untargeted action, a synthetic move entry).
	 */
	accessibleLabel?: string;
};

/**
 * One target of the current selection (an occupant on a cell, a free cell,
 * a neighbouring place, "You") — `apps/play/src/lib/selection.ts`'s own
 * `SelectionSubject`, re-exported here as the widget's input shape so
 * `ui-widgets` does not import the app's module (the same pattern
 * `CombatTarget` already follows for `TargetGroup`). `name` is plain text;
 * the host renders it through the `name` snippet below when it wants an
 * `InfoLink` instead (`ui-widgets` has no opinion on info cards).
 */
export type SelectionRowSubject = {
	id: string;
	name: string;
	/** An info-card ref for the host's own `name` snippet — the widget never
	 * reads this itself. */
	infoRef?: string;
	primary: SelectionRowAction[];
	more: ActionMenuEntry[];
};

export type SelectionRowProps = {
	title: string;
	subtitle?: string;
	subjects: SelectionRowSubject[];
	/** A short honest sentence when the selection offers nothing. */
	note?: string;
	/** The id of the action whose call is in flight — only that one pill
	 * shows pending. */
	pendingActionId?: string | null;
	disabled?: boolean;
	/** Fires with a primary pill's or a `more` entry's own id. Never called
	 * for a submenu entry itself (mirrors `ActionMenuProps.onSelect`). */
	onAct: (actionId: string) => void;
	/** Renders a subject's name — the host's chance to wrap it in an
	 * `InfoLink` when `subject.infoRef` is set. Absent ⇒ plain text. */
	name?: Snippet<[SelectionRowSubject]>;
};
