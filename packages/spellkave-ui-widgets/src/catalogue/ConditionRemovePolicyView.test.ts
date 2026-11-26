import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ConditionRemovePolicyView, {
	conditionRemovePolicyRowView,
} from "./ConditionRemovePolicyView.svelte";

/**
 * The ONLY `condition_remove_policy_definitions` row in the whole corpus,
 * copied field-for-field from
 * `packages/spellkave-srd-cc/fixtures/base/playing-the-game/cover-conditions.toml`.
 * Both `srd/cover/half` and `srd/cover/three-quarters` point at it via
 * their own `remove_time_policy` column.
 */
const INDEPENDENT_LIFETIME_POLICY: Record<string, unknown> = {
	bundle_id: "srd",
	display_name: "Independent lifetime",
	policy_id: "srd/remove_policy/independent_lifetime",
	remove_predicate_source: "0 == 1",
};

const link = (): string | undefined => undefined;

describe("conditionRemovePolicyRowView", () => {
	it("titles the page from display_name and keeps the policy id as its ref", () => {
		const row = conditionRemovePolicyRowView(
			INDEPENDENT_LIFETIME_POLICY,
			"/docs/srd/mechanics/condition-remove-policies/x",
			link,
		);
		expect(row.title).toBe("Independent lifetime");
		expect(row.ref).toBe("srd/remove_policy/independent_lifetime");
		expect(row.kind_label).toBe("Remove policy");
	});

	it("leads with the auto-remove predicate rather than the raw column name", () => {
		const row = conditionRemovePolicyRowView(INDEPENDENT_LIFETIME_POLICY, undefined, link);
		expect(row.fields.map((field) => field.label)).toEqual([
			"Auto-remove when",
			"Policy ID",
			"Owning bundle",
		]);
		expect(row.fields[0]?.value).toBe("0 == 1");
	});

	it("does not treat the predicate expression as a linkable id", () => {
		const row = conditionRemovePolicyRowView(INDEPENDENT_LIFETIME_POLICY, undefined, link);
		const predicate = row.fields.find((f) => f.label === "Auto-remove when");
		expect(predicate?.code).toBeUndefined();
		expect(predicate?.href).toBeUndefined();
	});
});

describe("ConditionRemovePolicyView", () => {
	const row = conditionRemovePolicyRowView(
		INDEPENDENT_LIFETIME_POLICY,
		"/docs/srd/mechanics/condition-remove-policies/x",
		link,
	);

	it("renders inline as a linked one-liner carrying the raw ref", () => {
		const { unmount } = render(ConditionRemovePolicyView, { row, view: "inline" });
		expect(screen.getByRole("link", { name: "Independent lifetime" })).toBeTruthy();
		expect(screen.getByText("srd/remove_policy/independent_lifetime")).toBeTruthy();
		unmount();
	});

	it("renders compact as a card naming its kind", () => {
		const { unmount } = render(ConditionRemovePolicyView, { row, view: "compact" });
		expect(screen.getAllByText(/Independent lifetime/).length).toBeGreaterThan(0);
		expect(screen.getAllByText("Remove policy").length).toBeGreaterThan(0);
		unmount();
	});

	it("renders full with its title and its fields", () => {
		const { unmount } = render(ConditionRemovePolicyView, { row, view: "full", chrome: true });
		expect(screen.getAllByText(/Independent lifetime/).length).toBeGreaterThan(0);
		expect(screen.getByText("Auto-remove when")).toBeTruthy();
		unmount();
	});

	it("keeps the ref visible at full view even with chrome off, where the title is deliberately omitted", () => {
		const { unmount } = render(ConditionRemovePolicyView, {
			row,
			view: "full",
			chrome: false,
			sections: { details: false },
		});
		expect(screen.getByText("srd/remove_policy/independent_lifetime")).toBeTruthy();
		expect(screen.queryByText("Auto-remove when")).toBeNull();
		unmount();

		render(ConditionRemovePolicyView, {
			row,
			view: "full",
			chrome: false,
			sections: { header: false },
		});
		expect(screen.getByText("Auto-remove when")).toBeTruthy();
	});
});
