// @vitest-environment jsdom

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  type Mock,
  test,
  vi,
} from "vitest";
import {
  ECSTASY_PLAN,
  PLANS_RESPONSE,
  UNPAYABLE_PLAN,
  WEEKLY_PLAN,
} from "./__fixtures__/od_insurance";
import type { query_od_insurance_plans } from "./api";
import {
  covered_item_ids,
  OD_PLANS_FRESH_MS,
  OdInsurancePlansCache,
  payable_plans,
} from "./od_insurance";
import { Storage } from "./storage";

describe("covered_item_ids", () => {
  test("gives the item each payable plan covers, once", () => {
    const xanax_day = { ...WEEKLY_PLAN, plan_key: "xanax" };
    expect(
      covered_item_ids({
        ...PLANS_RESPONSE,
        plans: [ECSTASY_PLAN, WEEKLY_PLAN, xanax_day],
      }),
    ).toEqual([197, 206]);
  });

  test("skips plans nobody can pay for", () => {
    const unpayable_ecstasy = {
      ...UNPAYABLE_PLAN,
      covered_item: { item_id: 197, name: "Ecstasy" },
    };
    expect(
      covered_item_ids({
        ...PLANS_RESPONSE,
        plans: [unpayable_ecstasy, WEEKLY_PLAN],
      }),
    ).toEqual([206]);
  });

  test("skips plans whose covered item is not set", () => {
    const unset = {
      ...ECSTASY_PLAN,
      covered_item: { item_id: null, name: null },
    };
    expect(
      covered_item_ids({ ...PLANS_RESPONSE, plans: [unset, WEEKLY_PLAN] }),
    ).toEqual([206]);
  });
});

test("payable_plans keeps plans that name a recipient", () => {
  expect(payable_plans(PLANS_RESPONSE)).toEqual([ECSTASY_PLAN, WEEKLY_PLAN]);
});

test("payable_plans hides plans whose recipient is null", () => {
  expect(
    payable_plans({
      ...PLANS_RESPONSE,
      plans: [UNPAYABLE_PLAN, ECSTASY_PLAN],
    }),
  ).toEqual([ECSTASY_PLAN]);
});

test("payable_plans returns nothing when no plan is payable", () => {
  expect(
    payable_plans({
      manager_player_id: null,
      manager_name: null,
      plans: [UNPAYABLE_PLAN],
    }),
  ).toEqual([]);
});

describe("OdInsurancePlansCache", () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const ok = { result: PLANS_RESPONSE, blank: false as const };
  let query: Mock<typeof query_od_insurance_plans>;
  let cache: OdInsurancePlansCache;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
    localStorage.clear();
    query = vi.fn<typeof query_od_insurance_plans>().mockResolvedValue(ok);
    cache = new OdInsurancePlansCache({
      storage: new Storage("test."),
      query,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("fetches when nothing is stored", async () => {
    await expect(cache.get()).resolves.toEqual({
      status: "fresh",
      response: PLANS_RESPONSE,
    });
    expect(query).toHaveBeenCalledTimes(1);
    await cache.get();
    expect(query).toHaveBeenCalledTimes(1);
  });

  test("serves a fresh list without a request", async () => {
    await cache.get();
    vi.advanceTimersByTime(OD_PLANS_FRESH_MS - 1);
    await expect(cache.get()).resolves.toMatchObject({ status: "fresh" });
    expect(query).toHaveBeenCalledTimes(1);
  });

  test("fetches again once the list is 10 minutes old", async () => {
    await cache.get();
    vi.advanceTimersByTime(OD_PLANS_FRESH_MS);
    await cache.get();
    expect(query).toHaveBeenCalledTimes(2);
  });

  test("shares one request between callers", async () => {
    const [a, b] = await Promise.all([cache.get(), cache.get()]);
    expect(a).toBe(b);
    expect(query).toHaveBeenCalledTimes(1);
  });

  test("falls back to a stale list under 24 hours old when the refresh fails", async () => {
    await cache.get();
    vi.advanceTimersByTime(23 * HOUR);
    query.mockRejectedValue(new Error("offline"));
    await expect(cache.get()).resolves.toEqual({
      status: "stale",
      response: PLANS_RESPONSE,
      fetched_at: new Date("2026-11-12T12:00:00Z").getTime(),
    });
  });

  test("treats a blank response as a failure", async () => {
    query.mockResolvedValue({ blank: true });
    await expect(cache.get()).resolves.toEqual({ status: "failed" });
  });

  test("fails when the refresh fails and the stored list is over 24 hours old", async () => {
    await cache.get();
    vi.advanceTimersByTime(24 * HOUR + 1);
    query.mockRejectedValue(new Error("offline"));
    await expect(cache.get()).resolves.toEqual({ status: "failed" });
  });

  test("fails when the request fails and nothing is stored", async () => {
    query.mockRejectedValue(new Error("offline"));
    await expect(cache.get()).resolves.toEqual({ status: "failed" });
  });

  test("tries again after a failure", async () => {
    query.mockRejectedValueOnce(new Error("offline"));
    await expect(cache.get()).resolves.toEqual({ status: "failed" });
    await expect(cache.get()).resolves.toMatchObject({ status: "fresh" });
    expect(query).toHaveBeenCalledTimes(2);
  });
});
