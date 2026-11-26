/** Shared Lab fixture: every projector can title from display_name or its id. */
export const KIND_RECORD: Record<string, unknown> = {
	action_id: "srd/probe/row",
	template_id: "srd/probe/row",
	outcome_template_id: "srd/probe/row",
	niche_id: "srd/probe/row",
	capability_id: "srd/probe/row",
	condition_definition_id: "srd/probe/row",
	slot_id: "srd/probe/row",
	roll_table_id: "srd/probe/row",
	effect_id: "srd/probe/row",
	resource_definition_id: "srd/probe/row",
	place_graph_id: "srd/probe/row",
	display_name: "Authored name",
	title: "Derived title",
	bundle_id: "srd",
	description: "Authored prose for this catalogue row, shown on the Lab page.",
	actor_kind: "entity",
	default_visibility: "Public",
};

/**
 * A small verbatim projection of the SRD Rage action fixture
 * (`fixtures/base/classes/barbarian.toml`). It gives the Action page real
 * fields to project without teaching the other per-kind components that this
 * shape belongs to them too.
 */
export const ACTION_RECORD: Record<string, unknown> = {
	...KIND_RECORD,
	action_id: "srd/barbarian/rage",
	display_name: "Enter Rage",
	description:
		"SRD: enter Rage as a Bonus Action (classes.md:234-256 (§ Barbarian > Level 1: Rage)). Gate: a use remaining. Consequence: spend one use, apply srd/condition/raging until owner turn_start.",
	on_success: "srd/barbarian/rage/success",
	required_capability: "srd/class-feature/barbarian/rage",
	resolution_mode: "Deterministic",
	spends_channel: "srd/economy_channel/bonus",
};

/**
 * Keep fixtures kind-scoped: a generic baseline demonstrates only common
 * identity fields, while a selected kind may exercise its actual projector
 * contract. This is illustrative Lab data, never a substitute for a world
 * catalogue read or documentation-link resolver.
 */
export function recordForKind(kind: string): Record<string, unknown> {
	if (kind === "action_definition") return ACTION_RECORD;
	return KIND_RECORD;
}

export const KIND_PAGES: { kind: string; slug: string; title: string }[] = [
	{ kind: "action_definition", slug: "action", title: "Action" },
	{ kind: "affordance_template", slug: "affordance", title: "Affordance" },
	{ kind: "area_shape_definition", slug: "area-shape", title: "Area shape" },
	{ kind: "autonomy_job", slug: "autonomy-job", title: "Autonomy job" },
	{ kind: "boundary_definition", slug: "boundary", title: "Boundary" },
	{ kind: "capability_definition", slug: "capability", title: "Capability" },
	{ kind: "combat_grid_blueprint", slug: "combat-grid", title: "Combat grid" },
	{ kind: "condition_definition", slug: "condition", title: "Condition" },
	{
		kind: "condition_remove_policy_definition",
		slug: "condition-remove-policy",
		title: "Condition remove policy",
	},
	{ kind: "consequence_template", slug: "consequence", title: "Consequence" },
	{ kind: "coordinate_kind_definition", slug: "coordinate-kind", title: "Coordinate kind" },
	{ kind: "distance_metric_definition", slug: "distance-metric", title: "Distance metric" },
	{ kind: "dsl_macro_definition", slug: "macro", title: "Macro" },
	{ kind: "economy_channel_definition", slug: "channel", title: "Channel" },
	{ kind: "effect_definition", slug: "effect", title: "Effect" },
	{ kind: "equipment_slot_definition", slug: "slot", title: "Slot" },
	{ kind: "extent_kind_definition", slug: "extent-kind", title: "Extent kind" },
	{ kind: "location_definition", slug: "location", title: "Location" },
	{ kind: "modifier_target_definition", slug: "modifier-target", title: "Modifier target" },
	{ kind: "modifier_template", slug: "modifier", title: "Modifier" },
	{ kind: "niche_definition", slug: "niche", title: "Niche" },
	{ kind: "object_state_definition", slug: "object-state", title: "Object state" },
	{ kind: "outcome_graph", slug: "outcome-graph", title: "Outcome graph" },
	{ kind: "outcome_template", slug: "outcome", title: "Outcome" },
	{ kind: "roll_table", slug: "roll-table", title: "Roll table" },
	{ kind: "spatial_state_definition", slug: "spatial-state", title: "Spatial state" },
	{
		kind: "stacking_discipline_definition",
		slug: "stacking-discipline",
		title: "Stacking discipline",
	},
	{ kind: "substrate_definition", slug: "substrate", title: "Substrate" },
	{ kind: "trace_kind_definition", slug: "trace-kind", title: "Trace kind" },
];
