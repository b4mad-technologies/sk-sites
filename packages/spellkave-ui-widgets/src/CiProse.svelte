<script lang="ts">
	/**
	 * Prose from CI comments with its references made clickable: repository
	 * paths, ADR numbers and issue numbers. The caller decides where each one
	 * goes (Spire opens docs in place, code on GitHub); a reference it cannot
	 * resolve stays plain text, with its kind as a hover.
	 */
	import type { CiProseProps, CiReference } from "./ci-types";

	let { text, resolve, class: className }: CiProseProps = $props();

	const PATTERN =
		/((?:\.github|\.agents|docs|scripts|packages|apps|specifications|just|infra|crates|server|client|ledger|openspec)\/[\w./-]*[\w-](?:\.[A-Za-z]+)?)|(ADR-\d{4}(?: D-\d+)?)|(#\d{2,6})\b|(sk-(?=[a-z]*[0-9])[a-z0-9]+(?:\.[0-9]+)*)/g;

	type Segment = { text: string; ref?: CiReference; code?: boolean };

	// `inline code` stays code: a command or flag, not a reference to follow.
	function linked(part: string): Segment[] {
		const out: Segment[] = [];
		let last = 0;
		for (const match of part.matchAll(PATTERN)) {
			const index = match.index ?? 0;
			if (index > last) out.push({ text: part.slice(last, index) });
			const [whole, path, adr, issue, bead] = match;
			const ref: CiReference = path
				? { kind: "path", value: path }
				: adr
					? { kind: "adr", value: adr }
					: issue
						? { kind: "issue", value: issue }
						: { kind: "bead", value: bead as string };
			out.push({ text: whole, ref });
			last = index + whole.length;
		}
		if (last < part.length) out.push({ text: part.slice(last) });
		return out;
	}

	const segments = $derived(
		text
			.split(/`([^`\n]+)`/)
			.flatMap((part, index) => (index % 2 === 1 ? [{ text: part, code: true }] : linked(part))),
	);

	const KIND: Record<CiReference["kind"], string> = {
		path: "file in the repository",
		adr: "architecture decision record",
		issue: "GitHub issue",
		bead: "work item in the beads tracker (bd show <id>)",
	};
</script>

<span class={["whitespace-pre-line", className]} data-slot="ci-prose"
	>{#each segments as segment, index (index)}{#if segment.code}<code class="rounded-sm bg-muted px-1 font-mono text-[0.85em]">{segment.text}</code>{:else if segment.ref}{@const link = resolve?.(segment.ref)}{#if link}<a
					class="text-primary underline-offset-2 hover:underline"
					href={link.href}
					title={KIND[segment.ref.kind]}
					{...link.external ? { target: "_blank", rel: "noreferrer" } : {}}
					onclick={link.onClick
						? (event) => {
								event.preventDefault();
								link.onClick?.();
							}
						: undefined}>{segment.text}</a
				>{:else}<span class="underline decoration-dotted underline-offset-2" title={KIND[segment.ref.kind]}>{segment.text}</span
				>{/if}{:else}{segment.text}{/if}{/each}</span
>
