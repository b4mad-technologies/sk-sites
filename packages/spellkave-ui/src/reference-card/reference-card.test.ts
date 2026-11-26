import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ReferenceCard from "./reference-card.svelte";

describe("ReferenceCard", () => {
	it("renders label, title, and facts without a link", () => {
		render(ReferenceCard, {
			label: "Person",
			title: "Aldwin",
			facts: [{ label: "Place", value: "Inn · Common room" }],
		});
		expect(screen.getByText("Person")).toBeTruthy();
		expect(screen.getByText("Aldwin").tagName.toLowerCase()).toBe("h2");
		expect(screen.queryByRole("link")).toBeNull();
		expect(screen.getByText("Place:")).toBeTruthy();
		expect(screen.getByText("Inn · Common room")).toBeTruthy();
	});

	it("renders a fact link and calls onClick", async () => {
		const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
		render(ReferenceCard, {
			label: "Person",
			title: "Steward",
			facts: [
				{
					label: "Place",
					value: "Deep tomb · Steward court",
					href: "/w/kavemouth/place/kavemouth/deep_tomb/steward_court",
					onClick,
				},
			],
		});
		const link = screen.getByRole("link", { name: "Deep tomb · Steward court" });
		expect(link.getAttribute("href")).toContain("steward_court");
		link.click();
		expect(onClick).toHaveBeenCalled();
	});

	it("renders a title link and calls onNavigate", async () => {
		const onNavigate = vi.fn((event: MouseEvent) => event.preventDefault());
		render(ReferenceCard, {
			label: "Resource",
			title: "Focus",
			href: "/docs/focus",
			onNavigate,
		});
		const link = screen.getByRole("link", { name: "Focus" });
		expect(link.getAttribute("href")).toBe("/docs/focus");
		link.click();
		expect(onNavigate).toHaveBeenCalled();
	});
});
