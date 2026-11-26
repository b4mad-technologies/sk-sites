import type { CiHealthState } from "./ci-types";

/** The health dot's colour: the outcome bar's colours for green and red work, muted for too few runs. */
export const HEALTH_DOT: Record<CiHealthState, string> = {
	healthy: "bg-accent",
	"needs attention": "bg-destructive",
	"too few runs": "bg-muted-foreground/50",
};
