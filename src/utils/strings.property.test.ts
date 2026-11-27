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
import { estimate_with_ff, ff_data_arb } from "./types.arbitraries";

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
function near_boundary_arb(units: number[]): fc.Arbitrary<number> {
  return fc
    .record({
      unit: fc.constantFrom(...units),
      below: fc.integer({ min: 1, max: 10 ** 4 }),
    })
    .map(({ unit, below }) => Math.max(1000, unit * 1000 - below));
}

// No unit is larger than t, so just under 1000t a label is "1000t". That
// label is right, and it reads back, but its number is not under 1000.
const below_t_units = [10 ** 3, 10 ** 6, 10 ** 9];
const all_units = [...below_t_units, 10 ** 12];

// Filter text with no digit: mostly the characters that the parser reads
// (separators, suffixes, spaces), and sometimes any text with its digits
// removed. Removing the digits rejects no input, as a filter would.
const no_digit_arb = fc.oneof(
  fc.string({
    unit: fc.constantFrom(",", ".", "k", "m", "b", "t", "K", " "),
    minLength: 1,
  }),
  fc.string().map((text) => text.replace(/\d/g, "")),
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

// FF data with any FF value, also below 1 and above 5, where the arrow
// clamps.
const any_ff_data_arb = ff_data_arb({
  fair_fight: fc.double({ min: 0, max: 100, noNaN: true }),
});

const SCHEMES = Object.values(ColorScheme);

// The exponent of each suffix: "8.2m" is 8.2e6.
const SUFFIX_EXPONENTS = { k: 3, m: 6, b: 9, t: 12 };

// A stored color scheme: a known one, or any string. A beta build can store
// a scheme that stable does not know.
const stored_scheme_arb = fc.oneof(fc.constantFrom(...SCHEMES), fc.string());

// ============================================================================
// Suffix numbers
// ============================================================================

describe("suffix number properties", () => {
  // Rule: text with no digit is not a number. Source: parse_suffix_number,
  // which the filters use to read a typed limit.
  // "," once parsed to 0 (#63).
  test.prop([no_digit_arb], { examples: [[","]] })(
    "parse_suffix_number returns null for text with no digit",
    (text) => {
      expect(parse_suffix_number(text)).toBeNull();
    },
  );

  // Rule: a value with up to 2 decimals and a suffix parses to its exact
  // value, with no float noise. Source: parse_suffix_number. A stats max of
  // "8.2m" must not hide a target at 8,200,000. Multiplying 8.2 by 1000000
  // once gave 8199999.999999999 (#63).
  test.prop(
    [
      fc.integer({ min: 0, max: 99_999 }),
      fc.constantFrom(...Object.entries(SUFFIX_EXPONENTS)),
    ],
    { examples: [[820, ["m", 6]]] },
  )(
    "a decimal with a suffix parses to its exact value",
    (hundredths, [suffix, exponent]) => {
      const whole = Math.floor(hundredths / 100);
      const fraction = String(hundredths % 100).padStart(2, "0");
      expect(parse_suffix_number(`${whole}.${fraction}${suffix}`)).toBe(
        hundredths * 10 ** (exponent - 2),
      );
    },
  );

  // Rule: thousands separators do not change the value. Source:
  // parse_suffix_number, which accepts "1,000".
  test.prop([count_arb])(
    "a count with thousands separators parses to the same value",
    (n) => {
      expect(parse_suffix_number(n.toLocaleString("en-US"))).toBe(n);
    },
  );

  // Rule: for n from 1000 to just under 1000t, a label uses the largest unit
  // that keeps its number under 1000. Source: format_suffix_number.
  // 999999 once gave "1000k" (#64).
  test.prop([fc.oneof(suffixed_count_arb, near_boundary_arb(below_t_units))], {
    examples: [[999_999]],
  })("the number before the suffix is less than 1000", (n) => {
    const label = format_suffix_number(n);
    expect(label).toMatch(/^[\d.]+[kmbt]$/);
    expect(Number.parseFloat(label)).toBeLessThan(1000);
  });

  // Rule: a label reads back to the same label. Source: format_suffix_number
  // is the inverse of parse_suffix_number. Compare labels, not numbers: a
  // label rounds n, so it reads back as a different number.
  // 999999 once gave "1000k", which reads back as "1m" (#64).
  test.prop([fc.oneof(count_arb, near_boundary_arb(all_units))], {
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
  // "-5m" once parsed to -300 (#63).
  test.prop([duration_arb], { examples: [["-5m"]] })(
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
  // Setup: storage is empty, so no custom colors apply.
  // An unknown scheme once had no palette, so the arrow threw (#65).
  test.prop([stored_scheme_arb, any_ff_data_arb], {
    examples: [["not-a-scheme", estimate_with_ff(2)]],
  })("any stored color scheme gives a hex arrow color", (scheme, data) => {
    ffconfig.color_scheme = scheme as ColorScheme;
    expect(get_ff_arrow_colour(data)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
