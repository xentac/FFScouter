// Writes the job summary for the deep property-test workflow
// (.github/workflows/property-deep.yml). It reads the vitest JSON report and
// prints one replay line for each failing property, in Markdown.
//
// Usage: bun run scripts/property-deep-summary.ts <report.json> [num_runs]
//
// Leave out num_runs when the run used the test:deep default. The replay
// line then uses that default too.

import { readFileSync } from "node:fs";

type Report = {
  testResults: {
    name?: string;
    assertionResults: { status: string; title: string }[];
  }[];
};

// @fast-check/vitest adds this suffix to the name of each property test.
const SEED_SUFFIX = /^(.*) \(with seed=(-?\d+)\)$/;

// `-t` takes a regular expression, so the name is escaped for that first.
function escape_regex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The line goes inside double quotes, where \, ", $ and ` are special.
function escape_double_quoted(text: string): string {
  return text.replace(/[\\"$`]/g, "\\$&");
}

/**
 * The command that replays one failing property, or null when the test
 * name has no seed suffix (it is not a property test). With no run count,
 * the command uses the test:deep default.
 */
export function replay_command(
  title: string,
  num_runs: number | undefined,
): string | null {
  const match = title.match(SEED_SUFFIX);
  if (!match) return null;
  const [, name = "", seed = ""] = match;
  const pattern = escape_double_quoted(escape_regex(name));
  const runs = num_runs === undefined ? "" : ` FC_NUM_RUNS=${num_runs}`;
  return `FC_SEED=${seed}${runs} bun run test:deep -t "${pattern}"`;
}

/** The Markdown job summary for a vitest JSON report. */
export function summarize(
  report: Report,
  num_runs: number | undefined,
): string {
  const replays: string[] = [];
  const others: string[] = [];
  for (const file of report.testResults) {
    for (const result of file.assertionResults) {
      if (result.status !== "failed") continue;
      const command = replay_command(result.title, num_runs);
      if (command) replays.push(command);
      else others.push(`${file.name ?? "unknown file"}: ${result.title}`);
    }
  }

  const lines = ["## Deep property tests", ""];
  if (replays.length === 0 && others.length === 0) {
    lines.push("No test failed.");
  }
  if (replays.length > 0) {
    lines.push("Replay each failing property with:", "", "```sh");
    lines.push(...replays, "```");
  }
  if (others.length > 0) {
    lines.push("", "These tests failed and have no seed:", "");
    lines.push(...others.map((name) => `- ${name}`));
  }
  return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
  const [report_path, num_runs] = process.argv.slice(2);
  let report: Report;
  try {
    report = JSON.parse(readFileSync(report_path ?? "", "utf8")) as Report;
  } catch {
    // No report: the run stopped before vitest wrote one.
    console.log(
      "## Deep property tests\n\nNo test report. Read the job log.\n",
    );
    process.exit(0);
  }
  console.log(summarize(report, num_runs ? Number(num_runs) : undefined));
}
