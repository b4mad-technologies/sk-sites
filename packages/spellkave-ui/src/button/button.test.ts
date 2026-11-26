import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Button from "./button.svelte";

describe("Button", () => {
	it("renders a semantic button by default", () => {
		render(Button);
		expect(screen.getByRole("button")).toBeTruthy();
	});

	it("gives a bare Button a 44px-high target", () => {
		render(Button);
		const classes = screen.getByRole("button").className.split(/\s+/);
		expect(classes).toContain("h-11");
		expect(classes).toContain("min-h-11");
		expect(classes).not.toContain("h-8");
	});

	it("renders an anchor when href is provided and keeps disabled inert", async () => {
		render(Button, { href: "/guide", disabled: true });
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(null);
		expect(link.getAttribute("aria-disabled")).toBe("true");
		expect(link.getAttribute("tabindex")).toBe("-1");
	});

	it("keeps variant and size props available including woven hero variants", () => {
		render(Button, { variant: "hero", size: "lg" });
		const button = screen.getByRole("button");
		expect(button.className).toContain("text-primary-foreground");
		expect(button.getAttribute("data-woven-frame")).toBe("loom-fill");
	});

	it("renders size=sm on woven-primary at 28px without the 44px min-height clamp", () => {
		render(Button, { variant: "woven-primary", size: "sm" });
		const classes = screen.getByRole("button").className.split(/\s+/);
		expect(classes).toContain("h-7");
		expect(classes).toContain("min-h-7");
		expect(classes).not.toContain("h-11");
		expect(classes).not.toContain("min-h-11");
	});

	it("uses a CSS loom outline for secondary hero actions", () => {
		render(Button, { variant: "woven-secondary" });
		expect(screen.getByRole("button").getAttribute("data-woven-frame")).toBe("loom-outline");
	});

	it("provides square and seal skins without baking the accessible name into the image", () => {
		const square = render(Button, {
			variant: "woven-icon",
			size: "compact",
			"aria-label": "Open settings",
		});
		expect(
			square.getByRole("button", { name: "Open settings" }).getAttribute("data-woven-frame"),
		).toBe("square");

		const seal = render(Button, {
			variant: "woven-icon",
			size: "seal",
			"aria-label": "Search worlds",
		});
		expect(
			seal.getByRole("button", { name: "Search worlds" }).getAttribute("data-woven-frame"),
		).toBe("seal");
	});

	it("forwards target and rel attributes when rendered as a link", () => {
		render(Button, {
			props: { href: "https://spellkave.com", target: "_blank", rel: "noopener noreferrer" },
		});
		const link = screen.getByRole("link");
		expect(link.getAttribute("target")).toBe("_blank");
		expect(link.getAttribute("rel")).toBe("noopener noreferrer");
	});
});
