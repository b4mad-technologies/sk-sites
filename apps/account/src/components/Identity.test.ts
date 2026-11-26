import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import type { AccountApi, SeatBoardRow } from "../lib/account-api";
import Identity from "./Identity.svelte";

const seatedAccount = {
	sub: "user_a",
	capabilities: [] as string[],
	worlds: [
		{
			slug: "demo1",
			display_name: "Demo Vale",
			role: "owner" as const,
			capabilities: ["world.play"],
		},
	],
	seat: { slug: "demo1", actor_id: "7", role: "primary" },
};

function apiWith(overrides: Partial<AccountApi> = {}): AccountApi {
	return {
		getSeats: vi.fn(async () => [{ actor_id: "7", name: "Renn", claimed: true, mine: true }]),
		releaseSeat: vi.fn(),
		...overrides,
	} as unknown as AccountApi;
}

const onReleased = vi.fn();

describe("Identity", () => {
	it("names the signed-in person when no hero is claimed", () => {
		render(Identity, {
			displayName: "Ada",
			playAppUrl: "https://play.spellkave.com/",
			account: { sub: "user_a", capabilities: [], worlds: [], seat: null },
			api: apiWith(),
			onReleased,
		});
		expect(screen.getByText(/Ada\. You are not currently playing a hero/)).toBeTruthy();
		expect(screen.queryByTestId("enter-world")).toBeNull();
		expect(screen.getByRole("link", { name: /^Play$/i }).getAttribute("href")).toBe(
			"https://play.spellkave.com/",
		);
	});

	it("names the current hero from the board and links into that world", async () => {
		const getSeats = vi.fn(async () => [
			{ actor_id: "7", name: "Renn", claimed: true, mine: true },
		]);
		render(Identity, {
			displayName: "Ada",
			playAppUrl: "https://play.spellkave.com/",
			account: seatedAccount,
			api: apiWith({ getSeats }),
			onReleased,
		});
		expect(screen.getByText(/Ada\. Currently playing your hero in Demo Vale/)).toBeTruthy();
		await waitFor(() =>
			expect(screen.getByText(/Ada\. Currently playing Renn in Demo Vale/)).toBeTruthy(),
		);
		expect(getSeats).toHaveBeenCalledWith("demo1");
		expect(screen.queryByText(/hero 7/)).toBeNull();
		const enter = screen.getByTestId("enter-world");
		expect(enter.getAttribute("href")).toBe("https://play.spellkave.com/?world=demo1");
	});

	it("keeps 'your hero' when the board cannot be read", async () => {
		const getSeats = vi.fn(async () => {
			throw new Error("board unavailable");
		});
		render(Identity, {
			displayName: "Ada",
			playAppUrl: "https://play.spellkave.com/",
			account: seatedAccount,
			api: apiWith({ getSeats }),
			onReleased,
		});
		await waitFor(() =>
			expect(screen.getByText(/Ada\. Currently playing your hero in Demo Vale/)).toBeTruthy(),
		);
		expect(screen.queryByText(/hero 7/)).toBeNull();
		expect(screen.getByRole("button", { name: /Release this hero/i })).toBeTruthy();
	});

	it("keeps the two dialog actions as siblings in one container", async () => {
		render(Identity, {
			displayName: "Ada",
			playAppUrl: "https://play.spellkave.com/",
			account: seatedAccount,
			api: apiWith(),
			onReleased,
		});
		await waitFor(() => expect(screen.getByText(/Currently playing Renn/)).toBeTruthy());
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		const confirm = screen.getByTestId("release-hero-submit");
		const cancel = screen.getByRole("button", { name: /Keep playing/i });
		expect(confirm.parentElement).toBe(cancel.parentElement);
		expect(confirm.parentElement?.getAttribute("data-slot")).toBe("dialog-actions");
	});

	it("uses the board name in the release dialog", async () => {
		let finish: (rows: SeatBoardRow[]) => void = () => {};
		const getSeats = vi.fn(
			() =>
				new Promise<SeatBoardRow[]>((resolve) => {
					finish = resolve;
				}),
		);
		render(Identity, {
			displayName: "Ada",
			playAppUrl: "https://play.spellkave.com/",
			account: seatedAccount,
			api: apiWith({ getSeats }),
			onReleased,
		});
		expect(screen.getByText(/Currently playing your hero/)).toBeTruthy();
		finish([{ actor_id: "7", name: "Renn", claimed: true, mine: true }]);
		await waitFor(() => expect(screen.getByText(/Currently playing Renn/)).toBeTruthy());
		await fireEvent.click(screen.getByRole("button", { name: /Release this hero/i }));
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Release Renn?" })).toBeTruthy(),
		);
		expect(screen.getByText(/You give up Renn in Demo Vale/)).toBeTruthy();
	});
});
