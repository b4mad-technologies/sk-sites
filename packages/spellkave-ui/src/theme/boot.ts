import { DEFAULT_THEME_ID, isThemeId, schemeForTheme } from "./themes.ts";

export const THEME_COOKIE_NAME = "sk_theme";

/**
 * Inline <script> for `<head>`. No imports, no top-level await.
 * Vite apps inject this via `spellkaveThemeBoot()` (`@spellkave/ui/vite`).
 * The string export remains for non-Vite consumers.
 */
export const THEME_BOOT_SCRIPT =
	'(function(){var C="sk_theme";var D="living-grammar";var S={"loom-paper":"light","worlds-in-motion":"dark"};function read(){var p=document.cookie.split(";");for(var i=0;i<p.length;i++){var s=p[i].replace(/^\\s+/,"");if(s.indexOf(C+"=")==0){try{return decodeURIComponent(s.slice(C.length+1))}catch(e){return""}}}return""}var id=read()||D;var root=document.documentElement;if(id!==D&&S[id]){root.setAttribute("data-theme",id)}else{root.removeAttribute("data-theme");id=D}root.style.colorScheme=S[id]||"dark"})();';

function readCookie(): string {
	if (typeof document === "undefined") return "";
	const prefix = `${THEME_COOKIE_NAME}=`;
	for (const part of document.cookie.split(";")) {
		const trimmed = part.trim();
		if (trimmed.startsWith(prefix)) {
			try {
				return decodeURIComponent(trimmed.slice(prefix.length));
			} catch {
				return "";
			}
		}
	}
	return "";
}

export function cookieDomainAttribute(hostname: string): string {
	if (hostname === "spellkave.com" || hostname.endsWith(".spellkave.com")) {
		return "; Domain=.spellkave.com";
	}
	return "";
}

export function applyThemeToDocument(id: string): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	if (id === DEFAULT_THEME_ID) {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", id);
	}
	root.style.colorScheme = schemeForTheme(id);
}

export function persistThemeCookie(id: string): void {
	if (typeof document === "undefined") return;
	const hostname = globalThis.location?.hostname ?? "";
	document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; SameSite=Lax; Max-Age=31536000${cookieDomainAttribute(hostname)}`;
}

export function resolveStoredThemeId(): string {
	const stored = readCookie();
	return stored && isThemeId(stored) ? stored : DEFAULT_THEME_ID;
}

/** Same cookie → document mapping as THEME_BOOT_SCRIPT, for tests and hydrate. */
export function applyStoredTheme(): string {
	const id = resolveStoredThemeId();
	applyThemeToDocument(id);
	return id;
}
