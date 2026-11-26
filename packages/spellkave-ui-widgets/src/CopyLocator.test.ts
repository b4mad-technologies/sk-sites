import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CopyLocator from "./CopyLocator.svelte";

describe("CopyLocator", () => {
	it("copies the locator URL", async () => {
		const copy = vi.fn(async () => true);
		render(CopyLocator, {
			props: {
				url: "http://localhost:5174/w/kavemouth/place/kavemouth/bramble_crypt/entrance",
				copy,
			},
		});
		screen.getByRole("button", { name: "Copy link" }).click();
		await vi.waitFor(() => expect(copy).toHaveBeenCalled());
		expect(screen.getByText(/bramble_crypt/)).toBeTruthy();
	});
});
