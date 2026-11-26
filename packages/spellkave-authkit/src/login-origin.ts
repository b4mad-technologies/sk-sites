/**
 * Build variable naming the login site (ADR-0161 D-2) the sign-out posts to.
 * There is no default: a build pointed at the wrong login site would revoke
 * another environment's grants. Non-dev builds fail without it
 * (`requireLoginOrigin` in `vite.ts`); an invalid value throws.
 * No imports: Node loads this file from Vite configs.
 */
export const LOGIN_ORIGIN_ENV = "VITE_SPELLKAVE_LOGIN_ORIGIN";

/**
 * The login origin from {@link LOGIN_ORIGIN_ENV}: undefined when unset; throws
 * when set to anything but a bare https origin (plain http only on loopback).
 */
export function parseLoginOrigin(raw: string | undefined): string | undefined {
	const value = raw?.trim() ?? "";
	if (value === "") return undefined;
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${LOGIN_ORIGIN_ENV} is not a URL: ${value}`);
	}
	const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
		throw new Error(`${LOGIN_ORIGIN_ENV} must use https (http only on loopback): ${value}`);
	if ((url.pathname !== "/" && url.pathname !== "") || url.search !== "" || url.hash !== "")
		throw new Error(`${LOGIN_ORIGIN_ENV} must be a bare origin: ${value}`);
	return url.origin;
}
