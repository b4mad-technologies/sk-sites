<script lang="ts">
	import { rowViewFor } from "@spellkave/ui-widgets/catalogue";
	import { recordForKind } from "./kind-records";

	let { kind }: { kind: string } = $props();

	const registration = $derived.by(() => {
		const found = rowViewFor(kind);
		if (found === undefined) {
			throw new Error(`No catalogue widget registered for ${kind}`);
		}
		return found;
	});
	const record = $derived(recordForKind(kind));
	const row = $derived(registration.project(record, undefined, () => undefined));
	const View = $derived(registration.component);
</script>

<div class="flex w-full flex-col gap-8">
	<p data-testid="kind-demo-fixture-note" class="text-sm text-[color:var(--muted-foreground)]">
		Illustrative kind-scoped fixture. Reference targets remain unlinked here because UI Lab has no
		catalogue-page resolver; production documentation supplies that resolver before projection.
	</p>
	<p class="sk-label text-[color:var(--muted-foreground)]">view: full</p>
	<View {row} view="full" />
	<p class="sk-label text-[color:var(--muted-foreground)]">view: compact</p>
	<View {row} view="compact" />
	<p class="sk-label text-[color:var(--muted-foreground)]">view: inline</p>
	<View {row} view="inline" />
</div>
