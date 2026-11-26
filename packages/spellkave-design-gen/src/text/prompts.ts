import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Eta } from "eta";
import type { PromptId } from "./manifest.ts";

const views = join(dirname(fileURLToPath(import.meta.url)), "../../templates");
const eta = new Eta({ views, autoEscape: false, cache: true });

export interface PromptData {
	display_name: string;
	core_traits: Record<string, string>;
}

export function renderPrompt(id: PromptId, data: PromptData): { system: string; user: string } {
	return {
		system: eta.render(`${id}.system.eta`, data).trim(),
		user: eta.render(`${id}.user.eta`, data).trim(),
	};
}
