// @vitest-environment node
import { describe, expect, it } from "vitest";
import { quotedDslOccurrences } from "./reference-graph";
import { projectDslFields, tokenizeDslSource } from "./tokenize-dsl";

describe("quotedDslOccurrences", () => {
	it("keeps byte ranges including quotes", () => {
		const source = "cond(actor.has_capability('srd/feat'), 1, 0)";
		expect(quotedDslOccurrences(source)).toEqual([
			{
				id: "srd/feat",
				start: source.indexOf("'srd/feat'"),
				end: source.indexOf("'srd/feat'") + "'srd/feat'".length,
			},
		]);
	});
});

describe("tokenizeDslSource", () => {
	it("returns kind plus byte range including whitespace", () => {
		const tokens = tokenizeDslSource("a && b");
		expect(tokens).not.toBeNull();
		expect(tokens?.map((token) => token.kind)).toEqual([
			"Ident",
			"Whitespace",
			"AndAnd",
			"Whitespace",
			"Ident",
		]);
	});
});

describe("projectDslFields", () => {
	it("attaches a unique route onto a quoted identifier token", () => {
		const source = "actor.stat('srd/ac')";
		const dsl = projectDslFields({ resolution_predicate_source: source }, (id) =>
			id === "srd/ac" ? [{ title: "AC", kind: "Resources", href: "/docs/srd/ac" }] : undefined,
		);
		const stringLit = dsl?.resolution_predicate_source?.tokens.find(
			(token) => token.kind === "StringLit",
		);
		expect(stringLit?.href).toBe("/docs/srd/ac");
		expect(stringLit?.targets).toBeUndefined();
	});

	it("keeps every subject when an id names two, instead of dropping the link", () => {
		const source = "actor.stat('srd/str')";
		const dsl = projectDslFields({ resolution_predicate_source: source }, (id) =>
			id === "srd/str"
				? [
						{ title: "Strength", kind: "Resources", href: "/docs/srd/playing-the-game/str" },
						{ title: "Strength", kind: "Modifier targets", href: "/docs/srd/mechanics/str" },
					]
				: undefined,
		);
		const stringLit = dsl?.resolution_predicate_source?.tokens.find(
			(token) => token.kind === "StringLit",
		);
		expect(stringLit?.href).toBeUndefined();
		expect(stringLit?.targets?.map((target) => target.href)).toEqual([
			"/docs/srd/playing-the-game/str",
			"/docs/srd/mechanics/str",
		]);
	});
});
