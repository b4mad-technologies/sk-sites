import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DistanceMetricView, { distanceMetricRowView } from "./DistanceMetricView.svelte";

// DistanceMetricDefinitionRow (ADR-0134): the standard SRD grid names this metric.
const CHEBYSHEV = {
	metric_id: "core/metric/chebyshev",
	metric_shape: "Chebyshev",
	bundle_id: "core",
	description: "Distance is the largest absolute coordinate difference.",
	title: "Chebyshev distance",
};
const href = "/docs/srd/mechanics/distance-metrics/core/metric/chebyshev";
const row = distanceMetricRowView(CHEBYSHEV, href, () => undefined);

describe("distance metric reader", () => {
	it("preserves the metric identity, formula and ownership", () => {
		expect(row.ref).toBe(CHEBYSHEV.metric_id);
		expect(row.fields).toEqual([
			{ label: "Formula", value: "Chebyshev", code: true },
			{ label: "Distance Metric ID", value: CHEBYSHEV.metric_id, code: true },
			{ label: "Owning bundle", value: "core" },
		]);
	});

	it("renders the formula and authored description on the full page", () => {
		render(DistanceMetricView, { row, view: "full" });
		expect(screen.getByText("Chebyshev")).toBeTruthy();
		expect(screen.getByText(CHEBYSHEV.description)).toBeTruthy();
	});

	it("links the inline view to the published metric", () => {
		render(DistanceMetricView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: CHEBYSHEV.title }).getAttribute("href")).toBe(href);
	});

	it("uses the identity as title when no display title is supplied", () => {
		const minimal = distanceMetricRowView(
			{ metric_id: "custom/metric" },
			undefined,
			() => undefined,
		);
		expect(minimal.title).toBe("custom/metric");
		expect(minimal.fields).toEqual([
			{ label: "Distance Metric ID", value: "custom/metric", code: true },
		]);
	});
});
