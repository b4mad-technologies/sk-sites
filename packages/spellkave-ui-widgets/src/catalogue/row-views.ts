// Registration of reader components by catalogue entry kind.
//
// This replaces an if/else chain that probed which optional field a projected
// entry happened to carry (`entry.resource`, `entry.subject`, `entry.tag`).
// That shape worked for three kinds and would not survive twenty-five: every
// new kind meant another branch in a file that already knew about all of them.
//
// A registration is NOT a god component. Each kind's knowledge — which column
// is the title, which are references, what a reader should call each one —
// lives in that kind's own component beside the markup that renders it. This
// map only says which component owns which kind.
//
// A kind absent from this map falls through to the raw technical dump in
// `CatalogueEntryPage.svelte`. That is the net for kinds deliberately
// classified as having no page of their own in
// `packages/spellkave-srd-cc/src/docs/row-kind-coverage.toml` — not a place to
// park a kind nobody got to yet.

import type { Component } from "svelte";
import ActionView, { actionRowView } from "./ActionView.svelte";
import AffordanceView, { affordanceRowView } from "./AffordanceView.svelte";
import AreaShapeView, { areaShapeRowView } from "./AreaShapeView.svelte";
import AudienceKindDefinitionView, {
	audienceKindDefinitionRowView,
} from "./AudienceKindDefinitionView.svelte";
import AutonomyJobView, { autonomyJobRowView } from "./AutonomyJobView.svelte";
import BoundaryView, { boundaryRowView } from "./BoundaryView.svelte";
import CapabilityView, { capabilityRowView } from "./CapabilityView.svelte";
import ChannelView, { channelRowView } from "./ChannelView.svelte";
import CombatGridView, { combatGridRowView } from "./CombatGridView.svelte";
import ConditionRemovePolicyView, {
	conditionRemovePolicyRowView,
} from "./ConditionRemovePolicyView.svelte";
import ConditionView, { conditionRowView } from "./ConditionView.svelte";
import ConsequenceView, { consequenceRowView } from "./ConsequenceView.svelte";
import CoordinateKindView, { coordinateKindRowView } from "./CoordinateKindView.svelte";
import DistanceMetricView, { distanceMetricRowView } from "./DistanceMetricView.svelte";
import EffectView, { effectRowView } from "./EffectView.svelte";
import ExtentKindView, { extentKindRowView } from "./ExtentKindView.svelte";
import LocationView, { locationRowView } from "./LocationView.svelte";
import MacroView, { macroRowView } from "./MacroView.svelte";
import ModifierTargetView, { modifierTargetRowView } from "./ModifierTargetView.svelte";
import ModifierView, { modifierRowView } from "./ModifierView.svelte";
import NicheView, { nicheRowView } from "./NicheView.svelte";
import ObjectStateView, { objectStateRowView } from "./ObjectStateView.svelte";
import OutcomeGraphView, { outcomeGraphRowView } from "./OutcomeGraphView.svelte";
import OutcomeView, { outcomeRowView } from "./OutcomeView.svelte";
import PromptDefinitionView, { promptDefinitionRowView } from "./PromptDefinitionView.svelte";
import RollTableView, { rollTableRowView } from "./RollTableView.svelte";
import SlotView, { slotRowView } from "./SlotView.svelte";
import SpatialStateView, { spatialStateRowView } from "./SpatialStateView.svelte";
import StackingDisciplineView, { stackingDisciplineRowView } from "./StackingDisciplineView.svelte";
import SubstrateView, { substrateRowView } from "./SubstrateView.svelte";
import TraceKindView, { traceKindRowView } from "./TraceKindView.svelte";
import type { DocsRowEntryView } from "./types";

/**
 * Turn one manifest row into the shared row shape.
 *
 * `link` resolves a referenced id to an href, or returns `undefined` when the
 * target has no page. Href resolution stays at build time, matching how every
 * other link in the reader is produced — a component never resolves a ref
 * itself.
 */
export type RowProjector = (
	record: Record<string, unknown>,
	href: string | undefined,
	link: (ref: string) => string | undefined,
) => DocsRowEntryView;

/**
 * Svelte component props are invariant, so concretely-typed components share no
 * usable supertype here. The prop contract every registered component honours
 * is `{ row, view, chrome?, sections? }`; each component declares it, and its
 * own tests hold it.
 */
// biome-ignore lint/suspicious/noExplicitAny: see the note above.
type AnyRowComponent = Component<any>;

export interface RowViewRegistration {
	readonly project: RowProjector;
	readonly component: AnyRowComponent;
}

const REGISTRATIONS: Readonly<Record<string, RowViewRegistration>> = {
	// Keys are catalogue entry kinds — the singular form, derived from the
	// manifest table name by the one shared rule in `row-kind-coverage.ts`.
	action_definition: { project: actionRowView, component: ActionView },
	affordance_template: { project: affordanceRowView, component: AffordanceView },
	capability_definition: { project: capabilityRowView, component: CapabilityView },
	combat_grid_blueprint: { project: combatGridRowView, component: CombatGridView },
	condition_definition: { project: conditionRowView, component: ConditionView },
	condition_remove_policy_definition: {
		project: conditionRemovePolicyRowView,
		component: ConditionRemovePolicyView,
	},
	consequence_template: { project: consequenceRowView, component: ConsequenceView },
	distance_metric_definition: { project: distanceMetricRowView, component: DistanceMetricView },
	dsl_macro_definition: { project: macroRowView, component: MacroView },
	economy_channel_definition: { project: channelRowView, component: ChannelView },
	effect_definition: { project: effectRowView, component: EffectView },
	equipment_slot_definition: { project: slotRowView, component: SlotView },
	modifier_target_definition: { project: modifierTargetRowView, component: ModifierTargetView },
	modifier_template: { project: modifierRowView, component: ModifierView },
	niche_definition: { project: nicheRowView, component: NicheView },
	outcome_template: { project: outcomeRowView, component: OutcomeView },
	roll_table: { project: rollTableRowView, component: RollTableView },
	spatial_state_definition: { project: spatialStateRowView, component: SpatialStateView },
	stacking_discipline_definition: {
		project: stackingDisciplineRowView,
		component: StackingDisciplineView,
	},
	area_shape_definition: { project: areaShapeRowView, component: AreaShapeView },
	audience_kind_definition: {
		project: audienceKindDefinitionRowView,
		component: AudienceKindDefinitionView,
	},
	autonomy_job: { project: autonomyJobRowView, component: AutonomyJobView },
	boundary_definition: { project: boundaryRowView, component: BoundaryView },
	coordinate_kind_definition: { project: coordinateKindRowView, component: CoordinateKindView },
	extent_kind_definition: { project: extentKindRowView, component: ExtentKindView },
	location_definition: { project: locationRowView, component: LocationView },
	object_state_definition: { project: objectStateRowView, component: ObjectStateView },
	outcome_graph: { project: outcomeGraphRowView, component: OutcomeGraphView },
	prompt_definition: { project: promptDefinitionRowView, component: PromptDefinitionView },
	substrate_definition: { project: substrateRowView, component: SubstrateView },
	trace_kind_definition: { project: traceKindRowView, component: TraceKindView },
};

/** The component and projector owning this entry kind, when one is registered. */
export function rowViewFor(kind: string): RowViewRegistration | undefined {
	return REGISTRATIONS[kind];
}

/** Every entry kind that has a registered reader component. */
export function registeredRowViewKinds(): readonly string[] {
	return Object.keys(REGISTRATIONS).sort();
}
