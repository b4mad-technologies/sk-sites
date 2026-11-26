import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Actions from "./Actions.svelte";

describe("Actions", () => {
	const actions = [
		{ id: "speak-mira", label: "Speak To Mira", verb: "speak" },
		{ id: "melee-rat-1", label: "Melee Attack — Cellar Rat 1", verb: "melee" },
	];

	it("renders offered action labels", () => {
		render(Actions, { actions });
		expect(document.querySelector('[data-slot="play-actions"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "What you can do" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Speak To Mira" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Melee Attack — Cellar Rat 1" })).toBeTruthy();
	});

	it("renders strip density as a glyph, label, and action-count datum", () => {
		render(Actions, { actions, density: "strip" });
		expect(document.querySelector('[data-slot="play-actions"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "What you can do" })).toBeTruthy();
		expect(screen.getByText("2 actions")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Speak To Mira" })).toBeNull();
	});

	it("renders card and stage density with every offered action", () => {
		const card = render(Actions, { actions, density: "card" });
		expect(card.getByRole("button", { name: "Speak To Mira" })).toBeTruthy();
		card.unmount();

		const stage = render(Actions, { actions, density: "stage" });
		expect(stage.getByRole("button", { name: "Speak To Mira" })).toBeTruthy();
	});

	it("renders bare chrome with no border or card ground, but keeps its own label/count section row (coordinator review: a framed box inside the table tile)", () => {
		render(Actions, { actions, density: "card", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-actions"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.getByRole("heading", { name: "What you can do" })).toBeTruthy();
		expect(screen.getByText("2 offered")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Speak To Mira" })).toBeTruthy();
	});

	it("accepts reader-facing metadata when an app intentionally curates a suggestion", () => {
		render(Actions, { actions, chrome: "bare", title: "Suggested next", meta: "2 suggested" });
		expect(screen.getByRole("heading", { name: "Suggested next" })).toBeTruthy();
		expect(screen.getByText("2 suggested")).toBeTruthy();
		expect(screen.queryByText("2 offered")).toBeNull();
	});

	it("can omit its visual heading inside an obvious fixed action dock", () => {
		render(Actions, { actions: [actions[0]!], chrome: "bare", showHeader: false });
		expect(screen.queryByRole("heading", { name: "What you can do" })).toBeNull();
		expect(screen.getByRole("button", { name: "Speak To Mira" })).toBeTruthy();
	});

	it("renders card density with every offered action at the sm 28px box, not the 44px default", () => {
		const withWords = [
			...actions,
			{ id: "say-thanks", label: "Thank Mira", verb: "speak", takesWords: true },
		];
		render(Actions, { actions: withWords, density: "card" });
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThan(0);
		for (const button of buttons) {
			const classes = button.className.split(/\s+/);
			expect(classes).toContain("min-h-7");
			expect(classes).not.toContain("min-h-11");
		}
	});

	it("sizes a long featured label to shrink and fill its tile instead of overflowing on a phone (sk-jay0.1.8.11 item 3 / sk-jay0.1.8.14 task c)", () => {
		const longLabel = [
			{ id: "melee-swarm", label: "Unarmed strike: damage — Cellar Rat Swarm", verb: "melee" },
		];
		render(Actions, { actions: longLabel });
		const button = screen.getByRole("button", {
			name: "Unarmed strike: damage — Cellar Rat Swarm",
		});
		const classes = button.className.split(/\s+/);
		// Button's own base is `shrink-0`; a featured button must override it
		// so the flex item can narrow instead of forcing the tile wide. The
		// wrap itself (`white-space`, `text-align`, `height`) is no longer a
		// local override — `PlayFrame.svelte`'s own `:global([data-slot^=
		// "play-"] …)` rule carries it for every consumer, not only
		// apps/play's mosaic (sk-jay0.1.8.16 task 3), so it is out of this
		// jsdom test's reach; `check:no-scroll` is the real-browser proof.
		// `min-w-[12rem]`, not `min-w-0`: a bare `min-w-0` let the button
		// collapse to its icon's own width the moment two long labels shared
		// one wide row (apps/ui-lab's gallery, one word per line, 314px
		// tall) — the floor keeps a legible multi-word wrap instead.
		expect(classes).toContain("shrink");
		expect(classes).not.toContain("shrink-0");
		expect(classes).toContain("min-w-[12rem]");
		expect(classes).toContain("max-w-full");
	});
});
