import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FFCache } from "./ffcache";
import type {
  CachedFFData,
  FFData,
  PlayerFlightsResponse,
  PlayerId,
} from "./types";

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
      source: "bss",
      premium_insights_available: false,
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
      source: "bss",
      premium_insights_available: false,
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

test("can save and recover flight data", async () => {
  const c = new FFCache("test-flights");
  const flightData: PlayerFlightsResponse = {
    player_id: 42,
    current: {
      takeoff_time: 1710000000,
      status_description: "Flying",
      earliest_arrival_time: 1710005000,
      latest_arrival_time: 1710006000,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  };

  expect(await c.get_flight(42)).toBeNull();

  await c.update_flight(flightData, 5 * MINUTE);

  const cached = await c.get_flight(42);
  expect(cached).not.toBeNull();
  expect(cached?.player_id).toEqual(42);
  expect(cached?.current?.status_description).toEqual("Flying");
  expect(cached?.expiry).toEqual(Date.now() + 5 * MINUTE);

  // Expiration test
  vi.advanceTimersByTime(6 * MINUTE);
  expect(await c.get_flight(42)).toBeNull();

  await c.delete_db();
});

test("clean_expired cleans flight cache", async () => {
  const c = new FFCache("test-flights-expired");
  const flightData1: PlayerFlightsResponse = {
    player_id: 101,
    current: null,
    recent_flights: [],
  };
  const flightData2: PlayerFlightsResponse = {
    player_id: 102,
    current: null,
    recent_flights: [],
  };

  await c.update_flight(flightData1, 5 * MINUTE);
  await c.update_flight(flightData2, 15 * MINUTE);

  vi.advanceTimersByTime(10 * MINUTE);

  // flightData1 is expired, flightData2 is not
  expect(await c.get_flight(101)).toBeNull();
  expect(await c.get_flight(102)).not.toBeNull();

  const dumped = await c.dump_flights();
  expect(dumped.length).toEqual(2);

  await c.clean_expired();

  const dumpedAfter = await c.dump_flights();
  expect(dumpedAfter.length).toEqual(1);
  expect(dumpedAfter[0]?.player_id).toEqual(102);

  await c.delete_db();
});
