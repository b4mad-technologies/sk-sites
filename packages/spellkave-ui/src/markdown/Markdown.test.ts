// keep-file(K1): enumerates rendering rules of the markdown renderer, incl. its safety rules.
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Markdown from "./Markdown.svelte";
import { safeHref } from "./markdown";

describe("Markdown", () => {
	it("renders emphasis, lists, inline code and code blocks as elements", () => {
		const { container } = render(Markdown, {
			source: "**World** `alpha`\n\n- one\n- two\n\n```sh\nsk dev up\n```",
		});
		expect(container.querySelector("strong")?.textContent).toBe("World");
		expect(container.querySelector("code.md-inline")?.textContent).toBe("alpha");
		expect(
			Array.from(container.querySelectorAll("li")).map((li) => li.textContent?.trim()),
		).toEqual(["one", "two"]);
		expect(container.querySelector("pre code")?.textContent).toBe("sk dev up");
	});

	it("shows raw HTML as text and never creates its elements", () => {
		const { container } = render(Markdown, {
			source: 'Hi <img src=x onerror="alert(1)"> <script>alert(2)</script>',
		});
		expect(container.querySelector("img, script")).toBeNull();
		expect(container.textContent).toContain("<script>alert(2)</script>");
	});

	it("links only http(s) and mailto targets", () => {
		const { container } = render(Markdown, {
			source: "[ok](https://spellkave.com) [bad](javascript:alert(1))",
		});
		const links = Array.from(container.querySelectorAll("a"));
		expect(links.map((a) => a.getAttribute("href"))).toEqual(["https://spellkave.com/"]);
		expect(links[0]?.getAttribute("rel")).toBe("noopener noreferrer");
		expect(container.textContent).toContain("bad");
		expect(safeHref("mailto:a@b.c")).toBe("mailto:a@b.c");
		expect(safeHref("/relative")).toBeUndefined();
	});

	it("keeps single newlines as line breaks and renders tables", () => {
		const { container } = render(Markdown, {
			source: "line one\nline two\n\n| a | b |\n|---|---|\n| 1 | 2 |",
		});
		expect(container.querySelector("p br")).not.toBeNull();
		expect(Array.from(container.querySelectorAll("td")).map((td) => td.textContent)).toEqual([
			"1",
			"2",
		]);
	});
});
