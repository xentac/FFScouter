// Property-based tests for the suffix-number and duration laws.
//
// The invariant under test, in plain words: a text that carries no digit is
// not a number, and a number the filter box accepts is always a usable
// finite bound. The bug these guard against is the one filed as
// https://github.com/xentac/FFScouter/issues/63 — a stray comma parsed as 0
// turned a stats max into "hide every member with a known estimate".
//
// Source of the property: "Grilling: which properties to adopt first"
// (https://github.com/xentac/FFScouter/issues/55) lists the suffix-number
// round trip and parse_duration_to_seconds as the first batch of laws.
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import {
  format_suffix_number,
  parse_duration_to_seconds,
  parse_suffix_number,
} from "./strings";

// A plain integer the user could type, without a suffix.
const integerArb = fc.integer({ min: 0, max: 1_000_000_000 });

// A decimal the user could type, before a suffix. Kept to values that are
// exactly representable after scaling, so the only noise under test is the
// one a suffix multiplier introduces.
const decimalArb = fc.integer({ min: 0, max: 100_000 }).map((n) => n / 100);

type Suffix = "k" | "m" | "b" | "t";
const suffixArb = fc.constantFrom<Suffix>("k", "m", "b", "t");

const MULTIPLIERS: Record<Suffix, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
  t: 1_000_000_000_000,
};

function getFormattingTolerance(formatted: string): number {
  if (formatted.endsWith("t")) return 5_000_000_000;
  if (formatted.endsWith("b")) return 5_000_000;
  if (formatted.endsWith("m")) return 5_000;
  if (formatted.endsWith("k")) return 5;
  return 0.5;
}

test.prop([
  fc.string({ minLength: 0, maxLength: 8 }).filter((s) => !/\d/.test(s)),
])("parse_suffix_number returns null for text with no digit", (text) => {
  expect(parse_suffix_number(text)).toBeNull();
});

test.prop([
  fc.constantFrom(",", ",k", "1,5", "1,50", "1,5000", "1,000,00", ".,", ",."),
])(
  "parse_suffix_number returns null for a thousands group it cannot read",
  (text) => {
    expect(parse_suffix_number(text)).toBeNull();
  },
);

test.prop([fc.string({ minLength: 0, maxLength: 16 })])(
  "parse_suffix_number never returns a non-finite number",
  (text) => {
    const parsed = parse_suffix_number(text);
    if (parsed !== null) {
      expect(Number.isFinite(parsed)).toBe(true);
    }
  },
);

test.prop([integerArb])("parse_suffix_number reads a plain integer", (n) => {
  expect(parse_suffix_number(String(n))).toBe(n);
});

test.prop([integerArb, suffixArb])(
  "parse_suffix_number applies the suffix multiplier exactly",
  (n, suffix) => {
    const parsed = parse_suffix_number(`${n}${suffix}`);
    expect(parsed).not.toBeNull();
    expect(parsed).toBe(n * MULTIPLIERS[suffix]);
  },
);

test.prop([decimalArb, suffixArb])(
  "parse_suffix_number scales a decimal without float noise",
  (n, suffix) => {
    const parsed = parse_suffix_number(`${n}${suffix}`);
    expect(parsed).not.toBeNull();
    expect(parsed).toBe(Math.round(n * MULTIPLIERS[suffix]));
    expect(parsed).toBe(Math.round(parsed as number));
  },
);

test.prop([fc.integer({ min: 1, max: 999_999_999 })])(
  "parse_suffix_number reads a thousands separator",
  (n) => {
    const grouped = n.toLocaleString("en-US");
    expect(parse_suffix_number(grouped)).toBe(n);
  },
);

test.prop([integerArb])(
  "format_suffix_number round trips through parse_suffix_number",
  (n) => {
    const formatted = format_suffix_number(n);
    const parsed = parse_suffix_number(formatted);
    expect(parsed).not.toBeNull();
    // format_suffix_number keeps two decimals per unit, so the round trip is
    // exact for units that divide cleanly and lossy within half a unit
    // otherwise. The bound scales with the unit used.
    const tolerance = getFormattingTolerance(formatted);
    expect(Math.abs((parsed as number) - n)).toBeLessThanOrEqual(tolerance);
  },
);

test.prop([fc.string({ minLength: 0, maxLength: 12 })])(
  "parse_duration_to_seconds returns null or a finite non-negative number",
  (text) => {
    const seconds = parse_duration_to_seconds(text);
    if (seconds !== null) {
      expect(Number.isFinite(seconds)).toBe(true);
      expect(seconds).toBeGreaterThanOrEqual(0);
    }
  },
);

test.prop([
  fc.integer({ min: 1, max: 100_000 }).map((n) => `-${n}m`),
  fc.integer({ min: 1, max: 100_000 }).map((n) => `-${n}s`),
  fc.integer({ min: 1, max: 100_000 }).map((n) => `-${n}h`),
])("parse_duration_to_seconds rejects a negative duration", (text) => {
  expect(parse_duration_to_seconds(text)).toBeNull();
});
