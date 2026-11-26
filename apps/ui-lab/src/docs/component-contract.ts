/** Curated documentation of selected component boundaries, not a second runtime schema. */
export interface ComponentContract {
	exportName: string;
	packageName: string;
	responsibility: string;
	dataOwner: string;
	source: string;
	inputs: { name: string; type: string; description: string }[];
	related: { path: string; label: string; description: string }[];
	consumers: { source: string; description: string }[];
}

export const referenceCardContract: ComponentContract = {
	exportName: "ReferenceCard",
	packageName: "@spellkave/ui",
	responsibility:
		"Presentation only: a title, optional image, facts, and a content snippet. It does not fetch data, parse Markdown, or open a floating window.",
	dataOwner: "The caller supplies display values. No world entity or catalogue record is required.",
	source: "packages/spellkave-ui/src/reference-card/reference-card.svelte",
	inputs: [
		{ name: "label, title", type: "string", description: "Required kind label and heading." },
		{
			name: "href, onNavigate",
			type: "optional URL and callback",
			description: "A normal title link; a caller may take over navigation.",
		},
		{
			name: "art",
			type: "optional { href, alt? }",
			description:
				"An image URL, not an asset identifier. Omit it for text-only cards; no loading/error placeholder API.",
		},
		{
			name: "facts",
			type: "ReferenceFact[]",
			description: "Label/value pairs with optional links and click handlers.",
		},
		{
			name: "children",
			type: "Snippet",
			description: "Caller-rendered body, not a description string interpreted by this component.",
		},
	],
	related: [
		{
			path: "/docs/entry-compact",
			label: "EntryCompact",
			description: "Adapts a catalogue display object to this card.",
		},
		{
			path: "/maps/hover-card",
			label: "HoverCard",
			description: "Map popup content; positioning belongs to MapCanvas.",
		},
		{
			path: "/components/popover",
			label: "Popover",
			description: "Owns floating-window interaction, independently of card content.",
		},
	],
	consumers: [
		{
			source: "apps/website/src/compendium/ReferenceCard.svelte",
			description:
				"Website adapter: adds a description string rendered as Markdown and local documentation navigation; forwards images and facts.",
		},
		{
			source: "apps/play/src/components/ReferencePreview.svelte",
			description:
				"Play integration: lazily loads public reference JSON and composes Popover + ReferenceCard. Currently title and plain-text description only, no art. The actual integration is exercised in Play's Creation playground, not copied here.",
		},
	],
};

export const linkMenuContract: ComponentContract = {
	exportName: "LinkMenu",
	packageName: "@spellkave/ui",
	responsibility:
		"Presents one ambiguous inline token as a menu of labelled targets. It owns menu focus and selection; the caller owns what selecting a target navigates to.",
	dataOwner:
		"The caller supplies already-resolved LinkMenuItem values. It does not parse DSL, look up documentation, or invent a fallback target.",
	source: "packages/spellkave-ui/src/link-menu/link-menu.svelte",
	inputs: [
		{
			name: "items",
			type: "LinkMenuItem[]",
			description:
				"Resolved label, optional kind hint, and optional href for each possible meaning of the token.",
		},
		{
			name: "children, label",
			type: "Snippet and optional string",
			description:
				"The inline token is caller-rendered; label overrides its accessible name when the token alone is not descriptive.",
		},
		{
			name: "onSelect",
			type: "optional (item) => void",
			description:
				"Selection callback. The host chooses client-side routing, normal navigation, or another response.",
		},
	],
	related: [
		{
			path: "/components/code",
			label: "Code",
			description: "Provides the code surface around inline reference tokens.",
		},
		{
			path: "/docs/action",
			label: "ActionView",
			description: "One catalogue renderer that can surface resolved DSL references.",
		},
	],
	consumers: [
		{
			source: "packages/spellkave-ui-widgets/src/catalogue/DslExpression.svelte",
			description:
				"Maps ambiguous, already-tokenised DSL references to targets and routes a selected href through catalogueOpen.",
		},
	],
};

export const entryCompactContract: ComponentContract = {
	exportName: "EntryCompact",
	packageName: "@spellkave/ui-widgets/catalogue",
	responsibility:
		"Adapts a catalogue display row into a compact ReferenceCard. This is a view model, not a raw server row.",
	dataOwner:
		"Per-kind projectors (for example actionRowView) turn catalogue records into DocsRowEntryView; the caller provides navigation context.",
	source: "packages/spellkave-ui-widgets/src/catalogue/EntryCompact.svelte",
	inputs: [
		{
			name: "row",
			type: "DocsRowEntryView",
			description:
				"ref, title, kind_label, fields and optional href/description. No art field. Compact facts currently retain label/value only, not field links or DSL formatting.",
		},
	],
	related: [
		{
			path: "/components/reference-card",
			label: "ReferenceCard",
			description: "Owns the card layout.",
		},
		{
			path: "/docs/action",
			label: "ActionView",
			description: "One typed catalogue adapter using this compact rendering.",
		},
	],
	consumers: [
		{
			source: "packages/spellkave-ui-widgets/src/catalogue/ActionView.svelte",
			description: "view=compact delegates here; inline/full use other catalogue renderers.",
		},
	],
};

export const hoverCardContract: ComponentContract = {
	exportName: "HoverCard",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Map popup content only. Despite its name, it has no hover trigger, positioning, or dismiss behavior.",
	dataOwner:
		"MapCanvas maps a hovered feature into display strings and mounts this content in its map popup.",
	source: "packages/spellkave-ui-widgets/src/HoverCard.svelte",
	inputs: [
		{ name: "title", type: "string", description: "Required heading." },
		{
			name: "label, meta, snippet",
			type: "optional strings",
			description:
				"Label defaults to Place; metadata and snippet default to empty. No image input.",
		},
	],
	related: [
		{
			path: "/components/reference-card",
			label: "ReferenceCard",
			description: "Shared visual structure.",
		},
		{
			path: "/maps/canvas",
			label: "Map canvas",
			description: "Owns the actual hover interaction.",
		},
	],
	consumers: [
		{
			source: "packages/spellkave-map-canvas/src/MapCanvas.svelte",
			description:
				"Mounts and positions the map popup; this demo intentionally shows only its content.",
		},
	],
};

export const combatContract: ComponentContract = {
	exportName: "Combat",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Renders the current combat turn bar: roster, target-specific offered verbs, reported action economy, and End turn. It never derives legal targets or spends an action by itself.",
	dataOwner:
		"Play's view adapter groups world-offered actions by target and maps the actor's returned economy channels. The host owns selection and dispatch callbacks.",
	source: "packages/spellkave-ui-widgets/src/Combat.svelte",
	inputs: [
		{
			name: "combat",
			type: "CombatState",
			description:
				"Session status plus the world-reported roster; no live connection inside the widget.",
		},
		{
			name: "targets, selectedTargetRef, onSelectTarget, onAct",
			type: "optional CombatTarget[] and callbacks",
			description:
				"The host groups offered actions by target and owns which group is selected and how a verb is dispatched.",
		},
		{
			name: "economy",
			type: "optional EconomyChannel[]",
			description:
				"Only channels returned by the world belong here. A missing channel is not presented as an invented available action.",
		},
		{
			name: "onEndTurn, busy, density, chrome",
			type: "optional callback and presentation state",
			description:
				"The host dispatches End turn and blocks duplicate interaction while work is in flight.",
		},
	],
	related: [
		{
			path: "/play/actions",
			label: "Actions",
			description: "Renders offered verbs outside a combat target context.",
		},
		{
			path: "/play/map",
			label: "PlaceMap",
			description: "Shows the place frame; a tactical map is a separate future family.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Supplies live grouped targets, economy, selection state, and action reducers from the player view.",
		},
	],
};

export const economyContract: ComponentContract = {
	exportName: "Economy",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Displays returned action-economy channels. It does not infer a missing channel or decide whether an action is legal.",
	dataOwner: "Play maps spellkave_self_states economy rows into EconomyChannel values.",
	source: "packages/spellkave-ui-widgets/src/Economy.svelte",
	inputs: [
		{
			name: "channels",
			type: "EconomyChannel[]",
			description: "Only rows the world read returned, in that order.",
		},
		{
			name: "density, chrome",
			type: "optional presentation state",
			description: "Host-controlled display level and framing.",
		},
	],
	related: [
		{
			path: "/play/combat",
			label: "Combat",
			description: "Mounts this compactly beside the current turn.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description: "Passes actor economy rows into Combat; no unavailable channel is fabricated.",
		},
	],
};

export const battleMapContract: ComponentContract = {
	exportName: "BattleMap",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Marks and selects cells on a sanitised tactical SVG plate while preserving the world drawing. The map only ever selects — every cell is selectable, an offered neighbour keeps a quiet reachable tint, occupant tokens draw as an overlay — and selecting never itself executes an action; only `onStep` (legacy, absent `onSelectCell`) steps.",
	dataOwner:
		"Play supplies the rendered plate, current node, one-hop exits, and occupant tokens for occupied cells. Technical location detail remains a separate world projection.",
	source: "packages/spellkave-ui-widgets/src/BattleMap.svelte",
	inputs: [
		{
			name: "plate, ownNodeId",
			type: "sanitised SVG and node id",
			description: "World-rendered grid markup and the player’s reported cell.",
		},
		{
			name: "exits, onStep, refusal",
			type: "BattleMapExit[] and callback",
			description:
				"Legacy mode (no onSelectCell): only world-offered steps become interactive; a rejection names the returned reason.",
		},
		{
			name: "selectedNodeId, onSelectCell, selectableNodeIds",
			type: "string | null, callback, BattleMapExit['toNodeId'][] | \"all\"",
			description:
				"Supplying onSelectCell switches every cell into a selector (default: every cell, since selecting is information, not action); onStep never fires once this is set.",
		},
		{
			name: "tokens",
			type: "BattleMapToken[]",
			description:
				"Occupant identities drawn as per-cell discs, replacing the plate's own anonymous count badge for a cell they cover.",
		},
	],
	related: [
		{
			path: "/play/map",
			label: "PlaceMap",
			description: "The non-tactical place-map presentation.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description: "Chooses BattleMap only for a tactical session with a grid-capable world plate.",
		},
	],
};

export const placeMapContract: ComponentContract = {
	exportName: "PlaceMap",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Draws the place peek or full-map frame; optionally offers click-to-travel to a neighbouring place, matched against the plate's own data-node-id marks. With no onTravel it stays exactly as inert as a plain map.",
	dataOwner:
		"Play supplies the map frame and, for travel, the one-hop exits. The current place's own node never becomes a travel target.",
	source: "packages/spellkave-ui-widgets/src/PlaceMap.svelte",
	inputs: [
		{
			name: "frame",
			type: "MapFrame",
			description: "Place name, caption, and the world's own sanitised SVG, when drawn.",
		},
		{
			name: "exits, onTravel, pendingHandle, disabled",
			type: "BattleMapExit[] and callback",
			description:
				"Only nodes matching an offered exit become operable; a pending or disabled state blocks activation without hiding the targets.",
		},
	],
	related: [
		{
			path: "/play/battle-map",
			label: "BattleMap",
			description: "The tactical-grid presentation of the same data-node-id contract.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Mounts PlaceMap for the place peek and full-map frame today; wiring the offered exits and travel dispatch is a separate follow-up (sk-jay0.1.8.63.8).",
		},
	],
};

export const fieldDetailContract: ComponentContract = {
	exportName: "FieldDetail",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"A display-only field reader that opens supplied description and metadata in a dialog. It never fetches or dispatches.",
	dataOwner: "The calling view owns field values, prose, metadata, and read state.",
	source: "packages/spellkave-ui-widgets/src/FieldDetail.svelte",
	inputs: [
		{
			name: "label, value, description, metadata",
			type: "display values",
			description: "Already-authorised values and explanatory prose.",
		},
		{
			name: "readState",
			type: "ready | loading | failed",
			description: "Makes absence, pending data, and failed detail distinguishable.",
		},
	],
	related: [
		{
			path: "/play/hero",
			label: "Hero",
			description: "Uses field readers for supplied character facts.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/Chronicle.svelte",
			description: "Opens a selected chronicle fact without asking the world for more data.",
		},
	],
};

export const entityReaderDialogContract: ComponentContract = {
	exportName: "EntityReaderDialog",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"A NAME rendered inline (a company sentence, a speech burst's own heading) that doubles as the trigger for that entity's own detail reader: styled as an inline reading-aid link, its accessible name adds \", details\", and activating it opens EntityDetail in a dialog rather than navigating. Opening it never invokes a world action; wraps @spellkave/ui's Dialog so focus return, Escape-to-close and the dialog's own accessible name are the same contract every other reader in the app already has.",
	dataOwner:
		"The calling view owns the selected entity's on-demand detail read (description, facts, verbs) and busy state; this package never fetches world or reference data itself.",
	source: "packages/spellkave-ui-widgets/src/EntityReaderDialog.svelte",
	inputs: [
		{
			name: "name, selectedId",
			type: "string",
			description:
				"The visible/accessible name and the entity id `detail` must match to be shown as loaded.",
		},
		{
			name: "detail, kindLabel, artwork, busy",
			type: "EntityDetailBody | null and display state",
			description:
				"Forwarded straight to EntityDetail; a mismatched or null detail reads as still loading.",
		},
		{
			name: "onAct",
			type: "(id, words?) => void",
			description:
				"Fires a verb through the host's own action path; never called merely by opening the reader.",
		},
		{
			name: "onOpenChange",
			type: "(open: boolean) => void",
			description:
				"The host's hook to (re)request selectedId's detail the moment the reader opens.",
		},
		{
			name: "reference",
			type: "Snippet",
			description:
				"The host's own public-reference presentation (Play owns the vocabulary fetch); absent entirely when no reference feed or match exists.",
		},
		{
			name: "isSecondaryVerb, secondaryVerbsLabel",
			type: "((verb: OfferedAction) => boolean) | undefined, string",
			description:
				"Forwarded straight to EntityDetail: the host's own semantic classification (e.g. a descriptor family, never a label) collapses matching verbs behind one closed-by-default disclosure so a wall of ability/skill checks does not bury a meaningful verb (attack, speak, take…). Absent classifier ⇒ every verb renders primary, unchanged.",
		},
	],
	related: [
		{
			path: "/play/scene",
			label: "Scene",
			description:
				"The Place tile's own inline occupant detail (EntityDetail directly) keeps working unchanged.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"A present occupant's own name in the Explore stream's company prose or a speech burst's heading opens this reader; a departed speaker falls back to plain reference-linked text instead.",
		},
	],
};

export const sceneContract: ComponentContract = {
	exportName: "Scene",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Renders a place’s supplied name, prose, and named exits; it never resolves movement itself.",
	dataOwner: "Play maps the current spellkave_scene read into Place and owns a move callback.",
	source: "packages/spellkave-ui-widgets/src/Scene.svelte",
	inputs: [
		{
			name: "place, onMove",
			type: "Place and optional callback",
			description:
				"A current place plus its offered exits; omitted callback leaves catalog exits inert.",
		},
		{
			name: "readState, busy",
			type: "optional view state",
			description: "Separates a pending or failed read from an empty place.",
		},
	],
	related: [
		{
			path: "/play/occupants",
			label: "Occupants",
			description: "Shows the separate current scene listing.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Adapts the current place and routes an offered exit through the player move reducer.",
		},
	],
};

export const occupantsContract: ComponentContract = {
	exportName: "Occupants",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Lists the currently supplied people, creatures, and things and exposes presentation-only selection.",
	dataOwner: "Play projects spellkave_scene occupants and owns any selected-detail read.",
	source: "packages/spellkave-ui-widgets/src/Occupants.svelte",
	inputs: [
		{
			name: "occupants, selectedId, onSelect",
			type: "Occupant[] and optional selection",
			description:
				"Caller-controlled scene entries and selection; selection is not a world action.",
		},
	],
	related: [
		{
			path: "/play/scene",
			label: "Scene",
			description: "Provides the place context that the list belongs to.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Selects an occupant then requests its authorised detail through the session adapter.",
		},
	],
};

export const actionsContract: ComponentContract = {
	exportName: "Actions",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Renders already-offered actions and optionally calls the host’s dispatch callback. It never creates availability.",
	dataOwner:
		"Play maps player tool offers into OfferedAction and owns dispatch, word input, and busy state.",
	source: "packages/spellkave-ui-widgets/src/Actions.svelte",
	inputs: [
		{
			name: "actions, onAct",
			type: "OfferedAction[] and optional callback",
			description: "World-offered labels and verb classes; callback is the host dispatch boundary.",
		},
		{
			name: "busy, total, density, chrome",
			type: "optional presentation state",
			description: "Host controls duplicate-action prevention, count context, and display.",
		},
	],
	related: [
		{
			path: "/play/combat",
			label: "Combat",
			description: "Regroups combat actions by target rather than using a flat action palette.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Renders remaining and contextual offers after dialogue and combat claims their own handles.",
		},
	],
};

export const activityFeedContract: ComponentContract = {
	exportName: "ActivityFeed",
	packageName: "@spellkave/ui-widgets",
	responsibility:
		"Renders an ordered activity list with a stable entry hook and an empty state. It does not create, retain, interpret, or style an activity's content.",
	dataOwner:
		"The host owns activity data, wording, retention and any world-confirmation policy; the row is caller-rendered.",
	source: "packages/spellkave-ui-widgets/src/ActivityFeed.svelte",
	inputs: [
		{
			name: "items",
			type: "readonly { id: string }[]",
			description: "Stable host-owned entries, in the order the reader should encounter them.",
		},
		{
			name: "renderItem",
			type: "Snippet<[item]>",
			description: "Caller-rendered row content; the feed never assumes an activity vocabulary.",
		},
		{
			name: "ariaLabel, emptyText",
			type: "string",
			description: "Accessible list name and the truthful no-activity state.",
		},
		{
			name: "isSectionHeader",
			type: "optional (item) => boolean",
			description:
				"Marks an item's own row as a section divider. It scrolls in normal flow with speech (owner decision 2026-11-04), preserving speaker visibility. The host owns the header's look (see ActivitySectionHeader, whose optional detailContent snippet wins over its plain detail string) and which items qualify.",
		},
	],
	related: [
		{
			path: "/play/speech",
			label: "Speech",
			description: "Owns an open spoken exchange; it is not an activity-feed adapter.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/Thread.svelte",
			description:
				"Supplies world-confirmed dialogue rows, speaker grouping and offered-answer controls.",
		},
		{
			source: "apps/play/src/components/PlayTable.svelte",
			description:
				"Supplies the continuous Explore journal: local outcomes, heard speech and place-arrival dividers across places visited this session. Place dividers are section headers in normal flow. The newest divider's companyParts render through detailContent; structured occupant identities use entityNameNode detail-reader controls and connective text stays plain.",
		},
	],
};

export const dockBarContract: ComponentContract = {
	exportName: "DockBar",
	packageName: "@spellkave/ui",
	responsibility:
		"A one-line bar (a bits-ui Menubar row) that lets info text, menu titles, and one-click actions sit side by side, each with its own look: DockBarText is inert (or a chip), DockBarMenu is a title followed by a small ▴ that opens upward, DockBarAction is a key-like pill, and DockBarDivider/DockBarZone lay out the row's groups. It owns the open/close and keyboard-navigation behavior of its menus; it does not own game state.",
	dataOwner:
		"The caller supplies already-resolved labels, sections, and callbacks — no world entity, action catalogue, or dialogue state is looked up here.",
	source: "packages/spellkave-ui/src/dock-bar/dock-bar.svelte",
	inputs: [
		{
			name: "DockBarText",
			type: '{ children, tone?: "muted" | "chip" }',
			description: "Non-interactive status text or a small bordered chip, e.g. a condition.",
		},
		{
			name: "DockBarAction",
			type: "{ label, key?, disabled?, onclick }",
			description:
				'A bordered pill button; a given key becomes a leading badge and joins the label as the accessible name ("1 Fighter").',
		},
		{
			name: "DockBarMenu",
			type: "DockBarMenuProps",
			description:
				"A plain-text title with a trailing ▴, opening a section list upward; a custom trigger snippet (e.g. a seat seal) replaces the label and ▴ entirely.",
		},
		{
			name: "DockBarDivider, DockBarZone",
			type: "{ class? } / { children, end? }",
			description:
				"A thin vertical rule between groups, and a flex group that clusters related pieces (end pushes a zone to the row's far side).",
		},
		{
			name: "DockNotice",
			type: "DockNoticeProps",
			description:
				'The one notice surface above a dock host, for a state message the bar itself has no room for (reconnecting, a slow pending act, a refusal) — "info" or "warn" tone, an optional × when the caller gives onDismiss. Positioned absolute against the host, so the host stays the positioning context.',
		},
	],
	related: [
		{
			path: "/components/link-menu",
			label: "LinkMenu",
			description: "The other caller-resolved, selection-only menu surface in the kit.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayDock.svelte",
			description:
				"Builds the Play app's bottom-dock status row: HP/AC/conditions, the place and its exits, dialogue answers and next-step actions, and the seat seal menu.",
		},
	],
};

export const dockHotbarContract: ComponentContract = {
	exportName: "DockHotbar",
	packageName: "@spellkave/ui",
	responsibility:
		"The dock's action row: caller-supplied groups (one per niche provider — SELECTION/HERE/ME) of stable, text-pill slots, wrapping across one or more rows, with an optional resource-strip and expand toggle. It owns none of the selection model, action economy, or composer state; it renders whatever `rows`/`pips` the caller passes this render and reports a click as `onSelect(slotId)`.",
	dataOwner:
		"The caller (Play's dock) resolves the selection into groups and slot ids, and decides which action ids are offered, dimmed, pending, or active. No world entity, affordance catalogue, or economy channel is read here.",
	source: "packages/spellkave-ui/src/dock-bar/dock-hotbar.svelte",
	inputs: [
		{
			name: "rows",
			type: "DockHotbarGroup[][]",
			description:
				"Outer array is visual rows, top first; each row is a caller-chosen set of groups. Digits, row count, and which groups appear are all caller decisions — the component only lays out what it is given.",
		},
		{
			name: "urgent",
			type: "DockHotbarUrgent | null",
			description:
				"An open reaction window. While set it REPLACES every action row (the toggle and trailing slot go with them), so the digits on screen are the digits that answer; its answers report through the same `onSelect`. Accent ground, an assertive live region, and a thin bar that drains over `remainingMs` (static under reduced motion).",
		},
		{
			name: "pips",
			type: "DockHotbarPip[]",
			description:
				'A compact resource strip leading the first row — "available" filled, "spent" hollow + struck, "partial" a small filled bar, "pending"/"unknown" dashed. The state is always in the accessible text too, never color alone.',
		},
		{
			name: "expanded, onToggleExpanded",
			type: "boolean, () => void",
			description:
				'A small ▴/▾ toggle rendered on the first row when `onToggleExpanded` is given, labelled "Show more actions"/"Show fewer actions" and reflecting `aria-expanded`.',
		},
		{
			name: "disabled",
			type: "boolean",
			description:
				"Makes every slot inert without dimming it — a busy world is not the same fact as an action the target does not offer.",
		},
		{
			name: "onSelect, trailing",
			type: "(slotId: string) => void, Snippet",
			description:
				'One callback for every slot and every group\'s overflow-menu pick alike; `trailing` renders caller content (e.g. "End turn") right-aligned on the first row.',
		},
	],
	related: [
		{
			path: "/components/dock-bar",
			label: "DockBar",
			description:
				"Supplies the DockBarAction/DockBarMenu primitives DockHotbar composes, and the one-line status row above it in Play's dock.",
		},
	],
	consumers: [
		{
			source: "apps/play/src/components/PlayDock.svelte",
			description:
				"Play's dock row 2: the selection's group or HERE/ME, the resource pips, the expand toggle, End turn, and the reaction window as `urgent` (ledger/designs/play-interaction-axioms.md).",
		},
	],
};

export const infoCardContract: ComponentContract = {
	exportName: "InfoCardProvider, InfoLink",
	packageName: "@spellkave/ui",
	responsibility:
		'One non-modal, chainable information card, in place of the four separate readers (reference popover, field dialog, ⓘ tooltip, entity dialog) the app used to have. InfoCardProvider owns a stack of open cards (a path, not a tree) rendered in a single portal layer; InfoLink is the inline trigger. It is not built from nested library Popovers — a click inside a nested Popover\'s content is reported as "outside" to its ancestor, which would close the whole chain on the interaction meant to grow it — so the stack, positioning (@floating-ui/dom), and outside-click/Esc/scroll/resize handling are all owned directly by InfoCardProvider.',
	dataOwner:
		"The host supplies a resolve(refId) callback; the provider renders its loading/ready/not-found/error result. No world entity or catalogue record is read here — INFORMATION ONLY, deliberately with no action-button API.",
	source: "packages/spellkave-ui/src/info-card/InfoCardProvider.svelte",
	inputs: [
		{
			name: "InfoCardProvider",
			type: "InfoCardProviderProps",
			description:
				"resolve, plus openDelay (hover-to-preview, default 300ms), closeDelay (grace before an unpinned preview closes, default 150ms), and pinDwell (hover-inside-card-to-pin, default 600ms). One per app/page; wraps everything that may contain an InfoLink.",
		},
		{
			name: "InfoLink",
			type: "InfoLinkProps",
			description:
				"refId plus children (the inline label). Hover opens a preview after openDelay; click, Enter/Space, or dwelling inside the preview for pinDwell pins it. A link rendered inside a pinned card opens its target beside that card, not beside itself.",
		},
		{
			name: "InfoCardData",
			type: "{ title, kind?, image?, summary?, facts?, body?, footerHref? }",
			description:
				"body is InfoRichText: (string | { refId, text })[] — the host decides which words become nested InfoLinks. No action/verb field exists anywhere in this shape.",
		},
	],
	related: [
		{
			path: "/components/reference-card",
			label: "ReferenceCard",
			description:
				"A static, non-chainable card shape this could eventually render inside, kept separate for now.",
		},
		{
			path: "/components/popover",
			label: "Popover",
			description:
				"The single-level floating-window primitive InfoCard intentionally does not nest.",
		},
	],
	consumers: [
		{
			source: "apps/ui-lab/src/demos/components/InfoCardDemo.svelte",
			description:
				"Mock-only for now: a game-log paragraph chains four levels deep with a slow, a failed, and a not-found reference, to judge the interaction before real Play data is wired in.",
		},
	],
};
