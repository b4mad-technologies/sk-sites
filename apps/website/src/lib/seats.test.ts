import { describe, expect, it } from "vitest";

import {
	displaySeatName,
	heroesFromWorld,
	type PlaySeat,
	playSeatsFromBoard,
	seatIsClaimable,
} from "./seats";

const renn: PlaySeat = { actor_id: "1", name: "Renn", claimed: true, mine: true };
const free: PlaySeat = { actor_id: "2", name: "Candidate", claimed: false, mine: false };

describe("displaySeatName", () => {
	it("keeps a named seat unchanged", () => {
		expect(displaySeatName({ actor_id: "1", name: "Renn" })).toBe("Renn");
		expect(displaySeatName({ actor_id: "1", name: "  Creation Candidate  " })).toBe(
			"Creation Candidate",
		);
	});

	it("falls back when the catalog name is empty or missing", () => {
		expect(displaySeatName({ actor_id: "10", name: "" })).toBe("Unnamed hero #10");
		expect(displaySeatName({ actor_id: "1", name: "   " })).toBe("Unnamed hero #1");
		expect(displaySeatName({ actor_id: "7", name: null })).toBe("Unnamed hero #7");
		expect(displaySeatName({ actor_id: "3" })).toBe("Unnamed hero #3");
	});
});

describe("playSeatsFromBoard", () => {
	it("normalizes Account API seat rows", () => {
		expect(
			playSeatsFromBoard([
				{ actor_id: "1", name: "Renn", claimed: true, mine: true },
				{ actor_id: "10", name: "", claimed: false, mine: false },
			]),
		).toEqual([
			{ actor_id: "1", name: "Renn", claimed: true, mine: true },
			{ actor_id: "10", name: "Unnamed hero #10", claimed: false, mine: false },
		]);
	});
});

describe("seatIsClaimable", () => {
	it("allows free seats and rejects taken / mine / disembodied", () => {
		expect(seatIsClaimable(free)).toBe(true);
		expect(seatIsClaimable(renn)).toBe(false);
		expect(seatIsClaimable({ ...free, claimed: true })).toBe(false);
		expect(seatIsClaimable({ ...free, embodied: false })).toBe(false);
	});
});

describe("heroesFromWorld", () => {
	it("aggregates my heroes from one world", () => {
		expect(heroesFromWorld("demo1", "Demo world 1", [renn, free])).toEqual([
			{ worldSlug: "demo1", worldName: "Demo world 1", actor_id: "1", name: "Renn" },
		]);
	});

	it("aggregates my heroes with the empty-name fallback", () => {
		const seats = playSeatsFromBoard([{ actor_id: "10", name: "", claimed: true, mine: true }]);
		expect(heroesFromWorld("elven-mini-3", "Elven Mini 3", seats)).toEqual([
			{
				worldSlug: "elven-mini-3",
				worldName: "Elven Mini 3",
				actor_id: "10",
				name: "Unnamed hero #10",
			},
		]);
	});
});
