import type { ProductNavItem } from "./types";

export const PRODUCT_APP_URLS = {
	play: "https://play.spellkave.com/",
	chat: "https://chat.spellkave.com/",
	account: "https://account.spellkave.com/",
	admin: "https://admin.spellkave.com/",
	maps: "https://maps.spellkave.com/",
} as const;

export type ProductNavKey = keyof typeof PRODUCT_APP_URLS;

const PRODUCT_NAV: readonly { key: ProductNavKey; label: string }[] = [
	{ key: "play", label: "Play" },
	{ key: "chat", label: "Chat" },
	{ key: "account", label: "Account" },
	{ key: "admin", label: "Admin" },
	{ key: "maps", label: "Maps" },
];

export function productNavigation(current?: ProductNavKey): ProductNavItem[] {
	return PRODUCT_NAV.map(({ key, label }) => ({
		label,
		href: PRODUCT_APP_URLS[key],
		...(current === key ? { current: true as const } : {}),
	}));
}
