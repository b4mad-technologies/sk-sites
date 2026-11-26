import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import PlaceInspect from "./PlaceInspect.svelte";

describe("PlaceInspect", () => {
	it("shows title, description, and size", () => {
		render(PlaceInspect, {
			props: {
				title: "Crypt Entrance",
				description: "A low stone lintel half-buried in hillside scrub marks the crypt entrance.",
				fields: [
					{ label: "Floor", value: "0" },
					{ label: "Size", value: "18 m across" },
				],
			},
		});
		expect(screen.getByRole("heading", { name: "Crypt Entrance" })).toBeTruthy();
		expect(screen.getByTestId("place-inspect-description").textContent).toMatch(/lintel/);
		expect(screen.getByText("18 m across")).toBeTruthy();
	});
});
