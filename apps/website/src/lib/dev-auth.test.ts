import { describe, expect, it } from "vitest";

import { applyDevSession, isDevAuthEnabled, sessionFromDevToken } from "./dev-auth";

describe("dev-auth", () => {
	it("builds a session from a non-empty token", () => {
		const session = sessionFromDevToken("  abc.token  ", "hero");
		expect(session).toMatchObject({
			access_token: "abc.token",
			display_name: "hero",
		});
		expect(sessionFromDevToken("   ")).toBeNull();
	});

	it("is only enabled under import.meta.env.DEV", () => {
		// vitest runs with DEV=true; production builds tree-shake the paste UI.
		expect(isDevAuthEnabled()).toBe(import.meta.env.DEV === true);
	});

	it("applyDevSession writes sessionStorage when DEV", () => {
		const store = new Map<string, string>();
		const storage = {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => {
				store.set(k, v);
			},
			removeItem: (k: string) => {
				store.delete(k);
			},
		} as Storage;
		const ok = applyDevSession(storage, "tok-1", "dev");
		if (import.meta.env.DEV) {
			expect(ok).toBe(true);
			expect(store.size).toBeGreaterThan(0);
		} else {
			expect(ok).toBe(false);
		}
	});
});
