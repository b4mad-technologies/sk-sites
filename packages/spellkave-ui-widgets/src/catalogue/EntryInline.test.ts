import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import EntryInline from "./EntryInline.svelte";
import type { DocsRowEntryReference } from "./types";

const entry: DocsRowEntryReference = {
	ref: "guide/focus",
	title: "Focus",
	href: "/docs/guide/rules/resource/guide%2Ffocus",
	summary: "Attention available by default.",
};

describe("EntryInline", () => {
	it("renders a linked title, the raw ref, and the summary", () => {
		render(EntryInline, { entry });
		const link = screen.getByRole("link", { name: "Focus" });
		expect(link.getAttribute("href")).toBe(entry.href);
		expect(screen.getByText("guide/focus")).toBeTruthy();
		expect(screen.getByText("— Attention available by default.")).toBeTruthy();
	});

	it("omits the summary line when none is given", () => {
		render(EntryInline, { entry: { ...entry, summary: undefined } });
		expect(screen.queryByText(/—/)).toBeNull();
	});

	it("degrades to an unlinked span when there is no href", () => {
		const { container } = render(EntryInline, { entry: { ...entry, href: undefined } });
		expect(container.querySelector("a")).toBeNull();
		expect(screen.getByText("Focus").tagName.toLowerCase()).toBe("span");
	});

	it("routes the title through a caller's onNavigate when one is given", async () => {
		const seen: string[] = [];
		render(EntryInline, {
			entry,
			onNavigate: (href: string, event: MouseEvent) => {
				event.preventDefault();
				seen.push(href);
			},
		});
		await fireEvent.click(screen.getByRole("link", { name: "Focus" }));
		expect(seen).toEqual([entry.href]);
	});
});
