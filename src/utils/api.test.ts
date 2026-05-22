import { expect, test, vi } from "vitest";
import {
  check_key,
  FFApiError,
  type gmRequest,
  make_flights_url,
  make_stats_url,
  query_flights,
  query_stats,
  query_targets,
} from "./api";
import { generate_test_ff_data } from "./test";

test("make_stats_url generates proper url", () => {
  expect(make_stats_url("a", [1])).toEqual(
    "https://ffscouter.com/api/v1/get-stats?key=a&targets=1",
  );
  expect(make_stats_url("a", [1, 4, 3, 2])).toEqual(
    "https://ffscouter.com/api/v1/get-stats?key=a&targets=1%2C4%2C3%2C2",
  );
});

test("handle errors", async () => {
  const error400: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: "error",
    responseXML: null,
    status: 400,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(query_stats("a", [], error400)).rejects.toThrow(
    new FFApiError(
      "API request failed. Couldn't parse response. HTTP status code: 400",
    ),
  );
  const error400_but_json: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: "{}",
    responseXML: null,
    status: 400,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(query_stats("a", [], error400_but_json)).rejects.toThrow(
    new FFApiError("API request failed. HTTP status code: 400"),
  );

  const error_with_code_1: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: JSON.stringify({
      code: 1,
      error: "API key is required",
    }),
    responseXML: null,
    status: 400,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(query_stats("a", [], error_with_code_1)).rejects.toThrow(
    new FFApiError("API request failed. Error: API key is required; Code: 1", {
      ff_api_error: {
        code: 1,
        error: "API key is required",
      },
    }),
  );

  const error_with_code_4: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: JSON.stringify({
      code: 4,
      error: "At least one target ID is required and no more than 205",
    }),
    responseXML: null,
    status: 200,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(query_stats("a", [], error_with_code_4)).rejects.toThrow(
    new FFApiError(
      "API request failed. Error: At least one target ID is required and no more than 205; Code: 4",
      {
        ff_api_error: {
          code: 4,
          error: "At least one target ID is required and no more than 205",
        },
      },
    ),
  );
});

test("success", async () => {
  const success: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders:
      "cache-control: no-cache, private\n\
      x-ratelimit-reset-until: 55\n\
x-ratelimit-reset-timestamp: 1768192440\n\
x-ratelimit-limit: 120\n\
x-ratelimit-remaining: 118\n",
    readyState: 4,
    response: "",
    responseText: JSON.stringify([
      generate_test_ff_data(234),
      generate_test_ff_data(567),
      generate_test_ff_data(20),
    ]),
    responseXML: null,
    status: 200,
    statusText: "",
    finalUrl: "",
    context: {},
  });

  expect(await query_stats("a", [234, 567, 20], success)).toEqual({
    result: new Map([
      [234, generate_test_ff_data(234)],
      [567, generate_test_ff_data(567)],
      [20, generate_test_ff_data(20)],
    ]),
    blank: false,
    limits: {
      rate_limit: 120,
      remaining: 118,
      reset_time: new Date("2026-01-12T04:34:00.000Z"),
      this_minute: 2,
    },
  });
});

test("success but missing results", async () => {
  const success: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders:
      "cache-control: no-cache, private\n\
      x-ratelimit-reset-until: 55\n\
x-ratelimit-reset-timestamp: 1768192440\n\
x-ratelimit-limit: 120\n\
x-ratelimit-remaining: 118\n",
    readyState: 4,
    response: "",
    responseText: JSON.stringify([]),
    responseXML: null,
    status: 200,
    statusText: "",
    finalUrl: "",
    context: {},
  });

  expect(await query_stats("a", [234, 567, 1], success)).toEqual({
    result: new Map([
      [
        234,
        {
          player_id: 234,
          no_data: true,
        },
      ],
      [
        567,
        {
          player_id: 567,
          no_data: true,
        },
      ],
      [
        1,
        {
          player_id: 1,
          no_data: true,
        },
      ],
    ]),
    blank: false,
    limits: {
      rate_limit: 120,
      remaining: 118,
      reset_time: new Date("2026-01-12T04:34:00.000Z"),
      this_minute: 2,
    },
  });
});

test("empty response", async () => {
  // This is a weird scenario that Torn PDA will do if you make requests too quickly
  const empty: typeof gmRequest = vi.fn().mockResolvedValue(null);

  expect(await query_stats("a", [234, 567], empty)).toEqual({
    result: new Map(),
    blank: true,
  });
});

test("check_key success", async () => {
  const mockCheckSuccess = {
    key: "valid-key",
    is_registered: true,
    registered_at: 1768192400,
    last_used: 1768192410,
    policy_version: 1,
    policy_update_required: false,
    is_premium: true,
    premium_expires_at: 1768192500,
    faction_id: 12345,
    faction_premium_expires_at: 1768192500,
    premium_entitlement_source: "patreon",
  };

  const success: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders:
      "cache-control: no-cache, private\n\
x-ratelimit-reset-until: 55\n\
x-ratelimit-reset-timestamp: 1768192440\n\
x-ratelimit-limit: 120\n\
x-ratelimit-remaining: 118\n",
    readyState: 4,
    response: "",
    responseText: JSON.stringify(mockCheckSuccess),
    responseXML: null,
    status: 200,
    statusText: "",
    finalUrl: "",
    context: {},
  });

  expect(await check_key("valid-key", success)).toEqual({
    result: mockCheckSuccess,
    blank: false,
    limits: {
      rate_limit: 120,
      remaining: 118,
      reset_time: new Date("2026-01-12T04:34:00.000Z"),
      this_minute: 2,
    },
  });
});

test("check_key empty response", async () => {
  const empty: typeof gmRequest = vi.fn().mockResolvedValue(null);
  expect(await check_key("some-key", empty)).toEqual({
    blank: true,
  });
});

test("check_key error response", async () => {
  const error_with_code_2: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: JSON.stringify({
      code: 2,
      error: "Incorrect key format",
    }),
    responseXML: null,
    status: 400,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(check_key("bad-key", error_with_code_2)).rejects.toThrow(
    new FFApiError("API request failed. Error: Incorrect key format; Code: 2", {
      ff_api_error: {
        code: 2,
        error: "Incorrect key format",
      },
    }),
  );
});

test("success with premium insights and distribution data", async () => {
  const success: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders:
      "cache-control: no-cache, private\n\
      x-ratelimit-reset-until: 55\n\
x-ratelimit-reset-timestamp: 1768192440\n\
x-ratelimit-limit: 120\n\
x-ratelimit-remaining: 118\n",
    readyState: 4,
    response: "",
    responseText: JSON.stringify([
      {
        player_id: 234,
        fair_fight: 6.4,
        last_updated: 1328080860,
        bs_estimate: 234000,
        bs_estimate_human: "234k",
        bss_public: 2340,
        source: "bss",
        premium_insights_available: true,
        distribution: {
          last_updated: 1328080800,
          distribution_human: "STR: 30%, DEF: 40%",
          stats_percentage: {
            strength: 30,
            defense: 40,
          },
        },
      },
    ]),
    responseXML: null,
    status: 200,
    statusText: "",
    finalUrl: "",
    context: {},
  });

  expect(await query_stats("a", [234], success)).toEqual({
    result: new Map([
      [
        234,
        {
          no_data: false,
          player_id: 234,
          fair_fight: 6.4,
          last_updated: 1328080860,
          bs_estimate: 234000,
          bs_estimate_human: "234k",
          bss_public: 2340,
          source: "bss",
          premium_insights_available: true,
          distribution: {
            last_updated: 1328080800,
            distribution_human: "STR: 30%, DEF: 40%",
            stats_percentage: {
              strength: 30,
              speed: undefined,
              defense: 40,
              dexterity: undefined,
            },
          },
        },
      ],
    ]),
    blank: false,
    limits: {
      rate_limit: 120,
      remaining: 118,
      reset_time: new Date("2026-01-12T04:34:00.000Z"),
      this_minute: 2,
    },
  });
});

test("make_flights_url generates proper url", () => {
  expect(make_flights_url("test-key", 12345)).toEqual(
    "https://ffscouter.com/api/v1/player-flights?key=test-key&target=12345",
  );
});

test("query_flights success", async () => {
  const mockResponse = {
    player_id: 12345,
    current: {
      takeoff_time: 1710000000,
      status_description: "Traveling to Japan",
      earliest_arrival_time: 1710007200,
      latest_arrival_time: 1710010800,
      travel_method: "Airline",
      book_likely_being_used: true,
    },
    recent_flights: [
      {
        takeoff_time: 1709900000,
        status_description: "Traveling to China",
        earliest_arrival_time: 1709905000,
        latest_arrival_time: 1709909000,
        travel_method: "PI",
        book_likely_being_used: false,
        approx_landing_time: 1709912000,
      },
    ],
  };

  const success: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders:
      "x-ratelimit-reset-timestamp: 1768192440\n\
x-ratelimit-limit: 100\n\
x-ratelimit-remaining: 99\n",
    readyState: 4,
    response: "",
    responseText: JSON.stringify(mockResponse),
    responseXML: null,
    status: 200,
    statusText: "",
    finalUrl: "",
    context: {},
  });

  expect(await query_flights("test-key", 12345, success)).toEqual({
    result: mockResponse,
    blank: false,
    limits: {
      rate_limit: 100,
      remaining: 99,
      reset_time: new Date("2026-01-12T04:34:00.000Z"),
      this_minute: 1,
    },
  });
});

test("query_flights empty response", async () => {
  const empty: typeof gmRequest = vi.fn().mockResolvedValue(null);
  expect(await query_flights("test-key", 12345, empty)).toEqual({
    blank: true,
  });
});

test("query_flights handle errors", async () => {
  const error400: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: "error",
    responseXML: null,
    status: 400,
    statusText: "status error",
    finalUrl: "",
    context: {},
  });

  await expect(query_flights("test-key", 12345, error400)).rejects.toThrow(
    new FFApiError(
      "API request failed. Couldn't parse response. HTTP status code: 400",
    ),
  );

  const error_rate_limit: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: JSON.stringify({
      code: 20,
      error:
        "Rate limit exceeded. Maximum 100 requests per minute per account.",
      retry_after_seconds: 45,
    }),
    responseXML: null,
    status: 429,
    statusText: "Too Many Requests",
    finalUrl: "",
    context: {},
  });

  await expect(
    query_flights("test-key", 12345, error_rate_limit),
  ).rejects.toThrow(
    new FFApiError(
      "API request failed. Error: Rate limit exceeded. Maximum 100 requests per minute per account.; Code: 20",
      {
        ff_api_error: {
          code: 20,
          error:
            "Rate limit exceeded. Maximum 100 requests per minute per account.",
          retry_after_seconds: 45,
        } as any,
      },
    ),
  );
});

test("query_targets success with parameters", async () => {
  const mockTargetsResponse = {
    parameters: {
      key: "test-key",
      preset: null,
      minlevel: 20,
      maxlevel: 50,
      inactiveonly: 1,
      minff: 1.5,
      maxff: 2.5,
      limit: 25,
      factionless: 1,
      generated_at: 1640995200,
    },
    targets: [
      {
        player_id: 12345,
        name: "PlayerName",
        level: 25,
        fair_fight: 1.8,
        bss_public: 50000,
        bss_public_timestamp: 1640995000,
        bs_estimate: 6750000,
        bs_estimate_human: "6.75m",
        last_action: 1640994000,
        source: "bss",
      },
    ],
  };

  const success: typeof gmRequest = vi.fn().mockImplementation((options) => {
    const url = new URL(options.url);
    expect(url.searchParams.get("key")).toBe("test-key");
    expect(url.searchParams.get("minlevel")).toBe("20");
    expect(url.searchParams.get("maxlevel")).toBe("50");
    expect(url.searchParams.get("minff")).toBe("1.5");
    expect(url.searchParams.get("maxff")).toBe("2.5");
    expect(url.searchParams.get("inactiveonly")).toBe("1");
    expect(url.searchParams.get("factionless")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("25");

    return Promise.resolve({
      responseHeaders: "",
      readyState: 4,
      response: "",
      responseText: JSON.stringify(mockTargetsResponse),
      responseXML: null,
      status: 200,
      statusText: "OK",
      finalUrl: "",
      context: {},
    });
  });

  const result = await query_targets(
    "test-key",
    {
      minlevel: 20,
      maxlevel: 50,
      minff: 1.5,
      maxff: 2.5,
      inactiveonly: 1,
      factionless: 1,
      limit: 25,
    },
    success,
  );

  expect(result).toEqual(mockTargetsResponse);
});

test("query_targets empty response error", async () => {
  const empty: typeof gmRequest = vi.fn().mockResolvedValue(null);
  await expect(query_targets("test-key", {}, empty)).rejects.toThrow(
    "Empty response from get-targets",
  );
});

test("query_targets HTTP error response", async () => {
  const error400: typeof gmRequest = vi.fn().mockResolvedValue({
    responseHeaders: "",
    readyState: 4,
    response: "",
    responseText: JSON.stringify({ error: "Invalid preset" }),
    responseXML: null,
    status: 400,
    statusText: "Bad Request",
    finalUrl: "",
    context: {},
  });

  await expect(query_targets("test-key", {}, error400)).rejects.toThrow(
    "Invalid preset",
  );
});
