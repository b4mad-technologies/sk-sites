import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import CapabilityView, { capabilityRowView } from "./CapabilityView.svelte";

/**
 * The Fighter's Second Wind capability, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/classes/fighter.toml`.
 */
const SECOND_WIND: Record<string, unknown> = {
	actor_kind: "entity",
	bundle_id: "srd",
	capability_id: "srd/class-feature/fighter/second-wind",
	default_visibility: "Public",
	description:
		"Fighter class feature — draw on a reserve of stamina to regain Hit Points as a Bonus Action. SRD: classes.md:4794-4798 (§ Fighter > Level 1: Second Wind). Sister precedent: world-fixtures/srd/base/second-wind.toml's own capability_id, re-authored through this package's own verb path.",
	display_name: "Use Second Wind",
};

const link = (_ref: string): string | undefined => undefined;

describe("capabilityRowView", () => {
	it("titles the page from display_name and keeps the capability id as its ref", () => {
		const row = capabilityRowView(SECOND_WIND, "/docs/srd/mechanics/capabilities/x", link);
		expect(row.title).toBe("Use Second Wind");
		expect(row.ref).toBe("srd/class-feature/fighter/second-wind");
		expect(row.kind_label).toBe("Capability");
	});

	it("leads with actor kind and visibility, not with the identity row", () => {
		const row = capabilityRowView(SECOND_WIND, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Actor kind",
			"Default visibility",
			"Capability ID",
			"Owning bundle",
		]);
		expect(row.fields[0]).toMatchObject({ label: "Actor kind", value: "entity" });
		expect(row.fields[1]).toMatchObject({ label: "Default visibility", value: "Public" });
	});

	it("shows Hidden default visibility exactly as authored, not silently normalised to Public", () => {
		// srd/action/apply-in-darkness (perception-conditions.toml) is the corpus's
		// own non-default-visibility row — proves this field is not a "always
		// Public" assumption baked into the component.
		const row = capabilityRowView(
			{ ...SECOND_WIND, default_visibility: "Hidden" },
			undefined,
			link,
		);
		expect(row.fields.find((field) => field.label === "Default visibility")?.value).toBe("Hidden");
	});

	it("marks the identity row as code but carries no href for it", () => {
		const row = capabilityRowView(SECOND_WIND, undefined, link);
		const identity = row.fields.find((field) => field.label === "Capability ID");
		expect(identity).toMatchObject({ value: "srd/class-feature/fighter/second-wind", code: true });
		expect(identity?.href).toBeUndefined();
	});

	it("carries no description when the row leaves it empty", () => {
		const { description: _dropped, ...withoutDescription } = SECOND_WIND;
		expect(capabilityRowView(withoutDescription, undefined, link).description).toBeUndefined();
	});
});

describe("CapabilityView", () => {
	const row = capabilityRowView(SECOND_WIND, "/docs/srd/mechanics/capabilities/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(CapabilityView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Use Second Wind" })).toBeTruthy();
		expect(screen.getByText("srd/class-feature/fighter/second-wind")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(CapabilityView, { row, view: "compact" });
		expect(screen.getAllByText(/Use Second Wind/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Capability").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(CapabilityView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Use Second Wind/).length).toBeGreaterThan(0);
		expect(screen.getByText("Actor kind")).toBeTruthy();
		unmount();
	});

	it("shows the description in the header half and the fields in the details half", () => {
		const { unmount } = render(CapabilityView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/draw on a reserve of stamina/)).toBeTruthy();
		expect(screen.queryByText("Actor kind")).toBeNull();
		unmount();

		render(CapabilityView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Actor kind")).toBeTruthy();
		expect(screen.queryByText(/draw on a reserve of stamina/)).toBeNull();
	});
});
