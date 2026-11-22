# Research: fast-check with vitest 5 under bun

Research for [issue #51](https://github.com/xentac/FFScouter/issues/51)
(child of wayfinder map [issue #50](https://github.com/xentac/FFScouter/issues/50)).

Question: does fast-check with `@fast-check/vitest` work in this repo
(vitest 5, run as `bun --bun vitest`, jsdom), and how do its features map
to the property-based testing effort?

Sources checked 2026-11-22:

- npm registry (`npm view`) for versions, dates and peer dependencies.
- The installed packages themselves: `node_modules/@fast-check/vitest/README.md`,
  `node_modules/@fast-check/vitest/lib/vitest-fast-check.js` (the wrapper
  source), `node_modules/fast-check/lib/fast-check.d.ts` (the API types).
- fast-check docs:
  [global settings](https://fast-check.dev/docs/configuration/global-settings/),
  [read test reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/),
  [model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/),
  [race conditions](https://fast-check.dev/docs/advanced/race-conditions/).
- [`@fast-check/vitest` CHANGELOG](https://github.com/dubzzz/fast-check/blob/main/packages/vitest/CHANGELOG.md).
- Prototype tests on this branch, run with `bun run test --run`
  (vitest 5.1.0, bun 1.4.4): `src/tests/fcsetup.ts`, `src/research/*.test.ts`.

## Answer in short

Yes. `fast-check@4.11.0` with `@fast-check/vitest@0.5.0` installs and runs
cleanly under `bun --bun vitest` 5.1.0, in both the `node` and `jsdom`
environments. `fc.asyncModelRun` drives `FFCache` against the fake
IndexedDB with no extra setup. A global run count from an env var works
through a vitest setup file. The full suite and `bun run lint` stay green.

## Versions and compatibility

| Package              | Version | Published  | Notes                             |
| -------------------- | ------- | ---------- | --------------------------------- |
| `fast-check`         | 4.11.0  | 2026-11-21 | 4.10.3 came out 2026-11-18        |
| `@fast-check/vitest` | 0.5.0   | 2026-09-11 | peer `vitest: ^4.1.0 \|\| ^5.0.0` |

- `@fast-check/vitest@0.5.0` depends on `fast-check: ^3.0.0 || ^4.0.0` and
  has the peer range `vitest: ^4.1.0 || ^5.0.0` (npm registry).
- The CHANGELOG lists "Support Vitest 5" (PR #7244) under **0.5.0**. The
  README's requirements table still says 0.4 covers `^5.0.0`. Trust the
  CHANGELOG and use 0.5.0.
- The README requires `require(esm)` support (Node 22.12+ for vitest 5).
  Bun has it. No source mentions bun at all. The prototype is the evidence:
  all property tests pass under `bun --bun vitest`.
- `fast-check@4.11.0` is one day old. If that worries you, `^4.10.3` is the
  previous release. The prototype ran on 4.11.0 with no problems.

## `test.prop` and `fc.assert`

`@fast-check/vitest` exports `test`, `it` and `fc`. `test.prop(arbs, params?)`
takes an array or a record of arbitraries. The predicate can be sync or async.
It can return a boolean or throw (so `expect` works). `.skip`, `.only`,
`.todo`, `.concurrent` and `test.each` work too (README, CHANGELOG 0.4.1).

```ts
import { fc, test } from "@fast-check/vitest";

test.prop([fc.string(), fc.string()])("concat keeps parts", (a, b) => {
  expect((a + b).startsWith(a)).toBe(true);
});
```

Inside, the wrapper calls `fc.assert(fc.asyncProperty(...), params)`
(`vitest-fast-check.js`). So plain `fc.assert` inside a normal vitest
`test` also works. It is the right tool when one test needs several
properties or custom setup.

Two wrapper details matter here:

- **Hooks run per iteration.** The wrapper runs every vitest `beforeEach`
  and `afterEach` around each predicate run (README, wrapper source). In this
  repo the global `afterEach` in `src/tests/idbsetup.ts` clears
  `document.body` and drains 5 MessageChannel tasks after every iteration.
  That is good for DOM isolation. The cost was small: 2000 runs of three
  properties, two of them against IndexedDB, took about 2 seconds.
- **The seed is in the test name.** The wrapper picks the seed when the file
  is collected and names the test `"<label> (with seed=<n>)"`. The name
  changes on every run. `-t "<label>"` still matches because it is a
  substring match.

## Failure reports and replay

A failure prints the seed, the path and the shrunk counterexample. Captured
from `src/research/fc-fail.test.ts` (a planted bug):

```text
FAIL  src/research/fc-fail.test.ts > naive sort is wrong (with seed=1361937097)
Error: Property failed after 2 tests
{ seed: 1361937097, path: "1:1:2:...:3", endOnFailure: true }
Counterexample: [[-1,-2]]
Shrunk 60 time(s)
Caused by: AssertionError: expected -1 to be less than or equal to -2
```

There are two ways to replay:

1. **Seed only, from the shell.** `FC_SEED=1361937097 bun run test --run <file>`.
   The setup file puts the seed in `fc.configureGlobal`, and the wrapper
   reads `readConfigureGlobal().seed` when a test gives no seed. The
   prototype reproduced the same counterexample this way. It replays the
   whole run and shrinks again, so it is slower but needs no code edit.
   Keep `FC_NUM_RUNS` the same as the failing run so the run matches.
2. **Seed and path, in code.** Paste the printed object into the test:
   `test.prop(arbs, { seed: 1361937097, path: "1:1:...", endOnFailure: true })`.
   This jumps straight to the shrunk case
   ([read test reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/)).
   `path` cannot go in `configureGlobal`: `GlobalParameters` excludes
   `path`, `examples` and `plugins` (`fast-check.d.ts`).

For model-based tests the counterexample also prints a `replayPath`, for
example `[update(1),advance(3600000),get(1) /*replayPath="JSY:F"*/]`. Pass it
as `fc.commands(cmds, { replayPath: "JSY:F" })` together with `seed` and
`path` ([model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/)).

## Global run count from an env var

`fc.configureGlobal` is the documented way to share settings. The docs
recommend calling it from a vitest `setupFiles` entry
([global settings](https://fast-check.dev/docs/configuration/global-settings/)).
It replaces all global settings, so spread `fc.readConfigureGlobal()` first.
The prototype `src/tests/fcsetup.ts`:

```ts
import { fc } from "@fast-check/vitest";

const numRuns = Number(process.env["FC_NUM_RUNS"] ?? "25");
const seed = process.env["FC_SEED"];
fc.configureGlobal({
  ...fc.readConfigureGlobal(),
  numRuns,
  ...(seed === undefined ? {} : { seed: Number(seed) }),
});
```

It is added after `idbsetup.ts` in `vite.config.ts`:
`setupFiles: ["./src/tests/idbsetup.ts", "./src/tests/fcsetup.ts"]`.

- `src/research/fc-basic.test.ts` counts predicate calls and asserts the
  count equals `FC_NUM_RUNS`. It passes with the default and with
  `FC_NUM_RUNS=40`.
- A deep run on a laptop: `FC_NUM_RUNS=2000 bun run test --run`.
- fast-check's own default is 100 runs. The prototype uses 25 as a fast CI
  default. The final number is for the spec to choose.
- A per-test `numRuns` in `test.prop(arbs, { numRuns })` overrides the
  global value, because the wrapper passes it straight to `fc.assert`.
  Avoid it except for very slow properties, or the env var stops working
  for that test.

## Model-based tests: `fc.commands` and `fc.asyncModelRun`

API (`fast-check.d.ts`):

- A command implements `AsyncCommand<Model, Real>`: `check(model)` says if
  the command may run, `run(model, real): Promise<void>` acts on the real
  system, checks it against the model and updates the model, and
  `toString()` names it in reports.
- `fc.commands(arbs, { size?, maxCommands?, replayPath?, disableReplayLog? })`
  makes a command list with a shrinker built for commands.
- `fc.asyncModelRun(setup, cmds)` runs the list. `setup` returns
  `{ model, real }` and may be async.
- `fc.scheduledModelRun(scheduler, setup, cmds)` does the same under
  `fc.scheduler()` to explore promise interleavings (race conditions).

`src/research/fc-model-ffcache.test.ts` is a working model-based test of
`FFCache` (`get`, `update`, and expiry) against the fake IndexedDB from
`src/tests/idbsetup.ts` (`vitest-indexeddb`, with `fake-indexeddb` pinned to
4.0.2 by `overrides`). Each run opens a fresh database with a unique name
and calls `delete_db()` in a `finally` block. It passes at 2000 runs in the
`node` environment and in a `// @vitest-environment jsdom` copy.

To check that it can find bugs, the model's expiry test was changed from
`<=` to `<`. fast-check found it and shrank it to three commands:

```text
Counterexample: [update(1),advance(3600000),get(1) /*replayPath="JSY:F"*/]
Shrunk 7 time(s)
```

That is the exact one-hour expiry boundary. Note that `FFCache` logs
migration lines on every open, so a failing run prints a lot of stdout. A
real test may want to silence the `storage` logger.

## Time

fast-check has no clock of its own. The race-conditions guide only shows
how to make `fc.scheduler` release pending fake timers through a custom
`act` (its example uses Jest fake timers)
([race conditions](https://fast-check.dev/docs/advanced/race-conditions/)).
`fc.date()` generates `Date` values but does not control `Date.now()`.

A test can still control time per command, because a command is plain
code. The prototype has an `AdvanceCmd(ms)` command. Its `run` adds `ms` to
`model.now` and calls `vi.setSystemTime(model.now)`. The test fakes only
`Date` (`vi.useFakeTimers({ toFake: ["Date"] })`) so timers and the fake
IndexedDB's scheduling stay real. Durations come from an arbitrary, such as
`fc.oneof(fc.integer({ min: 0, max: 2 * HOUR }), fc.constant(HOUR))`, so
boundary values show up often and shrink well.

For the injectable clock ticket: this works today only because `FFCache`
reads `Date.now()` and vitest can fake it globally. With an injected clock,
`setup` would build the real system with a clock that reads `model.now`,
and `AdvanceCmd` would only change the model. No global fake timers would
be needed, and properties could run with `.concurrent`.

## Alternatives

| Library     | Last release           | Status                 |
| ----------- | ---------------------- | ---------------------- |
| `jsverify`  | 0.8.4, 2018-10-31      | Unmaintained           |
| `testcheck` | 1.0.0-rc.2, 2017-04-26 | Unmaintained           |
| fast-check  | 4.11.0, 2026-11-21     | Active, vitest package |

Dates are from the npm registry. No maintained alternative was found that
fits better. fast-check is the only one with a first-party vitest binding,
model-based testing and a scheduler for race conditions.

## Recommendation

- Add `fast-check@^4.11.0` and `@fast-check/vitest@^0.5.0` as dev
  dependencies.
- Add `src/tests/fcsetup.ts` to `setupFiles`. It reads `FC_NUM_RUNS` (small
  default for CI) and `FC_SEED` (replay).
- Write properties with `test.prop` from `@fast-check/vitest`. Use
  `fc.assert` inside a plain `test` only when a test needs more control.
- To replay, run with `FC_SEED=<seed>`, or paste `{ seed, path, endOnFailure }`
  (and `replayPath` for commands) into the test while you debug.
- Use `fc.commands` with `fc.asyncModelRun` for stateful modules such as
  `FFCache`. It works with the fake IndexedDB as is. Give each run a fresh
  database name and delete it at the end.
- Control time with an `advance` command. Today that means
  `vi.setSystemTime` with only `Date` faked. After the injectable clock
  lands, it means a clock that reads the model's time.

The prototype files on this branch are throwaway. They are not meant to be
merged.
