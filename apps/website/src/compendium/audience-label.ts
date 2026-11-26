/**
 * Human-facing description of an attachment's `audience` (ADR-0130 D-3;
 * `packages/spellkave-world-author/docs/metadata-attachments.md`). The public
 * compendium keeps showing every attachment, including non-public ones — it
 * only labels them, it does not hide them (sk-jay0.3.5.77 closes the earlier
 * proposal to hide them; sk-jay0.3.5.76 is why the label is read off the
 * namespace registration rather than a hard-coded namespace list).
 *
 * An audience is one of the five `VisibilityClass` tokens (`public`, `local`,
 * `hidden`, `internal`, `discoverable`), the strict owner token `owned`, or a
 * capability id (contains `/` or `.`, e.g. `frontier.apply_manifest`). All
 * six class/owner tokens are matched case-insensitively, matching
 * `VisibilityClass::parse_authored`'s accepted spellings; a capability id is
 * matched exactly as authored.
 */

export type AudienceTier = "reference" | "warning";

export interface AudienceMarker {
	/** Human label naming who may read the attachment. */
	label: string;
	/** The raw audience token as authored, shown alongside the label. */
	token: string;
	/**
	 * `"reference"` for `hidden`/`local` (still world-visible, just not
	 * everyone's business); `"warning"` for `internal`, `discoverable`,
	 * `owned`, and any capability audience (the spoiler tier — the ADR groups
	 * `discoverable` with `internal`: no per-row substrate admits a plain
	 * owner).
	 */
	tier: AudienceTier;
}

const CLASS_LABELS: Readonly<Record<string, { label: string; tier: AudienceTier }>> = {
	// `Local` is delivered unconditionally, exactly like `Public` (ADR-0130 D-3,
	// `owner_delivery_admits`) — it reads as a class on the row, not as a
	// narrower readership.
	local: { label: "Everyone", tier: "reference" },
	hidden: { label: "Everyone who can see the subject", tier: "reference" },
	internal: { label: "DM only", tier: "warning" },
	discoverable: { label: "DM only", tier: "warning" },
	owned: { label: "Only the driver of this subject", tier: "warning" },
};

/**
 * Known capability ids with a friendly display name. Any other capability id
 * falls back to showing the id itself — this module has no general
 * capability-definition registry to resolve one from.
 */
const CAPABILITY_LABELS: Readonly<Record<string, string>> = {
	"frontier.apply_manifest": "Authors",
};

/**
 * `undefined` for a public audience — no marker. Callers only ever see a
 * `DocsAttachment.audience` value in the first place when the namespace
 * registration was non-public (`project-metadata-docs.ts`), but this also
 * quietly absorbs an explicitly authored `"Public"`/`"public"` value rather
 * than rendering a stray badge for it.
 */
export function describeAttachmentAudience(audience: string): AudienceMarker | undefined {
	if (audience.toLowerCase() === "public") return undefined;
	const known = CLASS_LABELS[audience.toLowerCase()];
	if (known) return { label: known.label, token: audience, tier: known.tier };
	return { label: CAPABILITY_LABELS[audience] ?? audience, token: audience, tier: "warning" };
}
