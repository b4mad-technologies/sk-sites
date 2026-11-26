import {
	applyStoredTheme,
	applyThemeToDocument,
	persistThemeCookie,
	resolveStoredThemeId,
} from "./boot";
import { DEFAULT_THEME_ID, isThemeId } from "./themes";

export const theme = $state({
	id: DEFAULT_THEME_ID,
});

export function setTheme(id: string): void {
	const next = isThemeId(id) ? id : DEFAULT_THEME_ID;
	theme.id = next;
	applyThemeToDocument(next);
	persistThemeCookie(next);
}

export function initTheme(): void {
	const id = resolveStoredThemeId();
	theme.id = id;
	applyStoredTheme();
}
