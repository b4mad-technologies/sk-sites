import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Dialog from "./Dialog.svelte";

const confirm = createRawSnippet(() => ({
	render: () => '<button type="button">Confirm reset world</button>',
}));

describe("Dialog", () => {
	it("puts confirm and close in one wrapping row", async () => {
		render(Dialog, {
			title: "Reset this world?",
			triggerLabel: "Reset world",
			closeLabel: "Cancel",
			children: confirm,
		});
		await fireEvent.click(screen.getByRole("button", { name: /Reset world/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		const confirmButton = screen.getByRole("button", { name: "Confirm reset world" });
		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		expect(confirmButton.parentElement).toBe(cancelButton.parentElement);
		expect(confirmButton.parentElement?.getAttribute("data-slot")).toBe("dialog-actions");
		const classes = confirmButton.parentElement?.className ?? "";
		expect(classes.split(/\s+/)).toEqual(expect.arrayContaining(["flex", "flex-wrap"]));
	});
	it("leaves body scroll unlocked under jsdom (sk-jay0.7.144)", async () => {
		// The lock is meaningless without a layout engine, and releasing it
		// arms a 24ms destroy-timer that can outlive jsdom teardown and fail
		// a green suite. The wrapper must keep it off in jsdom without being
		// asked; an explicit preventScroll prop stays available for callers.
		render(Dialog, {
			title: "Reset this world?",
			triggerLabel: "Reset world",
			closeLabel: "Cancel",
			children: confirm,
		});
		await fireEvent.click(screen.getByRole("button", { name: /Reset world/i }));
		await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
		expect(document.body.getAttribute("style")).toBeNull();
		expect(document.body.style.overflow).toBe("");
	});

	it("renders no default trigger when another surface controls it", async () => {
		render(Dialog, {
			open: true,
			title: "Keyboard shortcuts",
			triggerLabel: null,
		});
		await waitFor(() =>
			expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeTruthy(),
		);
		expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
	});
});
