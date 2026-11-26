/** Closed-subset markdown/HTML → sanitized HTML for the paper reading sheet. */

const ALLOWED = new Set([
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
	"br",
	"strong",
	"em",
	"b",
	"i",
	"a",
	"pre",
	"code",
]);

export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function allowlist(html: string): string {
	return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, tag: string) => {
		const name = tag.toLowerCase();
		if (!ALLOWED.has(name)) return "";
		if (full.startsWith("</")) return `</${name}>`;
		if (name === "br") return "<br>";
		if (name === "a") {
			if (full.startsWith("</")) return "</a>";
			const href = /href="(\/docs(?:\/[^"]*)?)"/.exec(full)?.[1];
			if (!href) return "";
			return `<a href="${href}">`;
		}
		return `<${name}>`;
	});
}

function applyMarkdown(escaped: string): string {
	return escaped
		.replace(/\*\*_(.+?)_\*\*/g, "<strong><em>$1</em></strong>")
		.replace(/_\*\*(.+?)\*\*_/g, "<em><strong>$1</strong></em>")
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[\s(])_(.+?)_([\s).,;:!?]|$)/g, "$1<em>$2</em>$3")
		.replace(/^###### (.+)$/gm, "<h6>$1</h6>")
		.replace(/^##### (.+)$/gm, "<h5>$1</h5>")
		.replace(/^#### (.+)$/gm, "<h4>$1</h4>")
		.replace(/^### (.+)$/gm, "<h3>$1</h3>")
		.replace(/^## (.+)$/gm, "<h2>$1</h2>")
		.replace(/^# (.+)$/gm, "<h1>$1</h1>")
		.replace(/\[([^\]]+)\]\((\/docs(?:\/[^)\s]+)?)\)/g, '<a href="$2">$1</a>');
}

function wrapBlocks(body: string): string {
	const blocks = body
		.split(/\n{2,}/)
		.map((part) => part.trim())
		.filter(Boolean);
	return blocks
		.map((block) => {
			if (/^<(h[1-6]|blockquote|table|ul|ol|pre)\b/i.test(block)) return block;
			const withBreaks = block.replaceAll("\n", "<br>");
			return `<p>${withBreaks}</p>`;
		})
		.join("\n");
}

export function stripLeadingTitle(verbatim: string, name: string): string {
	const trimmed = verbatim.replaceAll("\r\n", "\n").trimStart();
	if (!name.trim()) return trimmed;
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const heading = new RegExp(`^(?:#{1,6}\\s*)?${escaped}\\s*(?:\\n+|$)`, "i");
	return trimmed.replace(heading, "").trimStart();
}

/** Sanitize SRD/adventure verbatim for `{@html}` on the paper sheet. */
export function renderSheetHtml(
	verbatim: string,
	format: "markdown" | "plain" = "plain",
	title?: string,
): string {
	const stripped = title ? stripLeadingTitle(verbatim, title) : verbatim;
	const source = stripped.replaceAll("\r\n", "\n").trim();
	if (!source) return "";
	if (format !== "markdown") {
		return wrapBlocks(escapeHtml(source));
	}

	const fences: string[] = [];
	let working = source.replace(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g, (_full, body: string) => {
		fences.push(`<pre><code>${escapeHtml(body)}</code></pre>`);
		return `\n\n%%FENCE${fences.length - 1}%%\n\n`;
	});
	const tables: string[] = [];
	working = working.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => {
		tables.push(allowlist(table));
		return `\n\n%%TABLE${tables.length - 1}%%\n\n`;
	});
	working = working.replace(/<br\s*\/?>/gi, "%%BR%%");
	working = applyMarkdown(escapeHtml(working));
	working = working.replace(/(?:^&gt;.*(?:\n|$))+/gm, (quote) => {
		const body = quote
			.split("\n")
			.map((line) => line.replace(/^&gt; ?/, ""))
			.join("\n")
			.trim();
		return `<blockquote>${wrapBlocks(body)}</blockquote>\n\n`;
	});
	working = working.replaceAll("%%BR%%", "<br>");
	working = working.replace(/%%FENCE(\d+)%%/g, (_, index: string) => fences[Number(index)] ?? "");
	working = working.replace(/%%TABLE(\d+)%%/g, (_, index: string) => tables[Number(index)] ?? "");
	return wrapBlocks(working);
}

/** Collapse markdown/HTML/whitespace so two SRD strings can be compared. */
export function stripMarkup(text: string): string {
	return text
		.replaceAll("\r\n", "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/[#*_`[\]()]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/** True when description_short adds nothing beyond verbatim (prefix or equal). */
export function isRedundantShortDescription(
	short: string,
	verbatim: string,
	title?: string,
): boolean {
	const trimmed = short.trim();
	if (!trimmed) return true;
	const body = title ? stripLeadingTitle(verbatim, title) : verbatim;
	const a = stripMarkup(trimmed);
	const b = stripMarkup(body);
	if (!a) return true;
	return b.startsWith(a) || a === b;
}

export function prettyCatalogLabel(id: string): string {
	const slug = id.split("/").filter(Boolean).pop() ?? id;
	return slug
		.replaceAll("_", " ")
		.replaceAll("-", " ")
		.replace(/\b\w/g, (ch) => ch.toUpperCase());
}
