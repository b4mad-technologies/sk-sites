/**
 * Build guard for {@link LOGIN_ORIGIN_ENV} (ADR-0161 D-7). A sign-out posts to
 * the login site this variable names, which revokes the person's app grants in
 * that environment. A build that silently pointed at the production login site
 * would let a staging build revoke production grants, so every build except a
 * development one must name it explicitly. Add `requireLoginOrigin()` to the
 * app's Vite plugins.
 */

import { LOGIN_ORIGIN_ENV, parseLoginOrigin } from "./login-origin.ts";

interface ConfigEnv {
	command: "build" | "serve";
	mode: string;
}

/** Throws unless the build names a valid login origin. Pure; exported for tests. */
export function checkLoginOrigin(env: ConfigEnv, vars: Record<string, string | undefined>): void {
	const origin = parseLoginOrigin(vars[LOGIN_ORIGIN_ENV]);
	if (origin === undefined && env.command === "build" && env.mode !== "development")
		throw new Error(
			`${LOGIN_ORIGIN_ENV} is required for a ${env.mode} build (the login site sign-out posts to; e.g. https://login.spellkave.com)`,
		);
}

export function requireLoginOrigin() {
	return {
		name: "spellkave-require-login-origin",
		async config(
			config: { envDir?: string | false; root?: string },
			env: ConfigEnv,
		): Promise<void> {
			const { loadEnv } = await import("vite");
			const envDir =
				typeof config.envDir === "string" ? config.envDir : (config.root ?? process.cwd());
			checkLoginOrigin(env, loadEnv(env.mode, envDir, "VITE_"));
		},
	};
}
