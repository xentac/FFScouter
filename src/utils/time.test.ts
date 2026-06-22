// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest";
import { get_current_time_seconds } from "./time";

afterEach(() => {
  delete (window as any).getCurrentTimestamp;
});

test("get_current_time_seconds falls back to Date.now() when window.getCurrentTimestamp is absent", () => {
  const originalNow = Date.now;
  Date.now = () => 1_000_000_000;
  try {
    expect(get_current_time_seconds()).toEqual(1_000_000);
  } finally {
    Date.now = originalNow;
  }
});

test("get_current_time_seconds prefers window.getCurrentTimestamp when present", () => {
  (window as any).getCurrentTimestamp = () => 2_000_000_000;
  expect(get_current_time_seconds()).toEqual(2_000_000);
});
