import { describe, expect, it } from "vitest";
import { laidOutSource, layoutDsl } from "./layout-dsl";
import type { DocsDslToken } from "./types";

describe("layoutDsl", () => {
	it("keeps short expressions on one line", () => {
		const source = "a && b";
		const tokens: DocsDslToken[] = [
			{ kind: "Ident", start: 0, end: 1 },
			{ kind: "Whitespace", start: 1, end: 2 },
			{ kind: "AndAnd", start: 2, end: 4 },
			{ kind: "Whitespace", start: 4, end: 5 },
			{ kind: "Ident", start: 5, end: 6 },
		];
		expect(laidOutSource(source, tokens)).toBe(source);
	});

	it("breaks long expressions before && and still parses as whitespace", () => {
		const source = `${"x".repeat(40)} && ${"y".repeat(40)}`;
		const andAt = source.indexOf("&&");
		const tokens: DocsDslToken[] = [
			{ kind: "Ident", start: 0, end: 40 },
			{ kind: "Whitespace", start: 40, end: 41 },
			{ kind: "AndAnd", start: andAt, end: andAt + 2 },
			{ kind: "Whitespace", start: andAt + 2, end: andAt + 3 },
			{ kind: "Ident", start: andAt + 3, end: source.length },
		];
		const laid = laidOutSource(source, tokens);
		expect(laid.includes("\n")).toBe(true);
		expect(laid.replaceAll(/\s+/g, "")).toBe(source.replaceAll(/\s+/g, ""));
	});

	it("carries href on string tokens", () => {
		const source = "'srd/ac'";
		const tokens: DocsDslToken[] = [{ kind: "StringLit", start: 0, end: 8, href: "/docs/x" }];
		expect(layoutDsl(source, tokens)[0]?.href).toBe("/docs/x");
	});
});
