import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import HoverCard from "./HoverCard.svelte";

describe("HoverCard", () => {
	it("uses the shared reference card for name, meta, and snippet", () => {
		render(HoverCard, {
			props: {
				title: "Lodge Porch",
				meta: "Floor 0 · 2 people",
				snippet: "A covered porch.",
			},
		});
		expect(screen.getByRole("heading", { name: "Lodge Porch" })).toBeTruthy();
		expect(screen.getByText("Floor 0 · 2 people")).toBeTruthy();
		expect(screen.getByText("A covered porch.")).toBeTruthy();
		expect(screen.getByText("Place")).toBeTruthy();
	});
});
