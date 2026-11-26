/**
 * Presentation diagnostics for required metadata fields. These deliberately do
 * not supply substitute content: an absent authored value must stay visible as
 * an authoring/export problem rather than turn into believable website copy.
 */
export function metadataStringDiagnostic(
	value: unknown,
	path: string,
	options: { allowEmpty?: boolean } = {},
): string | null {
	if (value === undefined || value === null) return `Missing required metadata: ${path}.`;
	if (typeof value !== "string") return `Invalid metadata: ${path} must be a string.`;
	if (!options.allowEmpty && value.trim().length === 0)
		return `Invalid metadata: ${path} must not be empty.`;
	return null;
}

/**
 * Attachment payloads are authored reference data, not page metadata. Keep a
 * missing field equally visible without falsely describing it as metadata.
 */
export function attachmentPayloadStringOrDiagnostic(
	payload: Record<string, unknown> | undefined,
	key: string,
	path: string,
): string {
	const value = payload?.[key];
	return typeof value === "string" && value.trim().length > 0
		? value
		: `Missing attachment payload: ${path}.`;
}
