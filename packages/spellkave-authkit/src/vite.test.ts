import { describe, expect, it } from "vitest";
import { checkLoginOrigin } from "./vite";

const prodBuild = { command: "build" as const, mode: "production" };

describe("requireLoginOrigin build guard", () => {
	it("fails a production or staging build without a login origin", () => {
		expect(() => checkLoginOrigin(prodBuild, {})).toThrow(/required for a production build/);
		expect(() => checkLoginOrigin({ command: "build", mode: "staging" }, {})).toThrow(
			/required for a staging build/,
		);
	});

	it("fails any build or dev server with an invalid login origin", () => {
		expect(() =>
			checkLoginOrigin(prodBuild, { VITE_SPELLKAVE_LOGIN_ORIGIN: "http://login.spellkave.com" }),
		).toThrow(/must use https/);
		expect(() =>
			checkLoginOrigin(
				{ command: "serve", mode: "development" },
				{ VITE_SPELLKAVE_LOGIN_ORIGIN: "nope" },
			),
		).toThrow(/not a URL/);
	});

	it("passes a valid origin, and a dev server or development build without one", () => {
		expect(() =>
			checkLoginOrigin(prodBuild, { VITE_SPELLKAVE_LOGIN_ORIGIN: "https://login.spellkave.com" }),
		).not.toThrow();
		expect(() => checkLoginOrigin({ command: "serve", mode: "development" }, {})).not.toThrow();
		expect(() => checkLoginOrigin({ command: "build", mode: "development" }, {})).not.toThrow();
	});
});
