export type TocItem = {
	title: string;
	url: string;
	items?: TocItem[];
};

export function headingsToToc(root: HTMLElement | null): TocItem[] {
	if (!root) return [];
	const headings = Array.from(root.querySelectorAll("h2, h3"));
	const items: TocItem[] = [];
	for (const heading of headings) {
		if (!heading.id) continue;
		const title = heading.textContent?.trim() ?? "";
		if (!title) continue;
		const item: TocItem = { title, url: `#${heading.id}` };
		if (heading.tagName === "H3" && items.length > 0) {
			const parent = items[items.length - 1];
			if (!parent) continue;
			parent.items = parent.items ?? [];
			parent.items.push(item);
		} else {
			items.push(item);
		}
	}
	return items;
}

export function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 64);
}
