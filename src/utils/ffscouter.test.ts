import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { query_stats } from "./api";
import { FFCache } from "./ffcache";
import { FFConfig } from "./ffconfig.js";
import { FFScouter } from "./ffscouter";

import { generate_test_ff_data } from "./test.js";
import type { FFData } from "./types.js";

vi.mock(import("./api.js"), () => {
  return {
    query_stats: vi.fn(),
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

  vi.fn(query_stats).mockResolvedValue({
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
  vi.fn(query_stats).mockResolvedValue({
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
    vi.fn(query_stats).mockResolvedValue({
      result: new Map([[i, generate_test_ff_data(i)]]),
      blank: false,
    });
    const p = observe(f.get(i));
    await f.process_cache();
    await f.process_api();
    await Promise.resolve();
    expect(p.resolved).toBe(true);
    expect(p.value).toEqual(generate_test_ff_data(i));
    expect(vi.fn(query_stats)).toHaveBeenCalledWith(config.key, [i]);
  }
});

test("enqueue more than one batch in a single batch time", async () => {
  const c = new FFCache("name");

  vi.spyOn(c, "get").mockResolvedValue(new Map());
  vi.spyOn(c, "update").mockResolvedValue();
  vi.spyOn(c, "clean_expired").mockResolvedValue();
  const spy = vi.fn(query_stats);

  for (let i = 0; i < 5; i++) {
    spy.mockResolvedValueOnce({
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

    expect(spy).toHaveBeenCalledWith(
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
  vi.fn(query_stats).mockResolvedValue({
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

  vi.fn(query_stats).mockResolvedValue({
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
