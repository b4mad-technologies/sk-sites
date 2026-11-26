import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DocIndex from "./doc-index.svelte";
import { freshness } from "./freshness";
import FreshnessBadge from "./freshness-badge.svelte";
import { mermaidConfig, renderMermaid } from "./mermaid";
import ReadingPath from "./reading-path.svelte";

const NOW = new Date("2026-10-16T12:00:00Z");

describe("freshness", () => {
	it("reads recent, aging and stale dates", () => {
		expect(freshness("2026-10-16T08:00:00Z", NOW)).toMatchObject({
			label: "updated today",
			tone: "good",
		});
		expect(freshness("2026-10-13T08:00:00Z", NOW)).toMatchObject({
			label: "updated 3 days ago",
			tone: "good",
		});
		expect(freshness("2026-07-01T00:00:00Z", NOW)).toMatchObject({
			label: "updated 3 months ago",
			tone: "neutral",
		});
		expect(freshness("2025-09-01T00:00:00Z", NOW)).toMatchObject({
			label: "updated last year",
			tone: "muted",
		});
		expect(freshness(null, NOW)).toBeNull();
		expect(freshness("not a date", NOW)).toBeNull();
	});
});

describe("FreshnessBadge", () => {
	it("shows the age and links the commit", () => {
		render(FreshnessBadge, {
			date: "2026-10-13T08:00:00Z",
			commit: "77bff83b000a90bb",
			href: "https://example.test/c",
			now: NOW,
		});
		const link = screen.getByRole("link", { name: /updated 3 days ago/ });
		expect(link.getAttribute("title")).toBe("Last commit 2026-10-13 (77bff83b00)");
	});

	it("says when the date is unknown", () => {
		render(FreshnessBadge, { date: null, href: "https://example.test/c" });
		expect(screen.getByText("date unknown")).toBeTruthy();
		expect(screen.queryByRole("link")).toBeNull();
	});
});

const roles = [
	{
		id: "author",
		title: "Author",
		who: "You write content.",
		steps: [{ title: "Onramp", href: "?doc=a.md", why: "Start here." }],
	},
	{
		id: "operator",
		title: "Operator",
		who: "You run the deployment.",
		steps: [{ title: "Topology", href: "?doc=b.md", why: "What runs where." }],
	},
];

describe("ReadingPath", () => {
	it("switches the path by role and hands step clicks to the caller", async () => {
		const onNavigate = vi.fn((_href: string, event: MouseEvent) => event.preventDefault());
		render(ReadingPath, { roles, onNavigate });
		expect(screen.getByRole("link", { name: "Onramp" })).toBeTruthy();
		await fireEvent.click(screen.getByRole("button", { name: "Operator" }));
		expect(screen.getByRole("button", { name: "Operator" }).getAttribute("aria-pressed")).toBe(
			"true",
		);
		const step = screen.getByRole("link", { name: "Topology" });
		await fireEvent.click(step);
		expect(onNavigate).toHaveBeenCalledWith("?doc=b.md", expect.any(MouseEvent));
	});
});

describe("DocIndex", () => {
	it("groups entries and filters by id, title or summary", async () => {
		render(DocIndex, {
			groups: [
				{
					title: "Kernel",
					entries: [
						{
							key: "a",
							label: "ADR-0021",
							title: "Affordance substrate",
							href: "?doc=a",
							status: { label: "Active", tone: "good" as const },
						},
					],
				},
				{
					title: "Estate",
					entries: [
						{
							key: "b",
							label: "ADR-0108",
							title: "Observability boundary",
							href: "?doc=b",
							summary: "Where telemetry lives.",
						},
					],
				},
			],
		});
		expect(screen.getByText("Active")).toBeTruthy();
		await fireEvent.input(screen.getByLabelText("Filter"), { target: { value: "telemetry" } });
		expect(screen.queryByText("Affordance substrate")).toBeNull();
		expect(screen.getByText("Observability boundary")).toBeTruthy();
		expect(screen.getByText("1 shown")).toBeTruthy();
	});
});

describe("mermaid", () => {
	// Security guard: the settings that keep labels from becoming HTML.
	it("draws with strict security and no HTML labels", () => {
		const config = mermaidConfig();
		expect(config.securityLevel).toBe("strict");
		expect(config.htmlLabels).toBe(false);
		expect(config.flowchart.htmlLabels).toBe(false);
	});

	it("leaves a page without mermaid blocks alone", async () => {
		const root = document.createElement("div");
		root.innerHTML = '<pre><code class="language-ts">let a = 1;</code></pre>';
		expect(await renderMermaid(root)).toBe(0);
		expect(root.querySelector("pre")).not.toBeNull();
	});
});
