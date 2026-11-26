export interface TextUsage {
	input?: number;
	output?: number;
	cost?: number;
}

export interface TextGenerateResult {
	text: string;
	model: string;
	usage: TextUsage;
}

export interface TextGenerateInput {
	system: string;
	user: string;
	modelRef: string;
}

export interface TextProvider {
	id: string;
	generate(input: TextGenerateInput): Promise<TextGenerateResult>;
}

function splitRef(ref: string): { provider: string; id: string } {
	const slash = ref.indexOf("/");
	if (slash <= 0 || slash === ref.length - 1) {
		throw new Error(`model must be provider/id (got ${ref})`);
	}
	return { provider: ref.slice(0, slash), id: ref.slice(slash + 1) };
}

export function createFakeTextProvider(replies: Record<string, string>): TextProvider {
	return {
		id: "fake",
		async generate(input) {
			const text = replies[input.modelRef] ?? replies["*"];
			if (text === undefined) throw new Error(`fake provider has no reply for ${input.modelRef}`);
			return { text, model: input.modelRef, usage: { input: 1, output: 1, cost: 0 } };
		},
	};
}

export async function createPiTextProvider(): Promise<TextProvider> {
	const { builtinModels } = await import("@earendil-works/pi-ai/providers/all");
	const models = builtinModels();
	return {
		id: "pi-ai",
		async generate(input) {
			const { provider, id } = splitRef(input.modelRef);
			const model = models.getModel(provider, id);
			if (!model) throw new Error(`unknown model ${input.modelRef}`);
			const response = await models.completeSimple(model, {
				systemPrompt: input.system,
				messages: [{ role: "user", content: input.user, timestamp: Date.now() }],
			});
			const text = response.content
				.flatMap((block) => (block.type === "text" ? [block.text] : []))
				.join("")
				.trim();
			if (!text) throw new Error(`${input.modelRef} returned empty content`);
			return {
				text,
				model: response.model ?? input.modelRef,
				usage: {
					input: response.usage?.input,
					output: response.usage?.output,
					cost: response.usage?.cost?.total,
				},
			};
		},
	};
}
