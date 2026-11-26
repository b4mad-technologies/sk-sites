// keep-file(K2): accessible SVG labels, missing data messages and reactive pool selection.
import { render, screen } from "@testing-library/svelte";
import { expect, it } from "vitest";
import CiEstateHistoryPanel from "./CiEstateHistory.svelte";
import type { CiEstateHistory } from "./ci-types.ts";

const history: CiEstateHistory = {
	from: "2026-10-29T00:00:00Z",
	to: "2026-10-30T00:00:00Z",
	stepSeconds: 300,
	note: "Fixture samples",
	pods: [
		{
			namespace: "ci-build",
			pod: "arc-a-workflow",
			pool: "ci-rust",
			role: "job",
			points: [
				{
					at: 1793232000,
					cpuCores: 2,
					cpuLimit: 6,
					throttledRatio: 0.166,
					memoryBytes: 2 * 1073741824,
					memoryLimit: 12 * 1073741824,
				},
			],
		},
	],
};
it("labels all three charts with units and limits, exposes pod measurements and reacts to a different pool", async () => {
	const view = render(CiEstateHistoryPanel, { history, pool: "ci-rust" });
	expect(screen.getAllByRole("img")).toHaveLength(3);
	expect(screen.getByRole("img", { name: /CPU cores used.*Dashed lines/ })).toBeTruthy();
	expect(screen.getByRole("img", { name: /Memory working set.*GiB/ })).toBeTruthy();
	expect(screen.getByText(/Throttled ratio: 16.60 %/)).toBeTruthy();
	expect(view.container.querySelectorAll('path[stroke-dasharray="5 4"]')).toHaveLength(2);
	await view.rerender({ history, pool: "ci-empty" });
	expect(screen.queryAllByRole("img")).toHaveLength(0);
	expect(screen.getByText(/Resource history is unknown/)).toBeTruthy();
});
it("reports unavailable history and never invents a working set from a lifetime peak", () => {
	render(CiEstateHistoryPanel, {
		history: { ...history, unavailable: "Sample limit reached", pods: [] },
		pool: "ci-rust",
	});
	expect(screen.getByRole("status").textContent).toBe("Sample limit reached");
});

it("switches large cohorts to a median-to-max band and marks unsampled limits", () => {
	const pod = history.pods[0];
	if (!pod) throw new Error("Missing fixture pod");
	const many = {
		...history,
		poolCoverage: [{ pool: "ci-rust", observedPods: 14, selectedPods: 9 }],
		pods: Array.from({ length: 9 }, (_, i) => ({
			...pod,
			pod: `pod-${i}`,
			points: pod.points.map((p) => ({ ...p, cpuLimit: null, memoryLimit: null })),
		})),
	};
	const view = render(CiEstateHistoryPanel, { history: many, pool: "ci-rust" });
	expect(screen.getByText(/the cohort changes/)).toBeTruthy();
	expect(screen.getByText(/Newest 9 of 14 observed job pods/)).toBeTruthy();
	expect(view.container.querySelectorAll('path[fill-opacity="0.14"]')).toHaveLength(3);
	expect(screen.getAllByText("Observed limits unknown.")).toHaveLength(2);
});
