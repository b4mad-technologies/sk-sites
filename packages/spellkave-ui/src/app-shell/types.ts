import type { Snippet } from "svelte";

export interface AppShellProps {
	/** Left sidebar body (navigation). */
	sidebar: Snippet;
	/** Top bar content after the sidebar toggle, e.g. a title and status. */
	topbar?: Snippet;
	/** Main area, e.g. a transcript and composer. */
	children: Snippet;
	/** Right dock body; the dock shows while `dockOpen`. */
	dock?: Snippet;
	dockOpen?: boolean;
	/** Title of the dock, read by its close button. */
	dockLabel?: string;
	ondockclose?: () => void;
	/** Desktop: the sidebar is shown (else collapsed). Phone: the drawer is open. */
	sidebarOpen?: boolean;
	/** Sidebar width in px on desktop, changed by dragging its edge. */
	sidebarWidth?: number;
	/** Accessible name of the sidebar navigation. */
	sidebarLabel?: string;
	class?: string;
}

export interface SidebarItemProps {
	label: string;
	/** Second line, e.g. a world's adventure or a run state's words. */
	detail?: string;
	/** A small status mark before the label. */
	mark?: "busy" | "ok" | "failed" | "stopped" | "idle";
	/** Text on the right, e.g. a badge's words. */
	trailing?: string;
	active?: boolean;
	onclick?: () => void;
	class?: string;
}

export interface SidebarSectionProps {
	title: string;
	children: Snippet;
	/** Actions next to the title. */
	actions?: Snippet;
	class?: string;
}
