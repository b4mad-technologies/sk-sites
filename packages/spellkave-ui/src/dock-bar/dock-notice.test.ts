import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DockNotice from "./dock-notice.svelte";

describe("DockNotice", () => {
	it("renders its text with role status", () => {
		render(DockNotice, { text: "Reconnecting to the world…" });
		expect(screen.getByRole("status").textContent).toContain("Reconnecting to the world…");
	});

	it("tints the border toward destructive for tone warn", () => {
		render(DockNotice, { text: "That did not work.", tone: "warn" });
		expect(screen.getByRole("status").className).toContain("destructive");
	});

	it("renders no dismiss button when onDismiss is omitted", () => {
		render(DockNotice, { text: "The world is still thinking…" });
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("renders a dismiss button that fires onDismiss when given", async () => {
		const onDismiss = vi.fn();
		render(DockNotice, { text: "That did not work.", tone: "warn", onDismiss });
		await fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it("renders an offer button that fires action.onSelect, beside the dismiss", async () => {
		const onSelect = vi.fn();
		const onDismiss = vi.fn();
		render(DockNotice, {
			text: "Fight begins.",
			action: { label: "Map view", onSelect },
			onDismiss,
		});
		await fireEvent.click(screen.getByRole("button", { name: "Map view" }));
		expect(onSelect).toHaveBeenCalledOnce();
		expect(onDismiss).not.toHaveBeenCalled();
	});
});
