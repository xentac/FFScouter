import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FFCache } from "./ffcache";
import type { CachedFFData, FFData, PlayerId } from "./types";

const SEC = 1000;
const MINUTE = 60 * SEC;
const HOUR = 60 * MINUTE;

const players: Map<PlayerId, FFData> = new Map([
  [
    1,
    {
      no_data: true,
      player_id: 1,
    },
  ],
  [
    2,
    {
      no_data: false,
      fair_fight: 3.0,
      last_updated: Date.now() - 10 * SEC,
      bs_estimate: 1000,
      bs_estimate_human: "1k",
      bss_public: 20,
      player_id: 2,
    },
  ],
  [
    3,
    {
      no_data: false,
      fair_fight: 11.0,
      last_updated: Date.now() - 10 * SEC,
      bs_estimate: 1_000_000,
      bs_estimate_human: "1m",
      bss_public: 50,
      player_id: 3,
    },
  ],
]);

const get_player = (id: PlayerId) => {
  return players.get(id) ?? bare;
};

const add_expiry = (d: FFData): CachedFFData => {
  return { ...d, expiry: Date.now() + HOUR };
};

const bare: FFData = { no_data: true, player_id: -1 };

beforeEach(() => {
  // Take control of time.
  vi.useFakeTimers();
  const date = new Date(2012, 1, 1, 0, 0, 0);
  vi.setSystemTime(date);
});

afterEach(() => {
  // Put things back the way you found it.
  vi.useRealTimers();
});

test("can create and destroy db", async () => {
  const c = new FFCache("test");
  await c.open();

  await c.delete_db();
});

test("get an entry that doesn't exist returns null", async () => {
  const c = new FFCache("test");

  expect(await c.get([1])).toEqual(new Map([[1, null]]));

  await c.delete_db();
});

test("can save and recover data", async () => {
  const c = new FFCache("test");

  await c.update([get_player(1), get_player(2)]);

  expect(await c.get([1, 2])).toEqual(
    new Map([
      [1, add_expiry(get_player(1))],
      [2, add_expiry(get_player(2))],
    ]),
  );

  expect(await c.get([1])).toEqual(new Map([[1, add_expiry(get_player(1))]]));

  expect(await c.get([2])).toEqual(new Map([[2, add_expiry(get_player(2))]]));

  await c.delete_db();
});

test("delete_db deletes db", async () => {
  const c = new FFCache("test");

  await c.update([get_player(1), get_player(2)]);

  await c.delete_db();

  expect(await c.get([1])).toEqual(new Map([[1, null]]));
});

test("expired data is not returned but still saved and clean_expired works", async () => {
  const c = new FFCache("test");

  await c.update([get_player(1)]);
  const cached_player1 = add_expiry(get_player(1));

  vi.advanceTimersByTime(30 * MINUTE);

  await c.update([get_player(2)]);
  const cached_player2 = add_expiry(get_player(2));

  vi.advanceTimersByTime(31 * MINUTE);

  expect(await c.get([2, 1])).toEqual(
    new Map([
      [2, cached_player2],
      [1, null],
    ]),
  );

  expect(await c.dump()).toEqual([cached_player1, cached_player2]);

  await c.clean_expired();

  expect(await c.dump()).toEqual([cached_player2]);

  await c.delete_db();
});
