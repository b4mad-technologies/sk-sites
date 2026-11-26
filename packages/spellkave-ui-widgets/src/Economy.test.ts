import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Economy from "./Economy.svelte";

describe("Economy", () => {
	it("draws one pip per channel the read returned, in that order, labeled from the approved map", () => {
		render(Economy, {
			channels: [
				{ channelId: "srd/economy_channel/primary", spentMs: 1000, windowStartMs: 0 },
				{ channelId: "srd/economy_channel/bonus", spentMs: 0, windowStartMs: 0 },
				{ channelId: "srd/economy_channel/reaction", spentMs: 0, windowStartMs: 0 },
				{ channelId: "srd/economy_channel/object_interaction", spentMs: 0, windowStartMs: 0 },
			],
		});
		const list = screen.getByRole("list", { name: "Action economy" });
		const pips = list.querySelectorAll("li");
		expect(pips).toHaveLength(4);
		expect(pips[0]?.getAttribute("aria-label")).toBe("Action, spent");
		expect(pips[1]?.getAttribute("aria-label")).toBe("Bonus, unspent");
		expect(pips[2]?.getAttribute("aria-label")).toBe("Reaction, unspent");
		expect(pips[3]?.getAttribute("aria-label")).toBe("Interact, unspent");
	});

	it("falls back to the raw channel id when the id is not in the approved label map", () => {
		render(Economy, {
			channels: [{ channelId: "srd/economy_channel/movement", spentMs: 0, windowStartMs: 0 }],
		});
		expect(screen.getByText("srd/economy_channel/movement")).toBeTruthy();
	});

	it("never draws a channel the read did not return, even one the label map knows about", () => {
		render(Economy, {
			channels: [{ channelId: "srd/economy_channel/primary", spentMs: 500, windowStartMs: 0 }],
		});
		const list = screen.getByRole("list", { name: "Action economy" });
		expect(list.querySelectorAll("li")).toHaveLength(1);
		expect(screen.queryByText("Bonus")).toBeNull();
		expect(screen.queryByText("Reaction")).toBeNull();
		expect(screen.queryByText("Interact")).toBeNull();
	});

	it("shows an honest empty state rather than an invented pip when no channel has been read yet", () => {
		render(Economy, { channels: [] });
		expect(screen.queryByRole("list", { name: "Action economy" })).toBeNull();
		expect(screen.getByText("No action economy reported yet.")).toBeTruthy();
	});

	it("renders strip density as a glyph, title and a spent/total datum, swallowing the pip list", () => {
		render(Economy, {
			channels: [
				{ channelId: "srd/economy_channel/primary", spentMs: 1000, windowStartMs: 0 },
				{ channelId: "srd/economy_channel/bonus", spentMs: 0, windowStartMs: 0 },
			],
			density: "strip",
		});
		expect(document.querySelector('[data-slot="play-economy"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByText("1/2")).toBeTruthy();
		expect(screen.queryByRole("list", { name: "Action economy" })).toBeNull();
	});

	it("renders bare chrome with no border and no frame title, keeping the pip list", () => {
		render(Economy, {
			channels: [{ channelId: "srd/economy_channel/primary", spentMs: 1000, windowStartMs: 0 }],
			density: "stage",
			chrome: "bare",
		});
		const el = document.querySelector('[data-slot="play-economy"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("list", { name: "Action economy" })).toBeTruthy();
	});
});
