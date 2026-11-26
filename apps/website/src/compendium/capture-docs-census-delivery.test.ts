/**
 * The census capture check refuses a delivery-report drift even when both
 * census snapshots still match, and leaves the snapshots as they were.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { useCaptureFixture } from "./capture-docs-census.fixture";

const fixture = useCaptureFixture();

describe("real read-only census capture", () => {
	it("refuses delivery drift even when both census snapshots match", () => {
		const { capture, docsRoots, snapshotRoot, snapshots } = fixture;
		const path = join(snapshotRoot, "delivery-report.json");
		const delivery = JSON.parse(readFileSync(path, "utf8"));
		delivery.delivered += 1;
		writeFileSync(path, `${JSON.stringify(delivery, null, "\t")}\n`);
		const before = snapshots();
		expect(() => capture({ check: true, snapshotRoot, docsRoots })).toThrow("delivery-report.json");
		expect(snapshots()).toEqual(before);
	}, 180_000);
});
