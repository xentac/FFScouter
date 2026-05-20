// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Storage, Time } from "./storage";

beforeEach(() => {
  vi.useFakeTimers();
  const date = new Date("2026-05-20T00:00:00Z");
  vi.setSystemTime(date);

  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test("Storage stores and retrieves values with prefix", () => {
  const store = new Storage("test-prefix.");
  store.set("mykey", "myvalue");

  // Verify prefix is used in localStorage
  expect(localStorage.getItem("test-prefix.mykey")).not.toBeNull();
  expect(JSON.parse(localStorage.getItem("test-prefix.mykey")!)).toEqual({
    value: "myvalue",
    expiration: null,
  });

  // Verify get returns value
  expect(store.get<string>("mykey")).toEqual("myvalue");
});

test("Storage handles non-existent keys", () => {
  const store = new Storage("test-prefix.");
  expect(store.get("non-existent")).toBeNull();
});

test("Storage handles invalid JSON gracefully", () => {
  const store = new Storage("test-prefix.");
  localStorage.setItem("test-prefix.badjson", "{invalid json");

  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  expect(store.get("badjson")).toBeNull();
  expect(localStorage.getItem("test-prefix.badjson")).toBeNull(); // Should remove bad key
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [WARN]: "),
    expect.any(String),
    "Key 'badjson' has invalid JSON in it.",
  );
});

test("Storage supports expiration", () => {
  const store = new Storage("test-prefix.");

  // Set value to expire in 5 minutes
  store.set("expiring", "val", { amount: 5, unit: Time.Minutes });

  // Expiration time should be Date.now() + 5 * 60 * 1000 = 1768224000000 + 300000 = 1768224300000
  expect(store.get("expiring")).toEqual("val");

  // Advance time by 4 minutes and 59 seconds (under 5 mins)
  vi.advanceTimersByTime(5 * 60 * 1000 - 1000);
  expect(store.get("expiring")).toEqual("val");

  const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

  // Advance time past 5 minutes
  vi.advanceTimersByTime(2000);
  expect(store.get("expiring")).toBeNull();
  expect(localStorage.getItem("test-prefix.expiring")).toBeNull(); // Should clean up key
  expect(debugSpy).toHaveBeenCalledWith(
    expect.stringContaining("[FFSV3] - [DEBUG]: "),
    expect.any(String),
    "Key expiring has expired.",
  );
});

test("Storage.remove deletes key from localStorage", () => {
  const store = new Storage("test-prefix.");
  store.set("k", "v");
  expect(store.has("k")).toBe(true);

  store.remove("k");
  expect(store.has("k")).toBe(false);
  expect(localStorage.getItem("test-prefix.k")).toBeNull();
});

test("Storage.clearAll clears only prefixed keys", () => {
  const store1 = new Storage("pref1.");
  const store2 = new Storage("pref2.");

  store1.set("key", "val1");
  store2.set("key", "val2");
  localStorage.setItem("unrelated", "unrelated-val");

  expect(store1.has("key")).toBe(true);
  expect(store2.has("key")).toBe(true);
  expect(localStorage.getItem("unrelated")).toEqual("unrelated-val");

  store1.clearAll();

  expect(store1.has("key")).toBe(false);
  expect(store2.has("key")).toBe(true); // Should remain untouched
  expect(localStorage.getItem("unrelated")).toEqual("unrelated-val"); // Should remain untouched
});
