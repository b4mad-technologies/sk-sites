import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ChannelView, { channelRowView } from "./ChannelView.svelte";

/**
 * The Reaction channel row, copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/action-economy.toml`
 * — the one row of the 4 with `off_turn_eligible = true`, which is exactly
 * why an Opportunity Attack can fire outside your own turn. `title` stands
 * in for the field `CatalogueEntryPage.svelte` merges in at read time — this
 * kind carries no `display_name` column, so the real page derives it via
 * `idLabelFromPath`.
 */
const REACTION_CHANNEL: Record<string, unknown> = {
	bundle_id: "srd",
	id: "srd/economy_channel/reaction",
	off_turn_eligible: true,
	pool_ms_per_round: 6000,
	resets_on: "turn_start",
	title: "Reaction",
};

const PRIMARY_CHANNEL: Record<string, unknown> = {
	bundle_id: "srd",
	id: "srd/economy_channel/primary",
	off_turn_eligible: false,
	pool_ms_per_round: 6000,
	resets_on: "turn_start",
	title: "Primary",
};

const link = (ref: string): string | undefined =>
	ref === "turn_start" ? "/docs/srd/mechanics/boundaries/turn-start" : undefined;

describe("channelRowView", () => {
	it("titles the page from the merged title field and keeps the channel id as its ref", () => {
		const row = channelRowView(REACTION_CHANNEL, "/docs/srd/mechanics/channels/x", link);
		expect(row.title).toBe("Reaction");
		expect(row.ref).toBe("srd/economy_channel/reaction");
		expect(row.kind_label).toBe("Economy channel");
	});

	it("shows off-turn eligibility as Yes/No even when false, unlike a rare-flag omission", () => {
		const reaction = channelRowView(REACTION_CHANNEL, undefined, link);
		const primary = channelRowView(PRIMARY_CHANNEL, undefined, link);
		expect(reaction.fields.find((field) => field.label === "Off-turn eligible")?.value).toBe("Yes");
		expect(primary.fields.find((field) => field.label === "Off-turn eligible")?.value).toBe("No");
	});

	it("renders the pool in seconds and links the reset boundary when it has a page", () => {
		const row = channelRowView(REACTION_CHANNEL, undefined, link);
		expect(row.fields.find((field) => field.label === "Pool per round")?.value).toBe("6 s");
		const resets = row.fields.find((field) => field.label === "Resets on");
		expect(resets?.href).toBe("/docs/srd/mechanics/boundaries/turn-start");
		expect(resets?.code).toBe(true);
	});

	it("carries no description block at all, since the kind never authors one", () => {
		const row = channelRowView(REACTION_CHANNEL, undefined, link);
		expect(row.description).toBeUndefined();
	});
});

describe("ChannelView", () => {
	const row = channelRowView(REACTION_CHANNEL, "/docs/srd/mechanics/channels/x", link);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ChannelView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Reaction" })).toBeTruthy();
		expect(screen.getByText("srd/economy_channel/reaction")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ChannelView, { row, view: "compact" });
		expect(screen.getAllByText(/Reaction/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Economy channel").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ChannelView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Reaction/).length).toBeGreaterThan(0);
		expect(screen.getByText("Off-turn eligible")).toBeTruthy();
		unmount();
	});

	it("shows the ref/kind caption, never the title, when chrome is off", () => {
		const { unmount } = render(ChannelView, { row, view: "full", chrome: false });
		expect(screen.getByText("Off-turn eligible")).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Reaction" })).toBeNull();
		unmount();
	});
});
