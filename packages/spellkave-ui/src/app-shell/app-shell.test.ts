import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell.svelte";

const text = (t: string) => createRawSnippet(() => ({ render: () => `<p>${t}</p>` }));

describe("AppShell", () => {
	it("toggles the sidebar and resizes it from the keyboard", async () => {
		const { container } = render(AppShell, {
			sidebar: text("Personas"),
			children: text("Transcript"),
			sidebarLabel: "Coven",
		});
		const shell = container.querySelector("[data-slot=app-shell]") as HTMLElement;
		expect(shell.dataset.sidebar).toBe("open");
		const handle = screen.getByRole("separator", { name: "Resize sidebar" });
		await fireEvent.keyDown(handle, { key: "ArrowRight" });
		expect(handle.getAttribute("aria-valuenow")).toBe("276");
		await fireEvent.click(screen.getByRole("button", { name: "Hide sidebar" }));
		expect(shell.dataset.sidebar).toBe("closed");
	});

	it("shows the dock only while open and closes it", async () => {
		const ondockclose = vi.fn();
		render(AppShell, {
			sidebar: text("Personas"),
			children: text("Transcript"),
			dock: text("Node card"),
			dockOpen: true,
			dockLabel: "World alpha",
			ondockclose,
		});
		expect(screen.getByRole("complementary", { name: "World alpha" })).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Close World alpha" }));
		expect(ondockclose).toHaveBeenCalledOnce();
	});
});
