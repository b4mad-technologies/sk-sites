import type { WovenCornerVariant, WovenDividerVariant, WovenIconName } from "./assets";

export type WovenIconSize = "xs" | "sm" | "md" | "lg" | "xl";
export type WovenCornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface WovenIconProps {
	name: WovenIconName;
	label?: string;
	size?: WovenIconSize;
	class?: string;
}

export interface WovenDividerProps {
	variant?: WovenDividerVariant;
	class?: string;
}

export interface WovenCornerProps {
	variant?: WovenCornerVariant;
	position?: WovenCornerPosition;
	class?: string;
}
