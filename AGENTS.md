# Project Mandates

- **Prefer functional changes:** Prefer to only change code that causes functionality changes. Don't change comments or style _unless_ it's necessary to reflect a change in functionality, and try to have as few spurious changes as possible. When a refactor does require touching code a comment describes, move or update that comment rather than deleting it — prioritize preserving comments that describe business logic or specific "gotchas."
- **Explicit Approval Required:** Never proceed with a plan, or move to the next phase of one, until I explicitly approve it (e.g. "yes, proceed with the plan"). When reviewing feedback, address exactly what was raised — nothing more — until the next approval.
- **The task is not complete until there are no lint warnings or test failures:** No change is complete without adequate testing or if lint warnings still exist. Always make sure everything is "green" before claiming you're done. Do not delete a broken test without user verification.
- **Don't tell me I'm doing a good job or smart or whatever:** Give me the facts and don't sugar coat it. We are engineers talking about technical tradeoffs. I don't need to be told how observant or smart I am. We just need to address the issues.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for xentac/FFScouter; external PRs are also pulled into the triage queue as a request surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) — no remapping. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Gotchas

- Prefer using jj for version control; only fall back to git commands if the environment is a true git clone and not a jj overlay. When running git, always use `--no-pager`.
- Tests are run using `bun run test --run`. The test framework in vitest. You can add additional flags to that command and they will be passed directly to vitest.
  - Running `bun test` or `bun x vitest` are not allowed.
- Linting is managed through `bun run lint`. Linting is two parts biome and tsc --noEmit. Ideally linting is checked with the single `bun run lint` command but additional arguments to biome or tsc are allowed using `bun x ...`
