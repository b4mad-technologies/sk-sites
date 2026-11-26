import { describe, expect, it, vi } from "vitest";

import type { AccountGetResponse } from "./account-api";
import {
	accountDestination,
	DEFAULT_ACCOUNT_APP_URL,
	DEFAULT_OPERATOR_APP_URL,
	DEFAULT_PLAY_APP_URL,
	openAccountDestination,
} from "./account-destination";

function account(overrides: Partial<AccountGetResponse> = {}): AccountGetResponse {
	return {
		sub: "user_a",
		capabilities: [],
		worlds: [],
		seat: null,
		...overrides,
	};
}

describe("accountDestination", () => {
	it("sends observers and owners to Play instead of keeping a hub", () => {
		expect(
			accountDestination(
				account({
					worlds: [
						{
							slug: "woven-vale",
							display_name: "Woven Vale",
							role: "owner",
							capabilities: ["world.observe", "world.manage"],
						},
					],
				}),
			),
		).toEqual({ kind: "play", href: DEFAULT_PLAY_APP_URL });
	});

	it("opens a player's claimed world in Play", () => {
		expect(
			accountDestination(
				account({
					seat: { slug: "claimed-world", actor_id: "hero_7", role: "primary" },
					worlds: [
						{
							slug: "other-world",
							display_name: "Other World",
							role: "member",
							capabilities: ["world.play"],
						},
						{
							slug: "claimed-world",
							display_name: "Claimed World",
							role: "member",
							capabilities: ["world.observe", "world.play"],
						},
					],
				}),
			),
		).toEqual({
			kind: "play",
			href: "https://play.spellkave.com/?world=claimed-world",
			worldSlug: "claimed-world",
		});
	});

	it("routes DM capability to Play without inferring a role name", () => {
		expect(
			accountDestination(
				account({
					worlds: [
						{
							slug: "shaped-world",
							display_name: "Shaped World",
							role: "member",
							capabilities: ["world.observe", "world.oversee"],
						},
					],
				}),
			),
		).toMatchObject({ kind: "play", worldSlug: "shaped-world" });
	});

	it("gives system work precedence over combined world permissions", () => {
		expect(
			accountDestination(
				account({
					capabilities: ["future.capability", "system.manage"],
					worlds: [
						{
							slug: "also-playable",
							display_name: "Also Playable",
							role: "owner",
							capabilities: ["world.play", "world.manage"],
						},
					],
				}),
			),
		).toEqual({ kind: "system", href: DEFAULT_OPERATOR_APP_URL });
	});
});

it("navigates every destination off the public entrance", () => {
	const assign = vi.fn();
	expect(
		openAccountDestination(
			{ kind: "play", href: "https://play.spellkave.com/?world=demo", worldSlug: "demo" },
			{ assign },
		),
	).toBe(true);
	expect(openAccountDestination({ kind: "play", href: DEFAULT_PLAY_APP_URL }, { assign })).toBe(
		true,
	);
	expect(
		openAccountDestination({ kind: "system", href: DEFAULT_OPERATOR_APP_URL }, { assign }),
	).toBe(true);
	expect(assign).toHaveBeenCalledTimes(3);
	expect(DEFAULT_ACCOUNT_APP_URL).toBe("https://account.spellkave.com/");
});
