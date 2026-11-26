import type { DocsDslTarget, DocsDslToken } from "./types";

export interface LaidOutPiece {
	text: string;
	className: string;
	href?: string;
	targets?: DocsDslTarget[];
}

const KIND_CLASS: Record<string, string> = {
	Ident: "",
	StringLit: "text-primary",
	Number: "text-accent",
	Bool: "text-accent",
	Whitespace: "text-muted-foreground",
	AndAnd: "text-muted-foreground",
	OrOr: "text-muted-foreground",
	Dot: "text-muted-foreground",
	Dollar: "text-muted-foreground",
	LParen: "text-muted-foreground",
	RParen: "text-muted-foreground",
	Comma: "text-muted-foreground",
	Equal: "text-muted-foreground",
	Semicolon: "text-muted-foreground",
	Minus: "text-muted-foreground",
	Plus: "text-muted-foreground",
	Star: "text-muted-foreground",
	Slash: "text-muted-foreground",
	EqEq: "text-muted-foreground",
	Ne: "text-muted-foreground",
	Lt: "text-muted-foreground",
	Lte: "text-muted-foreground",
	Gt: "text-muted-foreground",
	Ge: "text-muted-foreground",
};

const BREAK_BEFORE = new Set(["AndAnd", "OrOr"]);
const BREAK_AFTER = new Set(["Semicolon"]);

function indent(depth: number): string {
	return `\n${"  ".repeat(Math.max(depth, 0))}`;
}

/**
 * Layout-only: inserts newlines and indentation. Concatenating `text`
 * still parses because the lexer skips whitespace.
 */
export function layoutDsl(source: string, tokens: DocsDslToken[]): LaidOutPiece[] {
	const long = source.length > 72;
	const pieces: LaidOutPiece[] = [];
	let depth = 0;
	for (const token of tokens) {
		const text = source.slice(token.start, token.end);
		if (token.kind === "RParen") depth = Math.max(0, depth - 1);
		if (long && BREAK_BEFORE.has(token.kind) && text.trim() !== "") {
			pieces.push({ text: indent(depth), className: "" });
		}
		if (token.kind !== "Whitespace" || !long) {
			pieces.push({
				text,
				className: KIND_CLASS[token.kind] ?? "",
				...(token.href ? { href: token.href } : {}),
				...(token.targets ? { targets: token.targets } : {}),
			});
		}
		if (token.kind === "LParen") depth += 1;
		if (long && (BREAK_AFTER.has(token.kind) || (token.kind === "Comma" && depth > 0))) {
			pieces.push({ text: indent(depth), className: "" });
		}
	}
	return pieces;
}

export function laidOutSource(source: string, tokens: DocsDslToken[]): string {
	return layoutDsl(source, tokens)
		.map((piece) => piece.text)
		.join("");
}
