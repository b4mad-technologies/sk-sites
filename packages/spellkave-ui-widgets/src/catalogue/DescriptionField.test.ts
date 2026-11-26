import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import DescriptionField from "./DescriptionField.svelte";

describe("DescriptionField", () => {
	it("renders the description with the field line underneath, and no raw-value chrome", () => {
		render(DescriptionField, {
			props: {
				description: "An authored description.",
				field: "entity_definitions.description",
				context: "Manifest field",
			},
		});
		expect(
			within(screen.getByTestId("description-rendered")).getByText("An authored description."),
		).toBeTruthy();
		const fieldLine = screen.getByText("entity_definitions.description").closest("p");
		expect(fieldLine?.textContent).toBe("Manifest field · entity_definitions.description");
		expect(screen.queryByText("Raw value")).toBeNull();
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("names the section by the heading prop for assistive tech", () => {
		render(DescriptionField, {
			props: {
				description: "An authored description.",
				field: "docs catalogue entry.description",
				heading: "Docs summary",
				context: "Documentation projection",
			},
		});
		expect(screen.getByRole("region", { name: "Docs summary" })).toBeTruthy();
	});

	it("shows the authored-nothing message when the description is empty", () => {
		render(DescriptionField, { description: "", field: "entity_definitions.description" });
		expect(screen.getByTestId("description-rendered").textContent).toContain(
			"No description is authored in this manifest field.",
		);
	});

	it("omits the manifest-field caption when no field is given (a live subject)", () => {
		render(DescriptionField, { props: { description: "Heavy interlocking rings." } });
		expect(screen.getByTestId("description-rendered").textContent).toContain(
			"Heavy interlocking rings.",
		);
		expect(screen.queryByText(/Manifest field/)).toBeNull();
		expect(document.querySelector("code")).toBeNull();
	});
});
