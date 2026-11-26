export const loomFocus =
	"outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

export const loomFrame = "rounded-[var(--radius)] border border-[color:var(--border)]";

export const loomTrigger = `${loomFrame} ${loomFocus} sk-label inline-flex min-h-11 items-center justify-center bg-[color:var(--background)] px-4 text-[color:var(--foreground)] disabled:pointer-events-none disabled:opacity-40`;

export const loomPanel = `${loomFrame} bg-[color:var(--card)] text-[color:var(--foreground)] shadow-none`;
