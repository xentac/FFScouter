# Project Mandates

- **The task is not complete until there are no lint warnings or test failures:** No change is complete without adequate testing or if lint warnings still exist. Always make sure everything is "green" before claiming you're done. Do not delete a broken test without user verification.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for xentac/FFScouter; external PRs are also pulled into the triage queue as a request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — no remapping. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Gotchas

- Prefer using jj for version control; only fall back to git commands if the environment is a true git clone and not a jj overlay. When running git, always use `--no-pager`.
- Branches, beta megamerge, and releases: read `docs/agents/branch-workflow.md` first. It applies before you commit to a `feat/*` branch, rebase onto `main`, change `beta`, push, or prepare `bun run release`.
- Tests are run using `bun run test --run`. The test framework in vitest. You can add additional flags to that command and they will be passed directly to vitest.
  - Running `bun test` or `bun x vitest` are not allowed.
- Linting is managed through `bun run lint`. Linting is three parts: biome, tsc --noEmit, and react-doctor (`--blocking error`, so it gates on error-level React issues only — the existing warning baseline is tracked in `TODO`, not blocking). Ideally linting is checked with the single `bun run lint` command but additional arguments to biome or tsc are allowed using `bun x ...`. Run `bun run react-doctor` for the full verbose React health report.
