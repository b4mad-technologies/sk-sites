import type { HTMLAnchorAttributes } from "svelte/elements";
import { tv, type VariantProps } from "tailwind-variants";
import { loomFocus } from "../lib/loom";
import type { WithElementRef } from "../lib/utils";

export const badgeVariants = tv({
	base: `${loomFocus} group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-[var(--radius)] border border-transparent px-2 py-0.5 text-xs font-semibold tracking-[0.08em] [&>svg]:pointer-events-none [&>svg]:size-3`,
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground",
			secondary: "bg-secondary text-secondary-foreground",
			destructive: "bg-destructive/10 text-destructive",
			outline: "border-border text-foreground",
			ghost: "text-foreground",
			link: "text-primary underline-offset-4 hover:underline",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export type BadgeProps = WithElementRef<HTMLAnchorAttributes> & {
	variant?: BadgeVariant;
};
