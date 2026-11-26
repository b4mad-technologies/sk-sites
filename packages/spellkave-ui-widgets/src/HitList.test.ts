import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HitList from "./HitList.svelte";

describe("HitList", () => {
	it("lists titled hits as primary links", () => {
		const onSelect = vi.fn();
		render(HitList, {
			props: {
				hits: [{ id: "1", title: "Aldwin", meta: "Person · Inn" }],
				onSelect,
			},
		});
		const aldwin = screen.getByRole("button", { name: /Aldwin/ });
		expect(aldwin.querySelector(".text-primary")).toBeTruthy();
		aldwin.click();
		expect(onSelect).toHaveBeenCalledWith("1", 0);
	});
});
