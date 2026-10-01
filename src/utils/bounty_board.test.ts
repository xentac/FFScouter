// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SELLER_BOARD_RESPONSE } from "./__fixtures__/bounty_board";
import type { query_bounty_seller_board } from "./api";
import {
  BOUNTY_BOARD_FRESHNESS_FLOOR_MS,
  BountyBoardCache,
} from "./bounty_board";
import { FFConfig } from "./ffconfig";
import { Storage } from "./storage";

const TEST_PREFIX = "ffscouter-bounty-test.";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-02T00:00:00Z"));
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// A fresh cache instance with its own FFConfig/Storage objects over the same
// localStorage, simulating a new page load.
const make_page_load = (query: typeof query_bounty_seller_board) => {
  const config = new FFConfig(TEST_PREFIX);
  return new BountyBoardCache(config, new Storage(TEST_PREFIX), query);
};

const set_key = () => {
  new FFConfig(TEST_PREFIX).key = "test-key";
};

test("get_board fetches with the configured key and returns the board", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const cache = make_page_load(query);

  expect(await cache.get_board()).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledExactlyOnceWith("test-key");
});

test("at most one fetch per freshness window across simulated page loads", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  await make_page_load(query).get_board();
  expect(query).toHaveBeenCalledTimes(1);

  // Second and third page loads inside the freshness window read storage only
  vi.advanceTimersByTime(BOUNTY_BOARD_FRESHNESS_FLOOR_MS - 1000);
  expect(await make_page_load(query).get_board()).toEqual(
    SELLER_BOARD_RESPONSE,
  );
  expect(await make_page_load(query).get_board()).toEqual(
    SELLER_BOARD_RESPONSE,
  );
  expect(query).toHaveBeenCalledTimes(1);

  // Crossing the freshness floor allows exactly one more fetch
  vi.advanceTimersByTime(2000);
  await make_page_load(query).get_board();
  expect(query).toHaveBeenCalledTimes(2);
});

test("concurrent get_board calls share one in-flight fetch", async () => {
  set_key();
  let resolve_fetch!: (v: unknown) => void;
  const query = vi.fn().mockReturnValue(
    new Promise((res) => {
      resolve_fetch = res;
    }),
  );
  const cache = make_page_load(query);

  const first = cache.get_board();
  const second = cache.get_board();
  resolve_fetch({ result: SELLER_BOARD_RESPONSE, blank: false });

  expect(await first).toEqual(SELLER_BOARD_RESPONSE);
  expect(await second).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(1);
});

test("get_board propagates fetch errors and does not poison the cache", async () => {
  set_key();
  const error = new Error("boom");
  const query = vi
    .fn()
    .mockRejectedValueOnce(error)
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const cache = make_page_load(query);

  await expect(cache.get_board()).rejects.toThrow("boom");
  // The failed fetch stored nothing; the next call fetches again
  expect(await cache.get_board()).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(2);
});

test("get_board treats a blank (PDA empty) response as an error", async () => {
  set_key();
  const query = vi.fn().mockResolvedValue({ blank: true });
  const cache = make_page_load(query);

  await expect(cache.get_board()).rejects.toThrow();
});

test("get_board without a configured key throws without fetching", async () => {
  const query = vi.fn();
  const cache = make_page_load(query as never);

  await expect(cache.get_board()).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();
});

test("refresh warms the cache and swallows errors", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(new Error("boom"))
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const cache = make_page_load(query);

  // A failing refresh resolves rather than rejecting
  await expect(cache.refresh()).resolves.toBeUndefined();

  await cache.refresh();
  expect(query).toHaveBeenCalledTimes(2);
  // The warmed cache serves a later page load without another fetch
  expect(await make_page_load(query).get_board()).toEqual(
    SELLER_BOARD_RESPONSE,
  );
  expect(query).toHaveBeenCalledTimes(2);
});
