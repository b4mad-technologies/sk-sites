import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Combat from "./Combat.svelte";

describe("Combat", () => {
	const combat = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn. Step or attack, then end the turn.",
		roster: [
			{ name: "Renn the Roadwarden", ordinal: 0, isMe: true, isCurrent: true },
			{ name: "Cellar Rat Swarm", ordinal: 1, isMe: false, isCurrent: false },
		],
	};

	it("renders the enemy heading and a disabled end turn outside a session", () => {
		render(Combat, {
			combat: {
				mode: "click",
				enemy: "Cellar Rat 1",
				status: "No session. One melee hit can end this.",
			},
		});
		expect(document.querySelector('[data-slot="play-combat"]')).not.toBeNull();
		expect(screen.getByRole("heading", { name: "Cellar Rat 1" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "End turn" }).hasAttribute("disabled")).toBe(true);
	});

	it("renders strip density as a glyph, enemy label, and current-actor datum, swallowing the tracker", () => {
		render(Combat, { combat, density: "strip" });
		expect(document.querySelector('[data-slot="play-combat"]')?.getAttribute("data-density")).toBe(
			"strip",
		);
		expect(screen.getByRole("heading", { name: "Cellar Rat Swarm" })).toBeTruthy();
		expect(screen.getByText("You")).toBeTruthy();
		expect(screen.queryByRole("list", { name: "Turn order" })).toBeNull();
	});

	it('shows the ordinal, the real name (never swapped for "You"), a separate you marker, and the current-turn marker in the tracker chip', () => {
		render(Combat, { combat, density: "card" });
		const order = screen.getByRole("list", { name: "Turn order" });
		const me = within(order).getByText("Renn the Roadwarden").closest("li");
		expect(me).not.toBeNull();
		expect(within(me as HTMLElement).getByText("1")).toBeTruthy();
		expect(within(me as HTMLElement).getByText("You")).toBeTruthy();
		expect(me?.getAttribute("aria-current")).toBe("step");
		const enemy = within(order).getByText("Cellar Rat Swarm").closest("li");
		expect(enemy?.getAttribute("aria-current")).toBeNull();
	});

	it("renders card and stage density with the roster and an enabled end turn on your turn", () => {
		const card = render(Combat, { combat, density: "card" });
		expect(card.getByRole("button", { name: "End turn" }).hasAttribute("disabled")).toBe(false);
		card.unmount();

		const stage = render(Combat, { combat, density: "stage" });
		expect(stage.getByRole("button", { name: "End turn" }).hasAttribute("disabled")).toBe(false);
	});

	it("disables end turn while waiting on someone else's turn", () => {
		render(Combat, {
			combat: { ...combat, mode: "waiting" },
			density: "card",
		});
		expect(screen.getByRole("button", { name: "End turn" }).hasAttribute("disabled")).toBe(true);
	});

	it("renders bare chrome with no border or enemy-name title, the roster still first", () => {
		render(Combat, { combat, density: "stage", chrome: "bare" });
		const el = document.querySelector('[data-slot="play-combat"]');
		expect(el?.tagName).toBe("DIV");
		expect(el?.hasAttribute("data-play-frame")).toBe(false);
		expect(screen.queryByRole("heading", { name: "Cellar Rat Swarm" })).toBeNull();
		expect(screen.getByRole("list", { name: "Turn order" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "End turn" })).toBeTruthy();
	});
});

describe("Combat target-first turn bar (S3, sk-jay0.1.8.39/40)", () => {
	const combatWithTarget = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn. Strike, step, or end it.",
		roster: [
			{ name: "Renn the Roadwarden", ordinal: 0, isMe: true, isCurrent: true },
			{
				name: "Cellar Rat Swarm",
				ordinal: 1,
				isMe: false,
				isCurrent: false,
				targetRef: "entity:123",
			},
		],
	};
	const targets = [
		{
			targetRef: "entity:123",
			label: "Cellar Rat Swarm",
			actions: [{ id: "h:melee", label: "Melee Attack — Cellar Rat Swarm", verb: "melee" }],
		},
		{
			targetRef: "",
			label: "No target",
			actions: [{ id: "h:dodge", label: "Dodge", verb: "manipulate" }],
		},
	];

	it("draws one chip per target group; a roster member that is also a target is the same chip, never drawn twice", () => {
		render(Combat, { combat: combatWithTarget, targets, density: "card" });
		const order = screen.getByRole("list", { name: "Turn order" });
		// Exactly one element in the tracker carries the rat's name — the
		// tracker chip, now also the target chip — never a second one below it.
		expect(within(order).getAllByText("Cellar Rat Swarm")).toHaveLength(1);
		const chip = within(order).getByRole("button", { name: /Cellar Rat Swarm/ });
		expect(chip.closest("li")).not.toBeNull();
		// The untargeted group gets its own standalone chip, outside the tracker.
		expect(screen.getByRole("button", { name: "No target" })).toBeTruthy();
	});

	it("shows the first group's verb row by default, and switches it on chip selection", async () => {
		const { rerender } = render(Combat, { combat: combatWithTarget, targets, density: "card" });
		expect(screen.getByRole("button", { name: "Melee Attack — Cellar Rat Swarm" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Dodge" })).toBeNull();

		await rerender({ combat: combatWithTarget, targets, density: "card", selectedTargetRef: "" });
		expect(screen.getByRole("button", { name: "Dodge" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Melee Attack — Cellar Rat Swarm" })).toBeNull();
	});

	it("falls back to the first group when the selected target ref no longer matches any group", () => {
		render(Combat, {
			combat: combatWithTarget,
			targets,
			density: "card",
			selectedTargetRef: "entity:999",
		});
		expect(screen.getByRole("button", { name: "Melee Attack — Cellar Rat Swarm" })).toBeTruthy();
	});

	it("clicking the merged tracker/target chip reports its targetRef through onSelectTarget", async () => {
		const onSelectTarget = vi.fn();
		render(Combat, { combat: combatWithTarget, targets, density: "card", onSelectTarget });
		const order = screen.getByRole("list", { name: "Turn order" });
		await fireEvent.click(within(order).getByRole("button", { name: /Cellar Rat Swarm/ }));
		expect(onSelectTarget).toHaveBeenCalledWith("entity:123");
	});

	it("clicking a verb button in the selected target's row reports its action id through onAct", async () => {
		const onAct = vi.fn();
		render(Combat, { combat: combatWithTarget, targets, density: "card", onAct });
		await fireEvent.click(screen.getByRole("button", { name: "Melee Attack — Cellar Rat Swarm" }));
		expect(onAct).toHaveBeenCalledWith("h:melee");
	});

	it("renders no chips or verb row when targets is absent or empty (older/non-fight caller)", () => {
		render(Combat, { combat: combatWithTarget, density: "card" });
		expect(screen.queryByRole("button", { name: "No target" })).toBeNull();
		expect(screen.queryByRole("list", { name: "Other targets" })).toBeNull();
		// The roster entry still carries `targetRef`, but with no `targets`
		// group to match it stays a plain, unselectable chip.
		const order = screen.getByRole("list", { name: "Turn order" });
		expect(within(order).queryByRole("button", { name: /Cellar Rat Swarm/ })).toBeNull();
	});
});

describe("Combat selectionMode (sk-jay0.1.8.63.13: the Table acts, the turn bar only selects)", () => {
	const deadRatCombat = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn.",
		roster: [
			{
				name: "Renn the Roadwarden",
				ordinal: 0,
				isMe: true,
				isCurrent: true,
				targetRef: "entity:7",
			},
			// No live target group for this one below — dead, nothing offered
			// against it — yet selectionMode must still let it be picked.
			{
				name: "Cellar Rat Swarm",
				ordinal: 1,
				isMe: false,
				isCurrent: false,
				targetRef: "entity:123",
				dead: true,
			},
		],
	};
	const targets = [
		{
			targetRef: "entity:7",
			label: "Renn the Roadwarden",
			actions: [{ id: "h:dodge", label: "Dodge", verb: "manipulate" }],
		},
	];

	it("every roster chip with a targetRef is selectable, even one `targets` offers no live group for", async () => {
		const onSelectTarget = vi.fn();
		render(Combat, {
			combat: deadRatCombat,
			targets,
			density: "card",
			selectionMode: true,
			onSelectTarget,
		});
		const order = screen.getByRole("list", { name: "Turn order" });
		const chip = within(order).getByRole("button", { name: /Cellar Rat Swarm/ });
		await fireEvent.click(chip);
		expect(onSelectTarget).toHaveBeenCalledWith("entity:123");
	});

	it("hides the verb row, the standalone chips and End turn; only the tracker remains", () => {
		render(Combat, {
			combat: deadRatCombat,
			targets,
			selectedTargetRef: "entity:7",
			density: "card",
			selectionMode: true,
		});
		expect(screen.queryByRole("button", { name: "Dodge" })).toBeNull();
		// Ending the turn is an act; the host's own action surface carries it.
		expect(screen.queryByRole("button", { name: "End turn" })).toBeNull();
		expect(screen.getByRole("list", { name: "Turn order" })).toBeTruthy();
	});

	it("highlights nothing when nothing is selected, never falling back to the first target group", () => {
		render(Combat, { combat: deadRatCombat, targets, density: "card", selectionMode: true });
		const order = screen.getByRole("list", { name: "Turn order" });
		const chip = within(order).getByRole("button", { name: /Renn the Roadwarden/ });
		expect(chip.getAttribute("aria-pressed")).toBe("false");
	});
});

describe("Combat tracker states (S5, sk-jay0.1.8.41)", () => {
	const rennEntry = { name: "Renn the Roadwarden", ordinal: 0, isMe: true, isCurrent: true };
	const deadCombat = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn.",
		roster: [
			rennEntry,
			{ name: "Cellar Rat 1", ordinal: 1, isMe: false, isCurrent: false, dead: true },
		],
	};

	it("renders a dead roster member's name struck through, with a visually hidden 'Dead' word for assistive tech", () => {
		render(Combat, { combat: deadCombat, density: "card" });
		const order = screen.getByRole("list", { name: "Turn order" });
		const entry = within(order).getByText("Cellar Rat 1").closest("li");
		expect(entry).not.toBeNull();
		expect(within(entry as HTMLElement).getByText("Cellar Rat 1").classList).toContain(
			"sk-play-roster-dead",
		);
		expect(within(entry as HTMLElement).getByText("Dead")).toBeTruthy();
		// The live member gets neither the struck-through class nor the hidden word.
		const rennEntry = within(order).getByText("Renn the Roadwarden").closest("li");
		expect(
			within(rennEntry as HTMLElement).getByText("Renn the Roadwarden").classList,
		).not.toContain("sk-play-roster-dead");
		expect(within(rennEntry as HTMLElement).queryByText("Dead")).toBeNull();
	});

	it("renders every other disclosed condition as its own glyph+label token, capped with a '+n' remainder", () => {
		const combat = {
			...deadCombat,
			roster: [
				rennEntry,
				{
					name: "Cellar Rat 2",
					ordinal: 1,
					isMe: false,
					isCurrent: false,
					conditions: [
						{ id: "srd/condition/prone", label: "Prone" },
						{ id: "srd/condition/poisoned", label: "Poisoned" },
						{ id: "srd/condition/frightened", label: "Frightened" },
					],
				},
			],
		};
		const card = render(Combat, { combat, density: "card" });
		const order = card.getByRole("list", { name: "Turn order" });
		const entry = within(order).getByText("Cellar Rat 2").closest("li") as HTMLElement;
		// Card density caps at one visible token, the rest fold into "+n".
		expect(within(entry).getByText("Prone")).toBeTruthy();
		expect(within(entry).queryByText("Poisoned")).toBeNull();
		expect(within(entry).getByText("+2")).toBeTruthy();
		card.unmount();

		const stage = render(Combat, { combat, density: "stage" });
		const stageOrder = stage.getByRole("list", { name: "Turn order" });
		const stageEntry = within(stageOrder).getByText("Cellar Rat 2").closest("li") as HTMLElement;
		// Stage has more room per chip: two visible, one folded into "+1".
		expect(within(stageEntry).getByText("Prone")).toBeTruthy();
		expect(within(stageEntry).getByText("Poisoned")).toBeTruthy();
		expect(within(stageEntry).queryByText("Frightened")).toBeNull();
		expect(within(stageEntry).getByText("+1")).toBeTruthy();
	});
});

describe("Combat card-density strips scroll instead of wrap (phone-width budget, sk-jay0.1.8.37 follow-up)", () => {
	const sixRosterEntries = Array.from({ length: 6 }, (_, i) => ({
		name: `Cellar Rat ${i + 1}`,
		ordinal: i,
		isMe: i === 0,
		isCurrent: i === 0,
	}));
	const sixMemberCombat = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn.",
		roster: sixRosterEntries,
	};
	const combatWithTarget = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn. Strike, step, or end it.",
		roster: [
			{ name: "Renn the Roadwarden", ordinal: 0, isMe: true, isCurrent: true },
			{
				name: "Cellar Rat Swarm",
				ordinal: 1,
				isMe: false,
				isCurrent: false,
				targetRef: "entity:123",
			},
		],
	};
	const targets = [
		{
			targetRef: "entity:123",
			label: "Cellar Rat Swarm",
			actions: [
				{ id: "h:melee", label: "Melee Attack", verb: "melee" },
				{ id: "h:unarmed", label: "Unarmed strike", verb: "manipulate" },
			],
		},
	];

	it("gives the tracker strip the no-wrap/scroll class at card density, not at stage", () => {
		const card = render(Combat, { combat: sixMemberCombat, density: "card" });
		const cardOrder = card.getByRole("list", { name: "Turn order" });
		expect(cardOrder.classList).toContain("sk-play-turnbar-strip");
		expect(cardOrder.classList).not.toContain("flex-wrap");
		card.unmount();

		const stage = render(Combat, { combat: sixMemberCombat, density: "stage" });
		const stageOrder = stage.getByRole("list", { name: "Turn order" });
		expect(stageOrder.classList).not.toContain("sk-play-turnbar-strip");
		expect(stageOrder.classList).toContain("flex-wrap");
	});

	it("gives the verb row the same no-wrap/scroll class at card density, not at stage", () => {
		const card = render(Combat, { combat: combatWithTarget, targets, density: "card" });
		const verbRow = card.getByRole("list", { name: "Cellar Rat Swarm actions" });
		expect(verbRow.classList).toContain("sk-play-turnbar-strip");
		expect(verbRow.classList).not.toContain("flex-wrap");
		card.unmount();

		const stage = render(Combat, { combat: combatWithTarget, targets, density: "stage" });
		const stageVerbRow = stage.getByRole("list", { name: "Cellar Rat Swarm actions" });
		expect(stageVerbRow.classList).not.toContain("sk-play-turnbar-strip");
		expect(stageVerbRow.classList).toContain("flex-wrap");
	});

	it("renders all six roster chips in the one tracker strip at card density (jsdom cannot measure, only structure)", () => {
		render(Combat, { combat: sixMemberCombat, density: "card" });
		const order = screen.getByRole("list", { name: "Turn order" });
		for (const entry of sixRosterEntries) {
			expect(within(order).getByText(entry.name)).toBeTruthy();
		}
		expect(within(order).getAllByRole("listitem")).toHaveLength(6);
	});
});

describe("Combat mounts the action-economy pip strip (S4, sk-jay0.1.8.40 mount step)", () => {
	const combat = {
		mode: "your-turn" as const,
		enemy: "Cellar Rat Swarm",
		status: "Your turn.",
		roster: [{ name: "Renn the Roadwarden", ordinal: 0, isMe: true, isCurrent: true }],
	};
	const economy = [
		{ channelId: "srd/economy_channel/primary", spentMs: 1000, windowStartMs: 0 },
		{ channelId: "srd/economy_channel/bonus", spentMs: 0, windowStartMs: 0 },
	];

	it("draws one pip per channel, labeled from the approved map, inside the turn bar", () => {
		render(Combat, { combat, density: "card", economy });
		const list = screen.getByRole("list", { name: "Action economy" });
		const pips = within(list).getAllByRole("listitem");
		expect(pips).toHaveLength(2);
		expect(pips[0]?.getAttribute("aria-label")).toBe("Action, spent");
		expect(pips[1]?.getAttribute("aria-label")).toBe("Bonus, unspent");
	});

	it("renders nothing for the strip when economy is null", () => {
		render(Combat, { combat, density: "card", economy: null });
		expect(screen.queryByRole("list", { name: "Action economy" })).toBeNull();
		expect(screen.queryByText("No action economy reported yet.")).toBeNull();
	});

	it("renders nothing for the strip when economy is an empty array, never the standalone widget's own empty-state line", () => {
		render(Combat, { combat, density: "card", economy: [] });
		expect(screen.queryByRole("list", { name: "Action economy" })).toBeNull();
		expect(screen.queryByText("No action economy reported yet.")).toBeNull();
	});

	it("renders nothing for the strip when economy is absent (an older/non-fight caller)", () => {
		render(Combat, { combat, density: "card" });
		expect(screen.queryByRole("list", { name: "Action economy" })).toBeNull();
	});

	it("gives the economy strip the no-wrap/scroll class at card density, not at stage", () => {
		const card = render(Combat, { combat, density: "card", economy });
		const cardList = card.getByRole("list", { name: "Action economy" });
		expect(cardList.classList).toContain("sk-play-turnbar-strip");
		expect(cardList.classList).not.toContain("flex-wrap");
		card.unmount();

		const stage = render(Combat, { combat, density: "stage", economy });
		const stageList = stage.getByRole("list", { name: "Action economy" });
		expect(stageList.classList).not.toContain("sk-play-turnbar-strip");
		expect(stageList.classList).toContain("flex-wrap");
	});
});
