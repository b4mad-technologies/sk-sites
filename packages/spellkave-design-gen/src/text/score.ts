export interface Hygiene {
	pass: boolean;
	missing: string[];
	leaked: string[];
}

export function scoreProse(
	text: string,
	needles: { must_include: readonly string[]; must_not: readonly string[] },
): Hygiene {
	const missing = needles.must_include.filter((needle) => !text.includes(needle));
	const leaked = needles.must_not.filter((needle) => text.includes(needle));
	return { pass: missing.length === 0 && leaked.length === 0, missing, leaked };
}
