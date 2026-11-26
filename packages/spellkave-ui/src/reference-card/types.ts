export interface ReferenceFact {
	label: string;
	value: string;
	href?: string;
	onClick?: (event: MouseEvent) => void;
}

export interface ReferenceCardProps {
	label: string;
	title: string;
	href?: string;
	facts?: ReferenceFact[];
	art?: { href: string; alt?: string };
	/** SPA navigate. Caller preventDefault when it owns routing. */
	onNavigate?: (event: MouseEvent) => void;
	class?: string;
}
