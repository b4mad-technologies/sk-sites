<script lang="ts">
	import { Badge, InfoLink } from "@spellkave/ui";
	import FieldDetail from "./FieldDetail.svelte";
	import PlayFrame from "./PlayFrame.svelte";
	import type { HeroProps } from "./types";

	let { self, density = "card", chrome = "frame", infoCards = false }: HeroProps = $props();

	const conditions = $derived(self.conditions.map(id => {
		const detail = self.conditionDetails?.find(condition => condition.id === id);
		return { ...detail, id, label: detail?.label || id };
	}));

	// Optional on SelfState (a fixture predating this bead has none) — absent
	// reads the same as reported-empty.
	const abilities = $derived(self.abilities ?? []);
	const skills = $derived(self.skills ?? []);
	const masteries = $derived(self.masteries ?? []);

	// Card stays exactly the ledger's card content (name, level line,
	// HP/AC/XP), unchanged by the stage sheet below — three figures, short
	// terms so they never truncate in a narrow tile column (sk-jay0.1.8.5
	// finding 2: "HP / ARMOR / EXPERI…").
	const cardFigures = $derived(
		[
			{ term: "Hit points", short: "HP", value: self.hp, tone: "plain" },
			{ term: "Armor class", short: "AC", value: self.ac, tone: "plain" },
			{ term: "Experience", short: "XP", value: self.xp, tone: "plain" },
		].filter((figure) => figure.value !== undefined),
	);

	// Compatibility default for callers without sheetVitals. New app
	// composition can supply its complete ordered values without teaching
	// this widget additional resource ids or game-system rules.
	const stageVitals = $derived(
		[
			{ term: "Hit points", short: "HP", value: self.hp, tone: "plain" },
			{ term: "Armor class", short: "AC", value: self.ac, tone: "plain" },
			{ term: "Level", short: "LVL", value: self.level, tone: "plain" },
			{ term: "Experience", short: "XP", value: self.xp, tone: "plain" },
			{ term: "Proficiency", short: "PROF", value: self.proficiency, tone: "plain" },
		].filter((figure) => figure.value !== undefined),
	);

	const figures = $derived(density === "stage" && self.sheetVitals !== undefined
		? self.sheetVitals.map((value) => ({ id: value.id, term: value.label, short: value.label, value: value.value, description: value.description, tone: "plain" }))
		: (density === "stage" ? stageVitals : cardFigures).map((value) => ({ ...value, id: value.term, description: undefined })));

	const stripDatum = $derived(self.hp === undefined ? undefined : `HP ${self.hp}`);
	const levelLine = $derived(self.level === undefined ? undefined : `Level ${self.level}`);

	// The sheet's own origin line ("Human · Level 3 Fighter · Soldier"),
	// stage-only — distinct from the strip/card `levelLine` above. Every
	// segment is optional: a fresh candidate mid-creation may report none of
	// species/class/background yet.
	const originLine = $derived(
		[
			self.species,
			self.level === undefined && self.className === undefined
				? undefined
				: [self.level === undefined ? undefined : `Level ${self.level}`, self.className]
						.filter((part) => part !== undefined && part !== "")
						.join(" "),
			self.background,
		]
			.filter((part): part is string => part !== undefined && part !== "")
			.join(" · "),
	);
	const identityFields = $derived(
		[self.species, self.className, self.background].filter((label): label is string => !!label)
			.map((label) => ({ label, description: self.identityDetails?.find((facet) => facet.label === label)?.description })),
	);
</script>

<PlayFrame
	slot="play-hero"
	titleId="play-hero-heading"
	title={self.name}
	titleTone="world"
	meta={levelLine}
	{density}
	{chrome}
	glyph="person"
	datum={stripDatum}
>
	{#if chrome === "bare"}
		<!-- The card's own tile-body shares `.tile-body`'s plain `overflow:
		     hidden` at rest with every other card tile (sk-jay0.1.8.18
		     finding, apps/play/src/styles.css) — a two-line wrap of this
		     h3 at stage's own `text-2xl` was, on its own, most of what
		     pushed the conditions row below the fold on the fight beat at
		     1280x720 (live-measured: 211px of content in a 167px box,
		     h3 alone 64px of that). Card keeps the name to one line
		     (`truncate`) at a smaller size instead of wrapping it — the
		     name is still the tile's own title (unlike the redundant
		     standalone level line the stage's origin line already
		     dedupes above), so it stays, just shorter. Stage has room to
		     scroll and keeps the full two-line wrap. A `title` attribute
		     on the card's own h3 (verifier follow-up) surfaces the full
		     name on hover/long-press whenever `truncate` actually cuts
		     it — no other surface names the hero once the ellipsis
		     lands. -->
		<h3
			id="play-hero-heading"
			class="sk-display m-0"
			class:text-2xl={density === "stage"}
			class:text-lg={density === "card"}
			class:truncate={density === "card"}
			title={density === "card" ? self.name : undefined}
		>
			{self.name}
		</h3>
		{#if levelLine && !(density === "stage" && originLine !== "")}
			<!-- The stage's own origin line already carries the level ("Human ·
			     Level 1 Fighter · Soldier") — showing this standalone line too
			     duplicated it (coordinator screenshot review, 1280×720 and
			     390×844). Card keeps this line unchanged: it has no origin line
			     of its own. -->
			<p class="sk-play-muted m-0 mt-0.5 text-sm">{levelLine}</p>
		{/if}
	{/if}
	{#if originLine !== "" && density === "stage"}
		<div class="sk-play-muted mt-0.5 flex flex-wrap items-center gap-x-3 text-sm" aria-label="Identity">
			{#if self.level !== undefined}<span>Level {self.level}</span>{/if}
			{#each identityFields as facet, index (facet.label)}
				{#if infoCards}
					<InfoLink refId={`hero:identity:${index}`}>{facet.label}</InfoLink>
				{:else}
					<FieldDetail label={facet.label} description={facet.description} readState={self.descriptionReads?.identity}>{facet.label}</FieldDetail>
				{/if}
			{/each}
		</div>
	{/if}
	{#if self.subtitle && density === "stage"}
		<p class="sk-play-muted m-0 mt-1 text-sm">{self.subtitle}</p>
	{/if}
	{#if density === "stage" && !identityFields.length && self.identityDetails?.length}
		<div class="mt-2" aria-label="Identity descriptions">
			{#each self.identityDetails as facet, index (facet.id)}
				{#if infoCards}
					<InfoLink refId={`hero:identity:${index}`}>{facet.label}</InfoLink>
				{:else}
					<FieldDetail label={facet.label} description={facet.description} readState={self.descriptionReads?.identity}>{facet.label}</FieldDetail>
				{/if}
			{/each}
		</div>
	{/if}
	{#if figures.length > 0}
		<dl
			class="sk-vitals-grid grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]"
			class:mt-4={density === "stage"}
			class:mt-2={density === "card"}
			style:grid-template-columns={density === "stage" ? "repeat(auto-fit, minmax(min(10rem, 100%), 1fr))" : `repeat(${figures.length}, minmax(0, 1fr))`}
		>
			{#each figures as figure (figure.id)}
				<div class="bg-[color:var(--card)]" class:px-3={density === "stage"} class:py-2.5={density === "stage"} class:px-2={density === "card"} class:py-1.5={density === "card"}>
					<dt class="sk-label sk-play-muted">
						{#if density === "stage"}
							{#if infoCards}
								{#if figure.description?.trim()}
									<span data-field-description="play-vital-value"><InfoLink refId={`hero:vital:${figure.id}`}>{figure.term}</InfoLink></span>
								{:else}
									<InfoLink refId={`hero:vital:${figure.id}`}>{figure.term}</InfoLink>
								{/if}
							{:else}
								<FieldDetail label={figure.term} value={String(figure.value)} description={figure.description} readState={self.descriptionReads?.values}>{figure.term}</FieldDetail>
							{/if}
						{:else}
							{figure.short}
						{/if}
					</dt>
					<dd
						data-slot="play-vital-value"
						class="sk-num m-0 mt-1 leading-none"
						class:text-2xl={density === "stage"}
						class:text-lg={density === "card"}
						class:text-[color:var(--destructive)]={figure.tone === "hurt"}
					>
						{figure.value}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}
	{#if density === "stage" && abilities.length > 0}
		<div class="mt-4">
			<span class="sk-label sk-play-muted">Abilities</span>
		</div>
		<dl
			class="mt-1 grid gap-px border border-[color:var(--border)] bg-[color:var(--border)]"
			style="grid-template-columns: repeat(auto-fit, minmax(min(8rem, 100%), 1fr));"
			data-testid="hero-abilities"
		>
			{#each abilities as ability (ability.id)}
				<div class="bg-[color:var(--card)] px-2 py-2 text-center">
					<dt class="sk-label sk-play-muted">
						{#if infoCards}
							<InfoLink refId={`hero:ability:${ability.id}`}>{ability.label}</InfoLink>
						{:else}
							<FieldDetail label={ability.label} description={ability.description}>{ability.label}</FieldDetail>
						{/if}
					</dt>
					<dd class="sk-num m-0 mt-1 text-lg leading-none">
						{ability.modifier >= 0 ? "+" : ""}{ability.modifier}
					</dd>
					<dd class="sk-num sk-play-muted m-0 mt-0.5 text-xs leading-none">{ability.score}</dd>
				</div>
			{/each}
		</dl>
	{/if}
	<div
		class="flex flex-wrap items-center gap-2"
		class:mt-4={density === "stage"}
		class:mt-2={density === "card"}
	>
		<span class="sk-label sk-play-muted mr-1">Conditions</span>
		{#if self.conditions.length === 0}
			<span class="sk-play-muted text-sm">None</span>
		{:else if conditions.length}
			{#each conditions as condition (condition.id)}
				<span class="text-sm" data-slot="play-condition-value">
					{#if infoCards}
						{#if condition.description?.trim()}
							<span data-field-description="play-condition-value"><InfoLink refId={`hero:condition:${condition.id}`}>{condition.label}</InfoLink></span>
						{:else}
							<InfoLink refId={`hero:condition:${condition.id}`}>{condition.label}</InfoLink>
						{/if}
					{:else}
						<FieldDetail
							label={condition.label}
							description={condition.description}
							readState={self.descriptionReads?.conditions}
							metadata={[
								...(condition.stackCount === undefined ? [] : [{ label: "Stacks", value: String(condition.stackCount) }]),
								...(condition.expiresAtTick === undefined ? [] : [{ label: "Expires at world tick", value: String(condition.expiresAtTick) }]),
							]}
							valueSlot="play-condition-value"
							metadataSlot="play-condition-value"
						>{condition.label}</FieldDetail>
					{/if}
					{#if infoCards}
						{#each [condition.stackCount, condition.expiresAtTick] as metadata}
							{#if metadata !== undefined}<span class="contents" data-field-metadata="play-condition-value"></span>{/if}
						{/each}
					{/if}
				</span>
			{/each}
		{:else}
			{#each self.conditions as condition (condition)}
				<span data-slot="play-condition-value">{#if infoCards}<InfoLink refId={`hero:condition:${condition}`}>{condition}</InfoLink>{:else}{condition}{/if}</span>
			{/each}
		{/if}
	</div>
	{#if density === "stage"}
		{#if self.quest?.length}
			<section class="mt-4" aria-label="Quest">
				<h3 class="sk-label sk-play-muted">Quest</h3>
				<dl class="grid gap-2">
					{#each self.quest as value (value.id)}
						<div>
							<dt class="sk-label">
								{#if infoCards}
									{#if value.description?.trim()}
										<span data-field-description="play-quest-value"><InfoLink refId={`hero:quest:${value.id}`}>{value.label}</InfoLink></span>
									{:else}
										<InfoLink refId={`hero:quest:${value.id}`}>{value.label}</InfoLink>
									{/if}
								{:else}
									<FieldDetail label={value.label} value={value.value} description={value.description} readState={self.descriptionReads?.values} valueSlot="play-quest-value">{value.label}</FieldDetail>
								{/if}
							</dt>
							<dd class="m-0 break-words">
								<span data-slot="play-quest-value">{value.value}</span>
							</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}
		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			<div>
				<span class="sk-label sk-play-muted">Skills</span>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#if skills.length === 0}
						<span class="sk-play-muted text-sm">None</span>
					{:else}
						{#each skills as skill (skill.id)}
							<Badge variant="outline">{#if infoCards}<InfoLink refId={`hero:skill:${skill.id}`}>{skill.label}</InfoLink>{:else}{skill.label}{/if}</Badge>
						{/each}
					{/if}
				</div>
			</div>
			<div>
				<span class="sk-label sk-play-muted">Masteries</span>
				<div class="mt-1 flex flex-wrap gap-1.5">
					{#if masteries.length === 0}
						<span class="sk-play-muted text-sm">None</span>
					{:else}
						{#each masteries as mastery (mastery.id)}
							<Badge variant="outline">{#if infoCards}<InfoLink refId={`hero:mastery:${mastery.id}`}>{mastery.label}</InfoLink>{:else}{mastery.label}{/if}</Badge>
						{/each}
					{/if}
				</div>
			</div>
		</div>
		{#if self.appearance}
			<div class="mt-4">
				<span class="sk-label sk-play-muted">Appearance</span>
			</div>
			<p class="sk-play-prose sk-play-muted !mt-1">{self.appearance}</p>
		{/if}
		{#if self.backstory}
			<div class="mt-4">
				<span class="sk-label sk-play-muted">Backstory</span>
			</div>
			<p class="sk-play-prose sk-play-muted !mt-1">{self.backstory}</p>
		{/if}
	{/if}
</PlayFrame>
