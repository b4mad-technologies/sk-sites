import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ConnectorList from "./ConnectorList.svelte";
import SeatBoard from "./SeatBoard.svelte";

const seats = [
	{ key: "srd/7", hero: "Arwen", world: "SRD-CC" },
	{ key: "srd/9", hero: "Borin", world: "SRD-CC", note: "world paused" },
];

describe("SeatBoard", () => {
	it("marks the active hero and offers a switch for every other one", async () => {
		const onSelect = vi.fn();
		render(SeatBoard, { seats, activeKey: "srd/7", onSelect });
		expect(screen.getByText("Playing now")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Switch to Arwen in SRD-CC" })).toBeNull();
		expect(screen.getByText("SRD-CC · world paused")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Switch to Borin in SRD-CC" }));
		expect(onSelect).toHaveBeenCalledWith("srd/9");
	});

	it("says so when the person holds no hero", () => {
		render(SeatBoard, { seats: [], onSelect: vi.fn(), emptyText: "Pick a hero in Play." });
		expect(screen.getByText("Pick a hero in Play.")).toBeTruthy();
	});

	it("disables switching while busy", () => {
		render(SeatBoard, { seats, activeKey: null, onSelect: vi.fn(), busy: true });
		for (const button of screen.getAllByRole("button"))
			expect(button.hasAttribute("disabled")).toBe(true);
	});
});

describe("ConnectorList", () => {
	it("disconnects one client or all of them", async () => {
		const onDisconnect = vi.fn();
		render(ConnectorList, {
			connectors: [{ id: "client_a", name: "Claude" }],
			onDisconnect,
			status: "1 disconnected",
		});
		await fireEvent.click(screen.getByRole("button", { name: "Disconnect Claude" }));
		expect(onDisconnect).toHaveBeenLastCalledWith("client_a");
		await fireEvent.click(screen.getByRole("button", { name: "Disconnect all connectors" }));
		expect(onDisconnect).toHaveBeenCalledTimes(1);
		expect(await screen.findByText("Disconnect all connected apps?")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Disconnect all" }));
		expect(onDisconnect).toHaveBeenLastCalledWith(null);
		expect(screen.getByRole("status").textContent).toBe("1 disconnected");
	});

	it("shows an empty state without the disconnect-all control", () => {
		render(ConnectorList, { connectors: [], onDisconnect: vi.fn() });
		expect(screen.getByText("No connected apps.")).toBeTruthy();
		expect(screen.queryByRole("button")).toBeNull();
	});
});

describe("ConnectorList confirmation", () => {
	it("keeps every connector when the person backs out", async () => {
		const onDisconnect = vi.fn();
		render(ConnectorList, { connectors: [{ id: "client_a", name: "Claude" }], onDisconnect });
		await fireEvent.click(screen.getByRole("button", { name: "Disconnect all connectors" }));
		await fireEvent.click(await screen.findByRole("button", { name: "Keep them" }));
		expect(onDisconnect).not.toHaveBeenCalled();
	});
});

describe("SeatBoard select label", () => {
	it("uses the caller's label in text and accessible name", () => {
		render(SeatBoard, { seats, onSelect: vi.fn(), selectLabel: "Play" });
		expect(screen.getByRole("button", { name: "Play Arwen in SRD-CC" }).textContent?.trim()).toBe(
			"Play",
		);
	});
});
