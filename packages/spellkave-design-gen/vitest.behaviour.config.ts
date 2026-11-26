// Behaviour suite: Gherkin scenarios in behaviour/*.feature drive the real
// skgen (bundled once by behaviour/support/setup.ts) in a temp workspace per
// scenario, and read only what skgen prints, its exit code and the files it
// writes; nothing under `src/` is imported. Scenarios share nothing (own
// workspace, own HOME), so feature files run in parallel. Offline: no
// provider credential, no network; prose runs use skgen's own
// `--provider fake`. The package's `test` script does not pick it up; sk.yml
// runs it as its own step.
//
// `pnpm guide` (`behaviour-docs guide`, from @spellkave/behaviour) turns the
// last run into docs/guide.md and docs/scenarios.md.
import { behaviourConfig } from "@spellkave/behaviour/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig(
	behaviourConfig({
		steps: ["behaviour/steps.ts"],
		globalSetup: ["behaviour/support/setup.ts"],
		parallel: true,
	}),
);
