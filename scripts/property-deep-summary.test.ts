import { describe, expect, test } from "vitest";
import { replay_command, summarize } from "./property-deep-summary";

describe("replay_command", () => {
  test("gives the seed, the run count, and the name without the seed suffix", () => {
    expect(
      replay_command(
        "a label reads back to the same label (with seed=42)",
        50000,
      ),
    ).toBe(
      'FC_SEED=42 FC_NUM_RUNS=50000 bun run test:deep -t "a label reads back to the same label"',
    );
  });

  test("keeps a negative seed", () => {
    expect(replay_command("rule (with seed=-1573849935)", 10)).toBe(
      'FC_SEED=-1573849935 FC_NUM_RUNS=10 bun run test:deep -t "rule"',
    );
  });

  test("escapes regular expression characters, then the shell characters", () => {
    // In double quotes, the shell turns \\ into \, so -t gets 2\. strict.
    expect(replay_command("2. strict: (any) spot (with seed=1)", 10)).toBe(
      'FC_SEED=1 FC_NUM_RUNS=10 bun run test:deep -t "2\\\\. strict: \\\\(any\\\\) spot"',
    );
  });

  test("escapes the characters that are special in double quotes", () => {
    expect(replay_command('a "$x" `y` (with seed=1)', 10)).toBe(
      'FC_SEED=1 FC_NUM_RUNS=10 bun run test:deep -t "a \\"\\\\\\$x\\" \\`y\\`"',
    );
  });

  test("leaves out the run count when the run used the test:deep default", () => {
    expect(replay_command("rule (with seed=5)", undefined)).toBe(
      'FC_SEED=5 bun run test:deep -t "rule"',
    );
  });

  test("is null for a name without a seed suffix", () => {
    expect(replay_command("an example test", 10)).toBeNull();
  });
});

describe("summarize", () => {
  const report = {
    testResults: [
      {
        name: "/repo/src/a.property.test.ts",
        assertionResults: [
          { status: "passed", title: "holds (with seed=1)" },
          { status: "failed", title: "breaks (with seed=7)" },
        ],
      },
      {
        name: "/repo/src/b.property.test.ts",
        assertionResults: [{ status: "failed", title: "no seed here" }],
      },
    ],
  };

  test("lists one replay line for each failing property", () => {
    const text = summarize(report, 50000);
    expect(text).toContain(
      'FC_SEED=7 FC_NUM_RUNS=50000 bun run test:deep -t "breaks"',
    );
    expect(text).not.toContain("holds");
  });

  test("names a failing test without a seed separately", () => {
    expect(summarize(report, 50000)).toContain("no seed here");
  });

  test("says when no test failed", () => {
    expect(summarize({ testResults: [] }, 50000)).toContain("No test failed");
  });
});
