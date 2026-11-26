import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import LinkMenu from "./link-menu.svelte";

const token = createRawSnippet(() => ({
	render: () => "<span>'srd/str'</span>",
}));

afterEach(async () => {
	// bits-ui menus restore focus on a timeout; let it run while jsdom lives.
	await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("LinkMenu", () => {
	it("opens on click and lists every target with its kind", async () => {
		render(LinkMenu, {
			items: [
				{ label: "Strength", kind: "Resources", href: "/docs/srd/playing-the-game/str" },
				{ label: "Strength", kind: "Modifier targets", href: "/docs/srd/mechanics/str" },
			],
			children: token,
		});

		await fireEvent.click(screen.getByRole("button", { name: "'srd/str'" }));
		await waitFor(() => expect(screen.getByRole("menu")).toBeTruthy());
		const items = screen.getAllByRole("menuitem");
		expect(items).toHaveLength(2);
		expect(screen.getAllByText("Strength")).toHaveLength(2);
		expect(screen.getByText("Resources")).toBeTruthy();
		expect(screen.getByText("Modifier targets")).toBeTruthy();
	});

	it("hands the chosen item to the caller on select", async () => {
		const onSelect = vi.fn();
		render(LinkMenu, {
			items: [{ label: "Strength", kind: "Resources", href: "/str" }],
			onSelect,
			children: token,
		});

		await fireEvent.click(screen.getByRole("button", { name: "'srd/str'" }));
		await waitFor(() => expect(screen.getByRole("menuitem")).toBeTruthy());
		await fireEvent.click(screen.getByRole("menuitem"));
		await waitFor(() =>
			expect(onSelect).toHaveBeenCalledWith({ label: "Strength", kind: "Resources", href: "/str" }),
		);
	});
});
