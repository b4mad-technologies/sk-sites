import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import type { AccountApi } from "../lib/account-api";
import TokenBoard from "./TokenBoard.svelte";

const session = {
	access_token: "jwt",
	id_token: "",
	expires_at: Date.now() + 60_000,
	display_name: "tester",
};

function fakeApi(overrides: Partial<AccountApi> = {}): AccountApi {
	return {
		baseUrl: "",
		token: "jwt",
		getAccount: vi.fn(async () => ({
			sub: "user_a",
			capabilities: [],
			worlds: [],
			seat: null,
		})),
		listTokens: vi.fn(async () => [
			{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" },
		]),
		createToken: vi.fn(async (name: string) => ({
			id: "key_2",
			name,
			secret: "sk_once",
		})),
		revokeToken: vi.fn(async () => undefined),
		...overrides,
	} as AccountApi;
}

describe("TokenBoard", () => {
	it("stays hidden when there is no session", () => {
		render(TokenBoard, { session: null });
		expect(screen.queryByTestId("token-board")).toBeNull();
	});

	it("lists tokens for a logged-in account", async () => {
		const api = fakeApi();
		render(TokenBoard, { session, createApi: () => api });
		await waitFor(() => expect(screen.getByText("ci")).toBeTruthy());
		expect(screen.getByRole("heading", { name: "API tokens" })).toBeTruthy();
		expect(api.listTokens).toHaveBeenCalled();
	});

	it("creates a token and shows the one-time secret", async () => {
		const api = fakeApi({
			listTokens: vi
				.fn()
				.mockResolvedValueOnce([
					{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" },
				])
				.mockResolvedValueOnce([
					{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" },
					{ id: "key_2", name: "laptop", created_at: "2026-08-24T00:00:01.000Z" },
				]),
		});
		render(TokenBoard, { session, createApi: () => api });
		await waitFor(() => expect(screen.getByText("ci")).toBeTruthy());
		const input = screen.getByTestId("token-name") as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "laptop" } });
		await fireEvent.click(screen.getByTestId("token-create"));
		await waitFor(() => expect(screen.getByTestId("token-secret")).toBeTruthy());
		expect(screen.getByText(/This secret is shown once/)).toBeTruthy();
		expect(api.createToken).toHaveBeenCalledWith("laptop");
	});

	it("revokes after confirm", async () => {
		const api = fakeApi({
			listTokens: vi
				.fn()
				.mockResolvedValueOnce([
					{ id: "key_1", name: "ci", created_at: "2026-08-24T00:00:00.000Z" },
				])
				.mockResolvedValueOnce([]),
		});
		render(TokenBoard, { session, createApi: () => api });
		await waitFor(() => expect(screen.getByText("ci")).toBeTruthy());
		await fireEvent.click(screen.getByTestId("token-revoke-key_1"));
		await fireEvent.click(screen.getByTestId("token-revoke-confirm-key_1"));
		await waitFor(() => expect(api.revokeToken).toHaveBeenCalledWith("key_1"));
	});
});
