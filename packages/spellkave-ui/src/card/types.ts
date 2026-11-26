import type { HTMLAttributes } from "svelte/elements";
import type { WithElementRef } from "../lib/utils";

export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
	size?: "default" | "sm";
};

export type CardHeaderProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
export type CardTitleProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
export type CardDescriptionProps = WithElementRef<HTMLAttributes<HTMLParagraphElement>>;
export type CardContentProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
export type CardFooterProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
export type CardActionProps = WithElementRef<HTMLAttributes<HTMLDivElement>>;
