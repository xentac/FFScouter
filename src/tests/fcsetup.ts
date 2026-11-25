import { fc } from "@fast-check/vitest";

// Global fast-check settings. FC_NUM_RUNS sets the run count (small default
// for CI, large for a deep run on a laptop). FC_SEED replays a reported seed.
const numRuns = Number(process.env["FC_NUM_RUNS"] ?? "25");
const seed = process.env["FC_SEED"];
fc.configureGlobal({
  ...fc.readConfigureGlobal(),
  numRuns,
  ...(seed === undefined ? {} : { seed: Number(seed) }),
});
