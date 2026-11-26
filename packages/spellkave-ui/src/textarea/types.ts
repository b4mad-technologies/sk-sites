import type { HTMLTextareaAttributes } from "svelte/elements";
import type { WithElementRef, WithoutChildren } from "../lib/utils";

export type TextareaProps = WithoutChildren<WithElementRef<HTMLTextareaAttributes>>;
