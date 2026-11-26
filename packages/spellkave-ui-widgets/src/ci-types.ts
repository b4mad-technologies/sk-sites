/**
 * Display shapes for the CI landscape widgets (Spire, spire-developer-portal
 * task 4.6). Callers compute them from `@spellkave/ci-landscape` and the
 * telemetry queries; the widgets only render. `null` means "no data", which
 * the widgets show as such — never as healthy.
 */

import type { CiIcon } from "./ci-icons";

export interface CiJobView {
	/** Stable id `<workflow stem>/<job key>`. */
	readonly id: string;
	readonly name: string;
	/** Needs a live SpacetimeDB node: `true`, `false`, or `null` when undeclared. */
	readonly liveNode: boolean | null;
	readonly runs: number | null;
	readonly failures: number | null;
	/** failures / decided runs, 0..1. */
	readonly redRate: number | null;
	readonly p95Seconds: number | null;
	/** p95 sits at the histogram's top bucket: the real value is at least this. */
	readonly p95AtCap?: boolean;
	/** Mean duration of finished runs. */
	readonly meanSeconds?: number | null;
	/** Share of its workflow's runs in which the job ran instead of being skipped. */
	readonly triggerShare?: number | null;
	/** The job in one line ("8.9 % · 2.6 min (p95 8.2 min)"); shown in place of the separate numbers. */
	readonly summary?: string;
	/** Health by the attention rule: a dot coloured by it, the word as its label. */
	readonly state?: CiHealthState;
}

/** A job's health by the shared attention rule ("Needs attention"). */
export type CiHealthState = "too few runs" | "needs attention" | "healthy";

export interface CiJobGlyphsProps {
	triggerShare: number | null;
	redRate: number | null;
	meanSeconds: number | null;
	p95Seconds?: number | null;
	/** Seconds that fill the duration bar, shared by every job. */
	scaleSeconds: number;
	size?: "sm" | "lg";
	alertAt?: number;
	/** Which pictures to draw (default all three); a step has no trigger share. */
	parts?: readonly ("trigger" | "red" | "duration")[];
	/** Runs behind the numbers; fewer than `minRuns` show "too few runs" instead of a red rate. */
	runs?: number;
	/** Compact only: one text line after the bars in place of the separate numbers. */
	summary?: string;
	minRuns?: number;
}

export interface CiRouteView {
	/** The caller job id, or the workflow id for a lane without callers. */
	readonly id: string;
	/** What selects this group: the caller job name, or the trigger. */
	readonly title: string;
	/** Nx routes (`metadata.ciWorkflow`) that select it. */
	readonly routes: readonly string[];
	readonly workflowName: string;
	readonly workflowPath: string;
	/** The workflow the card's jobs belong to, for {@link CiRouteBoardProps.onOpenWorkflow}. */
	readonly workflowId?: string;
	/** Packages the card's jobs check (full names), so a reader finds "cli" without knowing the workflow name. */
	readonly packages?: readonly string[];
	readonly jobs: readonly CiJobView[];
}

export interface CiLaneView {
	readonly id: string;
	readonly title: string;
	/** One line: what starts this lane, e.g. "pull_request → CI selection". */
	readonly entry: string;
	readonly groups: readonly CiRouteView[];
}

export interface CiRouteBoardProps {
	lanes: readonly CiLaneView[];
	selectedJobId?: string | null;
	onSelectJob?: (jobId: string) => void;
	/** Called with a card's workflowId when its title is clicked. */
	onOpenWorkflow?: (workflowId: string) => void;
	/** Red rate at or above this reads as a problem (default 0.2). */
	alertAt?: number;
	/** Called with a full package name when a package on a card is clicked. */
	onOpenPackage?: (name: string) => void;
	/** Seconds that fill a duration bar: one scale for every job (the slowest mean). */
	durationScale?: number;
	/** Which glyphs each job shows (default all three: trigger share, red, duration). */
	glyphParts?: readonly ("trigger" | "red" | "duration")[];
}

export type CiJobSortKey = "name" | "runs" | "redRate" | "p95";

export interface CiJobTableRow extends CiJobView {
	readonly workflowName: string;
}

export interface CiJobTableProps {
	rows: readonly CiJobTableRow[];
	selectedJobId?: string | null;
	onSelectJob?: (jobId: string) => void;
	alertAt?: number;
	caption?: string;
}

/** Matrix job facts already formatted by the host's shared report. */
export interface CiMatrixRow {
	readonly name: string;
	readonly note?: string | null;
	readonly runs: number;
	readonly failures: number;
	readonly red: string;
	readonly mean: string;
	readonly p95: string | null;
	readonly counts: readonly string[];
}

export interface CiMatrixRowsProps {
	readonly rows: readonly CiMatrixRow[];
}

export interface CiGraphJob {
	readonly id: string;
	readonly name: string;
	/** Ids of jobs in the same workflow this job needs. */
	readonly needs: readonly string[];
	/** The called workflow's name, for a reusable-workflow call job. */
	readonly calls?: string;
	readonly redRate: number | null;
	readonly liveNode: boolean | null;
	/** The job in one line ("8.9 % · 2.6 min (p95 8.2 min)"); shown in place of the red rate. */
	readonly summary?: string;
	/** Health by the attention rule; with it the box draws a health dot and bars. */
	readonly state?: CiHealthState;
	/** Short labels beside the bars: red rate ("8.9 %") and mean ("2.6 min"); `null` without bars. */
	readonly red?: string | null;
	readonly mean?: string | null;
	/** The p95 as text, shown on hover over its tick; `null` without one. */
	readonly p95?: string | null;
	readonly meanSeconds?: number | null;
	readonly p95Seconds?: number | null;
	/** For low-sample health: measured timing/sample text, else finished/skipped counts. */
	readonly runs_note?: string | null;
	readonly red_caveat?: string | null;
	/** How the numbers count, shown on hover over the box. */
	readonly counts?: readonly string[];
}

export interface CiWorkflowGraphProps {
	jobs: readonly CiGraphJob[];
	selectedJobId?: string | null;
	onSelectJob?: (jobId: string) => void;
	alertAt?: number;
	/** Seconds that fill a duration bar: the slowest job's mean, as on the large duration tile. */
	durationScale?: number;
}

export interface CiStepTargetView {
	readonly key: string;
	/** Short text on the chip, e.g. `@spellkave/gates · test` or `just ci-shell-checks`. */
	readonly label: string;
	/** Longer text for the tooltip: the command, or the suites it runs. */
	readonly detail?: string;
	/** An opaque link the caller resolves (a package name, a doc path); absent when nothing can be opened. */
	readonly open?: string;
}

/** One command inside an unfolded runner such as a `just` recipe. */
export interface CiStepCommandView {
	readonly command: string;
	/** The comment written above the command in the recipe. */
	readonly comment?: string;
	/** What the command's target says about itself (a test script's header comment). */
	readonly summary?: string;
	readonly targets: readonly CiStepTargetView[];
}

/** A runner the step calls, unfolded into the commands it really runs. */
export interface CiStepExpansionView {
	/** e.g. `just ci-shell-checks`. */
	readonly title: string;
	/** Where it is defined, e.g. `just/core.just:343`. */
	readonly where?: string;
	readonly doc?: string;
	/** Runners that run first. */
	readonly dependencies?: readonly string[];
	readonly commands: readonly CiStepCommandView[];
}

/** Telemetry for one step over the selected range. */
export interface CiStepStatsView {
	readonly runs: number;
	readonly failures: number;
	readonly redRate: number | null;
	readonly meanSeconds: number | null;
}

/**
 * A repository composite action a step uses (`./.github/actions/<dir>`):
 * what runs inside it. GitHub reports such a step as one step, so the inner
 * steps come from the action file and, when the runner reported them, their
 * numbers from the job profiles.
 */
export interface CiActionView {
	readonly name: string;
	/** The action's directory, e.g. `prepare-live-server-wasm`. */
	readonly where: string;
	/** The first sentence of the action's description; `null` for a nested action. */
	readonly lead: string | null;
	/** What the fold says, e.g. `11 inner steps`. */
	readonly summary: string;
	readonly steps: readonly CiActionStepView[];
}

/** Numbers of one inner step, from the job profiles' step records. */
export interface CiInnerStepStatsView {
	readonly runs: number;
	readonly failures: number;
	readonly redRate: number | null;
	readonly meanSeconds: number | null;
	/** e.g. `8 % red`; `too few runs` below the threshold. */
	readonly red: string;
	/** e.g. `38 s`. */
	readonly mean: string;
}

export interface CiActionStepView {
	readonly title: string;
	/** `external`: a remote action; `sometimes`: the step has an `if:`. */
	readonly marks: readonly ("external" | "sometimes")[];
	/** The `if:` behind `sometimes`, shown on hover as `runs only if: …`. */
	readonly condition: string | null;
	/** The remote action's repository, for `external`. */
	readonly link: string | null;
	/** A nested local action with more than one step, expanded one level. */
	readonly action: CiActionView | null;
	readonly stats: CiInnerStepStatsView | null;
	/** Visible sample and evidence of skips, including when no duration is available. */
	readonly measurement?: string;
}

/** One failed run of a step, newest first, from the job profiles. */
export interface CiFailedRunView {
	/** UTC, minutes: `2026-10-19 18:10`. */
	readonly date: string;
	/** `main`, `PR` plus its number, or the branch or tag. */
	readonly where: string;
	/** The innermost failed inner step, as a path below the step; `null` when the step itself failed. */
	readonly failing: string | null;
	/** The last output lines before the error, as the runner masked them. */
	readonly error: string | null;
	readonly url: string;
}

export interface CiFailedRunsView {
	/** e.g. `12 failed runs in 14d, newest 20 shown`. */
	readonly summary: string;
	readonly runs: readonly CiFailedRunView[];
}

export interface CiStepView {
	/** setup: checkout/toolchain/install; action: any other `uses:`; run: a command; test: a command that reaches a test entry point. */
	readonly kind: "setup" | "action" | "run" | "test";
	readonly title: string;
	/** The authors' comment above the step: why it is there. */
	readonly note?: string;
	/** One short line on what the step does when there is no comment, e.g. the script it runs. */
	readonly teaser?: string;
	readonly condition?: string;
	readonly command?: string;
	readonly targets: readonly CiStepTargetView[];
	readonly expansions?: readonly CiStepExpansionView[];
	readonly stats?: CiStepStatsView;
	/** The local composite action the step uses, with its inner steps. */
	readonly action?: CiActionView;
	/** The step's failed runs, when the job profiles reported any. */
	readonly failed_runs?: CiFailedRunsView;
	/** True when the step runs package checks the reader can open in place (see {@link CiCheckDetailView}). */
	readonly expandable?: boolean;
	/** The opened step's checks; absent until the host has read them, empty when there is nothing to show. */
	readonly details?: readonly CiCheckDetailView[];
}

/** One fact about a check from the repository, e.g. the files tsc sees and the tsconfig that says so. */
export interface CiCheckFactView {
	readonly label: string;
	readonly value: string;
	/** Repo path the fact comes from, linked through `resolve`. */
	readonly path?: string;
	/** What each part of the value means, e.g. one sentence per compiler rule. */
	readonly notes?: readonly { readonly name: string; readonly text: string }[];
}

/** A test file as the check sees it: its leading comment and its test titles. */
export interface CiCheckTestFileView {
	readonly path: string;
	readonly header?: string;
	/** `describe › it` titles. */
	readonly tests: readonly string[];
	/** Conditions, as written in the file, under which its tests skip. */
	readonly skipIf?: readonly string[];
	/**
	 * Where CI runs the file: `named` by steps that name its path, `script`
	 * with the check's own step, `manual` skips by default and no step names
	 * it, `none` nothing runs it.
	 */
	readonly ci?: {
		readonly runs: "named" | "script" | "manual" | "none";
		readonly steps?: readonly {
			readonly jobId: string;
			readonly step: string;
		}[];
	};
}

/** One place where the compiler does not check, with the comment next to it. */
export interface CiTypeEscapeView {
	/** What kind of escape, in words, e.g. "`as unknown as`". */
	readonly kind: string;
	readonly path: string;
	readonly line: number;
	readonly why?: string;
}

/** Where a typecheck does not look: source escapes one by one, test escapes counted. */
export interface CiTypeEscapesView {
	readonly sources: readonly CiTypeEscapeView[];
	/** Rows of the count table: kind, in sources, in tests. */
	readonly counts: readonly {
		readonly kind: string;
		readonly sources: number;
		readonly tests: number;
	}[];
	/** Single `as T` assertions in the sources, counted only. */
	readonly assertions: number;
	readonly files: number;
	/** The review rubric for escapes, linked so a reader knows what is expected. */
	readonly rubricPath?: string;
}

/** A Gherkin feature: its name, description and scenario names. */
export interface CiCheckFeatureView {
	readonly path: string;
	readonly name: string;
	readonly description?: string;
	readonly scenarios: readonly string[];
}

/**
 * A check opened in place. Everything comes from the repository or from the
 * tool the check runs: the tool's own one-line description, the config and
 * script comments, the test titles and scenarios, and the workflow comment.
 */
export interface CiCheckDetailView {
	readonly key: string;
	/** e.g. `@spellkave/cli · typecheck`, for screen readers and keys. */
	readonly label: string;
	/** The package the check runs in; the box's heading. The script shows in the command. */
	readonly package: string;
	/** What the tool does; the same in every repository. */
	readonly toolNote?: string;
	/** What the repository says about this check: the config's or the script's own comment. */
	readonly about?: { readonly text: string; readonly path: string };
	/** When the check runs, from the workflow's own comment. */
	readonly when?: string;
	readonly whenPath?: string;
	/** The command CI runs, to copy and run locally. */
	readonly command: string;
	/** What the script expands to, from package.json, e.g. `tsc --noEmit`. */
	readonly resolved?: string;
	readonly facts: readonly CiCheckFactView[];
	readonly testFiles?: readonly CiCheckTestFileView[];
	/** Test files beyond the ones listed. */
	readonly moreTestFiles?: number;
	readonly features?: readonly CiCheckFeatureView[];
	/** For a typecheck: where the compiler does not check. */
	readonly escapes?: CiTypeEscapesView;
	/** In-app target for the package, e.g. `pkg:@spellkave/cli`. */
	readonly open?: string;
}

export interface CiCheckDetailProps {
	detail: CiCheckDetailView;
	resolve?: (ref: CiReference) => CiLink | null;
	/** Opens a CI job's page; a test file's steps link there. */
	readonly onOpenJob?: (jobId: string) => void;
	/** A job's readable name for a job id; the id shows without it. */
	readonly jobName?: (jobId: string) => string;
	/** The workflow a job belongs to, by name, for a test file's short CI tag. */
	readonly workflowName?: (jobId: string) => string;
	/**
	 * The text a copy button puts on the clipboard for one test file, or one
	 * test in it: a command an agent can run to find exactly that test.
	 * Without it no copy buttons show.
	 */
	readonly copyFor?: (path: string, title?: string) => string;
}

export interface CiCheckSummaryProps {
	detail: CiCheckDetailView;
	resolve?: (ref: CiReference) => CiLink | null;
	/** Opens the check's own page. */
	onMore?: () => void;
	/** Opens an in-app target such as `pkg:@spellkave/cli`. */
	onOpen?: (open: string) => void;
}

export interface CiJobStepsProps {
	commandComparisons?: readonly {
		readonly kind: string;
		readonly label: string;
		readonly command: string;
		readonly steps: readonly string[];
		readonly cost: string;
		readonly note: string;
	}[];
	steps: readonly CiStepView[];
	onOpenTarget?: (open: string) => void;
	/** A step's red rate at or above this reads as a problem (default 0.2). */
	alertAt?: number;
	/** Makes references in comments clickable (see CiProse). */
	resolve?: (ref: CiReference) => CiLink | null;
	/** Called when the reader opens an expandable step, so the host can read its details. */
	onExpand?: (index: number) => void;
	/** Opens a check's own page, by the detail's `key`. */
	onMore?: (key: string) => void;
	/** Fewer runs than this show "too few runs" instead of a red rate (default 5). */
	minRuns?: number;
}

/** A reference found in CI prose. */
export interface CiReference {
	readonly kind: "path" | "adr" | "issue" | "bead";
	readonly value: string;
}

/** Where a reference goes. `onClick` keeps the reader inside the app instead of following `href`. */
export interface CiLink {
	readonly href: string;
	readonly external?: boolean;
	readonly onClick?: () => void;
}

export interface CiProseProps {
	text: string;
	/** Resolves a reference to a link; `null` leaves it as plain text. */
	resolve?: (ref: CiReference) => CiLink | null;
	class?: string;
}

export interface CiOutcomeBarProps {
	/** Runs by conclusion (success, failure, cancelled, skipped, …). */
	conclusions: Readonly<Record<string, number>>;
	/** The time window the counts cover, e.g. "14d". */
	window?: string;
}

export type CiFactTone = "neutral" | "good" | "info" | "alert" | "muted";

export interface CiFactProps {
	icon: CiIcon;
	label: string;
	tone?: CiFactTone;
	/** The longer explanation, shown on hover. */
	hint?: string;
}

export interface CiStatProps {
	icon: CiIcon;
	value: string;
	label: string;
	tone?: CiFactTone;
	hint?: string;
}

export interface CiGaugeProps {
	/** The green share, 0..1; `null` when nothing finished. */
	green: number | null;
	/** The figure printed beside the gauge. */
	value: string;
	label: string;
	caption?: string;
	hint?: string;
}
/** Same profile-cohort texts on Spire's page and CLI. No outcome inference. */
export interface CiTriggerReportView {
	readonly title: string;
	readonly filter: string;
	readonly range: string;
	readonly scope: string;
	readonly window: string;
	readonly source: string;
	readonly basis: string;
	readonly unknown_share: string;
	readonly coverage: string;
	readonly unknown_note: string;
	readonly buckets: readonly {
		readonly trigger: string;
		readonly count: number;
	}[];
	readonly cohorts: readonly {
		readonly job: string;
		readonly name: string;
		readonly workflow: string;
		readonly trigger: string;
		readonly count: number;
		readonly measured: string;
		readonly mean: string;
	}[];
	readonly empty: string | null;
}

export interface CiPrWaitReportView {
	readonly readiness_audit: CiReadinessAuditView;
	readonly daily: CiPrWaitDailyView;
	readonly concurrency: CiPrConcurrencyView;
	readonly readiness: readonly CiReadinessView[];
	readonly readiness_note: string;
	readonly work_coverage: string;
	readonly work_note: string;
	readonly work_jobs: readonly (CiPrWaitReportView["jobs"][number] & {
		readonly median_execution: string;
		readonly median_start_delay: string;
		readonly median_tail: string;
		readonly median_outside_execution: string;
		readonly clock_samples: string;
	})[];
	readonly unavailable_reasons: readonly string[];
	readonly title: string;
	readonly population: string;
	readonly window: string;
	readonly source: string;
	readonly coverage: string;
	readonly clock: string;
	readonly note: string;
	readonly observed_prs: number;
	readonly observed_heads: number;
	readonly measured_heads: number;
	readonly unavailable_heads: number;
	readonly unassociated_runs: number;
	readonly median_time_to_green: string;
	readonly jobs: readonly {
		readonly workflow: string;
		readonly job: string;
		readonly last_finishing_heads: number;
		readonly head_share: string;
		readonly median_time_to_green: string;
		readonly execution_share: string;
		readonly share_samples: string;
	}[];
	readonly unavailable: string | null;
}

export interface CiPrWaitDailyView {
	readonly title: string;
	readonly clock: string;
	readonly note: string;
	readonly coverage: string;
	readonly undated_heads: number;
	readonly outside_window_heads: number;
	readonly markers: readonly {
		readonly sha: string;
		readonly at: string;
		readonly pr: number | null;
		readonly subject: string;
	}[];
	readonly markers_unavailable: string | null;
	readonly unavailable: string | null;
	readonly days: readonly {
		readonly date: string;
		readonly from: string;
		readonly to: string;
		readonly partial_window: boolean;
		readonly observed_heads: number;
		readonly measured_heads: number;
		readonly unavailable_heads: number;
		readonly median_seconds: number | null;
		readonly median: string;
	}[];
}

export interface CiReadinessClocks {
	readonly job_id: string;
	readonly needs_ready_at: string | null;
	readonly ready_at: string | null;
	readonly after_needs_seconds: number | null;
	readonly own_runner_wait_seconds: number | null;
	readonly latest_prerequisites: readonly {
		readonly job_id: string;
		readonly job: string;
		readonly definition: string;
		readonly completed_at: string;
		readonly job_url: string;
	}[];
	readonly unavailable_reasons: readonly string[];
}
export interface CiReadinessAuditView {
	readonly definitions: readonly string[];
	readonly selected_definition: string | null;
	readonly coverage: string;
	readonly model_note: string;
	readonly rows: readonly (Omit<CiReadinessClocks, "job_id"> & {
		readonly pr: number;
		readonly head: string | null;
		readonly run_id: string;
		readonly attempt: number;
		readonly job_id: string | null;
		readonly job: string | null;
		readonly conclusion: string;
		readonly run_created_at: string | null;
		readonly created_at: string | null;
		readonly started_at: string | null;
		readonly completed_at: string | null;
		readonly execution_seconds: number | null;
		readonly model_period: string;
		readonly identity_note: string;
		readonly run_url: string;
		readonly attempt_url: string;
		readonly job_url: string | null;
	})[];
}

export interface CiReadinessView {
	readonly observations?: readonly CiReadinessClocks[];
	readonly work: string;
	readonly workflow: string;
	readonly heads: number;
	readonly complete_heads: number;
	readonly coverage: string;
	readonly parts: readonly {
		readonly part: string;
		readonly median: string;
		readonly samples: string;
	}[];
	readonly stages: readonly {
		readonly definition: string;
		readonly job: string;
		readonly role: string;
		readonly outcomes: string;
		readonly heads: number;
		readonly execution: string;
		readonly created_to_start: string;
		readonly after_ready: string;
		readonly creation_gap: string;
		readonly samples: string;
	}[];
	readonly unavailable_reasons: readonly string[];
}

export interface CiPrConcurrencyView {
	readonly title: string;
	readonly scope: string;
	readonly coverage: string;
	readonly clock: string;
	readonly model_note: string;
	readonly measurement_note: string;
	readonly reservation_note: string;
	readonly critical_peak: number | null;
	readonly other_peak: number | null;
	readonly critical_job_time: string;
	readonly critical_wall_time: string;
	readonly other_job_time_during_critical: string;
	readonly heads: readonly {
		readonly pr: number;
		readonly head: string;
		readonly critical_jobs: number;
		readonly critical_peak: number | null;
		readonly first_minute_critical_peak: number | null;
		readonly other_peak: number | null;
		readonly other_job_time_during_critical: string;
		readonly coverage: string;
	}[];
}
/** Evidence and coverage for an exact recorded-step timing selection. */
export interface CiStepTrendEvidenceView {
	readonly title: string;
	readonly clock: string;
	readonly coverage: Readonly<Record<string, number>>;
	readonly coverageText: readonly string[];
}

/** Clock projection shared by local timing files and live CI profile evidence. */
export interface CiTestTimingsReportView {
	readonly step: string;
	readonly script_phases: {
		readonly unavailable: string | null;
		readonly capped: boolean;
		readonly clock: string;
		readonly records: readonly {
			phase: string;
			name: string;
			started_at: string;
			duration_ms: number;
			duration: string;
			outcome: string;
		}[];
	};
	readonly title: string;
	readonly range: string;
	readonly window: string;
	readonly live_source: string;
	readonly source: string;
	readonly clock: string;
	readonly unavailable: string | null;
	readonly identity: readonly string[];
	readonly command: string;
	readonly phase: string;
	readonly tail: string;
	readonly outcome: string;
	readonly coverage: string;
	readonly cases: readonly {
		file: string;
		name: string;
		state: string;
		diagnostic: string;
		retries: string;
		repeats: string;
		body: string;
		observation: string;
		operations:
			| readonly {
					phase: string;
					category: string;
					duration: string;
					requests: number;
					processes: number;
			  }[]
			| null;
	}[];
	readonly modules: readonly {
		file: string;
		environment: string;
		prepare: string;
		collect: string;
		setup: string;
		tests_hooks: string;
	}[];
}

/** Browser-safe structural contract of the shared per-PR completion report. */
export interface CiPrHeadView {
	readonly invalid_records: number | null;
	readonly conflicting_identities: number | null;
	readonly duplicate_deliveries: number | null;
	readonly pr: number;
	readonly source: string;
	readonly coverage: string;
	readonly association_basis: string;
	readonly failure_coverage: string;
	readonly window: { readonly from: string; readonly to: string } | null;
	readonly unavailable: string | null;
	readonly heads: readonly {
		readonly head_sha: string;
		readonly observed_attempts: number;
		readonly time_to_green_seconds: number | null;
		readonly unavailable: string | null;
		readonly observed_failure_rows: number;
		readonly omitted_failure_rows: number;
		readonly failures: readonly {
			readonly workflow: string;
			readonly workflow_truncated: boolean;
			readonly workflow_path: string | null;
			readonly job: string | null;
			readonly job_id: string | null;
			readonly job_name_truncated: boolean;
			readonly run_id: string;
			readonly attempt: number;
			readonly conclusion: string;
			readonly identity_note: string;
			readonly run_url: string;
			readonly attempt_url: string;
			readonly job_url: string | null;
		}[];
	}[];
}

/** Local attempt clocks are separate from CI job and PR timing. No live source is implied. */
export interface CiLocalAttempt {
	version: 1;
	started_at: string;
	mode: "rust" | "preflight";
	route: "remote" | "local" | "fallback";
	source_sha: string | null;
	base_sha: string | null;
	image: string | null;
	library_head: string | null;
	library_tree: string | null;
	expected_library_tree: string | null;
	remote_status: number | null;
	local_status: number | null;
	exit_status: number | null;
	remote_ms: number | null;
	local_ms: number | null;
	wall_ms: number | null;
	lock_wait_ms: number | null;
	guard_reason: string;
	evidence: "complete" | "incomplete" | "missing" | "not-attempted";
	evidence_path: string | null;
}
export interface CiLocalAttemptClock {
	measured: number;
	unavailable: number;
	total_ms: number | null;
	mean_ms: number | null;
}
export interface CiLocalAttemptsReportView {
	title: string;
	scope: string;
	clock: string;
	coverage_note: string;
	evidence_note: string;
	unavailable: string | null;
	counts: { remote: number; local: number; fallback: number };
	guards: { reason: string; attempts: number }[];
	wall: CiLocalAttemptClock;
	remote: CiLocalAttemptClock;
	local: CiLocalAttemptClock;
	lock: CiLocalAttemptClock;
	coverage: {
		scanned: number;
		accepted: number;
		rejected: number;
		retained: number;
		omitted: number;
		truncated: boolean;
		capped: boolean;
	};
	attempts: CiLocalAttempt[];
}

/** Checked-in CI capabilities; nullable configuration is deliberately unknown. */
export interface CiMapTopology {
	schemaVersion: 1;
	reviewedAt: string;
	note: string;
	revision?: string | null;
	pools: {
		id: string;
		node: string | null;
		mode: string;
		slots: number | null;
		resources: Record<string, number> | null;
		note?: string;
		sources: string[];
	}[];
	stores: {
		id: string;
		name?: string;
		node?: string | null;
		summary?: string;
		kind?: string;
		tier: string;
		location: string;
		keying: string;
		retention: string | null;
		writers: string[];
		readers: string[];
		note: string;
		sources: string[];
	}[];
	cacheFillLanes?: {
		id: string;
		name: string;
		trigger: string;
		sources: string[];
		stages: { label: string; job?: string; store?: string; note?: string }[];
	}[];
	levers?: {
		id: string;
		name: string;
		effect: string;
		state: string;
		where: string;
		url?: string;
	}[];
	jobs: {
		id: string;
		name: string;
		workflow: string;
		pools: string[];
		steps?: { name: string; uses?: string; run?: string; condition?: string }[];
	}[];
}
export interface CiMapRuns {
	from: string;
	to: string;
	invalid: number;
	conflicts: number;
	note: string;
	runs: {
		id: string;
		attempt: number;
		workflow: string;
		sha: string | null;
		conclusion?: string | null;
		selection?: boolean;
		url: string;
		origin: number | null;
		end: number | null;
		chainComplete: boolean;
		chainReasons: readonly string[];
		jobs: {
			id: string;
			definition: string | null;
			name: string;
			created?: number | null;
			ready?: number | null;
			started: number | null;
			completed: number | null;
			conclusion: string;
			critical: boolean;
			url: string;
		}[];
	}[];
}

export interface CiMapStepSelection {
	range: "1d" | "7d" | "14d";
	run: string;
	attempt: number;
	job: string;
	name: string;
}
export interface CiMapStepTelemetry extends CiMapStepSelection {
	source?: "github-api" | "runner-hook";
	sourceNote?: string;
	steps: { name: string; seconds: number; result: string }[];
	unavailable?: string;
}

/** Estate sizing observations. Null means missing, never zero. */
export interface CiEstatePod {
	role: "runner" | "job" | null;
	/** Exact same-namespace ARC runner whose pool/node were inherited. */
	derivedFrom: string | null;
	namespace: string;
	pod: string;
	pool: string | null;
	node: string | null;
	cpuCores: number | null;
	cpuLimit: number | null;
	throttledRatio: number | null;
	memoryPeakBytes: number | null;
	memoryLimitBytes: number | null;
	oomObserved: boolean | null;
	restarts: number | null;
	memorySource: string;
	newest: string | null;
}
export interface CiEstateSizing {
	source: "estate";
	from: string;
	to: string;
	pods: CiEstatePod[];
	unavailable?: string;
	note: string;
	attribution: string;
}

export interface CiEstatePoint {
	at: number;
	cpuCores: number | null;
	cpuLimit: number | null;
	throttledRatio: number | null;
	memoryBytes: number | null;
	memoryLimit: number | null;
}
export interface CiEstateHistory {
	rateWindowSeconds?: number;
	poolCoverage?: { pool: string | null; observedPods: number; selectedPods: number }[];
	from: string;
	to: string;
	stepSeconds: number;
	pods: {
		namespace: string;
		pod: string;
		pool: string | null;
		role: "runner" | "job" | null;
		points: CiEstatePoint[];
	}[];
	note: string;
	unavailable?: string;
}
