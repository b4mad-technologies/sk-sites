import { describe, expect, it } from "vitest";
import { formatJobLine, readableJobName } from "./ci-format";

describe("readableJobName", () => {
	it("shows a matrix key instead of the raw expression", () => {
		expect(readableJobName("js ${{ matrix.ws }}")).toBe("js ‹ws›");
		expect(
			readableJobName(
				"srd-cc live ${{ matrix.tier.id }}${{ matrix.tier.gating == false && ' (x)' || '' }}",
			),
		).toBe("srd-cc live ‹tier›…");
	});

	it("falls back to the job key when the name is only an expression", () => {
		expect(readableJobName("${{ matrix.name }}", "images/publish")).toBe("publish ‹name›");
	});

	it("leaves plain names alone", () => {
		expect(readableJobName("sk command line", "sk/check")).toBe("sk command line");
	});
});

describe("formatJobLine", () => {
	it("puts red rate, mean and p95 on one line, as the job boxes and sk spire show it", () => {
		expect(formatJobLine(0.089, 156, 492)).toBe("8.9 % · 2.6 min (p95 8.2 min)");
		expect(formatJobLine(0.3, 9, 3600, true)).toBe("30 % · 9 s (p95 ≥ 60 min)");
	});

	it("leaves out what has no data", () => {
		expect(formatJobLine(0.05, null)).toBe("5.0 %");
		expect(formatJobLine(null, 40)).toBe("40 s");
		expect(formatJobLine(null, null)).toBe("no runs");
	});
});
