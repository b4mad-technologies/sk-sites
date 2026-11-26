import { describe, expect, it } from "vitest";
import {
	attachmentPayloadStringOrDiagnostic,
	metadataStringDiagnostic,
} from "./metadata-diagnostics";

describe("metadataStringDiagnostic", () => {
	it("names absent and null metadata fields", () => {
		expect(metadataStringDiagnostic(undefined, "metadata.docs.intro", { allowEmpty: true })).toBe(
			"Missing required metadata: metadata.docs.intro.",
		);
		expect(metadataStringDiagnostic(null, "metadata.docs.intro", { allowEmpty: true })).toBe(
			"Missing required metadata: metadata.docs.intro.",
		);
	});

	it("rejects blank required titles but permits an authored empty intro", () => {
		expect(metadataStringDiagnostic("  ", "metadata.docs.title")).toBe(
			"Invalid metadata: metadata.docs.title must not be empty.",
		);
		expect(metadataStringDiagnostic("", "metadata.docs.intro", { allowEmpty: true })).toBeNull();
	});
});

describe("attachmentPayloadStringOrDiagnostic", () => {
	it("does not invent absent attachment provenance", () => {
		expect(
			attachmentPayloadStringOrDiagnostic(undefined, "license", "srd.text.payload.license"),
		).toBe("Missing attachment payload: srd.text.payload.license.");
	});
});
