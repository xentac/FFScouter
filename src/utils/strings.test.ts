// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  ff_to_percent,
  format_difficulty_text,
  format_ff_score,
  format_relative_time,
  format_timestamp,
  get_contrast_color,
  get_ff_arrow_colour,
  get_ff_colour,
  parse_suffix_number,
} from "./strings";
import type { FFDataComplete } from "./types";

const HOUR = 60 * 60;
const DAY = HOUR * 24;

beforeEach(() => {
  vi.useFakeTimers();
  // Set current time to a fixed timestamp: 2026-05-20T00:00:00Z
  const date = new Date("2026-05-20T00:00:00Z");
  vi.setSystemTime(date);
});

afterEach(() => {
  vi.useRealTimers();
});

test("format_ff_score formats scores with age check", () => {
  const nowSec = Date.now() / 1000;

  const freshData: FFDataComplete = {
    player_id: 1,
    no_data: false,
    fair_fight: 2.3456,
    last_updated: nowSec - 5 * DAY,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  };
  expect(format_ff_score(freshData)).toEqual("2.35");

  const oldData: FFDataComplete = {
    player_id: 2,
    no_data: false,
    fair_fight: 4.1234,
    last_updated: nowSec - 15 * DAY,
    bs_estimate: 2000,
    bs_estimate_human: "2k",
    bss_public: 20,
    source: "bss",
    premium_insights_available: false,
  };
  expect(format_ff_score(oldData)).toEqual("4.12?");
});

test("format_difficulty_text returns correct strings based on fair_fight score", () => {
  const baseData = (ff: number): FFDataComplete => ({
    player_id: 1,
    no_data: false,
    fair_fight: ff,
    last_updated: Date.now() / 1000,
    bs_estimate: 100,
    bs_estimate_human: "100",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  expect(format_difficulty_text(baseData(0.5))).toEqual("Extremely easy");
  expect(format_difficulty_text(baseData(1.0))).toEqual("Extremely easy");
  expect(format_difficulty_text(baseData(1.5))).toEqual("Easy");
  expect(format_difficulty_text(baseData(2.0))).toEqual("Easy");
  expect(format_difficulty_text(baseData(2.5))).toEqual("Moderately difficult");
  expect(format_difficulty_text(baseData(3.5))).toEqual("Moderately difficult");
  expect(format_difficulty_text(baseData(4.0))).toEqual("Difficult");
  expect(format_difficulty_text(baseData(4.5))).toEqual("Difficult");
  expect(format_difficulty_text(baseData(5.0))).toEqual("May be impossible");
});

test("format_relative_time handles various time differences", () => {
  const nowSec = Date.now() / 1000;

  expect(format_relative_time(nowSec - 0.5 * DAY)).toEqual("");
  expect(format_relative_time(nowSec - 1.2 * DAY)).toEqual("(1 day old)");
  expect(format_relative_time(nowSec - 5 * DAY)).toEqual("(5 days old)");
  expect(format_relative_time(nowSec - 30 * DAY)).toEqual("(30 days old)");
  expect(format_relative_time(nowSec - 45 * DAY)).toEqual("(1 month old)");
  expect(format_relative_time(nowSec - 90 * DAY)).toEqual("(3 months old)");
  expect(format_relative_time(nowSec - 365 * DAY)).toEqual("(1 year old)");
  expect(format_relative_time(nowSec - 800 * DAY)).toEqual("(2 years old)");
});

test("get_ff_arrow_colour returns correct hex colors with clamping", () => {
  expect(get_ff_arrow_colour({ player_id: 1, no_data: true })).toEqual(
    "#000000",
  );

  // arrow_gradient3 is used:
  // Low score (1.0) maps to index 0: "#1734e8"
  expect(
    get_ff_arrow_colour({
      player_id: 2,
      no_data: false,
      fair_fight: 1.0,
    } as any),
  ).toEqual("#1734e8");

  // Clamping below 1
  expect(
    get_ff_arrow_colour({
      player_id: 2,
      no_data: false,
      fair_fight: 0.5,
    } as any),
  ).toEqual("#1734e8");

  // High score (5.0) maps to index 10: "#e81734"
  expect(
    get_ff_arrow_colour({
      player_id: 2,
      no_data: false,
      fair_fight: 5.0,
    } as any),
  ).toEqual("#e81734");

  // Clamping above 5
  expect(
    get_ff_arrow_colour({
      player_id: 2,
      no_data: false,
      fair_fight: 6.0,
    } as any),
  ).toEqual("#e81734");

  // Middle score (3.0) maps to index 5: "#34e817"
  expect(
    get_ff_arrow_colour({
      player_id: 2,
      no_data: false,
      fair_fight: 3.0,
    } as any),
  ).toEqual("#34e817");

  // get_ff_colour is an alias for get_ff_arrow_colour
  const comp: FFDataComplete = {
    player_id: 3,
    no_data: false,
    fair_fight: 3.0,
    last_updated: Date.now() / 1000,
    bs_estimate: 100,
    bs_estimate_human: "100",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  };
  expect(get_ff_colour(comp)).toEqual("#34e817");
});

test("get_contrast_color determines black or white based on background brightness", () => {
  expect(get_contrast_color("#ffffff")).toEqual("black");
  expect(get_contrast_color("#000000")).toEqual("white");
  expect(get_contrast_color("#1734e8")).toEqual("white"); // dark blue
  expect(get_contrast_color("#dbe817")).toEqual("black"); // bright yellow-green
});

test("ff_to_percent computes expected percentage relative to configured ranges", () => {
  // CONFIG_DEFAULTS low_ff_range: 2, high_ff_range: 4, max_ff_range: 8
  // low_mid_percent = 33, mid_high_percent = 66
  const data = (ff: number): FFDataComplete => ({
    player_id: 1,
    no_data: false,
    fair_fight: ff,
    last_updated: Date.now() / 1000,
    bs_estimate: 100,
    bs_estimate_human: "100",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
  });

  // Since low_ff_range is 2:
  // If fair_fight is 1.5, percent = ((1.5 - 1) / (2 - 1)) * 33 = 0.5 * 33 = 16.5
  expect(ff_to_percent(data(1.5))).toBeCloseTo(16.5);

  // If fair_fight is 3.0 (exactly halfway between low_ff 2 and high_ff 4)
  // percent = ((3.0 - 2) / (4 - 2)) * (66 - 33) + 33 = 0.5 * 33 + 33 = 49.5
  expect(ff_to_percent(data(3.0))).toBeCloseTo(49.5);

  // If fair_fight is 6.0 (exactly halfway between high_ff 4 and max_ff 8)
  // percent = ((6.0 - 4) / (8 - 4)) * (100 - 66) + 66 = 0.5 * 34 + 66 = 83
  expect(ff_to_percent(data(6.0))).toBeCloseTo(83);

  // If fair_fight is clamped to max_ff 8, it should return 100
  expect(ff_to_percent(data(8.0))).toEqual(100);
  expect(ff_to_percent(data(10.0))).toEqual(100);
});

test("format_timestamp formats seconds timestamp correctly", () => {
  // Epoch: 1768192440 is 2026-01-12T04:34:00Z (but local timezone dependent)
  // Let's create a local Date and format it to check the implementation logic
  const nowSec = Date.now() / 1000;
  const d = new Date(nowSec * 1000);
  const pad = (n: number) => (n < 10 ? "0" : "") + n;
  const expected = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} - ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() - 2000}`;

  expect(format_timestamp(nowSec)).toEqual(expected);
});

test("parse_suffix_number parses numeric suffixes correctly", () => {
  expect(parse_suffix_number("")).toBeNull();
  expect(parse_suffix_number("   ")).toBeNull();
  expect(parse_suffix_number("abc")).toBeNull();
  expect(parse_suffix_number("1.2.3")).toBeNull();

  expect(parse_suffix_number("123")).toEqual(123);
  expect(parse_suffix_number("12.5")).toEqual(12.5);
  expect(parse_suffix_number(" 456 ")).toEqual(456);

  expect(parse_suffix_number("10k")).toEqual(10000);
  expect(parse_suffix_number("1.5M")).toEqual(1500000);
  expect(parse_suffix_number("2.5 b")).toEqual(2500000000);
  expect(parse_suffix_number("1t")).toEqual(1000000000000);
  expect(parse_suffix_number("0.5k")).toEqual(500);

  expect(parse_suffix_number("10K")).toEqual(10000);
  expect(parse_suffix_number("1.5m")).toEqual(1500000);
  expect(parse_suffix_number("2.5B")).toEqual(2500000000);
  expect(parse_suffix_number("1T")).toEqual(1000000000000);

  expect(parse_suffix_number("1,000")).toEqual(1000);
  expect(parse_suffix_number("1,500k")).toEqual(1500000);
  expect(parse_suffix_number("1,000,000m")).toEqual(1000000000000);
});
