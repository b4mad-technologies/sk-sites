<script lang="ts" module>
	import type { DocsRowEntryView, DocsRowField } from "./types";

	/**
	 * `consequence_frame_writes` is classified `surface = "owner"` in
	 * `packages/spellkave-srd-cc/src/docs/row-kind-coverage.toml`: it gets no
	 * page of its own, and renders on its owning `consequence_templates`
	 * page instead (see `ConsequenceView`'s own doc comment). Its rows carry
	 * no id column — they key on `template_id` + `ordinal` — and the actual
	 * mutation is a tagged-union JSON blob (`{ "ModifyResource": {...} }`,
	 * etc.), one level of which (`ForEachActorInRadius.body`) nests further
	 * ops the same shape recurses into (kernel depth-1, `post_frame_hook.rs`).
	 *
	 * A row is a WRITE, not a value — "actor"/"resource"/"delta" are the
	 * kernel's own field names for a `ModifyResource` write
	 * (`mutation_dispatch.rs`), kept verbatim rather than invented synonyms.
	 */
	function isRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	function humanizeKey(key: string): string {
		const spaced = key.replace(/_/g, " ");
		return spaced.length === 0 ? spaced : spaced.charAt(0).toUpperCase() + spaced.slice(1);
	}

	/** "FireBoundary" -> "Fire boundary" — a fallback for a kernel `FrameWriteOp` variant name not in `VARIANT_LABELS`. */
	function humanizeVariant(variant: string): string {
		const words = variant.match(/[A-Z][a-z0-9]*|[0-9]+/g);
		if (words === null || words.length === 0) return variant;
		const lowered = words.map((word) => word.toLowerCase());
		return `${lowered[0]?.charAt(0).toUpperCase()}${lowered[0]?.slice(1)}${lowered.length > 1 ? ` ${lowered.slice(1).join(" ")}` : ""}`;
	}

	/** Human label for each kernel `FrameWriteOp` variant this view knows the fields of. */
	const VARIANT_LABELS: Record<string, string> = {
		ModifyResource: "Modify resource",
		ApplyStatus: "Apply status",
		ForEachActorInRadius: "For each actor in radius",
	};

	export interface FrameWriteOp {
		/** The kernel `FrameWriteOp` variant name (`mutation_dispatch.rs`), e.g. "ModifyResource". */
		variant: string;
		/** Human title for `variant` — a name from `VARIANT_LABELS`, or a humanized fallback for a variant this view has no dedicated field mapping for yet. */
		title: string;
		fields: DocsRowField[];
		/** `ForEachActorInRadius.body` — further ops applied per selected actor. Empty for every other variant. */
		body: Record<string, unknown>[];
	}

	/**
	 * Project one frame-write op — `{ "<Variant>": {...} }` — into its
	 * fields, recursing NOT performed here: the caller decides how deep to
	 * render (`FrameWriteView`'s own `full` view renders one level of
	 * `body`, recursively, since the kernel itself only ever nests depth-1
	 * in practice but does not forbid more).
	 *
	 * A variant this view has no dedicated mapping for still renders —
	 * generically, one field per own scalar/string key — rather than
	 * disappearing from the page; `consequence_frame_writes` is a big closed
	 * kernel enum (`FrameWriteOp`, 20+ variants) and `attacks.toml` only
	 * exercises three of them.
	 */
	export function projectFrameWriteOp(
		op: Record<string, unknown>,
		link: (ref: string) => string | undefined,
	): FrameWriteOp {
		const entry = Object.entries(op)[0];
		const variant = entry?.[0] ?? "";
		const payload = isRecord(entry?.[1]) ? (entry[1] as Record<string, unknown>) : {};
		const text = (key: string): string | undefined => {
			const value = payload[key];
			return typeof value === "string" && value !== "" ? value : undefined;
		};
		const fields: DocsRowField[] = [];
		const push = (label: string, value: string | undefined, options: { link?: boolean } = {}) => {
			if (value === undefined) return;
			const target = options.link ? link(value) : undefined;
			fields.push({ label, value, ...(options.link ? { code: true } : {}), ...(target ? { href: target } : {}) });
		};
		let body: Record<string, unknown>[] = [];

		if (variant === "ModifyResource") {
			push("Target", text("actor"));
			push("Resource", text("resource"), { link: true });
			push("Amount", text("delta_source"));
		} else if (variant === "ApplyStatus") {
			push("Target", text("target_ref"));
			push("Target kind", text("target_kind"));
			push("Condition", text("condition_definition_id"), { link: true });
		} else if (variant === "ForEachActorInRadius") {
			push("Centered on", text("center_ref"));
			push("Area shape", text("shape_id"), { link: true });
			const paramsSource = text("shape_params_json");
			if (paramsSource !== undefined) {
				try {
					const parsed: unknown = JSON.parse(paramsSource);
					const rendered = isRecord(parsed)
						? Object.entries(parsed)
								.map(([key, value]) => `${key}: ${String(value)}`)
								.join(", ")
						: paramsSource;
					if (rendered !== "") fields.push({ label: "Area parameters", value: rendered });
				} catch {
					fields.push({ label: "Area parameters", value: paramsSource });
				}
			}
			push("Filter", text("predicate_source"));
			if (Array.isArray(payload.body)) body = payload.body.filter(isRecord);
		} else {
			for (const [key, value] of Object.entries(payload)) {
				if (key === "body" || value === undefined || value === null || value === "") continue;
				fields.push({
					label: humanizeKey(key),
					value: typeof value === "string" ? value : JSON.stringify(value),
				});
			}
		}

		return { variant, title: VARIANT_LABELS[variant] ?? humanizeVariant(variant), fields, body };
	}

	/**
	 * Normalize one `consequence_frame_writes` row into the shared row
	 * shape. `href` is always `undefined` in practice — this kind owns no
	 * page (see the module comment above) — but the parameter stays, both
	 * to match `RowProjector` and so `inline`/`compact` degrade the same way
	 * every other kind's does when a caller has no route to offer.
	 */
	export function frameWriteRowView(
		record: Record<string, unknown>,
		href: string | undefined,
		link: (ref: string) => string | undefined,
	): DocsRowEntryView {
		const templateId = typeof record.template_id === "string" ? record.template_id : "";
		const ordinal = typeof record.ordinal === "number" ? record.ordinal : undefined;
		const ref = `${templateId}#${ordinal ?? 0}`;
		const op = projectFrameWriteOp(isRecord(record.frame_write) ? record.frame_write : {}, link);
		const fields: DocsRowField[] = [...op.fields];
		if (ordinal !== undefined) fields.push({ label: "Order", value: String(ordinal) });
		if (templateId !== "") {
			const target = link(templateId);
			fields.push({ label: "Consequence", value: templateId, code: true, ...(target ? { href: target } : {}) });
		}

		return {
			ref,
			title: op.title,
			kind_label: "Frame write",
			...(href ? { href } : {}),
			fields,
		};
	}
</script>

<script lang="ts">
	import EntryCompact from "./EntryCompact.svelte";
	import EntryInline from "./EntryInline.svelte";
	import FieldList from "./FieldList.svelte";

	let {
		row,
		view,
		record,
		link,
	}: {
		row: DocsRowEntryView;
		view: "inline" | "compact" | "full";
		/**
		 * The raw `consequence_frame_writes` row. Optional — `inline` and
		 * `compact` need only `row`, matching every other kind's component —
		 * but the `full` view needs it (together with `link`) to recurse into
		 * `ForEachActorInRadius.body`, which `row.fields` cannot carry (it is
		 * a flat label/value list; see `docs-types.ts`'s `DocsRowField`).
		 * The consequence page that embeds this view per frame write already
		 * has both on hand — it is iterating the raw rows to build them.
		 */
		record?: Record<string, unknown>;
		link?: (ref: string) => string | undefined;
	} = $props();

	const reference = $derived({
		ref: row.ref,
		title: row.title,
		...(row.href ? { href: row.href } : {}),
	});

	const nestedBody = $derived.by((): Record<string, unknown>[] => {
		if (record === undefined || link === undefined) return [];
		const frameWrite = record.frame_write;
		if (!isRecord(frameWrite)) return [];
		return projectFrameWriteOp(frameWrite, link).body;
	});
</script>

{#snippet opNode(op: Record<string, unknown>, depth: number)}
	{#if link !== undefined}
		{@const projected = projectFrameWriteOp(op, link)}
		<div class="border-l-2 border-[color:var(--border)] pl-3" style={`margin-left:${depth * 8}px`} data-testid="frame-write-op">
			<p class="text-sm font-semibold">{projected.title}</p>
			<FieldList fields={projected.fields} />
			{#if projected.body.length > 0}
				<div class="mt-2 space-y-2">
					{#each projected.body as child, i (i)}
						{@render opNode(child, depth + 1)}
					{/each}
				</div>
			{/if}
		</div>
	{/if}
{/snippet}

{#if view === "inline"}
	<EntryInline entry={reference} />
{:else if view === "compact"}
	<EntryCompact {row} />
{:else}
	<article data-testid="frame-write-full">
		<p class="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted-foreground)]">{row.kind_label}</p>
		<h3 class="font-display text-lg font-medium">{row.title}</h3>
		<FieldList fields={row.fields} />
		{#if nestedBody.length > 0}
			<div class="mt-3 space-y-3" data-testid="frame-write-body">
				{#each nestedBody as child, i (i)}
					{@render opNode(child, 1)}
				{/each}
			</div>
		{/if}
	</article>
{/if}
