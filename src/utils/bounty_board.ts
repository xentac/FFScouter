import {
  type BountySellerBoardResponse,
  FFApiError,
  type FFError,
  query_bounty_seller_board,
} from "./api";
import { type FFConfig, ffconfig } from "./ffconfig";
import logger from "./logger";
import default_storage, { type Storage } from "./storage";
import type { Timestamp } from "./types";

const log = logger.child("bounty-board");

// Freshness floor for the Bounty Board Cache: every bounty surface reads
// through this cache and a real board fetch happens only when the stored
// response is older than this, so navigating from the bounties page into an
// attack (even in a new tab) never double-fetches.
export const BOUNTY_BOARD_FRESHNESS_FLOOR_MS = 60 * 1000;

const BOARD_CACHE_KEY = "bounty_board";
const BOARD_FAILURE_KEY = "bounty_board_failure";

// Transient faults (5xx, unparseable body, PDA blank response, network
// errors) back off exponentially: 30s, 1m, 2m, 4m, capped at 8m. Coded 4xx
// failures are persistent *states* (consent not accepted, unregistered key)
// that flip when the user acts, so they stay at the flat 60s floor instead —
// a growing interval there would only delay noticing the flip.
const TRANSIENT_RETRY_BASE_MS = 30 * 1000;
const TRANSIENT_RETRY_CAP_MS = 8 * 60 * 1000;

type CachedBoard = {
  response: BountySellerBoardResponse;
  // When the response was fetched; compared against Date.now(), never the Torn clock
  fetched_at: Timestamp;
};

// Failures are cached as plain data and the error is rebuilt on read — an
// FFApiError instance would lose its prototype through the JSON round-trip
// (the same class trap ADR 0005 documents for structured clones).
type CachedBoardFailure = {
  message: string;
  ff_api_error?: FFError;
  // true for the transient class; the backoff counter only escalates there
  transient: boolean;
  fail_count: number;
  next_retry_at: Timestamp;
};

const rebuild_failure_error = (failure: CachedBoardFailure): Error => {
  return failure.ff_api_error
    ? new FFApiError(failure.message, { ff_api_error: failure.ff_api_error })
    : new Error(failure.message);
};

/**
 * The single storage-persisted cache of the seller board response, shared
 * across page loads. Claim submission never goes through this cache — the
 * claim POST is authoritative and never waits on freshness.
 */
export class BountyBoardCache {
  private config: FFConfig;
  private storage: Storage;
  private query: typeof query_bounty_seller_board;
  private inflight: Promise<BountySellerBoardResponse> | null = null;

  constructor(
    config: FFConfig,
    storage: Storage = default_storage,
    query: typeof query_bounty_seller_board = query_bounty_seller_board,
  ) {
    this.config = config;
    this.storage = storage;
    this.query = query;
  }

  // Read-through access: serves the stored response while it is younger than
  // the freshness floor, otherwise fetches and persists a fresh one. A
  // remembered failure inside its retry window is rethrown without a fetch,
  // so persistent error states and outages don't get hammered once per
  // consult — but callers still see the error every time to branch on it.
  get_board = async (): Promise<BountySellerBoardResponse> => {
    const cached = this.storage.get<CachedBoard>(BOARD_CACHE_KEY);
    if (
      cached &&
      Date.now() - cached.fetched_at < BOUNTY_BOARD_FRESHNESS_FLOOR_MS
    ) {
      return cached.response;
    }

    if (this.inflight) {
      return this.inflight;
    }

    const failure = this.storage.get<CachedBoardFailure>(BOARD_FAILURE_KEY);
    if (failure && Date.now() < failure.next_retry_at) {
      throw rebuild_failure_error(failure);
    }

    this.inflight = this.fetch_board();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  };

  // Explicit refresh hook for surfaces that want to warm the cache without
  // consuming the board (attack-page open, Start/Join Attack clicks). Same
  // freshness floor as get_board; failures are logged, never thrown.
  refresh = async (): Promise<void> => {
    try {
      await this.get_board();
    } catch (err) {
      log.error("Bounty board refresh failed", err);
    }
  };

  private fetch_board = async (): Promise<BountySellerBoardResponse> => {
    // A missing key is a local precondition, not a request outcome — never
    // recorded as a failure, so setting a key takes effect immediately.
    if (!this.config.key) {
      throw new Error("No API key configured");
    }
    try {
      const resp = await this.query(this.config.key);
      if (resp.blank) {
        throw new Error("Empty bounty board response");
      }
      this.storage.set<CachedBoard>(BOARD_CACHE_KEY, {
        response: resp.result,
        fetched_at: Date.now(),
      });
      this.storage.remove(BOARD_FAILURE_KEY);
      return resp.result;
    } catch (err) {
      this.record_failure(err);
      throw err;
    }
  };

  private record_failure = (err: unknown) => {
    const api_error = err instanceof FFApiError ? err : null;
    const coded = api_error?.ff_api_error;
    const status = api_error?.ff_http_status;

    const rate_limited = coded?.code === 21;
    // A coded non-5xx error is a persistent state; everything else (5xx even
    // with a code — e.g. 503 code 88 "try again shortly" — unparseable
    // bodies, blank responses, network throws) is a transient fault.
    const persistent =
      !rate_limited &&
      coded !== undefined &&
      (status === undefined || status < 500);

    let fail_count = 0;
    let retry_delay: number;
    if (rate_limited) {
      retry_delay = Math.max(
        BOUNTY_BOARD_FRESHNESS_FLOOR_MS,
        (coded?.retry_after_seconds ?? 0) * 1000,
      );
    } else if (persistent) {
      retry_delay = BOUNTY_BOARD_FRESHNESS_FLOOR_MS;
    } else {
      const prev = this.storage.get<CachedBoardFailure>(BOARD_FAILURE_KEY);
      fail_count = (prev?.transient ? prev.fail_count : 0) + 1;
      retry_delay = Math.min(
        TRANSIENT_RETRY_BASE_MS * 2 ** (fail_count - 1),
        TRANSIENT_RETRY_CAP_MS,
      );
    }

    this.storage.set<CachedBoardFailure>(BOARD_FAILURE_KEY, {
      message: err instanceof Error ? err.message : String(err),
      ff_api_error: coded,
      transient: !rate_limited && !persistent,
      fail_count,
      next_retry_at: Date.now() + retry_delay,
    });
  };
}

export const bounty_board_cache = new BountyBoardCache(ffconfig);
