export function routeFromHash(hash: string): { path: string; section: string } {
	const raw = (hash.startsWith("#") ? hash.slice(1) : hash) || "/";
	const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
	const withoutQuery = withSlash.split("?")[0] ?? "/";
	const query = withSlash.includes("?") ? withSlash.slice(withSlash.indexOf("?") + 1) : "";
	return {
		path: withoutQuery.replace(/\/+$/, "") || "/",
		section: new URLSearchParams(query).get("section") ?? "",
	};
}

export const router = $state({
	...routeFromHash(typeof window === "undefined" ? "" : window.location.hash),
});

export function syncRoute(): void {
	Object.assign(router, routeFromHash(window.location.hash));
}

export function startRouter(): () => void {
	syncRoute();
	window.addEventListener("hashchange", syncRoute);
	return () => window.removeEventListener("hashchange", syncRoute);
}

export function href(path: string, section?: string): string {
	const base = path === "/" ? "#/" : `#${path}`;
	return section ? `${base}?${new URLSearchParams({ section })}` : base;
}

export function navigate(path: string): void {
	window.location.hash = path === "/" ? "/" : path;
}
