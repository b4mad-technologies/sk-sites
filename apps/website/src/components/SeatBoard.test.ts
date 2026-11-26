import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import type { AccountApi } from "../lib/account-api";
import SeatBoard from "./SeatBoard.svelte";

const demo1 = {
	slug: "demo1",
	name: "Demo world 1",
	adventure: "kavemouth",
	db: "spellkave-demo1",
	position: 1,
	transcript_url: "worlds/demo1/agent-run-events.jsonl",
	transcript_lines: 0,
	transcript_updated_at: null,
};
const demo2 = {
	...demo1,
	slug: "demo2",
	name: "Demo world 2",
	db: "spellkave-demo2",
	position: 2,
	transcript_url: "worlds/demo2/agent-run-events.jsonl",
};
const worlds = [demo1];
const session = {
	access_token: "jwt",
	id_token: "",
	expires_at: Date.now() + 60_000,
	display_name: "tester",
};

function fakeApi(overrides: Partial<AccountApi> = {}): AccountApi {
	return {
		baseUrl: "https://api.spellkave.com",
		token: "jwt",
		getAccount: vi.fn(async () => ({
			sub: "user_a",
			capabilities: [],
			worlds: [
				{
					slug: "demo1",
					display_name: "Demo world 1",
					role: "member" as const,
					capabilities: ["world.observe"],
				},
			],
			seat: null,
		})),
		listSeats: vi.fn(async () => [
			{ actor_id: "1", name: "Renn", claimed: false, mine: false },
			{ actor_id: "2", name: "Candidate", claimed: false, mine: false },
		]),
		claimSeat: vi.fn(async () => ({
			seat: { slug: "demo1", actor_id: "1", role: "primary" },
		})),
		releaseSeat: vi.fn(async () => ({ ok: true as const })),
		addMember: vi.fn(async () => ({ members: [] })),
		removeMember: vi.fn(async () => ({ members: [] })),
		patchWorld: vi.fn(async () => ({ join_policy: "invite" as const })),
		requestReset: vi.fn(async () => ({ job_id: "job-1" })),
		getResetStatus: vi.fn(async () => ({ state: "done" as const })),
		...overrides,
	} as AccountApi;
}

describe("SeatBoard", () => {
	it("asks the visitor to log in when there is no session", () => {
		render(SeatBoard, { worlds, session: null });
		expect(screen.getByText(/Log in to list seats/)).toBeTruthy();
		expect(screen.getByRole("navigation", { name: "Playable worlds" })).toBeTruthy();
		expect(screen.getByText("My heroes")).toBeTruthy();
	});

	it("claims a free seat through the Account API client", async () => {
		const api = fakeApi({
			listSeats: vi
				.fn()
				.mockResolvedValueOnce([
					{ actor_id: "1", name: "Renn", claimed: false, mine: false },
					{ actor_id: "2", name: "Candidate", claimed: true, mine: false },
				])
				.mockResolvedValueOnce([
					{ actor_id: "1", name: "Renn", claimed: true, mine: true },
					{ actor_id: "2", name: "Candidate", claimed: true, mine: false },
				]),
		});
		const createApi = vi.fn(() => api);
		render(SeatBoard, {
			worlds,
			session,
			createApi,
			pollMs: 60_000,
		});
		await waitFor(() => expect(screen.getByText("Renn")).toBeTruthy());
		expect(screen.getByRole("button", { name: "Claim" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Taken" })).toBeTruthy();
		screen.getByRole("button", { name: "Claim" }).click();
		await waitFor(() => expect(api.claimSeat).toHaveBeenCalledWith("demo1", "1"));
	});

	it("never renders an empty seat name for unnamed candidates", async () => {
		const api = fakeApi({
			listSeats: vi.fn(async () => [{ actor_id: "10", name: "", claimed: false, mine: false }]),
		});
		render(SeatBoard, {
			worlds,
			session,
			createApi: () => api,
			pollMs: 60_000,
		});
		await waitFor(() => expect(screen.getByText("Unnamed hero #10")).toBeTruthy());
		const strong = screen.getByText("Unnamed hero #10");
		expect(strong.tagName).toBe("STRONG");
		expect(strong.textContent).not.toBe("");
	});

	it("does not recreate the API client when only the selected slug changes", async () => {
		const api = fakeApi({
			getAccount: vi.fn(async () => ({
				sub: "user_a",
				capabilities: [],
				worlds: [
					{
						slug: "demo1",
						display_name: "Demo world 1",
						role: "member" as const,
						capabilities: ["world.observe"],
					},
					{
						slug: "demo2",
						display_name: "Demo world 2",
						role: "member" as const,
						capabilities: ["world.observe"],
					},
				],
				seat: null,
			})),
			listSeats: vi.fn(async (slug: string) =>
				slug === "demo2"
					? [{ actor_id: "3", name: "Other", claimed: false, mine: false }]
					: [{ actor_id: "1", name: "Renn", claimed: false, mine: false }],
			),
		});
		const createApi = vi.fn(() => api);
		render(SeatBoard, {
			worlds: [demo1, demo2],
			session,
			createApi,
			pollMs: 60_000,
		});
		await waitFor(() => expect(screen.getByText("Renn")).toBeTruthy());
		const created = createApi.mock.calls.length;
		screen.getByRole("button", { name: /Demo world 2/ }).click();
		await waitFor(() => expect(screen.getByText("Other")).toBeTruthy());
		expect(createApi.mock.calls.length).toBe(created);
	});

	it("shows owner controls when account role is owner", async () => {
		const api = fakeApi({
			getAccount: vi.fn(async () => ({
				sub: "user_a",
				capabilities: [],
				worlds: [
					{
						slug: "demo1",
						display_name: "Demo world 1",
						role: "owner" as const,
						capabilities: ["world.observe", "world.manage"],
					},
				],
				seat: null,
			})),
		});
		render(SeatBoard, {
			worlds,
			session,
			createApi: () => api,
			pollMs: 60_000,
		});
		await waitFor(() => expect(screen.getByLabelText("Owner controls")).toBeTruthy());
		expect(screen.getByRole("button", { name: "Invite" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Reset world" })).toBeTruthy();
	});
});
