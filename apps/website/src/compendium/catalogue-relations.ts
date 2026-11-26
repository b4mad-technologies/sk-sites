import {
	type CatalogueIdentityShape,
	catalogueIdentities,
} from "@spellkave/srd-cc/docs/row-kind-coverage";
import { ROW_KIND_NATURAL_KEY } from "@spellkave/world-author";

export interface CatalogueIdentity {
	kind: string;
	ref: string;
}
export interface CatalogueRelation {
	kind: string;
	ref: string;
	label?: string;
	bundle_id?: string;
	source?: string;
	/** The creature's own value for this resource, from entity_definition_initial_state. */
	value_int?: number;
	/** The creature's own value for this resource, from entity_definition_initial_state. */
	value_bool?: boolean;
	/** Initial Text state, including an authored empty string. */
	value_text?: string;
}
export interface CatalogueProvenanceCandidate {
	namespace: string;
	bundle_id: string;
	source?: string;
	payload_source?: string;
	license?: string;
}

type Row = Record<string, unknown>;

/**
 * The entry kinds whose owning row THIS module knows how to look up.
 *
 * Deliberately narrower than the set of kinds that earn a catalogue page, and
 * deliberately kept here rather than derived from the shared classification:
 * these two answer different questions. `row-kind-coverage.toml` says which
 * kinds are subjects a reader can open; this set says which of them this
 * resolver has joins for. Widening it silently would make `exactRow` throw for
 * kinds nothing below handles.
 *
 * The `{table, idField}` shape is NOT restated here — that comes from the one
 * authored source, so the two can never drift apart on where a row lives.
 */
const HANDLED_KINDS: ReadonlySet<string> = new Set([
	"entity",
	"entity_definition",
	"resource_definition",
	"session_definition",
]);

const IDENTITIES = catalogueIdentities(ROW_KIND_NATURAL_KEY);

function shapeFor(kind: string): CatalogueIdentityShape | undefined {
	return HANDLED_KINDS.has(kind) ? IDENTITIES[kind] : undefined;
}

function rows(manifest: Record<string, unknown>, table: string): Row[] {
	return Array.isArray(manifest[table]) ? (manifest[table] as Row[]) : [];
}

function text(row: Row, field: string): string | undefined {
	return typeof row[field] === "string" && row[field] !== "" ? row[field] : undefined;
}

function numberField(row: Row, field: string): number | undefined {
	return typeof row[field] === "number" ? row[field] : undefined;
}

function boolField(row: Row, field: string): boolean | undefined {
	return typeof row[field] === "boolean" ? row[field] : undefined;
}

function assertSafe(value: unknown, context: string): void {
	if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value))
		throw new Error(`${context} contains an unsafe integer`);
	if (Array.isArray(value))
		value.forEach((item) => {
			assertSafe(item, context);
		});
	else if (value !== null && typeof value === "object")
		Object.values(value).forEach((item) => {
			assertSafe(item, context);
		});
}

function exactRow(
	manifest: Record<string, unknown>,
	table: string,
	field: string,
	ref: string,
): Row {
	const matches = rows(manifest, table).filter((row) => row[field] === ref);
	if (matches.length !== 1)
		throw new Error(`${table}.${field} '${ref}' resolves to ${matches.length} rows`);
	assertSafe(matches[0], `${table}.${field} '${ref}'`);
	return matches[0] ?? {};
}

function relation(
	manifest: Record<string, unknown>,
	kind: string,
	table: string,
	idField: string,
	ref: string | undefined,
): CatalogueRelation | undefined {
	if (!ref) return undefined;
	const target = exactRow(manifest, table, idField, ref);
	const label = text(target, "display_name") ?? text(target, "name");
	return {
		kind,
		ref,
		...(label ? { label } : {}),
		...(text(target, "bundle_id") ? { bundle_id: text(target, "bundle_id") } : {}),
		...(text(target, "source") ? { source: text(target, "source") } : {}),
	};
}

/** Exact schema joins only; this never derives a target kind from an ID prefix. */
export function catalogueRelations(
	manifest: Record<string, unknown>,
	identity: CatalogueIdentity,
): CatalogueRelation[] {
	const shape = shapeFor(identity.kind);
	if (!shape) return [];
	const owner = exactRow(manifest, shape.table, shape.idField, identity.ref);
	const found: CatalogueRelation[] = [];
	if (identity.kind === "entity") {
		const joined = relation(
			manifest,
			"entity_definition",
			"entity_definitions",
			"entity_def_id",
			text(owner, "entity_def_id"),
		);
		if (joined) found.push(joined);
	}
	if (identity.kind === "entity_definition") {
		for (const seed of rows(manifest, "entity_definition_initial_state").filter(
			(row) => row.entity_def_id === identity.ref,
		)) {
			const stateId = text(seed, "state_id");
			// Numeric resources also define object states. Prefer their resource
			// page; Text-only states resolve through their own schema table.
			const isResource = rows(manifest, "resource_definitions").some(
				(row) => row.resource_definition_id === stateId,
			);
			const joined = relation(
				manifest,
				isResource ? "resource_definition" : "object_state_definition",
				isResource ? "resource_definitions" : "object_state_definitions",
				isResource ? "resource_definition_id" : "state_id",
				stateId,
			);
			if (joined) {
				const value_int = numberField(seed, "value_int");
				const value_bool = boolField(seed, "value_bool");
				found.push({
					...joined,
					...(value_int !== undefined ? { value_int } : {}),
					...(value_bool !== undefined ? { value_bool } : {}),
					...(typeof seed.value_text === "string" ? { value_text: seed.value_text } : {}),
				});
			}
		}
		for (const seed of rows(manifest, "entity_definition_initial_equipment").filter(
			(row) => row.entity_def_id === identity.ref,
		)) {
			const joined = relation(
				manifest,
				"entity_definition",
				"entity_definitions",
				"entity_def_id",
				text(seed, "equipped_entity_def_id"),
			);
			if (joined) found.push(joined);
		}
	}
	if (identity.kind === "session_definition") {
		const joined = relation(
			manifest,
			"combat_grid_blueprint",
			"combat_grid_blueprints",
			"blueprint_id",
			text(owner, "combat_grid_blueprint_id"),
		);
		if (joined) found.push(joined);
	}
	const unique = new Map(found.map((item) => [`${item.kind}:${item.ref}`, item]));
	return [...unique.values()].sort(
		(left, right) => left.kind.localeCompare(right.kind) || left.ref.localeCompare(right.ref),
	);
}

/** Exact attachment-target matches; payload fields remain provenance, never gameplay. */
export function catalogueProvenanceCandidates(
	manifest: Record<string, unknown>,
	identity: CatalogueIdentity,
): CatalogueProvenanceCandidate[] {
	if (!shapeFor(identity.kind)) return [];
	const matches = rows(manifest, "metadata_attachments").filter(
		(row) => row.target_kind === identity.kind && row.target_ref === identity.ref,
	);
	return matches.map((row, index) => {
		assertSafe(row, `metadata attachment ${identity.kind} '${identity.ref}' occurrence ${index}`);
		const namespace = text(row, "namespace");
		const bundleId = text(row, "bundle_id");
		if (!namespace || !bundleId)
			throw new Error(
				`metadata attachment ${identity.kind} '${identity.ref}' lacks namespace or bundle_id`,
			);
		if (typeof row.payload_json !== "string")
			throw new Error(`metadata attachment ${identity.kind} '${identity.ref}' lacks payload_json`);
		const parsed = JSON.parse(row.payload_json) as unknown;
		assertSafe(parsed, `metadata attachment ${identity.kind} '${identity.ref}' payload`);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
			throw new Error(
				`metadata attachment ${identity.kind} '${identity.ref}' payload must be an object`,
			);
		const payload = parsed as Row;
		return {
			namespace,
			bundle_id: bundleId,
			...(text(row, "source") ? { source: text(row, "source") } : {}),
			...(text(payload, "source") ? { payload_source: text(payload, "source") } : {}),
			...(text(payload, "license") ? { license: text(payload, "license") } : {}),
		};
	});
}
