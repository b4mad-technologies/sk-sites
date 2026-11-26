/**
 * Markdown parsed by marked into tokens and rendered as Svelte elements, never
 * as HTML: raw HTML stays visible as text. GitHub-flavoured (tables,
 * strikethrough, task lists, autolinks); single newlines are line breaks, as
 * in chat clients. Same approach as pi's p2 prototype (`src/web/Markdown.tsx`,
 * earendil-works/pi, MIT License, Copyright (c) 2025 Mario Zechner).
 */
import { Lexer, type Token } from "marked";

export type { Token };

export function markdownTokens(source: string): Token[] {
	return Lexer.lex(source, { gfm: true, breaks: true });
}

/** A link target that is safe to follow: http(s) and mailto only; else none. */
export function safeHref(href: string): string | undefined {
	try {
		const url = new URL(href);
		return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
	} catch {
		return undefined;
	}
}
