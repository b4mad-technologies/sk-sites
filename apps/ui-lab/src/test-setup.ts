class ResizeObserverStub {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}

class IntersectionObserverStub implements IntersectionObserver {
	readonly root = null;
	readonly rootMargin = "";
	readonly thresholds = [];
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}
}

if (typeof globalThis.ResizeObserver === "undefined") {
	globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof globalThis.IntersectionObserver === "undefined") {
	globalThis.IntersectionObserver =
		IntersectionObserverStub as unknown as typeof IntersectionObserver;
}

if (typeof window.matchMedia !== "function") {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener(): void {},
			removeListener(): void {},
			addEventListener(): void {},
			removeEventListener(): void {},
			dispatchEvent(): boolean {
				return false;
			},
		}) as MediaQueryList;
}
