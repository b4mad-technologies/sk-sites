import type { CiEstateHistory, CiEstatePoint } from "./ci-types.ts";

export type EstateField = Exclude<keyof CiEstatePoint, "at">;
export type ChartPoint = { at: number; value: number | null };
export const ESTATE_LINE_PODS = 8;

/** Break on missing observations or an unsampled interval, including absent pod lifetimes. */
export function estatePath(
	points: readonly ChartPoint[],
	from: number,
	to: number,
	ceiling: number,
	step: number,
): string {
	let previous: number | null = null;
	return points
		.map(({ at, value }) => {
			if (value === null || at < from || at > to) {
				previous = null;
				return "";
			}
			const command = previous !== null && at - previous <= step * 1.01 ? "L" : "M";
			previous = at;
			return `${command}${(44 + ((at - from) / Math.max(1, to - from)) * 300).toFixed(2)},${(150 - (value / ceiling) * 124).toFixed(2)}`;
		})
		.join(" ");
}

export function estateChartSeries(pods: CiEstateHistory["pods"], field: EstateField) {
	if (pods.length <= ESTATE_LINE_PODS)
		return pods.map((pod, index) => ({
			id: JSON.stringify([pod.namespace, pod.pod]),
			label: `${index + 1}. ${pod.namespace}/${pod.pod}`,
			points: pod.points.map((point) => ({ at: point.at, value: point[field] })),
		}));
	const times = new Map<number, number[]>();
	for (const pod of pods)
		for (const point of pod.points) {
			const values = times.get(point.at) ?? [];
			const value = point[field];
			if (value !== null) values.push(value);
			times.set(point.at, values);
		}
	const rows = [...times]
		.sort(([a], [b]) => a - b)
		.map(([at, values]) => ({ at, values: values.sort((a, b) => a - b) }));
	return [
		{
			id: "median",
			label: `Median across sampled job pods (${pods.length} pods in window)`,
			points: rows.map(({ at, values }) => {
				const middle = Math.floor(values.length / 2);
				return {
					at,
					value: values.length
						? ((values[middle] ?? 0) + (values[Math.floor((values.length - 1) / 2)] ?? 0)) / 2
						: null,
				};
			}),
		},
		{
			id: "maximum",
			label: "Maximum across sampled job pods",
			points: rows.map(({ at, values }) => ({ at, value: values.at(-1) ?? null })),
		},
	];
}

/** Shade median-to-maximum only where both cohorts have observations. */
export function estateBand(
	lower: readonly ChartPoint[],
	upper: readonly ChartPoint[],
	from: number,
	to: number,
	ceiling: number,
	step: number,
): string {
	const sections: { low: ChartPoint[]; high: ChartPoint[] }[] = [];
	let section: { low: ChartPoint[]; high: ChartPoint[] } | null = null;
	for (let i = 0; i < lower.length; i++) {
		const low = lower[i],
			high = upper[i];
		if (
			!low ||
			low.value === null ||
			!high ||
			high.value === null ||
			low.at < from ||
			low.at > to
		) {
			section = null;
			continue;
		}
		if (!section || low.at - (section.low.at(-1)?.at ?? low.at) > step * 1.01) {
			section = { low: [], high: [] };
			sections.push(section);
		}
		section.low.push(low);
		section.high.push(high);
	}
	return sections
		.map((s) => {
			const points = [...s.low, ...s.high.reverse()];
			return points
				.map(
					(p, i) =>
						`${i ? "L" : "M"}${(44 + ((p.at - from) / Math.max(1, to - from)) * 300).toFixed(2)},${(150 - ((p.value ?? 0) / ceiling) * 124).toFixed(2)}`,
				)
				.join(" ")
				.concat(" Z");
		})
		.join(" ");
}
