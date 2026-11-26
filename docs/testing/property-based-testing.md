# Property-based testing in FFScouter

This guide teaches property-based testing with the code of this script. It is also the standing guide for new property tests. Read it before you write one.

A normal example test checks one input that you chose. A property test checks a rule against hundreds or thousands of inputs that a generator chose. When the rule breaks, the library reduces the failing input to a small case and prints it. The pilot in `src/ui/floating/floating-drag.property.test.ts` found a real bug in this way. The example tests for the same code had passed for months.

The library is [fast-check](https://fast-check.dev/) with [`@fast-check/vitest`](https://www.npmjs.com/package/@fast-check/vitest). The tests run on vitest. [ADR 0015](../adr/0015-vitest-over-bun-test.md) records why.

## Terms

Each term below has a one-line meaning. The sections after this one show each term in real code.

| Term             | Meaning                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Property         | A rule plus the inputs it must hold for, written as a test.                                                       |
| Invariant        | A rule that must be true for every input, for example "the box stays inside the viewport".                        |
| Arbitrary        | A generator of random inputs of one shape, for example a random viewport.                                         |
| Run              | One generated input checked against the rule.                                                                     |
| Run count        | The number of runs in one test. The suite uses 25. A deep run uses 10000 or more.                                 |
| Counterexample   | An input that breaks the rule.                                                                                    |
| Shrinking        | The search for a smaller counterexample that still breaks the rule.                                               |
| Seed             | The number that starts the random generator. The same seed gives the same inputs again.                           |
| Precondition     | A condition that an input must meet before the rule applies.                                                      |
| Oracle           | A second, slow, obviously correct way to compute the answer. The property compares the real code with it.         |
| Round trip       | A pair of functions where the second undoes the first, for example format then parse.                             |
| Total function   | A function that returns a valid result for every input and never throws.                                          |
| Model-based test | A test that runs random command sequences against the real code and against a simple model, and compares the two. |

These are testing terms, not domain terms. They live in this guide, not in `CONTEXT.md`.

## How one property test runs

fast-check does four things for each property:

1. It draws an input from the arbitraries, with a seed.
2. It calls your predicate with that input. If the predicate throws or returns `false`, the run fails. An `expect` that fails throws, so `expect` works inside a predicate.
3. If the predicate fails, fast-check shrinks the input. It tries smaller values, for example smaller numbers, shorter arrays, and `null` in place of an option. It keeps each smaller value that still fails.
4. It reports the seed, the path to the shrunk case, and the shrunk counterexample.

If no run fails, the property passes. A pass means only that fast-check did not find a counterexample in that many runs. It does not prove the rule.

Vitest runs `beforeEach` and `afterEach` around every run, not once per test. The global `afterEach` in `src/tests/idbsetup.ts` therefore runs for each run. The cost is small.

## A first property: suffix numbers

`format_suffix_number` and `parse_suffix_number` in `src/utils/strings.ts` turn 1500000 into "1.5m" and back. An example test checks a few values. A property states the rule for every value:

```ts
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { format_suffix_number, parse_suffix_number } from "./strings";

// Counts and prices are whole numbers of 0 or more.
const count_arb = fc.integer({ min: 0, max: 10 ** 15 });

// Rule: the label reads back to the same label. Source: format_suffix_number.
// Compare strings, not numbers: parsing "8.2m" gives 8199999.999999999.
test.prop([count_arb])("a suffix label reads back to the same label", (n) => {
  const label = format_suffix_number(n);
  const parsed = parse_suffix_number(label);
  expect(parsed).not.toBeNull();
  expect(format_suffix_number(parsed as number)).toBe(label);
});
```

This is a round trip. It does not say what the label is. It says that two functions agree with each other, and that is often enough to find a bug.

A second rule for the same function: for every value of 1000 or more, the number before the suffix is less than 1000. A property survey found that `format_suffix_number(999_999)` returns "1000k". That bug is [Suffix-number labels show 1000k instead of 1m](https://github.com/xentac/FFScouter/issues/64). No example test had tried a value just under a unit boundary. The generator tried one in a few hundred runs.

## The worked example: floating placement

The pilot tests `resolve_box` and `drop_anchor` in `src/ui/floating/floating-drag.ts`. These functions place a floating element on the screen from a saved anchor. They keep the element inside the viewport. They also move it out of each Keep-out Zone. A Keep-out Zone is a screen area that floating elements must not cover, for example Torn's chat bar. Read the pilot file next to this section. The parts below are the lessons from it.

### Arbitraries that match real input

```ts
// Integers only: every real input is whole CSS pixels from
// getBoundingClientRect() or a saved anchor, and integer edges let the
// brute-force oracle try every top position.
const viewport_arb = fc.record({
  width: fc.integer({ min: 200, max: 2000 }),
  height: fc.integer({ min: 200, max: 1500 }),
});

// Heights up to 1600, so some elements are taller than the viewport.
const size_arb = fc.record({
  width: fc.integer({ min: 10, max: 300 }),
  height: fc.integer({ min: 10, max: 1600 }),
});
```

Each arbitrary has a comment that says how it matches real input. The ranges are wide on purpose. They include the stress cases: an element taller than the viewport, a saved inset wider than the viewport, and zones that cover the whole height. Put the stress cases inside the ranges. Do not write a separate test for each one.

Use `fc.record` with named fields. A record shrinks to a readable object such as `{ width: 10, height: 10 }`. A tuple shrinks to `[10, 10]`, and the reader must count positions.

The raw zone arbitrary generates zones before they are clipped to a viewport. A helper, `clip_zones`, then clips them and drops the empty ones. Generate simple raw values and map them to the real shape in a plain function. Do not try to generate the real shape directly.

### Preconditions with an early return

Some rules apply only to some inputs. If the element does not fit, the rule "the box stays inside the viewport" does not apply. Skip the other inputs with an early `return`:

```ts
if (!fits(size, viewport)) return;
```

Do not use `fc.pre` for this. `fc.pre` rejects the input and draws a new one. When zones are random, it rejects too many inputs, and fast-check gives up. Do not use `chain` to build an input that always meets the precondition. `chain` makes one arbitrary depend on the value of another, and it damages shrinking. If you must use `chain`, add a comment that says why. This is the one hard rule for generators in this repo.

### Derived values for readable counterexamples

A counterexample prints the inputs. It does not print the values that the predicate computes from them. The pilot maps the inputs through a helper first:

```ts
const escape_case = fc
  .tuple(anchor_arb, size_arb, viewport_arb, zones_arb)
  .map((args) => escape_case_of(...args));
```

`escape_case_of` returns the inputs plus `start` (the clamped box before zone escape) and `box` (the result of `resolve_box`). A failure then prints the start box and the resolved box next to the zones. You can see the bug without a debugger.

### An oracle with a stated rule

Rule 3 of the pilot says that zone escape picks the nearest free spot. The real code tests only the spots directly above and below each zone. The oracle, `nearest_free`, tries every top position, one pixel at a time. It is slow and obviously correct. The property compares the two.

The first oracle accepted any top position with no overlap. It failed at once, because the real code keeps an 8 px gap (`EDGE_GAP`) from each zone by design. That was a fault in the oracle, not in the code. The fix was to state the rule exactly. The oracle now takes the gap as a parameter. The pilot has two separate properties: one with the gap, which passes, and one strict, which found the bug.

An oracle must state the same rule as the code. When an oracle fails, first find out whether the oracle or the code is wrong. Write down the rule that you chose in the property comment.

### Compare distances, not positions

A free spot above a zone and a free spot below it can be at the same distance. The real code picks one by loop order. The oracle can pick the other. Both are correct. The property therefore compares distances:

```ts
// Distances, not tops: a spot above and a spot below can tie.
expect(Math.abs(box.top - start.top)).toBeLessThanOrEqual(
  Math.abs(oracle.top - start.top),
);
```

When the rule allows more than one correct answer, compare the quantity that the rule is about.

### What the pilot found

The two strict properties found two rare cases in `escape_zones`. The bug issue is [Zone escape misses thin free strips and keeps the gap from only one zone][bug-61]. The counterexamples shrank to a 10x10 element in a 200x200 viewport.

The default 25 runs did not find either case. The two cases needed about 300 and about 600 runs. A deep run is therefore necessary, not optional. The section [Run counts and deep runs](#run-counts-and-deep-runs) shows how to run one.

### The pilot's wrapper

The runner decision was open when the pilot was written, so the pilot first used plain `fc.assert` inside a normal `test`. The adoption work converted it to `test.prop` and `test.fails.prop`. The arbitraries, helpers, and predicates did not change. Only the wrapper changed.

## Round trips

A round trip is the cheapest strong property. Look for a pair of functions where the second undoes the first:

- `format_suffix_number` and `parse_suffix_number`
- `drop_anchor` and `resolve_box`: a drop with the same viewport and zones resolves where it landed, apart from clamping and zone escape
- a storage write and a storage read

A round trip often needs a precondition or an exception. The pilot's round trip uses `snap: false`, because snapping moves the element to the side edge by design. State each exception in the property comment.

## Total functions

Some functions read values that the script does not control: stored settings, API responses, page text. The rule for these is that the function is total. It returns a valid result for every input and never throws.

Generate any value, not only valid ones. For the palette:

```ts
// Rule: any stored color scheme value gives a hex color.
// Source: get_ff_arrow_colour. A beta build can store a scheme that stable
// does not know, so the stored value is any string.
test.prop([fc.string(), ff_data_arb])(
  "any stored color scheme gives a hex arrow color",
  (scheme, data) => { ... },
);
```

This property found [An unknown stored color scheme crashes every FF arrow][bug-65].

For an API call, generate any status and any body, and inject them through the `requester` parameter of `query_stats` in `src/utils/api.ts`. The rule is that the call resolves with a map keyed by exactly the requested ids, or rejects with an `FFApiError`. Any other outcome is a bug. This property found [Malformed FFScouter API responses throw TypeError instead of FFApiError][bug-66].

Use `fc.jsonValue()` or `fc.anything()` for a body, and `fc.oneof` to mix random values with near-valid ones. A near-valid body (a valid response with one field changed) finds more bugs than pure noise, because the code rejects pure noise at its first test of the shape.

## Model-based tests

A cache has state. A single input does not test it. A model-based test generates a sequence of commands. It runs each command against the real cache and against a model. After each command, it checks that the two agree. The model is a few lines of plain code, for example a `Map` and a number for the time.

The example below is a short form of the `FFCache` property in `src/utils/ffcache.property.test.ts`. It uses the clock seam: `FFCache` takes a `now` function in its options. The cache reads the model's clock, so no fake timers are needed. `BountyBoardCache` and `OdInsurancePlansCache` take `now` in the same way. The test clock and the clock commands are in `src/tests/clock.ts`.

```ts
type Model = {
  clock: Clock;
  rows: Map<PlayerId, { data: FFData; expiry: Timestamp }>;
};
type Real = { cache: FFCache };

class GetCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ids: PlayerId[]) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    const got = await r.cache.get(this.ids);
    for (const id of this.ids) {
      const row = m.rows.get(id);
      // Rule: an expired entry is never returned.
      const want =
        row === undefined || row.expiry <= m.clock.now()
          ? null
          : { ...row.data, expiry: row.expiry };
      expect(got.get(id)).toEqual(want);
    }
  }
  toString = () => `get(${this.ids.join(",")})`;
}

// UpdateCmd writes rows to the cache and to the model in the same way.

// The expiry of each row that the model holds. The deadline command moves
// the clock to 1 ms before, on, or after one of them.
const row_expiries = (m: Readonly<Model>) =>
  [...m.rows.values()].map((row) => row.expiry);

const commands = fc.commands([
  update_arb,
  get_arb,
  fc
    .integer({ min: 1, max: 2 * HOUR })
    .map((ms) => new AdvanceCmd<Model, Real>(ms)),
  advance_to_deadline_arb<Model, Real>(row_expiries),
]);

test.prop([commands])(
  "FFCache never returns an expired entry",
  async (cmds) => {
    const clock = make_clock(Date.UTC(2026, 0, 1));
    const cache = new FFCache(`ffcache-model-${db_counter++}`, {
      now: clock.now,
    });
    try {
      await fc.asyncModelRun(
        () => ({ model: { clock, rows: new Map() }, real: { cache } }),
        cmds,
      );
    } finally {
      await cache.delete_db();
    }
  },
);
```

The real cache and the model share the `clock` object. An `advance` command moves the model's time, and the cache reads the same value through `now`.

Rules for model-based tests in this repo:

- Time moves forward only. Do not generate a backward clock.
- Reach each deadline exactly. A deadline is a time that the model holds, for example the expiry of a row or the end of the 60-second board floor. Random steps almost never land on one. A fixed step such as 1 hour lands on one only when it comes directly after the command that set the deadline. Add `advance_to_deadline_arb` with a function that lists the model's deadlines. Its command moves the clock to 1 ms before, on, or after one of them, after any history.
- Give each command a `toString`. A failure prints the command sequence, for example `update(1), advance(3600000), get(1)`.
- Use a fresh database name for each run, and delete the database at the end. The fake IndexedDB from `src/tests/idbsetup.ts` works as is.

## Known failures

A property that finds a real bug stays in the test file while the bug is open. Mark it `test.fails.prop` and pin the shrunk counterexample through `examples`:

```ts
// Known bug: https://github.com/xentac/FFScouter/issues/61 (case A).
// Remove `.fails` when it is fixed. Keep the example.
test.fails.prop([escape_case], { examples: [[THIN_STRIP_AT_EDGE]] })(
  "2. strict: clear of the zones when any free spot exists",
  ({ size, viewport, zones, start, box }) => { ... },
);
```

`test.fails` alone is flaky. At 25 runs, random inputs almost never reach the counterexample. The property then passes, and `test.fails` reports the pass as a failure. The pinned example runs first in every run, so the property fails every time and `test.fails` stays green.

When the fix lands, remove `.fails` and keep the example. The example then guards against the bug coming back. If a reader of `*.test.ts` must see the case, also write a separate example test there.

## Conventions

- File names. Put each module's properties in `<module>.property.test.ts`, next to the module. The deep run selects property files by this suffix.
- Wrapper. Use `test.prop` from `@fast-check/vitest`. Keep arbitraries and predicates separate from the wrapper.
- Shared arbitraries. An arbitrary stays in its property file until a second file needs it. Then move it to `<module>.arbitraries.ts`, next to the module that owns the type, for example `keep-out-zones.arbitraries.ts`. Do not make a central folder.
- Arbitrary comments. Each arbitrary has a comment that says how it matches real input.
- Property comments. Each property has a comment. The comment gives the rule in plain words and its source: a `CONTEXT.md` term, a code comment, or a function. It also names any precondition that the predicate skips with an early return. A known-failing property links its bug issue.
- Test names. The test name states the rule.
- Generators. Use `fc.record` with named fields and integers for pixel inputs. Use an early `return` in place of `fc.pre` or `chain`. Use a mapping helper for derived values. Every `chain` has a comment that says why.
- Bugs. If a property finds a bug, file it as its own issue with the shrunk counterexample. Pin the counterexample with `test.fails.prop`. Fix the bug in its own change.
- Generated inputs are synthetic. The rule to anonymize Torn DOM captures does not apply to them.

## Run counts and deep runs

The setup file `src/tests/fcsetup.ts` reads two environment variables:

- `FC_NUM_RUNS` sets the run count. The default is 25.
- `FC_SEED` sets the seed, to replay a failure.

The normal `bun run test --run` and the push CI use 25 runs. That keeps the suite fast, and it catches a property that breaks for most inputs.

A deep run uses many more runs. Use the `test:deep` package script. It runs only the property files, with 10000 runs and a 600-second per-test timeout:

```sh
bun run test:deep
```

To change the count, set `FC_NUM_RUNS`. It replaces the 10000 default:

```sh
FC_NUM_RUNS=50000 bun run test:deep
```

Run a deep run on your laptop after you add or change a property. The pilot takes about 0.8 seconds at 5000 runs.

The workflow `.github/workflows/property-deep.yml` runs `test:deep` in CI. It runs daily on `main` and on each push to `beta`, with 50000 runs. It also runs on request for a `feat/*` branch, with the `test:deep` default of 10000 runs unless you set `num_runs`:

```sh
gh workflow run property-deep.yml -r feat/<name>
```

fast-check picks a new seed for each run, so each day searches new inputs. A deep failure does not block the lint, test, and build check. GitHub emails the failure for a scheduled run. The job summary has a replay line for each failing property. The workflow opens no issues. File each bug by hand.

## Replay a failure

A failure prints a report like this:

```text
Property failed after 312 tests
{ seed: 1573849935, path: "311:2:0:1:4", endOnFailure: true }
Counterexample: [{"size":{"width":10,"height":10}, ...}]
```

The test name also ends with `(with seed=1573849935)`.

To replay the whole run, set the seed, the run count of the failing run, and the test name:

```sh
FC_SEED=1573849935 FC_NUM_RUNS=50000 bun run test:deep -t "2. strict"
```

`FC_SEED` applies to every property in the run, so `-t` limits the replay to the failing one. The `-t` value is a regular expression, so use a part of the name without parentheses.

To go straight to the shrunk case, paste the printed object into the property parameters while you debug:

```ts
test.prop([escape_case], { seed: 1573849935, path: "311:2:0:1:4", endOnFailure: true })(...)
```

The path is often very long. `FC_SEED` is usually the faster way. Remove the pasted object before you commit. Pin the counterexample through `examples` in its place.

## Choose what to test

Rank candidate properties by the chance of a real bug times its effect on the player, divided by the cost to write the property. Good places to look:

- Code with a rule in `CONTEXT.md` or in a comment, for example the Keep-out Zone rules.
- Pairs of functions that undo each other.
- Functions that read stored settings, API responses, or page text. These must be total.
- Code with state and time, for example the caches.
- Geometry and boundary arithmetic, where a value 1 below a limit behaves differently from the limit.

Skip code that only measures the DOM, and code whose rule is the same as its implementation. A property that restates the code finds nothing.

The adoption spec lists the first batch of properties and the ranked next candidates.

## Background

The decisions behind this guide are on the map [Wayfinder map: property-based testing in FFScouter](https://github.com/xentac/FFScouter/issues/50). The main tickets are these:

- [Prototype: pilot property tests for floating placement and resize](https://github.com/xentac/FFScouter/issues/53): the pilot and what was hard
- [Grilling: property test conventions and the deep-run command](https://github.com/xentac/FFScouter/issues/56): the conventions above
- [Grilling: injectable clock for the caches](https://github.com/xentac/FFScouter/issues/54): the clock seam for model-based tests
- [Grilling: scheduled deep property-test job in CI](https://github.com/xentac/FFScouter/issues/60): the CI job
- [Research: fast-check with vitest 5 under bun](https://github.com/xentac/FFScouter/issues/51): the library check

[bug-61]: https://github.com/xentac/FFScouter/issues/61
[bug-65]: https://github.com/xentac/FFScouter/issues/65
[bug-66]: https://github.com/xentac/FFScouter/issues/66
