import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import WovenCorner from "./WovenCorner.svelte";
import WovenDivider from "./WovenDivider.svelte";
import WovenIcon from "./WovenIcon.svelte";

describe("WovenIcon", () => {
	it("keeps decorative icons silent and exposes a label only when requested", () => {
		const decorative = render(WovenIcon, { name: "maps" });
		const decorativeImage = decorative.container.querySelector('[data-slot="woven-icon"]');
		expect(decorativeImage?.getAttribute("alt")).toBe("");
		expect(decorativeImage?.getAttribute("aria-hidden")).toBe("true");

		const labelled = render(WovenIcon, { name: "invite", label: "Invite player" });
		const labelledImage = labelled.container.querySelector('[data-slot="woven-icon"]');
		expect(labelledImage?.getAttribute("alt")).toBe("Invite player");
		expect(labelledImage?.getAttribute("aria-hidden")).toBeNull();
	});
});

describe("woven ornaments", () => {
	it("renders divider and corner ornaments as decorative geometry", () => {
		const divider = render(WovenDivider, { variant: "knot" });
		const corner = render(WovenCorner, { variant: "bloom", position: "bottom-right" });

		expect(divider.container.querySelector('[data-slot="woven-divider"]')).toBeTruthy();
		expect(corner.container.querySelector('[data-slot="woven-corner"]')).toBeTruthy();
		expect(corner.container.querySelector("svg")?.getAttribute("class")).toContain("bottom-0");
		expect(divider.container.querySelector("img")).toBeNull();
	});
});
