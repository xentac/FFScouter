import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { query_flights, query_stats } from "./api";
import { FFCache } from "./ffcache";
import { FFConfig } from "./ffconfig.js";
import { FFScouter } from "./ffscouter";

import { generate_test_ff_data } from "./test.js";
import type { FFData, TravelMethod } from "./types.js";

vi.mock(import("./api.js"), () => {
  return {
    query_stats: vi.fn(),
    query_flights: vi.fn(),
  };
});

beforeEach(() => {
  // Take control of time.
  vi.useFakeTimers();
  const date = new Date(2012, 1, 1, 0, 0, 0);
  vi.setSystemTime(date);

  vi.clearAllMocks();
});

afterEach(() => {
  // Put things back the way you found it.
  vi.useRealTimers();
});

type ObservedPromise<T> = {
  promise: Promise<T>;
  resolved: boolean;
  value?: T;
};

function observe<T>(p: Promise<T>): ObservedPromise<T> {
  const o: ObservedPromise<T> = {
    promise: p,
    resolved: false,
  };

  p.then((v) => {
    o.resolved = true;
    o.value = v;
  });

  return o;
}

const prime_cache = async (c: FFCache) => {
  const datas = [];
  for (let i = 0; i < 200; i++) {
    datas.push(generate_test_ff_data(i + 1000));
  }

  await c.update(datas);
};

const config = new FFConfig("test");
vi.spyOn(config, "key", "get").mockReturnValue("a");
vi.spyOn(config, "key", "set");

test("start creates runner that runs and does nothing", async () => {
  const c = new FFCache("name");

  const b = new FFScouter(config, c);
  vi.spyOn(b, "schedule");

  await prime_cache(c);

  expect(b.schedule).not.toHaveBeenCalled();
  b.schedule_cache();
  expect(b.schedule).toHaveBeenCalledWith(b.process_cache, 10);

  b.schedule_api();
  expect(b.schedule).toHaveBeenCalledWith(b.process_api, 100);

  await c.delete_db();
});

test("promises returned are same for same id but different for different id", async () => {
  const f = new FFScouter(config);

  const p = f.get(1);
  const q = f.get(1);
  const r = f.get(2);

  expect(p).toBe(q);
  expect(p).not.toBe(r);
});

test("promises returned after processing is done are different", async () => {
  const c = new FFCache("name");

  const f = new FFScouter(config, c);
  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  vi.mocked(query_stats).mockResolvedValue({
    result: new Map([[1, generate_test_ff_data(1)]]),
    blank: false,
  });

  const p = f.get(1);

  await vi.advanceTimersByTimeAsync(10);
  await vi.advanceTimersByTimeAsync(100);

  const q = f.get(1);

  expect(p).not.toBe(q);

  expect(await p).toEqual(generate_test_ff_data(1));

  expect(c.update).toBeCalledTimes(1);

  await c.delete_db();
});

test("enqueue less than one batch over less than initial interval", async () => {
  const c = new FFCache("name");

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();
  vi.mocked(query_stats).mockResolvedValue({
    result: new Map([
      [10, generate_test_ff_data(10)],
      [11, generate_test_ff_data(11)],
      [12, generate_test_ff_data(12)],
      [13, generate_test_ff_data(13)],
      [14, generate_test_ff_data(14)],
      [15, generate_test_ff_data(15)],
      [16, generate_test_ff_data(16)],
      [17, generate_test_ff_data(17)],
    ]),
    blank: false,
  });

  const f = new FFScouter(config, c);
  vi.spyOn(f, "schedule");

  const promises = new Map<number, ObservedPromise<FFData>>();
  for (const i of [10, 11, 12, 13, 14, 15, 16, 17]) {
    promises.set(i, observe(f.get(i)));
  }
  expect(f.schedule).toHaveBeenCalledWith(f.process_cache, 10);

  for (const p of promises.values()) {
    expect(p.resolved).toBe(false);
  }

  await f.process_cache();
  expect(f.schedule).toHaveBeenCalledWith(f.process_api, 100);
  await f.process_api();
  await Promise.resolve();
  expect(query_stats).toBeCalledTimes(1);
  expect(f.schedule).toHaveBeenCalledWith(f.process_api, 1000);

  for (const [id, p] of promises.entries()) {
    expect(p.resolved).toBe(true);
    expect(p.value).toEqual(generate_test_ff_data(id));
  }

  await f.process_cache();
  await f.process_api();
  await Promise.resolve();

  expect(query_stats).toBeCalledTimes(1);

  expect(query_stats).toHaveBeenCalledWith(
    config.key,
    [10, 11, 12, 13, 14, 15, 16, 17],
  );
});

test("get across interval boundaries", async () => {
  const c = new FFCache("name");

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const f = new FFScouter(config, c);

  for (const i of [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111]) {
    vi.mocked(query_stats).mockResolvedValue({
      result: new Map([[i, generate_test_ff_data(i)]]),
      blank: false,
    });
    const p = observe(f.get(i));
    await f.process_cache();
    await f.process_api();
    await Promise.resolve();
    expect(p.resolved).toBe(true);
    expect(p.value).toEqual(generate_test_ff_data(i));
    expect(query_stats).toHaveBeenCalledWith(config.key, [i]);
  }
});

test("enqueue more than one batch in a single batch time", async () => {
  const c = new FFCache("name");

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();
  vi.mocked(query_stats).mockReset();
  for (let i = 0; i < 5; i++) {
    vi.mocked(query_stats).mockResolvedValueOnce({
      result: new Map(
        Array.from({ length: 200 }, (_, j) => {
          return [
            i * 200 + j + 1000,
            generate_test_ff_data(i * 200 + j + 1000),
          ];
        }),
      ),
      blank: false,
    });
  }

  const f = new FFScouter(config, c);

  for (let i = 1000; i < 2000; i++) {
    observe(f.get(i));
  }

  for (let i = 0; i < 5; i++) {
    await f.process_cache();
    await f.process_api();
    await Promise.resolve();

    expect(query_stats).toHaveBeenCalledWith(
      config.key,
      Array.from({ length: 200 }, (_, j) => {
        return i * 200 + j + 1000;
      }),
    );
  }
});

test("calculate_next_run works", () => {
  const f = new FFScouter(config);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 100,
      rate_limit: 100,
      this_minute: 0,
    }),
  ).toEqual(1000);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 99,
      rate_limit: 100,
      this_minute: 1,
    }),
  ).toEqual(1000);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 98,
      rate_limit: 100,
      this_minute: 2,
    }),
  ).toEqual(1000);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 75,
      rate_limit: 100,
      this_minute: 25,
    }),
  ).toEqual(1000 / 75);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 35,
      rate_limit: 100,
      this_minute: 65,
    }),
  ).toEqual(1000 / 35);

  expect(
    f.calculate_next_api_run({
      reset_time: new Date(Date.now() + 1000),
      remaining: 0,
      rate_limit: 100,
      this_minute: 100,
    }),
  ).toEqual(1000);
});

test("next_run is calculated based on limits returned", async () => {
  const c = new FFCache("name");

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();
  vi.mocked(query_stats).mockResolvedValue({
    result: new Map([[10, generate_test_ff_data(10)]]),
    blank: false,
    limits: {
      reset_time: new Date(Date.now() + 10_000),
      remaining: 5,
      rate_limit: 100,
      this_minute: 95,
    },
  });

  const f = new FFScouter(config, c);
  vi.spyOn(f, "schedule");

  expect(f.schedule).toHaveBeenCalledTimes(0);
  f.get(10);
  expect(f.schedule).toHaveBeenCalledWith(f.process_cache, 10);

  await f.process_cache();
  expect(f.schedule).toHaveBeenCalledWith(f.process_api, 100);
  await f.process_api();
  expect(f.schedule).toHaveBeenCalledWith(f.process_api, 2000);
});

test("complete schedules execution now", async () => {
  const c = new FFCache("name");

  const f = new FFScouter(config, c);
  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  vi.mocked(query_stats).mockResolvedValue({
    result: new Map([[1, generate_test_ff_data(1)]]),
    blank: false,
  });
  vi.spyOn(f, "process_cache");

  f.get(1);
  expect(f.process_cache).not.toHaveBeenCalled();
  f.complete();
  expect(f.process_cache).toHaveBeenCalled();

  await c.delete_db();
});

test("get_flights cache hit", async () => {
  const c = new FFCache("test-scouter-flights-hit");
  const f = new FFScouter(config, c);

  const mockFlight = {
    player_id: 123,
    current: null,
    recent_flights: [],
  };

  vi.spyOn(c, "get_flight").mockResolvedValue({
    ...mockFlight,
    expiry: Date.now() + 5000,
  });
  vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const res = await f.get_flights(123);
  expect(res).toEqual(mockFlight);
  expect(c.get_flight).toHaveBeenCalledWith(123);
  expect(query_flights).not.toHaveBeenCalled();

  await c.delete_db();
});

test("get_flights cache miss success", async () => {
  const c = new FFCache("test-scouter-flights-miss");
  const f = new FFScouter(config, c);

  const now = 1000000000000;
  vi.spyOn(Date, "now").mockReturnValue(now);
  const nowUnix = now / 1000;

  const mockFlight = {
    player_id: 456,
    current: {
      takeoff_time: nowUnix - 1800,
      status_description: "Leaving",
      earliest_arrival_time: nowUnix + 1800,
      latest_arrival_time: nowUnix + 3600, // 1 hour remaining
      travel_method: "BCT" as TravelMethod,
      book_likely_being_used: false,
    },
    recent_flights: [],
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  vi.mocked(query_flights).mockResolvedValue({
    result: mockFlight,
    blank: false,
  });

  const promise = f.get_flights(456);
  await Promise.resolve();
  await vi.runAllTimersAsync();
  const res = await promise;

  expect(res).toEqual(mockFlight);
  expect(c.get_flight).toHaveBeenCalledWith(456);
  expect(query_flights).toHaveBeenCalledWith("a", 456);
  expect(c.update_flight).toHaveBeenCalledWith(mockFlight, 1800000); // 3600 / 2 = 1800 seconds = 1,800,000 ms
  expect(c.clean_expired).toHaveBeenCalled();

  await c.delete_db();
});

test("get_flights API error throws", async () => {
  const c = new FFCache("test-scouter-flights-err");
  const f = new FFScouter(config, c);

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  vi.spyOn(c, "clean_expired").mockResolvedValue();
  vi.mocked(query_flights).mockRejectedValue(new Error("API offline"));

  const promise = expect(f.get_flights(789)).rejects.toThrow("API offline");
  await Promise.resolve();
  await vi.runAllTimersAsync();
  await promise;

  await c.delete_db();
});

test("get_flights cache miss with current === null starts rechecking", async () => {
  const c = new FFCache("test-scouter-flights-recheck-start");
  const f = new FFScouter(config, c);

  const mockBlankFlight = {
    player_id: 111,
    current: null,
    recent_flights: [],
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  const spyUpdate = vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  vi.mocked(query_flights).mockResolvedValue({
    result: mockBlankFlight,
    blank: false,
  });

  const now = 1000000000000;
  vi.spyOn(Date, "now").mockReturnValue(now);

  const promise = f.get_flights(111);
  await Promise.resolve();
  await vi.runAllTimersAsync();
  const res = await promise;

  expect(res.rechecking).toBe(true);
  expect(res.next_retry_at).toBe(now + 60 * 1000);
  expect(res.recheck_until).toBe(now + 3 * 60 * 1000);
  expect(spyUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      player_id: 111,
      rechecking: true,
      next_retry_at: now + 60 * 1000,
      recheck_until: now + 3 * 60 * 1000,
    }),
    3 * 60 * 1000,
  );

  await c.delete_db();
});

test("get_flights cache hit rechecking before next_retry_at returns cached", async () => {
  const c = new FFCache("test-scouter-flights-recheck-before");
  const f = new FFScouter(config, c);

  const now = 1000000000000;
  const cachedData = {
    player_id: 222,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: now + 60000,
    recheck_until: now + 180000,
    expiry: now + 180000,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(cachedData);
  vi.spyOn(Date, "now").mockReturnValue(now + 5000); // 5 seconds later (before next_retry_at)

  const res = await f.get_flights(222);

  expect(res.rechecking).toBe(true);
  expect(res.next_retry_at).toBe(now + 60000);
  expect(query_flights).not.toHaveBeenCalled();

  await c.delete_db();
});

test("get_flights cache hit rechecking after next_retry_at retries API (still null)", async () => {
  const c = new FFCache("test-scouter-flights-recheck-after-null");
  const f = new FFScouter(config, c);

  const now = 1000000000000;
  const cachedData = {
    player_id: 333,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: now + 60000,
    recheck_until: now + 180000,
    expiry: now + 180000,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(cachedData);
  const spyUpdate = vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const currentTime = now + 70000; // after next_retry_at
  vi.spyOn(Date, "now").mockReturnValue(currentTime);

  const mockBlankFlight = {
    player_id: 333,
    current: null,
    recent_flights: [],
  };
  vi.mocked(query_flights).mockResolvedValue({
    result: mockBlankFlight,
    blank: false,
  });

  const promise = f.get_flights(333);
  await Promise.resolve();
  await vi.runAllTimersAsync();
  const res = await promise;

  expect(res.rechecking).toBe(true);
  expect(res.next_retry_at).toBe(currentTime + 60000);
  expect(res.recheck_until).toBe(now + 180000);
  expect(query_flights).toHaveBeenCalledWith("a", 333);
  expect(spyUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      rechecking: true,
      next_retry_at: currentTime + 60000,
      recheck_until: now + 180000,
    }),
    now + 180000 - currentTime,
  );

  await c.delete_db();
});

test("get_flights cache hit rechecking after next_retry_at retries API (tracked)", async () => {
  const c = new FFCache("test-scouter-flights-recheck-after-tracked");
  const f = new FFScouter(config, c);

  const now = 1000000000000;
  const cachedData = {
    player_id: 444,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: now + 60000,
    recheck_until: now + 180000,
    expiry: now + 180000,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(cachedData);
  const spyUpdate = vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const currentTime = now + 70000; // after next_retry_at
  vi.spyOn(Date, "now").mockReturnValue(currentTime);
  const currentTimeUnix = currentTime / 1000;

  const mockFlight = {
    player_id: 444,
    current: {
      takeoff_time: currentTimeUnix - 1800,
      status_description: "Leaving",
      earliest_arrival_time: currentTimeUnix + 1800,
      latest_arrival_time: currentTimeUnix + 3600, // 1 hour remaining
      travel_method: "BCT" as TravelMethod,
      book_likely_being_used: false,
    },
    recent_flights: [],
  };
  vi.mocked(query_flights).mockResolvedValue({
    result: mockFlight,
    blank: false,
  });

  const promise = f.get_flights(444);
  await Promise.resolve();
  await vi.runAllTimersAsync();
  const res = await promise;

  expect(res.rechecking).toBeUndefined();
  expect(res.current).not.toBeNull();
  expect(spyUpdate).toHaveBeenCalledWith(mockFlight, 1800000); // 3600 / 2 = 1800 seconds = 1,800,000 ms

  await c.delete_db();
});

test("get_flights cache hit rechecking after recheck_until finalizes", async () => {
  const c = new FFCache("test-scouter-flights-recheck-final");
  const f = new FFScouter(config, c);

  const now = 1000000000000;
  const cachedData = {
    player_id: 555,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: now + 60000,
    recheck_until: now + 180000,
    expiry: now + 180000,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(cachedData);
  const spyUpdate = vi.spyOn(c, "update_flight").mockResolvedValue();

  const currentTime = now + 190000; // after recheck_until
  vi.spyOn(Date, "now").mockReturnValue(currentTime);

  const res = await f.get_flights(555);

  expect(res.rechecking).toBe(false);
  expect(res.current).toBeNull();
  expect(query_flights).not.toHaveBeenCalled();
  expect(spyUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      rechecking: false,
    }),
    30 * 60 * 1000,
  );

  await c.delete_db();
});

test("get_flights sequentially paces API requests", async () => {
  const c = new FFCache("test-scouter-flights-pacing");
  const f = new FFScouter(config, c);

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const mockFlight1 = { player_id: 801, current: null, recent_flights: [] };
  const mockFlight2 = { player_id: 802, current: null, recent_flights: [] };

  vi.mocked(query_flights).mockImplementation(async (_, target) => {
    if (target === 801) return { result: mockFlight1, blank: false };
    return { result: mockFlight2, blank: false };
  });

  const p1 = f.get_flights(801);
  const p2 = f.get_flights(802);

  // Advance by 0 to let the first request run
  await vi.advanceTimersByTimeAsync(0);
  expect(query_flights).toHaveBeenCalledTimes(1);
  expect(query_flights).toHaveBeenLastCalledWith("a", 801);

  // The second request should be paced and wait for 1000ms
  expect(query_flights).not.toHaveBeenCalledWith("a", 802);

  // Advance by 1000ms to trigger the paced second request
  await vi.advanceTimersByTimeAsync(1000);
  expect(query_flights).toHaveBeenCalledTimes(2);
  expect(query_flights).toHaveBeenLastCalledWith("a", 802);

  await Promise.all([p1, p2]);
  await c.delete_db();
});

test("get_flights pauses queries when global quota remaining is <= 50", async () => {
  const c = new FFCache("test-scouter-flights-quota");
  const f = new FFScouter(config, c);

  // Set limits.remaining to 50
  f.last_limits = {
    reset_time: new Date(Date.now() + 60000),
    remaining: 50,
    rate_limit: 100,
    this_minute: 50,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const mockFlight = { player_id: 901, current: null, recent_flights: [] };
  vi.mocked(query_flights).mockResolvedValue({
    result: mockFlight,
    blank: false,
  });

  const promise = f.get_flights(901);

  // Advance timers by 0 - it should see the quota <= 50 and defer (not call query_flights)
  await vi.advanceTimersByTimeAsync(0);
  expect(query_flights).not.toHaveBeenCalled();

  // Boost remaining quota above 50 and advance timers to let it run
  f.last_limits.remaining = 60;
  await vi.advanceTimersByTimeAsync(5000); // Wait the 5 second retry delay
  expect(query_flights).toHaveBeenCalledTimes(1);

  await promise;
  await c.delete_db();
});

test("get_aggregated_analytics aggregates and groups entries correctly", async () => {
  const c = new FFCache("test-scouter-analytics-aggregation");
  const f = new FFScouter(config, c);

  const mockEntries = [
    {
      feature: "fallback",
      player_id: 1,
      status: "applied" as const,
      url: "https://www.torn.com/profiles.php",
      params: "?XID=1&sid=mySession",
      hash: "",
      timestamp: Date.now(),
    },
    {
      feature: "fallback",
      player_id: 2,
      status: "applied" as const,
      url: "https://www.torn.com/profiles.php",
      params: "?XID=2&sid=mySession",
      hash: "",
      timestamp: Date.now(),
    },
    {
      feature: "fallback",
      player_id: 3,
      status: "ignored" as const,
      url: "https://www.torn.com/profiles.php",
      params: "?XID=3&step=profile",
      hash: "",
      timestamp: Date.now(),
    },
    {
      feature: "mini-profile",
      player_id: 4,
      status: "applied" as const,
      url: "https://www.torn.com/index.php",
      params: "",
      hash: "#/step=profile",
      timestamp: Date.now(),
    },
    {
      feature: "mini-profile",
      player_id: 5,
      status: "applied" as const,
      url: "https://www.torn.com/index.php",
      params: "",
      hash: "#/sid=mySession",
      timestamp: Date.now(),
    },
    {
      feature: "faction",
      player_id: 6,
      status: "applied" as const,
      url: "https://www.torn.com/factions.php",
      params: "",
      hash: "",
      timestamp: Date.now(),
    },
  ];

  vi.spyOn(c, "get_analytics").mockResolvedValue(mockEntries);

  const aggregated = await f.get_aggregated_analytics();

  expect(aggregated).toEqual(
    expect.arrayContaining([
      {
        url: "https://www.torn.com/profiles.php",
        param: "mySession",
        feature: "fallback",
        status: "applied",
        count: 2,
      },
      {
        url: "https://www.torn.com/profiles.php",
        param: "profile",
        feature: "fallback",
        status: "ignored",
        count: 1,
      },
      {
        url: "https://www.torn.com/index.php",
        param: "profile",
        feature: "mini-profile",
        status: "applied",
        count: 1,
      },
      {
        url: "https://www.torn.com/index.php",
        param: "mySession",
        feature: "mini-profile",
        status: "applied",
        count: 1,
      },
      {
        url: "https://www.torn.com/factions.php",
        param: "-",
        feature: "faction",
        status: "applied",
        count: 1,
      },
    ]),
  );

  expect(aggregated.length).toBe(5);

  await c.delete_db();
});

test("get_aggregated_analytics correctly handles query parsing edge cases", async () => {
  const c = new FFCache("test-scouter-analytics-edge-cases");
  const f = new FFScouter(config, c);

  const mockEntries = [
    {
      feature: "fallback",
      player_id: 1,
      status: "applied" as const,
      url: "https://www.torn.com/profiles.php",
      params: "?sid=hello+world%20test", // plus decoding + percent-decoding
      hash: "",
      timestamp: Date.now(),
    },
    {
      feature: "fallback",
      player_id: 2,
      status: "applied" as const,
      url: "https://www.torn.com/profiles.php",
      params: "?othersid=123&sid=actual-sid", // prefix match exclusion
      hash: "",
      timestamp: Date.now(),
    },
  ];

  vi.spyOn(c, "get_analytics").mockResolvedValue(mockEntries);

  const aggregated = await f.get_aggregated_analytics();

  expect(aggregated).toEqual(
    expect.arrayContaining([
      {
        url: "https://www.torn.com/profiles.php",
        param: "hello world test",
        feature: "fallback",
        status: "applied",
        count: 1,
      },
      {
        url: "https://www.torn.com/profiles.php",
        param: "actual-sid",
        feature: "fallback",
        status: "applied",
        count: 1,
      },
    ]),
  );

  await c.delete_db();
});

test("clear_analytics on FFScouter calls c.clear_analytics", async () => {
  const c = new FFCache("test-scouter-analytics-clear");
  const f = new FFScouter(config, c);

  const spyClear = vi.spyOn(c, "clear_analytics").mockResolvedValue();

  await f.clear_analytics();

  expect(spyClear).toHaveBeenCalledTimes(1);

  await c.delete_db();
});

test("get immediately resolves with no_data when key is empty", async () => {
  const emptyConfig = new FFConfig("test-empty-key");
  vi.spyOn(emptyConfig, "key", "get").mockReturnValue("");
  const f = new FFScouter(emptyConfig);

  const res = await f.get(123);
  expect(res).toEqual({ player_id: 123, no_data: true });
});

test("get_flights immediately returns blank flight status when key is empty", async () => {
  const emptyConfig = new FFConfig("test-empty-key");
  vi.spyOn(emptyConfig, "key", "get").mockReturnValue("");
  const f = new FFScouter(emptyConfig);

  const res = await f.get_flights(123);
  expect(res).toEqual({
    player_id: 123,
    current: null,
    recent_flights: [],
  });
});

test("get_flights does not pause queries if global quota is expired/stale", async () => {
  const c = new FFCache("test-scouter-flights-quota-stale");
  const f = new FFScouter(config, c);

  // Set limits.remaining <= 50, but reset_time is in the past
  f.last_limits = {
    reset_time: new Date(Date.now() - 5000), // 5 seconds in the past
    remaining: 50,
    rate_limit: 100,
    this_minute: 50,
  };

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  vi.spyOn(c, "update_flight").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const mockFlight = { player_id: 902, current: null, recent_flights: [] };
  vi.mocked(query_flights).mockResolvedValue({
    result: mockFlight,
    blank: false,
  });

  const promise = f.get_flights(902);
  await vi.advanceTimersByTimeAsync(0);

  // Should NOT be deferred, query_flights should be called immediately
  expect(query_flights).toHaveBeenCalledTimes(1);
  const res = await promise;
  expect(res).toEqual({
    player_id: 902,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: expect.any(Number),
    recheck_until: expect.any(Number),
  });

  await c.delete_db();
});

test("process_api resolves promises even when FFCache update throws", async () => {
  const c = new FFCache("test-scouter-cache-throw");
  const f = new FFScouter(config, c);

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  // Mock cache update to throw an error
  vi.spyOn(c, "update").mockRejectedValue(new Error("IndexedDB blocked"));
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const testData = generate_test_ff_data(10);
  vi.mocked(query_stats).mockResolvedValue({
    result: new Map([[10, testData]]),
    blank: false,
  });

  const promise = f.get(10);
  await f.process_cache();
  await f.process_api();

  // The promise should successfully resolve with API results even though cache update failed
  const res = await promise;
  expect(res).toEqual(testData);

  await c.delete_db();
});

test("process_flight_queue resolves promises even when FFCache update_flight throws", async () => {
  const c = new FFCache("test-scouter-flights-throw");
  const f = new FFScouter(config, c);

  vi.spyOn(c, "get_flight").mockResolvedValue(null);
  // Mock cache update_flight to throw an error
  vi.spyOn(c, "update_flight").mockRejectedValue(
    new Error("QuotaExceededError"),
  );
  vi.spyOn(c, "clean_expired").mockResolvedValue();

  const mockFlight = { player_id: 903, current: null, recent_flights: [] };
  vi.mocked(query_flights).mockResolvedValue({
    result: mockFlight,
    blank: false,
  });

  const promise = f.get_flights(903);
  await vi.advanceTimersByTimeAsync(0);

  // The promise should successfully resolve with API results even though cache update failed
  const res = await promise;
  expect(res).toEqual({
    ...mockFlight,
    rechecking: true,
    next_retry_at: expect.any(Number),
    recheck_until: expect.any(Number),
  });

  await c.delete_db();
});
