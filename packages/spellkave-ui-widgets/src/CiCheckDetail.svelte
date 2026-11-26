<script lang="ts">
	/**
	 * One check in full, for its own page: what the tool does and what the
	 * repository says about this check, the command, the config with what each
	 * rule means, every test title (filterable) or scenario, and where the
	 * compiler does not check. The host reads all of it from the repository;
	 * this widget only lays it out.
	 */
	import CiCopyCommand from "./CiCopyCommand.svelte";
	import CiIconGlyph from "./CiIconGlyph.svelte";
	import CiProse from "./CiProse.svelte";
	import type { CiCheckDetailProps } from "./ci-types";

	let { detail, resolve, onOpenJob, jobName, workflowName, copyFor }: CiCheckDetailProps = $props();

	const RUNS_LABEL = {
		named: "",
		script: "",
		manual: "manual only",
		none: "not in CI",
	} as const;
	type TestFile = NonNullable<CiCheckDetailProps["detail"]["testFiles"]>[number];
	/**
	 * A file a CI step runs by its path: the tag says where. When the file also
	 * skips by default, this check's own step skips it, so the tag says that too.
	 */
	function runsLabel(testFile: TestFile): string {
		const ci = testFile.ci;
		if (!ci) return "";
		if (ci.runs !== "named") return RUNS_LABEL[ci.runs];
		const names = [...new Set((ci.steps ?? []).map((s) => workflowName?.(s.jobId) ?? s.jobId))];
		return testFile.skipIf?.length ? `skipped here · runs in ${names.join(", ")}` : `also runs in ${names.join(", ")}`;
	}
	function runsHint(testFile: TestFile): string {
		const ci = testFile.ci;
		if (!ci) return "";
		if (ci.runs !== "named") return RUNS_HINT[ci.runs];
		return testFile.skipIf?.length
			? "This check's own step skips the file (see 'Skips when' inside): it needs what that step does not have, e.g. a running world. Another CI job sets that up and runs the file by its path. Click to open that job."
			: "Besides this check's own step, another CI job runs the file by its path. Click to open that job.";
	}
	let copied = $state<string | null>(null);
	function copy(text: string): void {
		const done = () => {
			copied = text;
			setTimeout(() => {
				if (copied === text) copied = null;
			}, 1500);
		};
		// The async clipboard needs a secure context and permission; a selected
		// textarea and the copy command work where it does not.
		const fallback = () => {
			const area = document.createElement("textarea");
			area.value = text;
			area.style.position = "fixed";
			area.style.opacity = "0";
			document.body.append(area);
			area.select();
			if (document.execCommand("copy")) done();
			area.remove();
		};
		if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback);
		else fallback();
	}
	const RUNS_HINT = {
		named: "Its own CI step runs this file by its path, apart from the check's step. Open the file for the step.",
		script: "",
		manual: "Its tests skip unless the condition below is met, and no CI step runs the file by name: someone runs it by hand.",
		none: "No CI step runs this file.",
	} as const;

	let filter = $state("");
	const link = (path: string) => resolve?.({ kind: "path", value: path }) ?? null;
	const file = (path: string) => path.split("/").pop() ?? path;
	const testCount = $derived((detail.testFiles ?? []).reduce((n, f) => n + f.tests.length, 0));
	const uncommented = $derived((detail.escapes?.sources ?? []).filter((e) => !e.why).length);
	const scenarioCount = $derived((detail.features ?? []).reduce((n, f) => n + f.scenarios.length, 0));
	const needle = $derived(filter.trim().toLowerCase());
	const shownFiles = $derived(
		(detail.testFiles ?? [])
			.map((f) => ({
				...f,
				tests: needle ? f.tests.filter((t) => t.toLowerCase().includes(needle)) : f.tests,
			}))
			.filter((f) => !needle || f.tests.length > 0 || f.path.toLowerCase().includes(needle)),
	);
</script>

{#snippet copyButton(text: string)}
	<button
		type="button"
		class="ml-1 rounded-sm border border-border px-1 font-mono text-[0.65rem] text-muted-foreground hover:text-foreground"
		title={`Copy for an agent: ${text}`}
		aria-label="Copy the sk spire command for this test"
		onclick={(event) => {
			event.preventDefault();
			event.stopPropagation();
			copy(text);
		}}>{copied === text ? "copied" : "sk ⧉"}</button
	>
{/snippet}

{#snippet source(path: string, label: string)}
	{@const target = link(path)}
	{#if target}
		<a
			class="font-mono text-[0.7rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
			href={target.href}
			target={target.external ? "_blank" : undefined}
			rel={target.external ? "noreferrer" : undefined}
			onclick={target.onClick
				? (event) => {
						event.preventDefault();
						target.onClick?.();
					}
				: undefined}>{label}</a
		>
	{:else}
		<span class="font-mono text-[0.7rem] text-muted-foreground">{label}</span>
	{/if}
{/snippet}

{#snippet heading(text: string)}
	<p class="text-xs font-medium text-muted-foreground">{text}</p>
{/snippet}

<div class="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3" data-slot="ci-check-detail" aria-label={detail.label}>

	<div class="flex flex-col gap-1">
		{@render heading("The tool")}
		{#if detail.toolNote}
			<p class="max-w-[72ch] text-sm leading-relaxed">{detail.toolNote}</p>
		{/if}
		{#if detail.about}
			<p class="max-w-[72ch] text-sm leading-relaxed"><CiProse text={detail.about.text} {resolve} /></p>
			{@render source(detail.about.path, `from ${file(detail.about.path)}`)}
		{/if}
		{#if !detail.toolNote && !detail.about}
			<p class="flex items-center gap-1.5 text-sm text-muted-foreground italic">
				<CiIconGlyph name="nodata" class="size-3.5" /> Spire cannot read this tool, and no comment explains the script.
			</p>
		{/if}
	</div>

	{#if detail.when}
		<div class="flex flex-col gap-1">
			{@render heading("When it runs")}
			<p class="max-w-[72ch] text-sm leading-relaxed whitespace-pre-line"><CiProse text={detail.when} {resolve} /></p>
			{#if detail.whenPath}{@render source(detail.whenPath, `from ${file(detail.whenPath)}`)}{/if}
		</div>
	{/if}

	<div class="flex flex-col gap-1">
		{@render heading("Run it yourself")}
		<CiCopyCommand command={detail.command} resolved={detail.resolved} />
	</div>

	{#if detail.facts.length > 0}
		<dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
			{#each detail.facts as fact (fact.label)}
				<dt class="text-muted-foreground">{fact.label}</dt>
				<dd class="flex min-w-0 flex-col gap-1">
					<span class="flex flex-wrap items-baseline gap-x-2">
						<!-- With notes the names are listed below, each with what it means. -->
						{#if !fact.notes}<span class="font-mono break-all">{fact.value}</span>{/if}
						{#if fact.path}{@render source(fact.path, file(fact.path))}{/if}
					</span>
					{#if fact.notes}
						<ul class="flex flex-col gap-0.5">
							{#each fact.notes as note (note.name)}
								<li><code class="font-mono">{note.name}</code> <span class="text-muted-foreground">— {note.text}</span></li>
							{/each}
						</ul>
					{/if}
				</dd>
			{/each}
		</dl>
	{/if}

	{#if detail.escapes}
		{@const escapes = detail.escapes}
		<div class="flex flex-col gap-2" data-slot="ci-type-escapes">
			{@render heading("Where the compiler does not check")}
			<p class="flex flex-wrap items-center gap-2 text-sm">
				{#if escapes.sources.length === 0}
					<CiIconGlyph name="check" class="size-4 text-accent" />
					<span>No escape in the sources: the compiler checks every line it sees.</span>
				{:else}
					<CiIconGlyph name={uncommented > 0 ? "alert" : "check"} class={["size-4", uncommented > 0 ? "text-destructive" : "text-accent"].join(" ")} />
					<span>
						{escapes.sources.length} place{escapes.sources.length === 1 ? "" : "s"} in the sources where the compiler takes the code's word{#if uncommented > 0}; <span class="text-destructive">{uncommented} without a comment saying why</span>{/if}.
					</span>
				{/if}
				{#if escapes.rubricPath}{@render source(escapes.rubricPath, "what is expected")}{/if}
			</p>
			{#if escapes.sources.length > 0}
				<ul class="flex flex-col gap-1 text-xs">
					{#each escapes.sources as escape (`${escape.path}:${escape.line}:${escape.kind}`)}
						<li class={["flex flex-col gap-0.5 border-l-2 pl-2", escape.why ? "border-border" : "border-destructive"]}>
							<span class="flex flex-wrap items-baseline gap-x-2">
								{@render source(escape.path, `${file(escape.path)}:${escape.line}`)}
								<span class="text-muted-foreground"><CiProse text={escape.kind} {resolve} /></span>
							</span>
							{#if escape.why}
								<span><CiProse text={escape.why} {resolve} /></span>
							{:else}
								<span class="text-destructive italic">no comment says why</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			<details class="text-xs">
				<summary class="cursor-pointer text-muted-foreground">all kinds, sources and tests</summary>
				<table class="mt-1 w-full max-w-xl">
					<thead class="text-muted-foreground"><tr><th class="text-left font-normal">kind</th><th class="text-right font-normal">sources</th><th class="text-right font-normal">tests</th></tr></thead>
					<tbody>
						{#each escapes.counts as row (row.kind)}
							<tr><td><CiProse text={row.kind} {resolve} /></td><td class="text-right font-mono tabular-nums">{row.sources}</td><td class="text-right font-mono tabular-nums">{row.tests}</td></tr>
						{/each}
					</tbody>
				</table>
				<p class="mt-1 text-muted-foreground">Tests force shapes on purpose, so only their counts are shown. Plus {escapes.assertions} single <code class="font-mono">as T</code> assertions in the sources; without the type checker Spire cannot tell which of them narrow <code class="font-mono">unknown</code>. {escapes.files} files read.</p>
			</details>
		</div>
	{/if}

	{#if detail.testFiles && detail.testFiles.length > 0}
		<div class="flex flex-col gap-1">
			{@render heading(`What it tests · ${testCount} tests in ${detail.testFiles.length}${detail.moreTestFiles ? `+${detail.moreTestFiles}` : ""} files`)}
			<input
				type="search"
				class="w-full max-w-sm rounded-sm border border-border bg-background px-2 py-1 text-xs"
				placeholder="Filter test titles or files"
				aria-label="Filter test titles or files"
				bind:value={filter}
			/>
			<ul class="flex flex-col gap-0.5 text-xs">
				{#each shownFiles as testFile (testFile.path)}
					<li>
						<details open={needle !== ""}>
							<summary class="cursor-pointer">
								<span class="font-mono">{file(testFile.path)}</span>
								<span class="text-muted-foreground">· {testFile.tests.length}</span>
								{#if testFile.ci && runsLabel(testFile)}
									{@const firstJob = testFile.ci.steps?.[0]?.jobId}
									{#if firstJob && onOpenJob}
										<button
											type="button"
											class="ml-1 rounded-sm border border-border px-1 text-[0.65rem] text-primary underline-offset-2 hover:underline"
											title={runsHint(testFile)}
											onclick={(event) => {
												event.preventDefault();
												event.stopPropagation();
												onOpenJob(firstJob);
											}}>{runsLabel(testFile)} ↗</button
										>
									{:else}
										<span
											class="ml-1 rounded-sm border px-1 text-[0.65rem] {testFile.ci.runs === 'named' ? 'border-border text-muted-foreground' : 'border-accent/60 text-accent'}"
											title={runsHint(testFile)}>{runsLabel(testFile)}</span
										>
									{/if}
								{/if}
								{#if copyFor}{@render copyButton(copyFor(testFile.path))}{/if}
								{#if testFile.header}<span class="text-muted-foreground"> — <CiProse text={testFile.header} {resolve} /></span>{/if}
							</summary>
							<ul class="mt-1 mb-2 flex flex-col gap-0.5 border-l border-border/60 pl-3">
								{#if testFile.skipIf?.length}
									<li class="text-muted-foreground">
										Skips when {#each testFile.skipIf as condition, n (n)}{#if n > 0} or {/if}<code class="font-mono text-foreground">{condition}</code>{/each}
									</li>
								{/if}
								{#if testFile.ci?.steps?.length}
									<li class="text-muted-foreground">
										CI runs it in {#each testFile.ci.steps as step, n (`${step.jobId}:${step.step}`)}{#if n > 0}; {/if}{#if onOpenJob}<button type="button" class="text-primary underline-offset-2 hover:underline" onclick={() => onOpenJob(step.jobId)}>{jobName?.(step.jobId) ?? step.jobId}</button>{:else}<span>{jobName?.(step.jobId) ?? step.jobId}</span>{/if} › “{step.step}”{/each}
									</li>
								{/if}
								{#each testFile.tests as title, n (n)}
									<li class="group">{title}{#if copyFor}<span class="opacity-0 group-hover:opacity-100 focus-within:opacity-100">{@render copyButton(copyFor(testFile.path, title))}</span>{/if}</li>
								{:else}
									<li class="text-muted-foreground italic">no test titles found</li>
								{/each}
								<li>{@render source(testFile.path, "open file")}</li>
							</ul>
						</details>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if detail.features && detail.features.length > 0}
		<div class="flex flex-col gap-1">
			{@render heading(`What it tests · ${scenarioCount} scenarios in ${detail.features.length} features`)}
			<ul class="flex max-h-80 flex-col gap-0.5 overflow-auto text-xs">
				{#each detail.features as feature (feature.path)}
					<li>
						<details>
							<summary class="cursor-pointer">
								<span>{feature.name}</span>
								<span class="text-muted-foreground">· {feature.scenarios.length}</span>
								{#if feature.description}<span class="text-muted-foreground"> — {feature.description}</span>{/if}
							</summary>
							<ul class="mt-1 mb-2 flex flex-col gap-0.5 border-l border-border/60 pl-3">
								{#each feature.scenarios as scenario, n (n)}
									<li>{scenario}</li>
								{/each}
								<li>{@render source(feature.path, "open feature")}</li>
							</ul>
						</details>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
