import { fc } from "@fast-check/vitest";
import { describe, expect, test } from "vitest";
import {
  check_known_example,
  guard_known_bugs,
  issue_label,
  type KnownBug,
  type Predicate,
} from "./known-bugs";

const ISSUE = "https://github.com/xentac/FFScouter/issues/64";

// Runs the guarded predicate over 0 to 99, as the helper's property does,
// with enough runs for the share check.
function check_guarded(
  known: KnownBug<[number]>[],
  predicate: Predicate<[number]>,
) {
  const { run, plugin } = guard_known_bugs(known, predicate);
  const property = fc.asyncProperty(
    fc.integer({ min: 0, max: 99 }),
    async (n) => (await run(n)) !== false,
  );
  return fc.check(property, {
    plugins: [plugin],
    numRuns: 1000,
  });
}

// A known bug that owns 0 to 4. fast-check draws small values more often,
// so it owns about 20% of the inputs, not 5%.
const below_5: KnownBug<[number]> = {
  issue: ISSUE,
  example: [3],
  applies: (n) => n < 5,
  max_share: 0.4,
};

describe("guard_known_bugs", () => {
  test("skips the inputs that a known bug owns", async () => {
    const details = await check_guarded([below_5], (n) => n >= 5);
    expect(details.failed).toBe(false);
    expect(details.numSkips).toBeGreaterThan(0);
  });

  test("fails on a new bug in the same property, and shrinks outside the known bug", async () => {
    // The new bug is every n of 50 or more. Shrinking moves toward 0, which
    // the known bug owns, so a slip would end in 0 to 4.
    const details = await check_guarded([below_5], (n) => n >= 5 && n < 50);
    expect(details.failed).toBe(true);
    expect(details.counterexample).toEqual([50]);
  });

  test("fails a run where a bug owns more than its share", async () => {
    const half: KnownBug<[number]> = {
      issue: ISSUE,
      example: [3],
      applies: (n) => n < 50,
    };
    await expect(check_guarded([half], () => true)).rejects.toThrow(
      "of the generated inputs, more than 20%",
    );
  });

  test("skips the share check when the run has too few inputs", async () => {
    const half: KnownBug<[number]> = {
      issue: ISSUE,
      example: [3],
      applies: (n) => n < 50,
    };
    const { run, plugin } = guard_known_bugs<[number]>([half], () => true);
    const property = fc.asyncProperty(
      fc.integer({ min: 0, max: 99 }),
      async (n) => (await run(n)) !== false,
    );
    const details = await fc.check(property, {
      plugins: [plugin],
      numRuns: 25,
    });
    expect(details.failed).toBe(false);
  });

  test("allows a larger share when the bug declares one", async () => {
    const half: KnownBug<[number]> = {
      ...below_5,
      applies: (n) => n < 50,
      max_share: 0.8,
    };
    const details = await check_guarded([half], () => true);
    expect(details.failed).toBe(false);
  });
});

describe("check_known_example", () => {
  test("passes while the example throws", async () => {
    await expect(
      check_known_example(below_5, (n) => {
        expect(n).toBeGreaterThanOrEqual(5);
      }),
    ).resolves.toBeUndefined();
  });

  test("passes while the example returns false", async () => {
    await expect(
      check_known_example(below_5, (n) => n >= 5),
    ).resolves.toBeUndefined();
  });

  test("fails when the example passes", async () => {
    await expect(
      check_known_example<[number]>(below_5, () => true),
    ).rejects.toThrow("looks fixed");
  });

  test("fails when the example is outside applies", async () => {
    const outside: KnownBug<[number]> = { ...below_5, example: [7] };
    await expect(
      check_known_example<[number]>(outside, () => false),
    ).rejects.toThrow("outside its applies()");
  });
});

test("issue_label takes the issue number from the URL", () => {
  expect(issue_label(ISSUE)).toBe("#64");
});
