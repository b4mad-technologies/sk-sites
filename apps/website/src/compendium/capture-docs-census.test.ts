/**
 * The census capture check accepts a manifest edit that changes no projected
 * text, and writes no snapshot while it checks.
 *
 * Sibling files: capture-docs-census-drift.test.ts (a real change and invalid
 * input are refused) and capture-docs-census-delivery.test.ts (delivery drift
 * is refused).
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { useCaptureFixture } from "./capture-docs-census.fixture";

const fixture = useCaptureFixture();

describe("real read-only census capture", () => {
	it("accepts a count-neutral description assignment edit without writing snapshots", () => {
		const { capture, docsRoots, fixturePath, originalFixture, snapshotRoot, snapshots } = fixture;
		const assignment = 'description = "Aldwin sits by the hearth, ledger open on his knee."';
		expect(originalFixture).toContain(assignment);
		writeFileSync(
			fixturePath,
			originalFixture.replace(
				assignment,
				"description = 'Aldwin sits by the hearth, ledger open on his knee.'",
			),
		);
		const before = snapshots();
		expect(() => capture({ check: true, snapshotRoot, docsRoots })).not.toThrow();
		expect(snapshots()).toEqual(before);
	}, 180_000);
});
