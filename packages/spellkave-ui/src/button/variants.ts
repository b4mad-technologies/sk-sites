import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
import { tv, type VariantProps } from "tailwind-variants";
import type { WithElementRef } from "../lib/utils";

export const buttonVariants = tv({
	base: "group/button relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding text-sm font-medium outline-none transition-all select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground hover:bg-primary/85",
			outline:
				"border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
			secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
			ghost:
				"hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
			destructive:
				"bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
			link: "text-primary underline-offset-4 hover:underline",
			// Height is the size slot's job (below), not the variant's: baking
			// h-11/min-h-11 in here clamped every size=sm woven button to 44px
			// visually, since tailwind-merge resolves the height (h-*) conflict
			// against size's h-7 but nothing here competed with min-h-11.
			hero: "sk-label rounded-[var(--radius)] bg-primary px-7 text-primary-foreground",
			"hero-outline": "sk-label rounded-[var(--radius)] bg-background px-7 text-foreground",
			"woven-primary": "sk-label rounded-[var(--radius)] bg-primary px-7 text-primary-foreground",
			"woven-secondary": "sk-label rounded-[var(--radius)] bg-background px-7 text-foreground",
			"woven-icon": "rounded-[var(--radius)] bg-background text-foreground",
		},
		size: {
			default: "h-11 min-h-11 gap-1.5 px-2.5",
			// B after target is height-only (inset-x-0): horizontal neighbours never collide at any gap; a wrapping row of B-size Buttons needs row gap ≥ 20px (xs) / 18px (sm).
			xs: "isolate h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] [&_svg:not([class*='size-'])]:size-3",
			sm: "isolate h-7 min-h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] [&_svg:not([class*='size-'])]:size-3.5",
			lg: "h-11 min-h-11 gap-1.5 px-3",
			icon: "size-11",
			"icon-xs":
				"isolate size-6 rounded-[min(var(--radius-md),10px)] after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] [&_svg:not([class*='size-'])]:size-3",
			"icon-sm":
				"isolate size-7 rounded-[min(var(--radius-md),12px)] after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
			"icon-lg": "size-11",
			compact: "size-11 p-0",
			seal: "size-12 rounded-full p-0",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
	},
});

export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
	WithElementRef<HTMLAnchorAttributes> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
		children?: Snippet;
	};
