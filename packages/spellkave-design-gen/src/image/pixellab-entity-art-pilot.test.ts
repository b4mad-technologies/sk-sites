// A content author running the entity-art pilot relies on its subject list and
// prompt templates being the ones the style pack promises. The free pilot plan
// is a scenario in behaviour/image.feature.
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import {
	ENTITY_ART_PILOT,
	fillTemplate,
	loadPromptTemplates,
	renderPilotPrompt,
} from "./pixellab-entity-art-pilot.ts";

// Monorepo-root data the tests read (style packs, sample manifests, the
// PixelLab reference). Copied into test/repo-root; see PROVENANCE.md.
const REPO_FIXTURE = resolve(import.meta.dirname, "../../test/repo-root");

describe("entity-art-v1 pilot", () => {
	// keep(K4): snapshot of the pilot subject table
	it("covers 24 subjects across the required kinds", () => {
		expect(ENTITY_ART_PILOT).toHaveLength(24);
		const kinds = ENTITY_ART_PILOT.map((subject) => subject.kind);
		expect(kinds.filter((kind) => kind === "creature")).toHaveLength(7);
		expect(kinds.filter((kind) => kind === "item")).toHaveLength(6);
		expect(kinds.filter((kind) => kind === "spell")).toHaveLength(4);
		expect(kinds.filter((kind) => kind === "feat")).toHaveLength(2);
		expect(kinds.filter((kind) => kind === "class_emblem")).toHaveLength(2);
		expect(kinds.filter((kind) => kind === "person")).toHaveLength(3);
		expect(
			ENTITY_ART_PILOT.some((subject) => subject.id === "adult-red-dragon" && subject.size === 96),
		).toBe(true);
		expect(ENTITY_ART_PILOT.some((subject) => subject.id === "longsword-plus-1")).toBe(true);
		expect(
			ENTITY_ART_PILOT.some((subject) => subject.id === "cellar-rat" && subject.size === 64),
		).toBe(true);
	});

	// keep(K1): template filler cases
	it("fills mustache slots from the pack templates", async () => {
		expect(fillTemplate("{{name}}: {{descriptors}}", { name: "Wolf", descriptors: "beast" })).toBe(
			"Wolf: beast",
		);
		const templates = await loadPromptTemplates(REPO_FIXTURE);
		const wolf = ENTITY_ART_PILOT.find((subject) => subject.id === "wolf");
		if (!wolf) throw new Error("wolf missing");
		const prompt = renderPilotPrompt(templates, wolf);
		expect(prompt).toContain("Wolf");
		expect(prompt).toContain("Medium beast");
		expect(prompt).toContain("Theme-neutral");
		expect(prompt).not.toContain("{{boilerplate}}");
	});
});
