# Research: `bun test` against vitest for this repo

Research for [issue #58](https://github.com/xentac/FFScouter/issues/58)
(child of wayfinder map [issue #50](https://github.com/xentac/FFScouter/issues/50)).
This file gives facts and trade-offs. The stay-or-move decision belongs to
[issue #59](https://github.com/xentac/FFScouter/issues/59).

Question: what would FFScouter gain and lose by moving its tests from vitest
to bun's own test runner?

Method, run on 2026-11-22:

- Local bun is 1.4.4. CI pins the same version
  (`.github/workflows/ci.yml`). Vitest is 5.1.0.
- The real suite ran under vitest (`bun run test --run`) three times.
- The same 48 test files ran under `bun test` in a throwaway worktree, with
  a throwaway preload and tsconfig (see the appendix). No test file was
  edited. Nothing from the experiment is on this branch except this file.
- Docs were read on <https://bun.com/docs> (banner shows v1.4.5) and
  <https://vitest.dev>, plus the bun 1.4.4 and 1.4.5 release notes.

## Headline: the bun docs describe more than bun 1.4.4 ships

The current bun docs describe a broad vitest compatibility layer. The 1.4.4
binary that this repo pins does not have most of it. This gap is the main
fact in this report.

| Feature                                                                                                                            | Docs say                                                                                         | Measured on 1.4.4                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `import { vi } from "vitest"`                                                                                                      | built-in module with vitest semantics ([writing-tests](https://bun.com/docs/test/writing-tests)) | Works. bun remaps the import to its own `vi`                                    |
| `vi.fn`, `vi.spyOn`, `vi.mock`, `vi.useFakeTimers`, `vi.advanceTimersByTime`, `vi.runAllTimers`                                    | present                                                                                          | Present                                                                         |
| `vi.mocked`, `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.importActual`, `vi.resetModules`, `vi.hoisted`, `vi.waitFor`, `vi.doMock` | present ([mocks](https://bun.com/docs/test/mocks))                                               | All `undefined`                                                                 |
| `vi.setSystemTime`                                                                                                                 | same as `jest.setSystemTime` ([dates-times](https://bun.com/docs/test/dates-times))              | `undefined` (`jest.setSystemTime` exists)                                       |
| `vi.advanceTimersByTimeAsync`, `vi.runAllTimersAsync`                                                                              | not listed                                                                                       | `undefined`                                                                     |
| `importOriginal` argument to a `vi.mock` factory                                                                                   | factory gets the original module ([mocks](https://bun.com/docs/test/mocks))                      | Not passed. 9 files fail to load                                                |
| `vi.mock(import("./x"), factory)`                                                                                                  | not mentioned                                                                                    | Rejected: "mock(module, fn) requires a module name string"                      |
| `toHaveBeenCalledExactlyOnceWith`                                                                                                  | not mentioned                                                                                    | Missing                                                                         |
| `environment = "jsdom"` / `--environment` / `// @vitest-environment`                                                               | supported ([dom](https://bun.com/docs/test/dom))                                                 | No such flag in `bun test --help`. The pragma is ignored. No DOM globals appear |
| CSS Module import returns a class map                                                                                              | yes, in `bun test` ([file-types](https://bun.com/docs/runtime/file-types))                       | `import styles from "./x.module.css"` returns `{}`                              |
| Module mocks reset at end of each file                                                                                             | yes ([mocks](https://bun.com/docs/test/mocks))                                                   | Not in default mode. Mocks leak across files unless `--isolate` or `--parallel` |

The bun 1.4.5 release (2026-11-19) is a security release only
([blog](https://bun.com/blog/bun-v1.4.5)). Its notes mention none of the
rows above. So a pin bump to 1.4.5 is not known to close the gap. These
features may live on canary builds only. That is unverified. Fetching a
newer bun binary was outside what this research was allowed to do.

To recheck on a newer bun, put this in any `*.test.ts` and run `bun test`
on that file:

```ts
import { test, vi } from "vitest";

test("probe", () => {
  const names = [
    "mocked",
    "stubGlobal",
    "importActual",
    "setSystemTime",
    "resetModules",
    "hoisted",
    "waitFor",
    "advanceTimersByTimeAsync",
  ];
  console.log(names.map((n) => `${n}=${typeof (vi as any)[n]}`).join(" "));
  console.log("document", typeof document);
});
```

Then run it again with `--environment=jsdom`.

## The current suite

- 48 test files, 7 of them `.tsx`. 744 tests.
- 40 files start with `// @vitest-environment jsdom`. The other 8 run in
  `node`.
- 8 files use `@testing-library/react`.
- No snapshots, no `import.meta.glob` in tests, no `expectTypeOf`, no
  `expect.poll`, no fast-check yet.
- Every file imports from `"vitest"`.
- Six source files import CSS Modules. Vitest maps them with
  `classNameStrategy: "non-scoped"`, so `styles.foo === "foo"`.
- `src/tests/idbsetup.ts` is the one setup file. It installs fake
  IndexedDB, puts real React on `unsafeWindow`, drains React's
  `MessageChannel` tasks after each test, and polyfills canvas,
  `BroadcastChannel`, and `localStorage`.
- No test touches `GM_*` directly. The stubbed globals are `location`
  (24 calls), `innerWidth` (6), `navigator` (1), and
  `requestAnimationFrame` (1).

### `vi` usage by count

| API                                  | Uses | Files |
| ------------------------------------ | ---: | ----: |
| `vi.mocked`                          |  218 |    18 |
| `vi.fn`                              |  155 |    26 |
| `vi.spyOn`                           |  108 |    11 |
| `vi.advanceTimersByTime`             |   65 |    11 |
| `vi.mock`                            |   46 |    20 |
| `vi.stubGlobal`                      |   35 |     8 |
| `importOriginal` / `vi.importActual` |   31 |     9 |
| `vi.waitFor`                         |   23 |     1 |
| `vi.useFakeTimers`                   |   20 |    13 |
| `vi.useRealTimers`                   |   16 |     — |
| `vi.clearAllMocks`                   |   15 |     — |
| `vi.restoreAllMocks`                 |   13 |     — |
| `vi.advanceTimersByTimeAsync`        |   11 |     — |
| `vi.setSystemTime`                   |   10 |     9 |
| `vi.unstubAllGlobals`                |    8 |     6 |
| `vi.runAllTimersAsync`               |    5 |     1 |
| `vi.resetModules`                    |    2 |     1 |
| `vi.hoisted`                         |    1 |     1 |

27 of 48 files use at least one `vi` member that bun 1.4.4 lacks.

## Results under `bun test` 1.4.4

### With no config at all

A pure util test (`src/utils/estimate.test.ts`) passed with no changes:
4 tests in 6 ms. bun accepted `import { expect, test } from "vitest"`.

Any file that imports source code with `@utils/...` or the `@real-react*`
aliases failed. bun does not read `vite.config.ts`. It does read tsconfig
`paths`, but this repo's `@real-react*` paths point at `.d.ts` files for
tsc, so bun cannot load them. A runtime `Bun.plugin` `onResolve` hook in a
preload never fired for these imports. A second tsconfig passed with
`bun --tsconfig-override` did work.

### With the throwaway preload

The preload (appendix) registers happy-dom, loads `fake-indexeddb/auto`,
fills the missing `vi` members, sets the build-time globals, and maps CSS
Modules to their literal class names.

| Mode                        | Files that load | Tests run | Pass | Fail | Time         |
| --------------------------- | --------------: | --------: | ---: | ---: | ------------ |
| default (one shared global) |              48 |       156 |  115 |   41 | 0.5 s        |
| `--isolate`                 |              38 |       514 |  492 |   22 | 6.7 to 7.1 s |
| `--parallel` (24 cores)     |              38 |       514 |  492 |   22 | 1.9 to 2.0 s |
| vitest today                |              48 |       744 |  744 |    0 | 2.6 to 3.0 s |

Notes on the table:

- In default mode, a `vi.mock("@utils/logger", ...)` in one file replaced
  the logger for later files. 33 load errors read "Export named
  'LogLevel' not found". So `--isolate` or `--parallel` is required.
- The 10 files that do not load hold 240 tests under vitest. The bun runs
  do not cover them. So the bun timings are for a partial suite.
- bun counts 514 tests in the 38 files that load. Vitest counts 504 there.
  The small gap is how each runner counts parameterised tests.

### What still fails, by cause

| Cause                                                        |                                                                  Files | Fix kind                                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------: | ------------------------------------------------------------------------- |
| `vi.mock` factory uses `importOriginal` or `vi.importActual` |                                                         9 (load error) | Rewrite each factory to `await import(...)` the real module and spread it |
| `vi.mock(import("./api.js"), ...)` form                      |                                    1 (load error, `ffscouter.test.ts`) | Use a string path                                                         |
| `vi.resetModules`                                            |                                       1 (`src/index.test.ts`, 3 tests) | Restructure the boot tests                                                |
| `toHaveBeenCalledExactlyOnceWith` missing                    |                                    1 (`bounty_board.test.ts`, 2 tests) | Use `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith`                 |
| `.resolves.not.toThrow()` on a resolved `undefined`          |                                          1 (`ffcache.test.ts`, 1 test) | Use `.resolves.toBeUndefined()`                                           |
| happy-dom differs from jsdom                                 | 4 (`faction-filter-box`, `column-population`, `settings-panel`, `dom`) | See below                                                                 |

Lines such as "error: API Key Invalid" or "error: idb down" in the bun
output come from tests that pass. bun prints errors that tests create on
purpose. They are not failures.

### jsdom against happy-dom

bun 1.4.4 has no jsdom environment. One attempt copied a `new JSDOM()`
window onto `globalThis` in the preload. Under that, `faction-filter-box`
and `column-population` passed, so their failures under happy-dom come
from DOM behaviour differences. But `dom.test.ts` failed more (13 tests),
mostly around `location`, `matchMedia`, and custom elements. A real jsdom
environment would need more careful global wiring than one attempt. So the
choice is: switch to happy-dom and fix the tests that depend on jsdom
behaviour, or keep jsdom and build and maintain the global wiring by hand.

### fast-check

- Plain `fc.assert(fc.property(...))` works under `bun test`. A failing
  property throws with its counterexample as usual.
- `@fast-check/vitest` does not work. It imports the real `vitest`
  package from `node_modules`, not bun's built-in, and fails with "Vitest
  failed to find the current suite".
- fast-check calls itself runner-agnostic. Its only official bridges are
  for ava, jest, and vitest ([ecosystem](https://fast-check.dev/docs/ecosystem/)).
  There is no `@fast-check/bun`. Under bun, `test.prop` would need a small
  local helper around `fc.assert`.

### Coverage

|               | vitest (`@vitest/coverage-v8`)         | `bun test --coverage`                                                           |
| ------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Metrics       | statements, branches, functions, lines | functions, lines only                                                           |
| Reporters     | many (text, html, lcov, json, ...)     | `text`, `lcov` ([code-coverage](https://bun.com/docs/test/code-coverage))       |
| Thresholds    | per metric                             | `lines`, `functions` ([code-coverage](https://bun.com/docs/test/code-coverage)) |
| Run time here | 5 s                                    | 1 s (partial suite)                                                             |

The bun run reported 68% functions and 72% lines. Vitest reported 75% and
80%. The bun run skipped 10 files, so these numbers do not compare the
runners. A documented gotcha: outside `--parallel`, bun checks the
threshold only when the `text` reporter is on
([code-coverage](https://bun.com/docs/test/code-coverage)).

### Watch, snapshots, CI output

- Both runners have a watch mode (`bun test --watch`).
- Both support `toMatchSnapshot` and inline snapshots
  ([snapshots](https://bun.com/docs/test/snapshots)). The repo uses none.
- bun has a JUnit reporter and a dots reporter, and it writes GitHub
  Actions annotations on its own
  ([reporters](https://bun.com/docs/test/reporters)).
- bun 1.4.4 has `--shard`, `--timings`, `--changed`, `--bail`, and
  `--rerun-each`.

### Fake timers

bun's fake timers came in 1.3.4 ([blog](https://bun.com/blog/bun-v1.3.4)).
Documented differences from vitest
([dates-times](https://bun.com/docs/test/dates-times)):

- `setImmediate` is not faked by default.
- `requestAnimationFrame` is faked only if a DOM library defined it.
- Real timers come back at the end of each file.

No remaining failure in the loaded files traced back to fake timers. Those
files ran with a shimmed `vi.setSystemTime` and an async-advance shim. The
shim's
`advanceTimersByTimeAsync` only flushes one microtask turn, so it is
weaker than vitest's.

## Config and dependencies

### What a move removes

- `vitest`
- `@vitest/coverage-v8`
- `vitest-indexeddb`. It is a 20-line wrapper that assigns
  `fake-indexeddb` exports to `globalThis`. `import "fake-indexeddb/auto"`
  does the same.
- `jsdom`, if the tests move to happy-dom.
- The `test` block in `vite.config.ts`.
- The `bun --bun vitest` and `vitest run --coverage` scripts.
- The `@fast-check/vitest` option, which becomes unusable.

### What a move adds

- `fake-indexeddb` as a direct devDependency. Today it is transitive and
  pinned to 4.0.2 by an `overrides` entry.
- `@happy-dom/global-registrator` (and `happy-dom`), unless jsdom is wired
  by hand.
- A `bunfig.toml` `[test]` section with the preloads.
- A preload that does what vite config does today:
  - set `__FF_SCOUTER_V2_VERSION__` and `__FF_SCOUTER_EDITION__`, which
    `vite-plugin-version-mark` and `define` supply today
  - map `.module.css` to literal class names with a `Bun.plugin`
    `onLoad` hook
- A way to resolve `@real-react*` to the `.js` files for bun while tsc
  still sees the `.d.ts` files. Options: a second tsconfig passed with
  `--tsconfig-override`, or change `idbsetup.ts` to import `react` and
  `react-dom` directly.
- On bun 1.4.4, a `vi` compatibility shim, or a rewrite of the 27 files
  that use the missing members.

The real `react` alias to `src/shims/react.ts` is not needed under bun.
Source code gets the real React from `node_modules`, which is the same
instance the shim would forward to.

## Migration size

On bun 1.4.4, two paths:

1. Shim path. Keep test files almost as they are. Write a maintained
   `vi` compat preload (about 60 lines). Then edit 13 files: 9 mock
   factories, 1 `vi.mock(import(...))`, 1 `vi.resetModules`, 1 matcher,
   1 `resolves.not.toThrow`. Then fix the 4 DOM-difference files.
2. Native path. Rewrite to `bun:test` APIs. 27 files touch missing `vi`
   members, and 218 `vi.mocked` calls become casts or go away. All 48
   files change their import line. Plus the same 4 DOM files.

On a bun version that ships what the docs describe, the shim would shrink
or go away. That has not been verified.

Either way: one new `bunfig.toml`, one new or changed preload, changes to
`idbsetup.ts`, `package.json` scripts and dependencies, `vite.config.ts`,
`CLAUDE.md` (the test command rule), and the CI workflow.

## Gains and losses

| Area         | Gain with `bun test`                                                                                                          | Loss with `bun test`                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Speed        | 1.9 s for 514 tests with `--parallel`, against 2.6 to 3.0 s for 744 under vitest. A fair full-suite number does not exist yet | `--isolate` alone is slower (6.7 s). Default mode is not safe                                    |
| Dependencies | Drops vitest, coverage-v8, vitest-indexeddb, maybe jsdom                                                                      | Adds happy-dom registrator, direct fake-indexeddb                                                |
| Config       | One runner, no Vite in the test path                                                                                          | Vite aliases, defines, and CSS Module rules must be copied by hand into a preload and a tsconfig |
| API fit      | `"vitest"` imports keep working for the basics                                                                                | On 1.4.4, many `vi` members, `importOriginal`, and one matcher are missing                       |
| DOM          | happy-dom is fast and documented for bun                                                                                      | No jsdom environment on 1.4.4. 4 files depend on jsdom behaviour                                 |
| Coverage     | Fast, lcov output                                                                                                             | No statements or branches metrics                                                                |
| fast-check   | Plain `fc.assert` works                                                                                                       | `@fast-check/vitest` (`test.prop`) does not                                                      |
| Docs trust   | The docs show where bun is heading                                                                                            | The docs describe features 1.4.4 lacks, so each claim needs a local check                        |

## Appendix: throwaway setup used

Run command:

```sh
bun --tsconfig-override=./tsconfig.buntest.json test --parallel \
  --preload ./src/tests/bun-preload.ts \
  --preload ./src/tests/idbsetup.ts ./src
```

`tsconfig.buntest.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@ui/*": ["./src/ui/*"],
      "@utils/*": ["./src/utils/*"],
      "@features/*": ["./src/features/*"],
      "@real-react": ["./node_modules/react/index.js"],
      "@real-react-dom": ["./node_modules/react-dom/index.js"],
      "@real-react-dom-client": ["./node_modules/react-dom/client.js"]
    }
  }
}
```

`src/tests/bun-preload.ts` (needs `@happy-dom/global-registrator`):

```ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { jest, vi } from "bun:test";

GlobalRegistrator.register({ url: "https://www.torn.com/" });
await import("fake-indexeddb/auto");

// Fill the vi members that bun 1.4.4's vi object lacks.
const v = vi as any;
const stubbed: Array<[string, PropertyDescriptor | undefined]> = [];
v.setSystemTime ??= (d: Date | number) => jest.setSystemTime(d as any);
v.mocked ??= <T>(x: T) => x;
v.advanceTimersByTimeAsync ??= async (ms: number) => {
  jest.advanceTimersByTime(ms);
  await Promise.resolve();
};
v.runAllTimersAsync ??= async () => {
  jest.runAllTimers();
  await Promise.resolve();
};
v.stubGlobal ??= (name: string, value: unknown) => {
  stubbed.push([name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  Object.defineProperty(globalThis, name, {
    value,
    writable: true,
    configurable: true,
  });
};
v.unstubAllGlobals ??= () => {
  for (const [name, desc] of stubbed.reverse()) {
    if (desc) Object.defineProperty(globalThis, name, desc);
    else Reflect.deleteProperty(globalThis, name);
  }
  stubbed.length = 0;
};
v.waitFor ??= async <T>(
  fn: () => T | Promise<T>,
  opts?: { timeout?: number; interval?: number } | number,
) => {
  const timeout = typeof opts === "number" ? opts : (opts?.timeout ?? 1000);
  const interval = typeof opts === "number" ? 50 : (opts?.interval ?? 50);
  const start = Date.now();
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      if (Date.now() - start > timeout) throw e;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
};
v.hoisted ??= <T>(fn: () => T) => fn();

// Vite define / vite-plugin-version-mark globals.
(globalThis as any).__FF_SCOUTER_V2_VERSION__ = "0.0.0-test";
(globalThis as any).__FF_SCOUTER_EDITION__ = "standard";

// CSS Modules: mirror vitest's classNameStrategy "non-scoped".
Bun.plugin({
  name: "css-modules-non-scoped",
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, () => ({
      contents:
        "export default new Proxy({}, { get: (_, k) => (typeof k === 'string' ? k : undefined) });",
      loader: "js",
    }));
  },
});
```
