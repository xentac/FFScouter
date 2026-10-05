import {
  type BountyClaimCreateResponse,
  type BountyClaimTarget,
  type BountySellerBoardResponse,
  FFApiError,
  type FFError,
  query_bounty_seller_board,
  submit_bounty_seller_claim,
} from "./api";
import { FFCache } from "./ffcache";
import { type FFConfig, ffconfig } from "./ffconfig";
import { DB_NAME } from "./ffscouter";
import logger from "./logger";
import type { PlayerId, Timestamp } from "./types";

const log = logger.child("bounty-board");

// Freshness floor for the Bounty Board Cache: every bounty surface reads
// through this cache and a real board fetch happens only when the stored
// response is older than this, so navigating from the bounties page into an
// attack (even in a new tab) never double-fetches.
export const BOUNTY_BOARD_FRESHNESS_FLOOR_MS = 60 * 1000;

// The stored board is never served past the freshness floor; this expiry only
// bounds how long a stale board lingers in IndexedDB before clean_expired
// removes it.
export const BOUNTY_BOARD_EXPIRY_MS = 10 * 60 * 1000;

const BOARD_CACHE_KEY = "board";
const BOARD_FAILURE_KEY = "failure";

// Transient faults (5xx, unparseable body, PDA blank response, network
// errors) back off exponentially: 30s, 1m, 2m, 4m, capped at 8m. Coded 4xx
// failures are persistent *states* (consent not accepted, unregistered key)
// that flip when the user acts, so they stay at the flat 60s floor instead —
// a growing interval there would only delay noticing the flip.
const TRANSIENT_RETRY_BASE_MS = 30 * 1000;
const TRANSIENT_RETRY_CAP_MS = 8 * 60 * 1000;

// How long a failure record outlives its retry window. The next transient
// failure reads fail_count from it to escalate the backoff, so it must survive
// gaps between consults (e.g. the user away from the bounties page) longer
// than any single retry window.
const FAILURE_RECORD_LINGER_MS = 60 * 60 * 1000;

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
 * The single IndexedDB-persisted cache of the seller board response, shared
 * across page loads. Claim submission never goes through this cache — the
 * claim POST is authoritative and never waits on freshness.
 */
export class BountyBoardCache {
  private config: FFConfig;
  private cache: FFCache;
  private query: typeof query_bounty_seller_board;
  private submit: typeof submit_bounty_seller_claim;
  private inflight: Promise<BountySellerBoardResponse> | null = null;

  constructor(
    config: FFConfig,
    cache: FFCache = new FFCache(DB_NAME),
    query: typeof query_bounty_seller_board = query_bounty_seller_board,
    submit: typeof submit_bounty_seller_claim = submit_bounty_seller_claim,
  ) {
    this.config = config;
    this.cache = cache;
    this.query = query;
    this.submit = submit;
  }

  // IndexedDB faults are logged and treated as a cache miss (or a dropped
  // write), never surfaced: the board fetch itself still works without them.
  private read = async <T>(
    key: string,
  ): Promise<{ value: T; expiry: Timestamp } | null> => {
    try {
      return await this.cache.get_bounty_board<T>(key);
    } catch (err) {
      log.error(`Failed to read bounty board cache '${key}'`, err);
      return null;
    }
  };

  private write = async <T>(
    key: string,
    value: T,
    expiry: Timestamp,
  ): Promise<void> => {
    try {
      await this.cache.put_bounty_board(key, value, expiry);
    } catch (err) {
      log.error(`Failed to write bounty board cache '${key}'`, err);
    }
  };

  private remove = async (key: string): Promise<void> => {
    try {
      await this.cache.delete_bounty_board(key);
    } catch (err) {
      log.error(`Failed to delete bounty board cache '${key}'`, err);
    }
  };

  // Read-through access: serves the stored response while it is younger than
  // the freshness floor, otherwise fetches and persists a fresh one. A
  // remembered failure inside its retry window is rethrown without a fetch,
  // so persistent error states and outages don't get hammered once per
  // consult — but callers still see the error every time to branch on it.
  // The whole lookup is shared in-flight (not just the fetch): the storage
  // reads are async, so concurrent callers would otherwise all miss and
  // fetch.
  get_board = async (): Promise<BountySellerBoardResponse> => {
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.load_board();
    try {
      return await this.inflight;
    } finally {
      this.inflight = null;
    }
  };

  private load_board = async (): Promise<BountySellerBoardResponse> => {
    const cached = (await this.read<CachedBoard>(BOARD_CACHE_KEY))?.value;
    if (
      cached &&
      Date.now() - cached.fetched_at < BOUNTY_BOARD_FRESHNESS_FLOOR_MS
    ) {
      return cached.response;
    }

    const failure = (await this.read<CachedBoardFailure>(BOARD_FAILURE_KEY))
      ?.value;
    if (failure && Date.now() < failure.next_retry_at) {
      throw rebuild_failure_error(failure);
    }

    return this.fetch_board();
  };

  // Submit a claim through the cache. The POST is authoritative and never
  // waits on freshness or the failure retry window; errors propagate to the
  // caller (a 409 means exhausted or raced — reported honestly) and never
  // create a board backoff window. On success the response's claims block —
  // the authoritative current state, given to us for free — is folded into
  // the cached board entry.
  submit_claim = async (
    target?: BountyClaimTarget | null,
    referrer_player_id?: PlayerId,
  ): Promise<BountyClaimCreateResponse> => {
    if (!this.config.key) {
      throw new Error("No API key configured");
    }
    const resp = await this.submit(this.config.key, target, referrer_player_id);
    if (resp.blank) {
      throw new Error("Empty bounty claim response");
    }

    // fetched_at and the expiry are deliberately kept: board targets don't
    // change at claim time (tiers deplete at credit time), so the claim must
    // not extend the board's freshness window.
    const cached = await this.read<CachedBoard>(BOARD_CACHE_KEY);
    if (cached) {
      await this.write<CachedBoard>(
        BOARD_CACHE_KEY,
        {
          response: {
            board: cached.value.response.board,
            claims: resp.result.claims,
          },
          fetched_at: cached.value.fetched_at,
        },
        cached.expiry,
      );
    }
    // A successful seller call disproves any remembered board failure
    // (e.g. consent accepted since the 403 was cached)
    await this.remove(BOARD_FAILURE_KEY);
    return resp.result;
  };

  // Consent is accepted outside this cache (accept_bounty_seller_policy), so
  // expose an explicit hook to drop the remembered failure; without it
  // get_board() would keep rethrowing the stale code-86 403 until
  // next_retry_at even though consent has just been granted.
  clear_failure = (): Promise<void> => {
    return this.remove(BOARD_FAILURE_KEY);
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
      const now = Date.now();
      await this.write<CachedBoard>(
        BOARD_CACHE_KEY,
        { response: resp.result, fetched_at: now },
        now + BOUNTY_BOARD_EXPIRY_MS,
      );
      await this.remove(BOARD_FAILURE_KEY);
      return resp.result;
    } catch (err) {
      await this.record_failure(err);
      throw err;
    }
  };

  private record_failure = async (err: unknown) => {
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
      const prev = (await this.read<CachedBoardFailure>(BOARD_FAILURE_KEY))
        ?.value;
      fail_count = (prev?.transient ? prev.fail_count : 0) + 1;
      retry_delay = Math.min(
        TRANSIENT_RETRY_BASE_MS * 2 ** (fail_count - 1),
        TRANSIENT_RETRY_CAP_MS,
      );
    }

    const next_retry_at = Date.now() + retry_delay;
    await this.write<CachedBoardFailure>(
      BOARD_FAILURE_KEY,
      {
        message: err instanceof Error ? err.message : String(err),
        ff_api_error: coded,
        transient: !rate_limited && !persistent,
        fail_count,
        next_retry_at,
      },
      next_retry_at + FAILURE_RECORD_LINGER_MS,
    );
  };
}

export const bounty_board_cache = new BountyBoardCache(ffconfig);
