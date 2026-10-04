// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  CLAIM_CREATE_RESPONSE,
  ERROR_CONSENT_REQUIRED,
  ERROR_NO_OPEN_BOUNTIES,
  SELLER_BOARD_RESPONSE,
} from "./__fixtures__/bounty_board";
import {
  FFApiError,
  type query_bounty_seller_board,
  type submit_bounty_seller_claim,
} from "./api";
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
  // Once the failure's retry window passes, the next call fetches again
  vi.advanceTimersByTime(31_000);
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

  // Past the failure's retry window, refresh fetches for real
  vi.advanceTimersByTime(31_000);
  await cache.refresh();
  expect(query).toHaveBeenCalledTimes(2);
  // The warmed cache serves a later page load without another fetch
  expect(await make_page_load(query).get_board()).toEqual(
    SELLER_BOARD_RESPONSE,
  );
  expect(query).toHaveBeenCalledTimes(2);
});

const consent_error = () =>
  new FFApiError(
    `API request failed. Error: ${ERROR_CONSENT_REQUIRED.error}; Code: 86`,
    { ff_api_error: ERROR_CONSENT_REQUIRED, ff_http_status: 403 },
  );

const server_error = (status: number) =>
  new FFApiError(`API request failed. HTTP status code: ${status}`, {
    ff_http_status: status,
  });

// Resolve to the thrown error (or the board) so tests can assert without
// try/catch noise.
const consult = (query: typeof query_bounty_seller_board) =>
  make_page_load(query)
    .get_board()
    .then(
      (board) => board,
      (err) => err,
    );

test("a coded 4xx failure is remembered for the floor across page loads", async () => {
  set_key();
  const query = vi.fn().mockRejectedValue(consent_error());

  const first = await consult(query);
  expect(first).toBeInstanceOf(FFApiError);
  expect(query).toHaveBeenCalledTimes(1);

  // Within the floor, every consult — including a new page load — gets the
  // remembered error, still carrying the code the consent UI branches on
  vi.advanceTimersByTime(59_000);
  const remembered = await consult(query);
  expect(remembered).toBeInstanceOf(FFApiError);
  expect((remembered as FFApiError).ff_api_error).toEqual(
    ERROR_CONSENT_REQUIRED,
  );
  expect(query).toHaveBeenCalledTimes(1);

  // After the floor, exactly one real fetch happens
  vi.advanceTimersByTime(2_000);
  await consult(query);
  expect(query).toHaveBeenCalledTimes(2);
});

test("clear_failure drops the remembered failure so the next get_board fetches", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(consent_error())
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  const first = await consult(query);
  expect(first).toBeInstanceOf(FFApiError);
  expect(query).toHaveBeenCalledTimes(1);

  // Still inside the retry window: without clearing, this would rethrow
  // the remembered code-86 without fetching.
  vi.advanceTimersByTime(1_000);
  make_page_load(query).clear_failure();

  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(2);
});

test("a 429 failure honors retry_after_seconds when longer than the floor", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(
      new FFApiError("API request failed. Error: throttled; Code: 21", {
        ff_api_error: {
          code: 21,
          error: "Rate limit exceeded. Please retry shortly.",
          retry_after_seconds: 120,
        },
        ff_http_status: 429,
      }),
    )
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  await consult(query);
  vi.advanceTimersByTime(119_000);
  const remembered = await consult(query);
  expect((remembered as FFApiError).ff_api_error?.code).toBe(21);
  expect(query).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(2_000);
  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(2);
});

test("transient failures back off exponentially from 30s", async () => {
  set_key();
  const query = vi
    .fn()
    .mockImplementation(() => Promise.reject(server_error(502)));

  await consult(query); // failure 1 → retry in 30s
  expect(query).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(29_000);
  await consult(query); // blocked
  expect(query).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(2_000);
  await consult(query); // failure 2 → retry in 60s
  expect(query).toHaveBeenCalledTimes(2);

  vi.advanceTimersByTime(59_000);
  await consult(query); // blocked
  expect(query).toHaveBeenCalledTimes(2);

  vi.advanceTimersByTime(2_000);
  await consult(query); // failure 3 → retry in 120s
  expect(query).toHaveBeenCalledTimes(3);

  vi.advanceTimersByTime(119_000);
  await consult(query); // blocked
  expect(query).toHaveBeenCalledTimes(3);
});

test("transient backoff is capped at 8 minutes", async () => {
  set_key();
  const query = vi
    .fn()
    .mockImplementation(() => Promise.reject(server_error(503)));

  // Drive the counter well past where the cap kicks in
  for (let i = 0; i < 8; i++) {
    await consult(query);
    vi.advanceTimersByTime(9 * 60_000);
  }
  await consult(query); // 9th failure → capped window
  expect(query).toHaveBeenCalledTimes(9);

  vi.advanceTimersByTime(8 * 60_000 - 1_000);
  await consult(query); // blocked within the cap
  expect(query).toHaveBeenCalledTimes(9);

  vi.advanceTimersByTime(2_000);
  await consult(query);
  expect(query).toHaveBeenCalledTimes(10);
});

test("a blank (PDA empty) response is a transient failure with backoff", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValueOnce({ blank: true })
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  await expect(make_page_load(query).get_board()).rejects.toThrow(
    /Empty bounty board/,
  );
  await expect(make_page_load(query).get_board()).rejects.toThrow(
    /Empty bounty board/,
  );
  expect(query).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(31_000);
  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(2);
});

test("a success clears the failure record and resets the backoff", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(server_error(500))
    .mockRejectedValueOnce(server_error(500))
    .mockResolvedValueOnce({ result: SELLER_BOARD_RESPONSE, blank: false })
    .mockRejectedValueOnce(server_error(500))
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  await consult(query); // failure 1 (30s)
  vi.advanceTimersByTime(31_000);
  await consult(query); // failure 2 (60s)
  vi.advanceTimersByTime(61_000);
  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(3);

  // After the freshness floor, the next failure starts a fresh 30s window
  // instead of continuing the earlier progression
  vi.advanceTimersByTime(61_000);
  await consult(query); // failure, count restarts at 1
  expect(query).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(29_000);
  await consult(query); // blocked
  expect(query).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(2_000);
  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(5);
});

test("a coded failure does not inherit the transient backoff count", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(server_error(502))
    .mockRejectedValueOnce(server_error(502))
    .mockRejectedValueOnce(consent_error())
    .mockRejectedValueOnce(server_error(502))
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });

  await consult(query); // transient 1 (30s)
  vi.advanceTimersByTime(31_000);
  await consult(query); // transient 2 (60s)
  vi.advanceTimersByTime(61_000);
  await consult(query); // coded → flat 60s window
  expect(query).toHaveBeenCalledTimes(3);

  // 61s later the coded window has passed; a continued transient progression
  // (120s) would still be blocked here
  vi.advanceTimersByTime(61_000);
  await consult(query); // transient again, count restarted → 30s
  expect(query).toHaveBeenCalledTimes(4);
  vi.advanceTimersByTime(31_000);
  expect(await consult(query)).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(5);
});

test("the missing-key error is not cached as a failure", async () => {
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const cache = make_page_load(query);

  await expect(cache.get_board()).rejects.toThrow();
  expect(query).not.toHaveBeenCalled();

  // Configuring a key makes the very next consult fetch — no backoff window
  set_key();
  expect(await cache.get_board()).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(1);
});

const make_page_load_with_submit = (
  query: typeof query_bounty_seller_board,
  submit: typeof submit_bounty_seller_claim,
) => {
  const config = new FFConfig(TEST_PREFIX);
  return new BountyBoardCache(config, new Storage(TEST_PREFIX), query, submit);
};

test("submit_claim folds the response claims into the cached board", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const submit = vi
    .fn()
    .mockResolvedValue({ result: CLAIM_CREATE_RESPONSE, blank: false });
  const cache = make_page_load_with_submit(query, submit);

  await cache.get_board();
  expect(await cache.submit_claim({ target_player_id: 267456763 })).toEqual(
    CLAIM_CREATE_RESPONSE,
  );
  expect(submit).toHaveBeenCalledExactlyOnceWith(
    "test-key",
    { target_player_id: 267456763 },
    undefined,
  );

  // A later page load inside the freshness window serves the merged state
  // with no extra fetch: fresh claims, unchanged board
  const board = await make_page_load(query).get_board();
  expect(board.claims).toEqual(CLAIM_CREATE_RESPONSE.claims);
  expect(board.board).toEqual(SELLER_BOARD_RESPONSE.board);
  expect(query).toHaveBeenCalledTimes(1);
});

test("submit_claim does not extend the board freshness window", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const submit = vi
    .fn()
    .mockResolvedValue({ result: CLAIM_CREATE_RESPONSE, blank: false });
  const cache = make_page_load_with_submit(query, submit);

  await cache.get_board();
  vi.advanceTimersByTime(45_000);
  await cache.submit_claim({ target_player_id: 267456763 });

  // 61s after the board fetch (16s after the claim) the board is stale
  vi.advanceTimersByTime(16_000);
  await cache.get_board();
  expect(query).toHaveBeenCalledTimes(2);
});

test("submit_claim without a cached board records nothing", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const submit = vi
    .fn()
    .mockResolvedValue({ result: CLAIM_CREATE_RESPONSE, blank: false });
  const cache = make_page_load_with_submit(query, submit);

  expect(await cache.submit_claim({ target_faction_id: 6731 })).toEqual(
    CLAIM_CREATE_RESPONSE,
  );
  // The next board consult still needs a real fetch
  expect(await cache.get_board()).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(1);
});

test("submit_claim posts despite a remembered board failure and clears it on success", async () => {
  set_key();
  const query = vi
    .fn()
    .mockRejectedValueOnce(consent_error())
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const submit = vi
    .fn()
    .mockResolvedValue({ result: CLAIM_CREATE_RESPONSE, blank: false });
  const cache = make_page_load_with_submit(query, submit);

  await expect(cache.get_board()).rejects.toThrow();
  // The claim POST is authoritative — it goes out even inside the board's
  // retry window
  expect(await cache.submit_claim({ target_player_id: 267456763 })).toEqual(
    CLAIM_CREATE_RESPONSE,
  );
  // Its success disproves the remembered failure: the board refetches
  // immediately instead of waiting out the window
  expect(await cache.get_board()).toEqual(SELLER_BOARD_RESPONSE);
  expect(query).toHaveBeenCalledTimes(2);
});

test("a failed submit_claim leaves the cached board and retry state untouched", async () => {
  set_key();
  const query = vi
    .fn()
    .mockResolvedValue({ result: SELLER_BOARD_RESPONSE, blank: false });
  const submit = vi
    .fn()
    .mockRejectedValue(
      new FFApiError(
        "API request failed. Error: No open bounties available.; Code: 91",
        { ff_api_error: ERROR_NO_OPEN_BOUNTIES, ff_http_status: 409 },
      ),
    );
  const cache = make_page_load_with_submit(query, submit);

  await cache.get_board();
  await expect(
    cache.submit_claim({ target_player_id: 267456763 }),
  ).rejects.toThrow(/Code: 91/);

  // Cached board still served untouched, and no board backoff window exists
  expect((await cache.get_board()).claims).toEqual(
    SELLER_BOARD_RESPONSE.claims,
  );
  expect(query).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(61_000);
  await cache.get_board();
  expect(query).toHaveBeenCalledTimes(2);
});

test("submit_claim treats a blank (PDA empty) response as an error", async () => {
  set_key();
  const submit = vi.fn().mockResolvedValue({ blank: true });
  const cache = make_page_load_with_submit(vi.fn() as never, submit);

  await expect(cache.submit_claim({ target_player_id: 1 })).rejects.toThrow(
    /Empty/,
  );
});

test("submit_claim without a configured key throws without posting", async () => {
  const submit = vi.fn();
  const cache = make_page_load_with_submit(vi.fn() as never, submit as never);

  await expect(cache.submit_claim({ target_player_id: 1 })).rejects.toThrow();
  expect(submit).not.toHaveBeenCalled();
});
