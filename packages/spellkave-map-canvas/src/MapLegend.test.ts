import { fireEvent, render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import MapLegend from "./MapLegend.svelte";

describe("MapLegend component", () => {
	it("renders collapsed toggle button initially", () => {
		const rendered = render(MapLegend, { open: false });
		expect(rendered.getByTestId("map-legend")).toBeTruthy();
		expect(rendered.getByRole("button", { name: "Show map legend" })).toBeTruthy();
		expect(rendered.queryByText("Substrates & Floors")).toBeNull();
	});

	it("expands to show legend sections when clicked", async () => {
		const rendered = render(MapLegend, { open: false });
		const toggleBtn = rendered.getByRole("button", { name: "Show map legend" });
		await fireEvent.click(toggleBtn);

		expect(rendered.getByText("Substrates & Floors")).toBeTruthy();
		expect(rendered.getByText("Structures & Connections")).toBeTruthy();
		expect(rendered.getByText("Points of Interest (maps.poi)")).toBeTruthy();
		expect(rendered.getByText("Entities & Occupants")).toBeTruthy();
		expect(rendered.getByText("Tactical")).toBeTruthy();
		expect(rendered.getByText("Outdoor")).toBeTruthy();
		expect(rendered.getByText("Indoor")).toBeTruthy();
	});

	it("collapses when close button is clicked", async () => {
		const rendered = render(MapLegend, { open: true });
		expect(rendered.getByText("Map Legend")).toBeTruthy();
		const closeBtn = rendered.getByRole("button", { name: "Close legend" });
		await fireEvent.click(closeBtn);
		expect(rendered.queryByText("Map Legend")).toBeNull();
		expect(rendered.getByRole("button", { name: "Show map legend" })).toBeTruthy();
	});

	it("applies custom rightOffset to avoid overlapping controls", () => {
		const rendered = render(MapLegend, { open: false, rightOffset: 280 });
		const root = rendered.getByTestId("map-legend");
		expect(root.getAttribute("style")).toContain("right: 280px");
	});
});
