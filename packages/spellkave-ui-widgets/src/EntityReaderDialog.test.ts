import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import EntityReaderDialog from "./EntityReaderDialog.svelte";

afterEach(async () => {
	// bits-ui Dialog restores body overflow on a 24ms timeout; let it run
	// while jsdom is still alive (same pattern as ../ui/dialog/Dialog.test.ts).
	await new Promise((resolve) => setTimeout(resolve, 50));
});

describe("EntityReaderDialog", () => {
	it("names the trigger for the entity and adds ', details' to its accessible name", () => {
		render(EntityReaderDialog, { name: "Goblin Warrior 1", selectedId: "e:1" });
		const trigger = screen.getByRole("button", { name: "Goblin Warrior 1, details" });
		expect(trigger.textContent?.trim()).toBe("Goblin Warrior 1");
	});

	it("opens a dialog labelled by the entity's name, shows loading before detail arrives, and returns focus on close", async () => {
		render(EntityReaderDialog, { name: "Goblin Warrior 1", selectedId: "e:1", detail: null });
		const trigger = screen.getByRole("button", { name: "Goblin Warrior 1, details" });
		trigger.focus();
		await fireEvent.click(trigger);
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByRole("status").textContent).toContain("Loading actions…");
		await fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
	});

	it("shows the description, facts and verbs once detail resolves for this selectedId, and fires onAct", async () => {
		const onAct = vi.fn();
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: {
				id: "e:1",
				description: "A wiry raider.",
				facts: [{ id: "faction", label: "Faction", value: "Raiders" }],
				verbs: [{ id: "act:attack", label: "Attack", verb: "manipulate" }],
			},
			onAct,
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByText("A wiry raider.")).toBeTruthy();
		expect(screen.getByText("Raiders")).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Attack" }));
		expect(onAct).toHaveBeenCalledWith("act:attack");
	});

	it("shows a failed read as an alert, never as an empty success", async () => {
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: { id: "e:1", facts: [], verbs: [], failed: true },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByRole("alert").textContent).toContain("Could not load actions.");
	});

	it("fires onOpenChange on open so a host can (re)request this entity's detail", async () => {
		const onOpenChange = vi.fn();
		render(EntityReaderDialog, { name: "Goblin Warrior 1", selectedId: "e:1", onOpenChange });
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(onOpenChange).toHaveBeenCalledWith(true);
	});

	it("renders the host's own reference section below the world detail when supplied", async () => {
		const reference = createRawSnippet(() => ({
			render: () => '<p data-testid="reference-block">Goblin Warrior — a common SRD raider.</p>',
		}));
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: { id: "e:1", facts: [], verbs: [] },
			reference,
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByTestId("reference-block")).toBeTruthy();
	});

	it("omits the reference section entirely when the host supplies none", async () => {
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: { id: "e:1", facts: [], verbs: [] },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.queryByTestId("reference-block")).toBeNull();
	});

	// sk-jay0.1.8.63.9: a scene offering ~20 checks alongside a meaningful verb
	// (Attack) buries the latter unless the host's own classification collapses
	// the checks behind one disclosure.
	it("collapses host-classified secondary verbs behind one closed disclosure, keeping primary verbs flat", async () => {
		const checkVerbs = ["acrobatics", "arcana"].map((slug) => ({
			id: `act:check-${slug}`,
			label: slug,
			verb: "manipulate",
			description: `Attempt a ${slug} check.`,
		}));
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: {
				id: "e:1",
				facts: [],
				verbs: [{ id: "act:attack", label: "Attack", verb: "manipulate" }, ...checkVerbs],
			},
			isSecondaryVerb: (verb) => verb.id.startsWith("act:check-"),
			secondaryVerbsLabel: "Checks",
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByRole("button", { name: "Attack" })).toBeTruthy();
		const summary = screen.getByText("Checks (2)");
		const disclosure = summary.closest("details");
		expect(disclosure?.open).toBe(false);
		await fireEvent.click(summary);
		expect(disclosure?.open).toBe(true);
		expect(screen.getByRole("button", { name: "acrobatics" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "arcana" })).toBeTruthy();
		// Each verb's own description disclosure keeps working inside the group.
		const aboutAcrobatics = screen.getByText("About acrobatics");
		await fireEvent.click(aboutAcrobatics);
		expect(screen.getByText("Attempt a acrobatics check.")).toBeTruthy();
	});

	it("renders every verb primary and shows no disclosure when the host supplies no classifier", async () => {
		render(EntityReaderDialog, {
			name: "Goblin Warrior 1",
			selectedId: "e:1",
			detail: {
				id: "e:1",
				facts: [],
				verbs: [{ id: "act:attack", label: "Attack", verb: "manipulate" }],
			},
		});
		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1, details" }));
		await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(screen.getByRole("button", { name: "Attack" })).toBeTruthy();
		expect(document.querySelector("[data-slot=play-secondary-actions]")).toBeNull();
	});
});
