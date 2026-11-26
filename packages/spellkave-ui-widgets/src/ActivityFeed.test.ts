import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ActivityFeed from "./ActivityFeed.svelte";
import ActivityFeedTestHarness from "./ActivityFeedTestHarness.svelte";

describe("ActivityFeed", () => {
	it("states honestly when there are no entries", () => {
		render(ActivityFeed, {
			props: {
				items: [],
				ariaLabel: "Recent activity",
				emptyText: "Nothing has happened yet.",
				renderItem: undefined as never,
			},
		});
		expect(screen.getByText("Nothing has happened yet.")).toBeTruthy();
	});

	it("renders a journal-length list (Play's continuous Explore stream, sk-jay0.1.8.60) without dropping a row", () => {
		const items = Array.from({ length: 1000 }, (_, index) => ({
			id: `row-${index}`,
			text: `Row ${index}`,
		}));
		const { container } = render(ActivityFeedTestHarness, { props: { items } });
		expect(container.querySelectorAll("[data-activity-id]")).toHaveLength(1000);
	});

	describe("isSectionHeader: grouped-list rows (sk-jay0.1.8.63.5)", () => {
		it("marks only the matched item's own li, leaving every other row unaffected", () => {
			const items = [
				{ id: "a", text: "Common Room" },
				{ id: "b", text: "You look around." },
				{ id: "c", text: "The Bar" },
				{ id: "d", text: "You order a drink." },
			];
			const { container } = render(ActivityFeedTestHarness, {
				props: { items, sectionIds: new Set(["a", "c"]) },
			});
			const rows = Array.from(container.querySelectorAll("[data-activity-id]"));
			expect(rows.map((row) => row.getAttribute("data-activity-id"))).toEqual(["a", "b", "c", "d"]);
			expect(rows.map((row) => row.getAttribute("data-slot"))).toEqual([
				"activity-feed-header",
				null,
				"activity-feed-header",
				null,
			]);
		});

		it("marks no row a header when isSectionHeader is never supplied (an ordinary feed)", () => {
			const items = [{ id: "a", text: "Row" }];
			const { container } = render(ActivityFeedTestHarness, { props: { items } });
			expect(container.querySelector("[data-slot='activity-feed-header']")).toBeNull();
		});
	});
});
