// @vitest-environment jsdom
// Properties for the suffix-number filters and labels, and for the FF arrow
// palette. Each test generates many inputs and checks a rule that must hold
// for all of them.
import { fc, test } from "@fast-check/vitest";
import { beforeEach, describe, expect } from "vitest";
import { ColorScheme, ffconfig } from "./ffconfig";
import {
  format_suffix_number,
  get_ff_arrow_colour,
  parse_duration_to_seconds,
  parse_suffix_number,
} from "./strings";
import type { FFData } from "./types";

// ============================================================================
// Arbitraries
// ============================================================================

// Counts and prices are whole numbers of 0 or more. Bounty prices and board
// estimates stay far below 10^15.
const count_arb = fc.integer({ min: 0, max: 10 ** 15 });

// The largest unit is "t", so a label stays under 1000 only up to 999t.
const suffixed_count_arb = fc.integer({ min: 1000, max: 999 * 10 ** 12 });

// Values just under a unit boundary, where rounding to 2 decimals carries
// into the next unit. Random integers in a wide range almost never land here.
const near_boundary_arb = fc
  .record({
    unit: fc.constantFrom(10 ** 3, 10 ** 6, 10 ** 9, 10 ** 12),
    below: fc.integer({ min: 1, max: 10 ** 4 }),
  })
  .map(({ unit, below }) => Math.max(1000, unit * 1000 - below));

// Filter text that a player types: mostly the characters that the filter
// grammar knows (separators, suffixes, spaces), plus any text at all.
const no_digit_arb = fc.oneof(
  fc.string({
    unit: fc.constantFrom(",", ".", "k", "m", "b", "t", "K", " "),
    minLength: 1,
  }),
  fc.string().filter((s) => !/\d/.test(s)),
);

// Duration filter text: near-valid text ("5m", "-2h 30s") and any text.
// Amounts stay in the range a player types. Text such as "1e308w" gives
// Infinity, but no player types it.
const duration_arb = fc.oneof(
  fc
    .record({
      sign: fc.constantFrom("", "-", "+"),
      amount: fc.oneof(
        fc.nat({ max: 10_000 }),
        fc.double({ min: -1e9, max: 1e9, noNaN: true }),
      ),
      unit: fc.constantFrom("", "s", "m", "h", "d", "w", "ms", "y"),
      rest: fc.constantFrom("", " 30s", " -1m", "m"),
    })
    .map(({ sign, amount, unit, rest }) => `${sign}${amount}${unit}${rest}`),
  fc.string(),
);

// An estimate with the given FF value. The arrow color reads only no_data
// and the FF value.
function estimate_with_ff(fair_fight: number): FFData {
  return {
    no_data: false,
    fair_fight,
    last_updated: 0,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 0,
    source: "bss",
    premium_insights_available: false,
    available_estimates: { bss: null, premium: null, spies: null },
    spies: [],
    player_id: 1,
  };
}

// FF data as the cache holds it: no data, or an estimate with any FF value.
const ff_data_arb: fc.Arbitrary<FFData> = fc.oneof(
  fc.constant<FFData>({ no_data: true, player_id: 1 }),
  fc.double({ min: 0, max: 100, noNaN: true }).map(estimate_with_ff),
);

// A stored color scheme: a known one, or any string. A beta build can store
// a scheme that stable does not know.
const stored_scheme_arb = fc.oneof(
  fc.constantFrom(...Object.values(ColorScheme)),
  fc.string(),
);

// ============================================================================
// Suffix numbers
// ============================================================================

describe("suffix number properties", () => {
  // Rule: text with no digit is not a number. Source: parse_suffix_number,
  // which the filters use to read a typed limit.
  // Known bug: https://github.com/xentac/FFScouter/issues/63.
  // Remove `.fails` when it is fixed. Keep the examples.
  test.fails.prop([no_digit_arb], { examples: [[","], [",k"]] })(
    "parse_suffix_number returns null for text with no digit",
    (text) => {
      expect(parse_suffix_number(text)).toBeNull();
    },
  );

  // Rule: a label uses the largest unit that keeps its number under 1000.
  // Source: format_suffix_number. Precondition: n is 1000 or more.
  // Known bug: https://github.com/xentac/FFScouter/issues/64.
  // Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([fc.oneof(suffixed_count_arb, near_boundary_arb)], {
    examples: [[999_999]],
  })("the number before the suffix is less than 1000", (n) => {
    const label = format_suffix_number(n);
    expect(label).toMatch(/^[\d.]+[kmbt]$/);
    expect(Number.parseFloat(label)).toBeLessThan(1000);
  });

  // Rule: a label reads back to the same label. Source: format_suffix_number
  // is the inverse of parse_suffix_number. Compare strings, not numbers:
  // parsing "8.2m" gives 8199999.999999999.
  // Known bug: https://github.com/xentac/FFScouter/issues/64. "1000k" reads
  // back as "1m". Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([fc.oneof(count_arb, near_boundary_arb)], {
    examples: [[999_999]],
  })("a suffix label reads back to the same label", (n) => {
    const label = format_suffix_number(n);
    const parsed = parse_suffix_number(label);
    expect(parsed).not.toBeNull();
    expect(format_suffix_number(parsed as number)).toBe(label);
  });

  // Rule: a duration filter is null or a finite count of seconds of 0 or
  // more. Source: parse_duration_to_seconds, which the filters use to read a
  // typed age.
  // Known bug: https://github.com/xentac/FFScouter/issues/63.
  // Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([duration_arb], { examples: [["-5m"]] })(
    "parse_duration_to_seconds returns null or a finite number of 0 or more",
    (text) => {
      const seconds = parse_duration_to_seconds(text);
      if (seconds === null) return;
      expect(Number.isFinite(seconds)).toBe(true);
      expect(seconds).toBeGreaterThanOrEqual(0);
    },
  );
});

// ============================================================================
// Palette
// ============================================================================

describe("palette properties", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Rule: any stored color scheme value gives a hex color, and the arrow
  // never throws. Source: get_ff_arrow_colour. A beta build can store a
  // scheme that stable does not know, so the stored value is any string.
  // Precondition: no custom colors are stored.
  // Known bug: https://github.com/xentac/FFScouter/issues/65.
  // Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([stored_scheme_arb, ff_data_arb], {
    examples: [["not-a-scheme", estimate_with_ff(2)]],
  })("any stored color scheme gives a hex arrow color", (scheme, data) => {
    ffconfig.color_scheme = scheme as ColorScheme;
    expect(get_ff_arrow_colour(data)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
