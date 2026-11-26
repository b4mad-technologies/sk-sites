<script lang="ts">
	import { CalendarDateTime, type DateValue } from "@internationalized/date";
	import { DatePicker, useId } from "bits-ui";
	import { cn } from "../lib/utils";
	import type { DateTimePickerProps } from "./types";

	let {
		class: className,
		id = useId(),
		label,
		description,
		iso = $bindable(""),
		disabled = false,
		name,
	}: DateTimePickerProps = $props();

	function fromIso(value: string): CalendarDateTime {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) {
			const now = new Date();
			return new CalendarDateTime(
				now.getUTCFullYear(),
				now.getUTCMonth() + 1,
				now.getUTCDate(),
				now.getUTCHours(),
				now.getUTCMinutes(),
			);
		}
		return new CalendarDateTime(
			parsed.getUTCFullYear(),
			parsed.getUTCMonth() + 1,
			parsed.getUTCDate(),
			parsed.getUTCHours(),
			parsed.getUTCMinutes(),
		);
	}

	function toIso(value: DateValue, previous: CalendarDateTime): string {
		const hour = "hour" in value ? value.hour : previous.hour;
		const minute = "minute" in value ? value.minute : previous.minute;
		const next = new CalendarDateTime(value.year, value.month, value.day, hour, minute);
		const month = String(next.month).padStart(2, "0");
		const day = String(next.day).padStart(2, "0");
		const hours = String(next.hour).padStart(2, "0");
		const minutes = String(next.minute).padStart(2, "0");
		return `${next.year}-${month}-${day}T${hours}:${minutes}:00Z`;
	}

	let value = $state<DateValue>(fromIso(iso));

	$effect(() => {
		value = fromIso(iso);
	});

	function commit(next: DateValue | undefined): void {
		if (!next) return;
		iso = toIso(next, fromIso(iso));
	}
</script>

<div class={cn("grid gap-2 text-[color:var(--foreground)]", className)}>
	<DatePicker.Root
		{disabled}
		hourCycle={24}
		locale="en-GB"
		granularity="minute"
		bind:value
		onValueChange={commit}
	>
		<DatePicker.Label
			class="text-sm font-medium tracking-[0.03em] text-[color:var(--muted-foreground)]"
		>
			{label}
		</DatePicker.Label>
		<div class="flex items-stretch gap-2">
			<DatePicker.Input
				{id}
				{name}
				class={cn(
					"flex min-h-10 flex-wrap items-center gap-0.5 rounded-[var(--radius)] border border-[color:var(--input)] bg-[color:var(--secondary)] px-3 py-2 text-sm",
					"focus-within:ring-2 focus-within:ring-[color:var(--ring)]",
					disabled && "opacity-40",
				)}
			>
				{#snippet children({ segments })}
					{#each segments as segment, index (`${segment.part}-${index}`)}
						<DatePicker.Segment
							part={segment.part}
							class={cn(
								"rounded-sm px-0.5 outline-none focus:bg-[color:var(--muted)] focus:text-[color:var(--foreground)]",
								segment.part === "literal" && "text-[color:var(--muted-foreground)]",
							)}
						>
							{segment.value}
						</DatePicker.Segment>
					{/each}
				{/snippet}
			</DatePicker.Input>
			<DatePicker.Trigger
				class={cn(
					"inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]",
					"hover:bg-[color:var(--muted)] focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]",
					disabled && "pointer-events-none opacity-40",
				)}
				aria-label={`Open calendar for ${label}`}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true" class="size-4">
					<rect
						x="2.5"
						y="3.5"
						width="11"
						height="10"
						rx="1"
						fill="none"
						stroke="currentColor"
						stroke-width="1.4"
					/>
					<path d="M5 2.5v2M11 2.5v2M2.5 6.5h11" fill="none" stroke="currentColor" stroke-width="1.4" />
				</svg>
			</DatePicker.Trigger>
		</div>
		<DatePicker.Content
			class="z-50 rounded-[var(--radius)] border border-[color:var(--border)] bg-[color:var(--card)] p-3 text-[color:var(--foreground)] shadow-lg"
			sideOffset={8}
		>
			<DatePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DatePicker.Header class="mb-3 flex items-center justify-between gap-2">
						<DatePicker.PrevButton
							class="inline-flex size-8 items-center justify-center rounded-[var(--radius)] hover:bg-[color:var(--muted)]"
						>
							‹
						</DatePicker.PrevButton>
						<DatePicker.Heading class="text-sm font-medium" />
						<DatePicker.NextButton
							class="inline-flex size-8 items-center justify-center rounded-[var(--radius)] hover:bg-[color:var(--muted)]"
						>
							›
						</DatePicker.NextButton>
					</DatePicker.Header>
					{#each months as month, monthIndex (monthIndex)}
						<DatePicker.Grid class="w-full border-collapse">
							<DatePicker.GridHead>
								<DatePicker.GridRow>
									{#each weekdays as day, dayIndex (dayIndex)}
										<DatePicker.HeadCell
											class="h-8 w-8 text-center text-xs text-[color:var(--muted-foreground)]"
										>
											{day.slice(0, 2)}
										</DatePicker.HeadCell>
									{/each}
								</DatePicker.GridRow>
							</DatePicker.GridHead>
							<DatePicker.GridBody>
								{#each month.weeks as week, weekIndex (weekIndex)}
									<DatePicker.GridRow>
										{#each week as date, dateIndex (dateIndex)}
											<DatePicker.Cell {date} month={month.value}>
												<DatePicker.Day
													class={cn(
														"inline-flex size-8 items-center justify-center rounded-[var(--radius)] text-sm",
														"hover:bg-[color:var(--muted)] data-selected:bg-[color:var(--primary)] data-selected:text-[color:var(--primary-foreground)]",
														"data-outside-month:text-[color:var(--muted-foreground)] data-unavailable:opacity-40",
													)}
												/>
											</DatePicker.Cell>
										{/each}
									</DatePicker.GridRow>
								{/each}
							</DatePicker.GridBody>
						</DatePicker.Grid>
					{/each}
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</DatePicker.Root>
	{#if description}
		<p class="text-sm leading-6 text-[color:var(--muted-foreground)]">{description}</p>
	{/if}
</div>
