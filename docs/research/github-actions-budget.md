# Research: GitHub Actions budget for long property-test runs

Research for [issue #52](https://github.com/xentac/FFScouter/issues/52)
(child of wayfinder map [issue #50](https://github.com/xentac/FFScouter/issues/50)).

Question: what GitHub Actions capacity does xentac/FFScouter have for long
property-test runs, and what does a scheduled deep run cost?

Sources fetched 2026-11-22. Each claim names its source.

## Short answer

A scheduled deep property-test job costs nothing. FFScouter is a public
repository. Standard GitHub-hosted runners are free for public repositories,
and that use does not count against the plan's included compute. Minutes are
not the budget. The real limits are 6 hours per job, 20 or 40 concurrent
jobs, 256 jobs per matrix, and schedule delays at busy times.

## Repository and plan

- `gh repo view` reports `visibility: PUBLIC`, owner `xentac` (a personal
  account).
- The plan is assumed to be GitHub Pro. It is not verified. `gh api user`
  returns `plan: null` because the local token lacks the `user` scope. The
  plan does not change the answer for a public repository on standard
  runners. It only changes the concurrency cap (20 on Free, 40 on Pro).

## Minutes and cost

Source: [GitHub Actions billing][billing].

- Standard GitHub-hosted runners in public repositories are free. The page
  says this use "remains free independently and does not reduce the included
  compute usage." Self-hosted runners are also free.
- Included compute is stated in dollars, not minutes. Free includes
  $12 USD per month. Pro and Team include $18 USD per month. This allowance
  applies to private repositories and paid runner types. It is not used by
  this repository's current workflows.
- "Larger runners are billed for public repositories."
- Storage: Free includes 500 MB of artifact storage. Pro includes 1 GB.
  Both include 10 GB of cache storage per repository. The page does not say
  whether artifact storage is free for public repositories. A fast-check
  failure report (seed, path, counterexample) is a few kilobytes, so this
  does not matter in practice.

Source: [GitHub's plans][plans]. The plans page repeats the $12 (Free) and
$18 (Pro) compute amounts. It lists no public-repository Actions benefit
for Pro beyond Free.

## Job, workflow, and concurrency limits

Source: [Actions limits][limits].

| Limit | Value |
|---|---|
| Job execution time on GitHub-hosted runners | 6 hours, then the job fails |
| Workflow run time | 35 days, including waiting and approval |
| Concurrent jobs, standard hosted runners | Free 20, Pro 40, Team 60 |
| Jobs per matrix | 256 per workflow run |
| Workflow run queue | 500 runs per 10 seconds |

The limits page lists no limits that apply only to scheduled workflows.

A job's `timeout-minutes` defaults to 360 minutes
([workflow syntax][syntax]), which is the same as the 6-hour cap. A deep job should set it explicitly below the cap. It should
also pass fast-check's `interruptAfterTimeLimit` so the run stops cleanly
and reports, instead of being killed.

## Runner hardware

Source: [GitHub-hosted runners][runners].

| Repository type | CPU | RAM | SSD |
|---|---|---|---|
| Public | 4 | 16 GB | 14 GB |
| Private | 2 | 8 GB | 14 GB |

`ubuntu-latest` in this public repository already has 4 vCPUs and 16 GB.
Larger runners cost money even here and give little extra for a
single-threaded JavaScript property loop. Vitest already spreads test files
across worker threads.

## Scheduled workflows

Source: [Events that trigger workflows, `schedule`][schedule].

- The shortest interval is once every 5 minutes.
- Scheduled runs "can be delayed during periods of high loads." The top of
  every hour is a high-load period. At high enough load, queued jobs can be
  dropped. Pick an odd minute, for example `17 5 * * *`.
- "Scheduled workflows will only run on the default branch." For FFScouter
  this is `main`.
- In public repositories, "scheduled workflows are automatically disabled
  when no repository activity has occurred in 60 days." The page does not
  define activity. A commit by a user with write access that changes the
  `cron` value re-enables the workflow.

Source: [Disable and enable workflows][disable].

- Re-enable from the Actions tab ("Enable workflow") or with
  `gh workflow enable <file>`.
- The page does not mention a warning email.

`workflow_dispatch` (manual run) is available alongside `schedule`. It
accepts up to 25 inputs, which suits a `num_runs` or `seed` override. The
workflow file must exist on the default branch.

## What the current CI uses

Source: `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`,
`.github/workflows/dependency-review.yml`, and `gh run list --limit 30`.

- `ci.yml` runs on push to `main` and `modernize`, and on every pull
  request. It has two jobs on `ubuntu-latest`. `lint-test` runs
  `bun install`, `bun run lint`, `bun run test --run`, and `bun run build`.
  `audit` runs `bun audit` (advisory). Bun is pinned to 1.4.4.
- `ci.yml` sets `concurrency: ci-${{ github.workflow }}-${{ github.ref }}`
  with `cancel-in-progress: true`. A deep job in its own workflow file gets
  its own group, because the group name includes the workflow name. A deep
  job added inside `ci.yml` would share the group, and a push to `main`
  would cancel it.
- No job sets `timeout-minutes`.
- Recent runs: a CI run takes about 25 to 40 seconds of wall time. CodeQL
  takes about 75 to 90 seconds. Dependency Review takes about 10 seconds.
  That is roughly 2 to 3 job-minutes per push or pull request, all free.
- CodeQL already runs on a weekly `schedule` (last run 2026-11-16). The
  repository already depends on cron, and the 60-day rule already applies.
- Vitest config (`vite.config.ts`) sets no `testTimeout`. Vitest's default
  is 5 seconds per test. A deep property run inside one `test.prop` will hit
  that limit. The deep run needs a larger per-test timeout.

## How TypeScript projects run long fast-check jobs

No widely used TypeScript project was found that documents a scheduled
fast-check job. fast-check's own repository has no such workflow. The
pattern below comes from fast-check's docs and from a few small public
repositories found with GitHub code search.

### fast-check's own guidance

- Run count: `fc.configureGlobal({ numRuns })` in a Vitest `setupFiles`
  module sets the count for every property
  ([global settings][fc-global]). `configureGlobal` replaces all global
  settings, so spread `fc.readConfigureGlobal()` to add to them.
- Long runs: the [fuzzing guide][fc-fuzz] uses `numRuns: 1_000_000` or
  `Number.POSITIVE_INFINITY`. It says several properties may need several
  processes because JavaScript is single-threaded.
- Time budget: `interruptAfterTimeLimit` caps runner time. An interrupt is
  not a failure unless no run succeeded. `markInterruptAsFailure: true`
  makes any interrupt a failure ([timeouts][fc-timeouts]).
- Seed reporting: every failure prints the run count, a replay object
  `{ seed, path, endOnFailure: true }`, the shrunk counterexample, the
  shrink count, and the error ([reading test reports][fc-reports]).
  Pass the replay object back to `fc.assert` or `test.prop` to replay
  ([`@fast-check/vitest` README][fc-vitest]).

### Patterns seen in other repositories

- Environment variable for the run count. PREreview/prereview.org runs
  `FAST_CHECK_NUM_RUNS=10 npx vitest run` ([Makefile][prereview]). A setup
  file reads the variable and calls `fc.configureGlobal`.
- Scheduled plus manual trigger. mbcrawfo/vibefun runs weekly
  (`0 7 * * 1`) and on `workflow_dispatch` with `num_runs` and `seed`
  inputs, passed as `FC_NUM_RUNS` and `FC_SEED`
  ([property-fuzz.yml][vibefun]). A failing seed becomes a pinned
  regression test.
- Matrix for seed diversity. purrgrammer/fragua runs a daily job
  (`17 5 * * *`) on Bun with a 5-job matrix. Each job runs the whole suite
  with a fresh seed and a 20x run multiplier, `timeout-minutes: 30`, and
  `bun test --timeout 300000` ([property-nightly.yml][fragua]). Its comments
  warn that the matrix does not split the work, so each job's timeout must
  cover the full suite.
- Failure artifact and issue. The closest documented example is Python.
  pydata/xarray's Hypothesis workflow runs daily and on
  `workflow_dispatch`. It saves the Hypothesis example database with
  `actions/cache/save` even on failure. On a scheduled failure it opens an
  issue from the pytest log ([hypothesis.yaml][xarray]). The fast-check
  equivalent is to upload the failure output (seed, path, counterexample)
  as an artifact or post it to an issue.

## Unused capacity for a scheduled deep job

- Minutes: unlimited for standard runners in this public repository. A
  nightly job that uses the full 6 hours adds about 180 runner-hours per
  month at no cost.
- Width: up to 40 concurrent jobs on Pro (20 on Free) and 256 matrix jobs
  per run. Current CI uses at most about 4 jobs at once.
- Depth: 6 hours per job. Set `timeout-minutes` below that and stop
  fast-check earlier with `interruptAfterTimeLimit`.

## Caveats for the map

- Schedules test `main` only. Work on `feat/*` and `beta` is not covered
  until it lands on `main`. Use `workflow_dispatch` (with a branch picked
  in the UI or `gh workflow run --ref`) to deep-run a feature branch.
- The 60-day inactivity rule can disable the schedule if the repository
  goes quiet. `gh workflow enable` fixes it.
- Scheduled runs can be late or dropped at the top of the hour.
- Keep the deep job out of the `ci.yml` concurrency group.
- Raise the Vitest per-test timeout for the deep run only.

[billing]: https://docs.github.com/en/billing/concepts/product-billing/github-actions
[plans]: https://docs.github.com/en/get-started/learning-about-github/githubs-plans
[limits]: https://docs.github.com/en/actions/reference/limits
[syntax]: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idtimeout-minutes
[runners]: https://docs.github.com/en/actions/reference/runners/github-hosted-runners
[schedule]: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
[disable]: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows
[fc-global]: https://fast-check.dev/docs/configuration/global-settings/
[fc-fuzz]: https://fast-check.dev/docs/advanced/fuzzing/
[fc-timeouts]: https://fast-check.dev/docs/configuration/timeouts/
[fc-reports]: https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/
[fc-vitest]: https://github.com/dubzzz/fast-check/blob/main/packages/vitest/README.md
[prereview]: https://github.com/PREreview/prereview.org/blob/main/Makefile
[vibefun]: https://github.com/mbcrawfo/vibefun/blob/main/.github/workflows/property-fuzz.yml
[fragua]: https://github.com/purrgrammer/fragua/blob/main/.github/workflows/property-nightly.yml
[xarray]: https://github.com/pydata/xarray/blob/main/.github/workflows/hypothesis.yaml
