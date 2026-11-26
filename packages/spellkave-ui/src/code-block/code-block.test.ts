import { render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import CodeBlock from "./code-block.svelte";

const source = createRawSnippet(() => ({
	render: () => "<span>actor.stat('srd/ac') && target.has_tag('srd.language.common')</span>",
}));

describe("CodeBlock", () => {
	it("renders children in a pre/code shell that does not wrap", () => {
		const { container } = render(CodeBlock, {
			children: source,
		});

		const pre = container.querySelector('[data-slot="code-block"]');
		expect(pre?.tagName.toLowerCase()).toBe("pre");
		expect(pre?.className).toContain("overflow-x-auto");
		expect(pre?.className).toContain("whitespace-pre");
		expect(pre?.className).not.toContain("break-words");
		expect(screen.getByText(/actor\.stat/)).toBeTruthy();
		expect(screen.getByText(/actor\.stat/).closest("code")).toBeTruthy();
	});
});
