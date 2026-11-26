/**
 * The census capture check refuses a real projected text change and an
 * invalid manifest, and repairs or publishes no snapshot when it refuses.
 */
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { useCaptureFixture } from "./capture-docs-census.fixture";

const fixture = useCaptureFixture();

describe("real read-only census capture", () => {
	it("refuses a real projected description change without repairing snapshots", () => {
		const { capture, docsRoots, fixturePath, originalFixture, snapshotRoot, snapshots } = fixture;
		writeFileSync(
			fixturePath,
			originalFixture.replace(
				"Aldwin sits by the hearth, ledger open on his knee.",
				"Aldwin stands by the hearth, ledger closed.",
			),
		);
		const before = snapshots();
		expect(() => capture({ check: true, snapshotRoot, docsRoots })).toThrow("snapshot drift");
		expect(snapshots()).toEqual(before);
	}, 180_000);

	it("refuses invalid manifest input without publishing either census", () => {
		const { capture, docsRoots, fixturePath, snapshotRoot, snapshots } = fixture;
		writeFileSync(fixturePath, 'invalid = "unterminated');
		const before = snapshots();
		expect(() =>
			capture({ check: false, snapshotRoot, docsRoots: [...docsRoots].reverse() }),
		).toThrow();
		expect(snapshots()).toEqual(before);
	});
});
