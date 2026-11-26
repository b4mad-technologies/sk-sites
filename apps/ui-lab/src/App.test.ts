// UI-lab readers can find documented components and exercise their real previews.
// Renders the app in the test DOM; no live node is required.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";
import { NAV_GROUPS } from "./docs/pages";
import { syncRoute } from "./docs/router.svelte";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(
	HTMLElement.prototype,
	"scrollIntoView",
);

async function go(hash: string) {
	window.location.hash = hash;
	syncRoute();
	await waitFor(() => {
		expect(document.getElementById("main-content")).toBeTruthy();
	});
}

describe("ui-lab App", () => {
	afterEach(() => {
		if (originalScrollIntoView)
			Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
		else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
		window.location.hash = "";
		syncRoute();
	});

	it("renders the header, theme switcher, and grouped sidebar", async () => {
		render(App);
		await go("#/");
		expect(screen.getByRole("banner", { name: "Site" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Spellkave UI" })).toBeTruthy();
		expect(screen.getByLabelText("Theme")).toBeTruthy();
		const sidebar = screen.getByRole("navigation", { name: "Documentation" });
		expect(sidebar).toBeTruthy();
		// Compute accessible names once for the complete link set, rather than
		// rescanning every link for each expected navigation item.
		const linkNames = new Map<Element | null, string>();
		const links = screen.getAllByRole("link", {
			name: (name, element) => {
				linkNames.set(element, name);
				return true;
			},
		});
		// The query filters inaccessible links after calling the name matcher.
		const visibleLinkNames = new Set(links.map((link) => linkNames.get(link)));
		for (const group of NAV_GROUPS) {
			expect(screen.getAllByText(group.title).length).toBeGreaterThan(0);
			for (const item of group.items) {
				expect(visibleLinkNames).toContain(item.title);
			}
		}
	});

	it("navigates to the Button page with a preview and a code panel", async () => {
		render(App);
		await go("#/components/button");
		expect(screen.getByRole("heading", { name: "Button", level: 1 })).toBeTruthy();
		expect(document.querySelector('[data-slot="component-preview"]')).not.toBeNull();
		expect(screen.getByRole("button", { name: "Primary action" })).toBeTruthy();
		expect(document.querySelector('[data-slot="code-panel"]')).not.toBeNull();
		expect(screen.getByText(/from "@spellkave\/ui"/)).toBeTruthy();
	});

	it("gives LinkMenu its own navigable component page and selection contract", async () => {
		render(App);
		await go("#/components/link-menu");
		expect(screen.getByRole("heading", { name: "LinkMenu", level: 1 })).toBeTruthy();
		expect(screen.getByText(/The caller resolves targets and chooses navigation/)).toBeTruthy();
		await screen.getByRole("button", { name: "'srd/str'" }).click();
		expect(screen.getByRole("menuitem", { name: "Strength Resources" })).toBeTruthy();
		await screen.getByRole("menuitem", { name: "Strength Resources" }).click();
		expect(screen.getByTestId("link-menu-demo-result").textContent).toContain(
			"/docs/srd/playing-the-game/str",
		);
	});

	it("gives DockBar its own navigable component page and a working menu", async () => {
		render(App);
		await go("#/components/dock-bar");
		expect(screen.getByRole("heading", { name: "DockBar", level: 1 })).toBeTruthy();
		expect(screen.getByText(/info text, menu titles and key-like actions/)).toBeTruthy();

		const trigger = screen.getByRole("button", { name: "Ways out" });
		await fireEvent.keyDown(trigger, { key: "Enter" });
		const menu = await screen.findByRole("menu");
		const villageSquare = within(menu).getByText("Village Square").closest('[role="menuitem"]');
		await fireEvent.click(villageSquare!);
		expect(screen.getByTestId("dock-bar-demo-result").textContent).toContain("exit:square");
	});

	it("gives InfoCard its own navigable page and pins a chained card on click", async () => {
		render(App);
		await go("#/components/info-card");
		expect(screen.getByRole("heading", { name: "InfoCard", level: 1 })).toBeTruthy();
		expect(screen.getByText(/hover to preview, click or dwell to pin/)).toBeTruthy();

		await fireEvent.click(screen.getByRole("button", { name: "Goblin Warrior 1" }));
		const card = await screen.findByRole("dialog", { name: "Goblin Warrior 1" });
		expect(within(card).getByText("Faction")).toBeTruthy();

		await fireEvent.click(within(card).getByRole("button", { name: "Goblin Warrior" }));
		const nested = await screen.findByRole("dialog", { name: "Goblin Warrior" });
		expect(within(nested).getByText("CR")).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Goblin Warrior 1" })).toBeTruthy();
	});

	it("InfoCard demo: a click opens a card even though InfoCardProvider's `open` is wired one-way through onOpenChange", async () => {
		// Regression test: InfoCardDemo passes `open={infoCardOpen}` (never
		// `bind:open`) and closes on its own via `onOpenChange` — the exact
		// shape that exposed a feedback loop between InfoCardProvider's two
		// `open`-syncing effects, where whichever ran first in a flush could
		// clobber the other's write before it took effect.
		render(App);
		await go("#/components/info-card");

		const link = screen.getByRole("button", { name: "Goblin Warrior 1" });
		expect(link.getAttribute("aria-expanded")).toBe("false");
		await fireEvent.click(link);
		expect(await screen.findByRole("dialog", { name: "Goblin Warrior 1" })).toBeTruthy();
		expect(link.getAttribute("aria-expanded")).toBe("true");
	});

	it("InfoCard demo: the ⋯ action icon opens a real menu, not an info card, and reports the chosen action", async () => {
		render(App);
		await go("#/components/info-card");

		await fireEvent.click(screen.getByRole("button", { name: "Actions for Goblin Warrior 1" }));
		const menu = await screen.findByRole("menu");
		expect(screen.queryByRole("dialog")).toBeNull();

		await fireEvent.click(within(menu).getByRole("menuitem", { name: "Attack" }));
		expect(screen.getByTestId("info-card-demo-action-log").textContent).toContain(
			"attack → Goblin Warrior 1",
		);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("navigates to the Scene play widget", async () => {
		render(App);
		await go("#/play/scene");
		expect(screen.getByRole("heading", { name: "Scene", level: 1 })).toBeTruthy();
		expect(document.querySelector('[data-slot="play-scene"]')).not.toBeNull();
		expect(screen.getAllByRole("heading", { name: "Loft" }).length).toBeGreaterThan(0);
	});

	// sk-jay0.1.8.102 follow-up: the long-description Place card demo scrolls
	// only its description; the place name and the way-out rows stay outside
	// the scroll region.
	it("demos the long Place card description as the card's one scroll region", async () => {
		render(App);
		await go("#/play/scene");
		const descriptions = screen.getAllByText(/^A grey hush hangs/);
		expect(descriptions).toHaveLength(2);
		for (const description of descriptions) {
			expect(description.classList.contains("sk-stream-scroll")).toBe(true);
			const card = description.closest('[data-slot="play-place"]') as HTMLElement;
			expect(
				within(card).getByRole("heading", { name: "Creation Limbo" }).closest(".sk-stream-scroll"),
			).toBeNull();
			expect(
				within(card).getByRole("list", { name: "Ways out" }).closest(".sk-stream-scroll"),
			).toBeNull();
		}
	});

	// sk-jay0.1.8.99 s3: the Place card demo names its ways out and a click
	// reports the exit; seven exits show four names and "+3 more".
	it("demos Place card ways out with a shared direction and a cut seven-exit list", async () => {
		render(App);
		await go("#/play/scene");
		const lists = screen.getAllByRole("list", { name: "Ways out" });
		const crossing = lists.find((list) => list.textContent?.includes("Bell tower"));
		const square = lists.find((list) => list.textContent?.includes("Smithy"));
		expect(crossing?.textContent).toContain("Chapel (north)");
		expect(crossing?.textContent).toContain("Bell tower (north)");
		expect(within(square as HTMLElement).getAllByRole("button")).toHaveLength(4);
		expect(within(square as HTMLElement).getByText("+3 more")).toBeTruthy();
		await fireEvent.click(
			within(crossing as HTMLElement).getByRole("button", { name: "Bell tower (north)" }),
		);
		expect(screen.getByRole("status", { name: "Card insertion" }).textContent).toBe(
			"Insert way out: crossing-n2",
		);
	});

	it("projects the real Rage fixture fields on the Action kind page", async () => {
		render(App);
		await go("#/docs/action");
		expect(screen.getByTestId("kind-demo-fixture-note").textContent).toMatch(
			/no\s+catalogue-page resolver/,
		);
		expect(screen.getAllByRole("heading", { name: "Enter Rage" }).length).toBeGreaterThan(0);
		expect(screen.getAllByText("srd/barbarian/rage").length).toBeGreaterThan(0);
		expect(screen.getAllByText("srd/class-feature/barbarian/rage").length).toBeGreaterThan(0);
		expect(screen.getAllByText("srd/economy_channel/bonus").length).toBeGreaterThan(0);
	});

	it("documents the real ReferenceCard and resolves a cold section permalink", async () => {
		const scroll = vi.fn();
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			configurable: true,
			value: scroll,
		});
		window.location.hash = "#/components/reference-card?section=component-relationships";
		syncRoute();
		render(App);
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "ReferenceCard", level: 1 })).toBeTruthy(),
		);
		expect(document.querySelectorAll('[data-slot="reference-card"]')).toHaveLength(3);
		expect(document.querySelector('[data-slot="reference-card"] img')).not.toBeNull();
		expect(screen.getByText(/No world entity or catalogue record/)).toBeTruthy();
		await waitFor(() => expect(scroll).toHaveBeenCalled());
		const toc = screen.getByRole("navigation", { name: "On this page" });
		expect(within(toc).getByRole("link", { name: "Relationships" }).getAttribute("href")).toBe(
			"#/components/reference-card?section=component-relationships",
		);
		await go("#/docs/entry-compact?section=component-contract");
		await waitFor(() =>
			expect(screen.getByRole("heading", { name: "Entry compact", level: 1 })).toBeTruthy(),
		);
		expect(screen.getByText(/No art field/)).toBeTruthy();
	});

	it("stacks a multi-root play demo at full preview width without a per-demo wrapper", async () => {
		// ActionsDemo returns two sibling roots (a widget grid, then a label and
		// a second grid) with no wrapper of its own (sk-jay0.7.37): DemoContainer
		// must supply the `flex w-full flex-col` stacking itself, or `.preview`
		// (a row) would split its width across the siblings and squeeze every
		// grid column, the bug sk-jay0.7.33 fixed per demo file.
		render(App);
		await go("#/play/actions");
		expect(screen.getByRole("heading", { name: "Actions", level: 1 })).toBeTruthy();

		const preview = document.querySelector('[data-slot="component-preview"] .preview');
		expect(preview).not.toBeNull();
		expect(preview?.children.length).toBe(1);

		const wrapper = preview?.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("flex-col");
		expect(wrapper.className).toContain("w-full");
		// the demo's own sibling roots (grid, label, grid) render as direct
		// children of the container's wrapper, not of `.preview`.
		expect(wrapper.children.length).toBe(3);
		// scoped to the rendered preview: the source panel below repeats this
		// string verbatim as highlighted code, so an unscoped query is ambiguous.
		expect(within(wrapper).getByText(/density: strip \| card \| stage/)).toBeTruthy();
	});

	it("documents ActivityFeed as a caller-rendered, ordered Play primitive", async () => {
		render(App);
		await go("#/play/activity-feed");
		expect(screen.getByRole("heading", { name: "ActivityFeed", level: 1 })).toBeTruthy();
		expect(screen.getByRole("list", { name: "Recent activity" }).textContent).toContain(
			"You notice fresh mud by the cellar door.",
		);
		expect(screen.getByText(/The host owns activity data/)).toBeTruthy();
	});

	it("shows Combat's target, dispatch, and economy contract as an interactive representative scenario", async () => {
		render(App);
		await go("#/play/combat");
		expect(screen.getByText(/Only channels returned by the world/)).toBeTruthy();
		await screen.getByRole("button", { name: /Cellar Rat 1/ }).click();
		expect(screen.getByTestId("combat-demo-event").textContent).toContain("Selected Cellar Rat 1.");
		await screen.getByRole("button", { name: "Melee Attack — Cellar Rat 1" }).click();
		expect(screen.getByTestId("combat-demo-event").textContent).toContain(
			"Would dispatch melee-rat-1.",
		);
	});

	it("documents Economy, BattleMap, and FieldDetail with their real states", async () => {
		render(App);
		await go("#/play/economy");
		expect(screen.getByRole("heading", { name: "Economy", level: 1 })).toBeTruthy();
		expect(screen.getByText("No action economy reported yet.")).toBeTruthy();

		await go("#/play/battle-map");
		await fireEvent.click(screen.getByRole("button", { name: "east" }));
		expect(screen.getByTestId("battle-map-demo-event").textContent).toContain(
			"Would step through s:exit:east.",
		);
		expect(screen.getByText(/The map only ever selects/)).toBeTruthy();

		await go("#/play/field-detail");
		expect(screen.getByRole("heading", { name: "FieldDetail", level: 1 })).toBeTruthy();
		expect(
			screen.getByText(/Makes absence, pending data, and failed detail distinguishable/),
		).toBeTruthy();
	});

	it("documents PlaceMap's click-to-travel and never offers the current place", async () => {
		render(App);
		await go("#/play/map");
		expect(screen.getByRole("heading", { name: "PlaceMap", level: 1 })).toBeTruthy();
		expect(
			screen.getByText(/optionally offers click-to-travel to a neighbouring place/),
		).toBeTruthy();

		expect(screen.queryByRole("button", { name: "Go to Common Room" })).toBeNull();
		await fireEvent.click(screen.getByRole("button", { name: "Go to Cellar" }));
		expect(screen.getByTestId("place-map-demo-event").textContent).toContain(
			"Would travel via s:exit:cellar.",
		);
	});
});
