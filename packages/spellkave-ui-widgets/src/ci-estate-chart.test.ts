// keep-file(K1): sparse paths and changing cohorts require numeric boundary assertions.
import { expect, it } from "vitest";
import { estateChartSeries, estatePath } from "./ci-estate-chart.ts";
import type { CiEstateHistory } from "./ci-types.ts";

it("breaks at nulls and absent sampling intervals without filling zero or bridging pod lifetimes", () => {
	expect(
		estatePath(
			[
				{ at: 0, value: 1 },
				{ at: 300, value: 2 },
				{ at: 600, value: null },
				{ at: 900, value: 2 },
				{ at: 1800, value: 1 },
			],
			0,
			1800,
			2,
			300,
		).match(/[ML]/g),
	).toEqual(["M", "L", "M", "M"]);
});
it("reports timewise median and max of observed pods only when the cohort is large", () => {
	const pods: CiEstateHistory["pods"] = Array.from({ length: 9 }, (_, i) => ({
		namespace: "ci-build",
		pod: String(i),
		pool: "ci-rust",
		role: "job",
		points: [
			{
				at: 0,
				cpuCores: i === 8 ? null : i,
				cpuLimit: 6,
				throttledRatio: null,
				memoryBytes: null,
				memoryLimit: null,
			},
		],
	}));
	expect(estateChartSeries(pods.slice(0, 2), "cpuCores")).toHaveLength(2);
	expect(estateChartSeries(pods, "cpuCores").map((s) => s.points)).toEqual([
		[{ at: 0, value: 3.5 }],
		[{ at: 0, value: 7 }],
	]);
});

it("shades median-to-max in separate sections around gaps", async () => {
	const { estateBand } = await import("./ci-estate-chart.ts");
	const points = [
		{ at: 0, value: 1 },
		{ at: 300, value: 2 },
		{ at: 600, value: null },
		{ at: 900, value: 2 },
	];
	expect(
		estateBand(
			points,
			points.map((p) => ({ ...p, value: p.value === null ? null : p.value + 1 })),
			0,
			900,
			4,
			300,
		).match(/Z/g),
	).toHaveLength(2);
});
