import type { WorldSeatBoardEntry } from "./account-api";

/** Seat row as shown on the public site (Account API board + local labels). */
export interface PlaySeat {
	actor_id: string;
	name: string;
	claimed: boolean;
	mine: boolean;
	/**
	 * Legacy SpacetimeDB seat flag. The Account API board does not return it;
	 * when absent, free seats are treated as claimable.
	 */
	embodied?: boolean;
}

export interface WorldHero {
	worldSlug: string;
	worldName: string;
	actor_id: string;
	name: string;
}

/**
 * Label for a playable seat on the public site.
 *
 * The Account API already normalizes empty names server-side; keep the same
 * client fallback so unit tests and any partial payload stay honest.
 */
export function displaySeatName(seat: { actor_id: string; name?: string | null }): string {
	const name = typeof seat.name === "string" ? seat.name.trim() : "";
	if (name !== "") return name;
	return `Unnamed hero #${String(seat.actor_id)}`;
}

/** Map an Account API seat board row onto the UI seat shape. */
export function playSeatsFromBoard(seats: WorldSeatBoardEntry[]): PlaySeat[] {
	return seats.map((seat) => ({
		actor_id: String(seat.actor_id),
		name: displaySeatName(seat),
		claimed: Boolean(seat.claimed),
		mine: Boolean(seat.mine),
	}));
}

/** True when the board row may be claimed (free and not already mine). */
export function seatIsClaimable(seat: PlaySeat): boolean {
	if (seat.mine || seat.claimed) return false;
	if (seat.embodied === false) return false;
	return true;
}

export function heroesFromWorld(
	worldSlug: string,
	worldName: string,
	seats: PlaySeat[],
): WorldHero[] {
	return seats
		.filter((seat) => seat.mine)
		.map((seat) => ({
			worldSlug,
			worldName,
			actor_id: seat.actor_id,
			name: displaySeatName(seat),
		}));
}
