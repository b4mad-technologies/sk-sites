import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

import WorldControls from "./WorldControls.svelte";

describe("WorldControls", () => {
	it("invites and removes members from the inputs", async () => {
		const onInvite = vi.fn();
		const onRemove = vi.fn();
		render(WorldControls, {
			onInvite,
			onRemove,
			onJoinPolicy: vi.fn(),
			onReset: vi.fn(),
			members: ["user_b"],
		});
		const invite = screen.getByTestId("invite-sub");
		await fireEvent.input(invite, { target: { value: "user_c" } });
		await fireEvent.click(screen.getByRole("button", { name: "Invite" }));
		expect(onInvite).toHaveBeenCalledWith("user_c");

		const remove = screen.getByTestId("remove-sub");
		await fireEvent.input(remove, { target: { value: "user_b" } });
		await fireEvent.click(screen.getByRole("button", { name: "Remove" }));
		expect(onRemove).toHaveBeenCalledWith("user_b");
		expect(screen.getByText("user_b")).toBeTruthy();
	});

	it("toggles join policy and confirms reset", async () => {
		const onJoinPolicy = vi.fn();
		const onReset = vi.fn();
		const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
		render(WorldControls, {
			joinPolicy: "invite",
			onInvite: vi.fn(),
			onRemove: vi.fn(),
			onJoinPolicy,
			onReset,
		});
		await fireEvent.click(screen.getByRole("button", { name: "Open" }));
		expect(onJoinPolicy).toHaveBeenCalledWith("open");
		await fireEvent.click(screen.getByRole("button", { name: "Reset world" }));
		expect(confirm).toHaveBeenCalledWith("resets every hero in this world");
		expect(onReset).toHaveBeenCalled();
		confirm.mockRestore();
	});
});
