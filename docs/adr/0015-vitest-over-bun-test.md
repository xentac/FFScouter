# Tests run on vitest, not `bun test`

FFScouter uses bun for installs, scripts, and CI, but the tests run on vitest through `bun --bun vitest`. No one chose vitest on purpose at first. It came with the Vite setup. In November 2026 the project compared a move to `bun test` and decided to stay on vitest.

The build is `vite build`, so Vite and `vite.config.ts` stay in any case. vitest reuses that file's aliases, defines, and CSS Module rules. bun 1.4.4, the version that CI pins, lacks much of the vitest layer that the bun docs describe. The missing parts are these:

- `vi.mocked`, `vi.stubGlobal`, `vi.setSystemTime`, `vi.importActual`, `vi.resetModules`, `vi.hoisted`, and `vi.waitFor`
- `importOriginal` in mock factories
- a jsdom environment

27 of 48 test files use one of them.

## Considered Options

- **Move to `bun test` with a `vi` compatibility shim**: rejected. It needs a shim of about 60 lines, edits to 13 test files, and fixes to 4 files that depend on jsdom. The project then owns the shim through every bun upgrade.
- **Move to native `bun:test` APIs**: rejected. It rewrites 27 files, including 218 `vi.mocked` calls.

Both moves copy the Vite rules into a preload and a second tsconfig, and the two copies must stay in step. Both lose statement and branch coverage, because bun reports lines and functions only. Both replace jsdom with happy-dom, which is less close to a real browser. Both need `--isolate` to stop module mocks from leaking across files, and `--isolate` was slower than vitest. Both lose `test.prop` from `@fast-check/vitest`. The gains are 3 or 4 fewer packages and maybe a faster run, but there is no fair full-suite speed number.

## Consequences

- Property tests use `test.prop` from `@fast-check/vitest`.
- If a bun release passes the probe in the research findings, or if vitest itself becomes a problem, recheck this decision. Do not recheck it at other times. The probe is in [docs/research/bun-test-vs-vitest.md](https://github.com/xentac/FFScouter/blob/research/bun-test-vs-vitest/docs/research/bun-test-vs-vitest.md) on the `research/bun-test-vs-vitest` branch. No issue tracks the recheck.
