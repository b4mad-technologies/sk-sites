/**
 * Turns ```mermaid code blocks inside rendered Markdown into diagrams in the
 * browser. Mermaid loads on first use only, so a page without a diagram
 * never downloads it.
 *
 * Safety: `securityLevel: "strict"` makes mermaid encode tags in labels,
 * disable click handlers and sanitize its SVG with DOMPurify; HTML labels
 * are off, so no label becomes a foreignObject with HTML inside. A block
 * mermaid cannot parse stays the code block it was, marked as not drawn.
 */

import type { Attachment } from "svelte/attachments";

type Mermaid = typeof import("mermaid").default;

let loading: Promise<Mermaid> | null = null;
let counter = 0;

function load(): Promise<Mermaid> {
	loading ??= import("mermaid").then((module) => module.default);
	return loading;
}

/** A CSS colour as `#rrggbb` (mermaid's colour maths reads hex and rgb, not oklch). */
function hex(color: string): string | undefined {
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext("2d");
	if (!ctx) return undefined;
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
	return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Theme colours from the page's tokens, so a diagram follows the active theme. */
function themeVariables(root: HTMLElement): Record<string, string | boolean> {
	const style = getComputedStyle(root);
	const token = (name: string) => {
		const value = style.getPropertyValue(name).trim();
		return value ? hex(value) : undefined;
	};
	const background = token("--card") ?? token("--background");
	const vars: Record<string, string | boolean | undefined> = {
		background,
		// Nodes sit on the card colour with foreground text, so labels keep the page contrast.
		mainBkg: background,
		nodeBorder: token("--primary"),
		clusterBkg: background,
		clusterBorder: token("--border"),
		primaryColor: background,
		primaryTextColor: token("--foreground"),
		primaryBorderColor: token("--primary"),
		secondaryColor: background,
		tertiaryColor: background,
		lineColor: token("--muted-foreground"),
		textColor: token("--foreground"),
		fontFamily: style.fontFamily,
	};
	if (background) {
		const n = Number.parseInt(background.slice(1), 16);
		const luma = 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
		vars.darkMode = luma < 128;
	}
	return Object.fromEntries(Object.entries(vars).filter(([, v]) => v !== undefined)) as Record<
		string,
		string | boolean
	>;
}

/** The mermaid config Spire draws with; exported so a test can pin the safety settings. */
export function mermaidConfig(variables: Record<string, string | boolean> = {}) {
	return {
		startOnLoad: false,
		securityLevel: "strict" as const,
		htmlLabels: false,
		flowchart: { htmlLabels: false },
		theme: "base" as const,
		themeVariables: variables,
	};
}

/**
 * Draws every `pre > code.language-mermaid` under `root`. Returns how many
 * diagrams were drawn; failed blocks keep their source and get
 * `data-mermaid="failed"`.
 */
export async function renderMermaid(root: HTMLElement): Promise<number> {
	const blocks = Array.from(root.querySelectorAll<HTMLElement>("pre > code.language-mermaid"));
	if (blocks.length === 0) return 0;
	const mermaid = await load();
	mermaid.initialize(mermaidConfig(themeVariables(root)));
	let drawn = 0;
	for (const code of blocks) {
		const pre = code.parentElement;
		if (!pre?.isConnected || pre.dataset.mermaid) continue;
		const source = code.textContent ?? "";
		try {
			const { svg } = await mermaid.render(`mermaid-${++counter}`, source);
			const figure = document.createElement("figure");
			figure.dataset.slot = "mermaid";
			figure.className = "my-4 overflow-x-auto";
			figure.setAttribute("role", "img");
			figure.setAttribute("aria-label", "Diagram");
			// Sanitized by mermaid (securityLevel strict, DOMPurify).
			figure.innerHTML = svg;
			pre.replaceWith(figure);
			drawn++;
		} catch {
			pre.dataset.mermaid = "failed";
			pre.title = "Mermaid could not draw this diagram; the source is shown instead.";
			// mermaid leaves its error SVG in the body when render fails.
			document.getElementById(`dmermaid-${counter}`)?.remove();
		}
	}
	return drawn;
}

/** `{@attach mermaidDiagrams}` on the element that holds rendered Markdown. */
export const mermaidDiagrams: Attachment<HTMLElement> = (node) => {
	void renderMermaid(node);
};
