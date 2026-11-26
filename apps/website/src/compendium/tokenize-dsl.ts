import type { DocsDslField, DocsDslTarget, DocsDslToken } from "@spellkave/ui-widgets/catalogue";
import { tokenize_dsl_json } from "spellkave-validate-wasm";
import { isDslField } from "./reference-graph";

interface WasmToken {
	kind: string;
	start: number;
	end: number;
}

export function tokenizeDslSource(source: string): DocsDslToken[] | null {
	try {
		const parsed = JSON.parse(tokenize_dsl_json(source)) as { tokens: WasmToken[] };
		return parsed.tokens.map((token) => ({
			kind: token.kind,
			start: token.start,
			end: token.end,
		}));
	} catch {
		return null;
	}
}

/**
 * Resolves a quoted identifier to EVERY catalogue subject carrying that id —
 * an id is not unique across kinds (76 ids name two subjects at once, e.g.
 * `srd/str` is both a resource and a modifier target). The caller decides how
 * to present a one-target token (a plain link) versus a multi-target one
 * (a chooser); nothing is silently dropped for being ambiguous.
 */
export type DslTargetsForId = (id: string) => DocsDslTarget[] | undefined;

export function projectDslFields(
	record: Record<string, unknown>,
	targetsForId: DslTargetsForId,
): Record<string, DocsDslField> | undefined {
	const dsl: Record<string, DocsDslField> = {};
	for (const [field, value] of Object.entries(record)) {
		if (typeof value !== "string" || !isDslField(field)) continue;
		const tokens = tokenizeDslSource(value);
		if (tokens === null) continue;
		dsl[field] = {
			tokens: tokens.map((token) => {
				if (token.kind !== "StringLit") return token;
				const id = value.slice(token.start + 1, token.end - 1);
				const targets = targetsForId(id);
				if (targets === undefined || targets.length === 0) return token;
				if (targets.length === 1) {
					const [target] = targets as [DocsDslTarget];
					return { ...token, href: target.href };
				}
				return { ...token, targets };
			}),
		};
	}
	return Object.keys(dsl).length === 0 ? undefined : dsl;
}
