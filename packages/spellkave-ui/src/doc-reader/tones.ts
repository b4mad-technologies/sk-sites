import type { DocTone } from "./types";

/** Pill colours by tone, the same language as Spire's fact labels. */
export const TONE_CLASSES: Record<DocTone, string> = {
	good: "border-accent/40 bg-accent/10 text-foreground",
	info: "border-primary/40 bg-primary/10 text-foreground",
	neutral: "border-border text-foreground",
	muted: "border-dashed border-border text-muted-foreground",
	alert: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const DOT_CLASSES: Record<DocTone, string> = {
	good: "bg-accent",
	info: "bg-primary",
	neutral: "bg-muted-foreground",
	muted: "border border-muted-foreground",
	alert: "bg-destructive",
};
