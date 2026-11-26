export function catalogueOpen(href: string, event?: MouseEvent): void {
	if (event) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		event.preventDefault();
	}
	window.history.pushState({}, "", href);
	window.dispatchEvent(new PopStateEvent("popstate"));
	window.scrollTo({ top: 0 });
}
