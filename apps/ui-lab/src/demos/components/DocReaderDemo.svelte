<script lang="ts">
	import {
		DocIndex,
		type DocIndexGroup,
		FreshnessBadge,
		mermaidDiagrams,
		ReadingPath,
		type ReadingRole,
	} from "@spellkave/ui/doc-reader";

	const now = new Date("2026-10-16T12:00:00Z");
	const roles: ReadingRole[] = [
		{
			id: "author",
			title: "World author",
			who: "You write world content: places, spells, NPCs, adventures.",
			steps: [
				{ title: "Role page", href: "#role", why: "Routes every authoring question to the right document." },
				{ title: "Tutorial: your first adventure", href: "#tutorial", why: "From an empty node to a cottage you can walk." },
				{ title: "Pattern index", href: "#patterns", why: "How to express X before you ask for a kernel change." },
			],
		},
		{
			id: "operator",
			title: "Operator",
			who: "You run or recover the live deployment.",
			steps: [
				{ title: "Runtime topology", href: "#topology", why: "What runs where, and who owns each layer." },
				{ title: "Release", href: "#release", why: "Which workflow to dispatch for which change." },
			],
		},
	];
	const groups: DocIndexGroup[] = [
		{
			title: "Kernel and interaction model",
			entries: [
				{ key: "0021", label: "ADR-0021", title: "Generic affordance substrate", href: "#0021", status: { label: "Active", tone: "good" } },
				{ key: "0048", label: "ADR-0048", title: "Deferred external resolution", href: "#0048", status: { label: "Proposed", tone: "info" } },
				{
					key: "0046",
					label: "ADR-0046",
					title: "An older decision",
					href: "#0046",
					status: { label: "Superseded by 0052", tone: "muted" },
					links: [{ relation: "superseded by", label: "ADR-0052", href: "#0052" }],
				},
			],
		},
		{
			title: "Capabilities",
			entries: [
				{ key: "pool", title: "ci-runner-pool", href: "#pool", summary: "How the self-hosted runners start, scale and roll back.", status: { label: "12 requirements", tone: "neutral" } },
			],
		},
	];
	const diagram = `<pre><code class="language-mermaid">flowchart LR
  client[Client] --> kernel[Kernel]
  kernel --> world[(World tables)]
  kernel -. affordances .-> client</code></pre>`;
	const prevent = (_href: string, event: MouseEvent) => event.preventDefault();
</script>

<div class="flex flex-col gap-8">
	<div class="flex flex-wrap items-center gap-3">
		<FreshnessBadge date="2026-10-13T09:00:00Z" commit="77bff83b000a90bb" href="#commit" {now} />
		<FreshnessBadge date="2026-07-01T09:00:00Z" {now} />
		<FreshnessBadge date="2025-09-01T09:00:00Z" {now} />
		<FreshnessBadge date={null} />
	</div>
	<div class="rounded-[var(--radius)] border border-border bg-card p-6">
		<ReadingPath {roles} onNavigate={prevent} />
	</div>
	<DocIndex {groups} filterLabel="Filter decisions" onNavigate={prevent} />
	<div {@attach mermaidDiagrams}>{@html diagram}</div>
</div>
