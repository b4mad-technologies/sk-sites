import { fireEvent, render, screen } from "@testing-library/svelte";
import { expect, it, vi } from "vitest";
import Actions from "./Actions.svelte";
import Description from "./Description.svelte";

it("omits empty prose and renders authored markup as text", () => {
	const empty = render(Description, { text: "  " });
	expect(empty.container.querySelector("details")).toBeNull();
	empty.unmount();
	const prose = render(Description, {
		text: "<b>Authored text</b>\nSecond line",
		label: "Read more",
	});
	expect(prose.container.querySelector("b")).toBeNull();
	expect(prose.container.querySelector("details")?.open).toBe(false);
	expect(screen.getByText(/Authored text/).textContent).toContain("<b>");
});

it("opens an explanation independently from executing its action", async () => {
	const onAct = vi.fn();
	render(Actions, {
		actions: [
			{
				id: "inspect",
				label: "Inspect",
				verb: "sensing",
				description: "Study the visible markings.",
			},
		],
		onAct,
	});
	const summary = screen.getByText("About Inspect");
	await fireEvent.click(summary);
	expect(summary.closest("details")?.open).toBe(true);
	expect(onAct).not.toHaveBeenCalled();
	await fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
	expect(onAct).toHaveBeenCalledExactlyOnceWith("inspect");
});
