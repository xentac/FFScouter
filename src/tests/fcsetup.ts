import fc from "fast-check";

// Global fast-check settings, read once per test file. FC_NUM_RUNS sets the
// run count: a small default for the normal suite and CI, a large one for a
// deep run on a laptop. FC_SEED replays the seed that a failure printed.
const numRuns = Number(process.env["FC_NUM_RUNS"] ?? "25");
const seed = process.env["FC_SEED"];
fc.configureGlobal({
  ...fc.readConfigureGlobal(),
  numRuns,
  ...(seed === undefined ? {} : { seed: Number(seed) }),
});
