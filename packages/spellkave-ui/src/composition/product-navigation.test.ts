import { describe, expect, it } from "vitest";
import { PRODUCT_APP_URLS, productNavigation } from "./product-navigation";

describe("productNavigation", () => {
	it("returns Play, Chat, Account, Admin, Maps in that order with the shared hrefs", () => {
		const items = productNavigation();

		expect(items.map((item) => item.label)).toEqual(["Play", "Chat", "Account", "Admin", "Maps"]);
		expect(items.map((item) => item.href)).toEqual([
			PRODUCT_APP_URLS.play,
			PRODUCT_APP_URLS.chat,
			PRODUCT_APP_URLS.account,
			PRODUCT_APP_URLS.admin,
			PRODUCT_APP_URLS.maps,
		]);
		expect(items.every((item) => item.current !== true)).toBe(true);
	});

	it("flags exactly the matching current item", () => {
		const items = productNavigation("maps");

		expect(items.filter((item) => item.current === true).map((item) => item.label)).toEqual([
			"Maps",
		]);
		expect(items.find((item) => item.label === "Maps")?.href).toBe(PRODUCT_APP_URLS.maps);
	});
});
