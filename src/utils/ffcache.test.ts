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
      available_estimates: { bss: null, premium: null, spies: null },
      spies: [],
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
      available_estimates: { bss: null, premium: null, spies: null },
      spies: [],
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

test("can save, recover, and purge analytics entries", async () => {
  const c = new FFCache("test-analytics");

  const entry1 = {
    feature: "fallback",
    player_id: 123,
    status: "applied" as const,
    url: "https://www.torn.com/profiles.php",
    params: "?XID=123",
    hash: "",
  };

  const entry2 = {
    feature: "mini-profile",
    player_id: 456,
    status: "ignored" as const,
    url: "https://www.torn.com/index.php",
    params: "",
    hash: "#/team",
  };

  await c.add_analytics(entry1);
  vi.advanceTimersByTime(5 * SEC);
  await c.add_analytics(entry2);

  const logs = await c.get_analytics();
  expect(logs.length).toEqual(2);
  expect(logs[0]?.feature).toEqual("fallback");
  expect(logs[0]?.player_id).toEqual(123);
  expect(logs[0]?.status).toEqual("applied");
  expect(logs[0]?.url).toEqual("https://www.torn.com/profiles.php");
  expect(logs[0]?.timestamp).toEqual(Date.now() - 5 * SEC);

  expect(logs[1]?.feature).toEqual("mini-profile");
  expect(logs[1]?.player_id).toEqual(456);
  expect(logs[1]?.status).toEqual("ignored");
  expect(logs[1]?.hash).toEqual("#/team");
  expect(logs[1]?.timestamp).toEqual(Date.now());

  // Test rolling log deletion (older than 30 days)
  vi.advanceTimersByTime(31 * 24 * 60 * 60 * SEC);

  const entry3 = {
    feature: "faction",
    player_id: 789,
    status: "applied" as const,
    url: "https://www.torn.com/factions.php",
    params: "?step=your",
    hash: "",
  };
  await c.add_analytics(entry3);

  const logsBeforeClean = await c.get_analytics();
  expect(logsBeforeClean.length).toEqual(3);

  await c.clean_expired();

  const logsAfterClean = await c.get_analytics();
  expect(logsAfterClean.length).toEqual(1);
  expect(logsAfterClean[0]?.player_id).toEqual(789);
  expect(logsAfterClean[0]?.feature).toEqual("faction");

  await c.delete_db();
});

test("clear_analytics clears all analytics entries in cache", async () => {
  const c = new FFCache("test-analytics-clear");

  const entry = {
    feature: "fallback",
    player_id: 123,
    status: "applied" as const,
    url: "https://www.torn.com/profiles.php",
    params: "?XID=123",
    hash: "",
  };

  await c.add_analytics(entry);
  const logsBefore = await c.get_analytics();
  expect(logsBefore.length).toEqual(1);

  await c.clear_analytics();
  const logsAfter = await c.get_analytics();
  expect(logsAfter.length).toEqual(0);

  await c.delete_db();
});

test("multi-tab deletion: delete_db does not hang when another connection is open, and other connection reopens transparently", async () => {
  const dbName = "test-multi-tab";
  const c1 = new FFCache(dbName);
  const c2 = new FFCache(dbName);

  await c1.update([get_player(1)]);
  await c2.update([get_player(2)]);

  expect(await c1.get([1])).toEqual(new Map([[1, add_expiry(get_player(1))]]));
  expect(await c2.get([2])).toEqual(new Map([[2, add_expiry(get_player(2))]]));

  const deletePromise = c1.delete_db();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("delete_db hung")), 2000),
  );

  await expect(
    Promise.race([deletePromise, timeoutPromise]),
  ).resolves.not.toThrow();

  const getPromise = c2.get([2]);
  await expect(getPromise).resolves.toEqual(new Map([[2, null]]));

  await c2.delete_db();
});
