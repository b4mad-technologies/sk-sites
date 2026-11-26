import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import AutonomyJobView, { autonomyJobRowView } from "./AutonomyJobView.svelte";

/**
 * The burning-room hazard pulse, copied from
 * `packages/spellkave-mechanics/fixtures/core/mech_burning_room/manifest.toml`.
 * This kind carries no `display_name` column, so `title` arrives merged in by
 * `CatalogueEntryPage` from the compiler-derived copy.
 */
const BURNING_ROOM: Record<string, unknown> = {
	job_id: "mech_burning_room/hazard-pulse",
	title: "Mech Burning Room — Hazard Pulse",
	anchor_place_node_id: "mech_burning_room/room",
	bundle_id: "mech_burning_room",
	description:
		"Burning room hazard pulse: damages every occupant of the room every 6s for 3 pulses, attributed to the fire entity, no cast involved.",
	dsl_function: "mech_burning_room/pulse",
	enabled: true,
	fire_at_boundary: "",
};

const link = (ref: string): string | undefined =>
	ref === "mech_burning_room/room" ? "/docs/x/room" : undefined;

describe("autonomyJobRowView", () => {
	it("takes its title from the derived copy, since the table has no display_name", () => {
		const row = autonomyJobRowView(BURNING_ROOM, undefined, link);
		expect(row.title).toBe("Mech Burning Room — Hazard Pulse");
		expect(row.kind_label).toBe("Standing work");
	});

	it("leads with what the job does and where, not with its id", () => {
		const row = autonomyJobRowView(BURNING_ROOM, undefined, link);
		expect(row.fields.slice(0, 2).map((field) => field.label)).toEqual(["Runs", "Anchored at"]);
		expect(row.fields.find((field) => field.label === "Anchored at")?.href).toBe("/docs/x/room");
	});

	it("omits a boundary the row leaves empty rather than printing a blank row", () => {
		const row = autonomyJobRowView(BURNING_ROOM, undefined, link);
		expect(row.fields.some((field) => field.label === "Fires on")).toBe(false);
	});

	it("stays silent about `enabled` when the job runs, and says so when it does not", () => {
		// A job that runs is the ordinary case; one authored but switched off is
		// what a DM needs to notice.
		expect(
			autonomyJobRowView(BURNING_ROOM, undefined, link).fields.some(
				(field) => field.label === "Enabled",
			),
		).toBe(false);
		expect(
			autonomyJobRowView({ ...BURNING_ROOM, enabled: false }, undefined, link).fields.find(
				(field) => field.label === "Enabled",
			)?.value,
		).toBe("No");
	});
});

describe("AutonomyJobView", () => {
	const row = autonomyJobRowView(BURNING_ROOM, "/docs/x/job", link);

	it("renders at all three view levels, each identifying the job", () => {
		for (const view of ["inline", "compact", "full"] as const) {
			const { container, unmount } = render(AutonomyJobView, { row, view, chrome: false });
			expect(container.textContent ?? "").toMatch(
				new RegExp(`${row.title}|mech_burning_room/hazard-pulse`),
			);
			unmount();
		}
	});

	it("splits the description from the detail rows", () => {
		const { unmount } = render(AutonomyJobView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText(/damages every occupant of the room/)).toBeTruthy();
		expect(screen.queryByText("Anchored at")).toBeNull();
		unmount();

		render(AutonomyJobView, { row, view: "full", chrome: false, sections: { header: false } });
		expect(screen.getByText("Anchored at")).toBeTruthy();
	});
});
