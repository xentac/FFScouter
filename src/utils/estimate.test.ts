import { expect, test } from "vitest";
import {
  extract_bs_estimate,
  extract_bs_estimate_human,
  extract_ff,
  extract_last_updated,
  extract_source,
} from "./estimate";
import type { FFDataComplete } from "./types";

function make_data(overrides: Partial<FFDataComplete> = {}): FFDataComplete {
  return {
    player_id: 1,
    no_data: false,
    fair_fight: 2.0,
    last_updated: 1000,
    bs_estimate: 5000,
    bs_estimate_human: "5k",
    bss_public: 40,
    source: "bss",
    premium_insights_available: false,
    available_estimates: { bss: null, premium: null, spies: null },
    spies: [],
    ...overrides,
  };
}

test("extract_* read from the available_estimates candidate matching data.source", () => {
  const data = make_data({
    source: "spies",
    available_estimates: {
      bss: null,
      premium: null,
      spies: {
        bs_estimate: 9000,
        bs_estimate_human: "9k",
        last_updated: 2000,
        source: "tornstats",
        fair_fight: 3.5,
      },
    },
  });

  expect(extract_ff(data)).toEqual(3.5);
  expect(extract_bs_estimate(data)).toEqual(9000);
  expect(extract_bs_estimate_human(data)).toEqual("9k");
  expect(extract_last_updated(data)).toEqual(2000);
  expect(extract_source(data)).toEqual("spies");
});

test("extract_* fall back to top-level fields when the matching candidate is missing", () => {
  const data = make_data({
    source: "premium",
    available_estimates: { bss: null, premium: null, spies: null },
  });

  expect(extract_ff(data)).toEqual(data.fair_fight);
  expect(extract_bs_estimate(data)).toEqual(data.bs_estimate);
  expect(extract_bs_estimate_human(data)).toEqual(data.bs_estimate_human);
  expect(extract_last_updated(data)).toEqual(data.last_updated);
});

test("extract_* fall back to top-level fields per-field when the candidate has null values", () => {
  const data = make_data({
    source: "premium",
    fair_fight: 4.4,
    available_estimates: {
      bss: null,
      premium: {
        bs_estimate: null,
        bs_estimate_human: null,
        last_updated: null,
        fair_fight: null,
      },
      spies: null,
    },
  });

  expect(extract_ff(data)).toEqual(4.4);
  expect(extract_bs_estimate(data)).toEqual(data.bs_estimate);
  expect(extract_bs_estimate_human(data)).toEqual(data.bs_estimate_human);
  expect(extract_last_updated(data)).toEqual(data.last_updated);
});

test("extract_* fall back to top-level fields instead of throwing when available_estimates is missing entirely", () => {
  // Simulates an FFDataComplete cached by a pre-available_estimates build,
  // still sitting in IndexedDB (up to 1h TTL) after an update ships.
  const data = make_data();
  delete (data as { available_estimates?: unknown }).available_estimates;

  expect(() => extract_ff(data)).not.toThrow();
  expect(extract_ff(data)).toEqual(data.fair_fight);
  expect(extract_bs_estimate(data)).toEqual(data.bs_estimate);
  expect(extract_bs_estimate_human(data)).toEqual(data.bs_estimate_human);
  expect(extract_last_updated(data)).toEqual(data.last_updated);
  expect(extract_source(data)).toEqual(data.source);
});
