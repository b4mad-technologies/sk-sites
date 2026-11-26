import type { HTMLInputAttributes } from "svelte/elements";

export type FieldProps = Omit<HTMLInputAttributes, "value"> & {
	label: string;
	description?: string;
	error?: string;
	value?: string;
	ref?: HTMLInputElement | null;
};
