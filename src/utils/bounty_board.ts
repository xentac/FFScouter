import {
  type BountySellerBoardResponse,
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

type CachedBoard = {
  response: BountySellerBoardResponse;
  // When the response was fetched; compared against Date.now(), never the Torn clock
  fetched_at: Timestamp;
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
  // the freshness floor, otherwise fetches and persists a fresh one.
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
    if (!this.config.key) {
      throw new Error("No API key configured");
    }
    const resp = await this.query(this.config.key);
    if (resp.blank) {
      throw new Error("Empty bounty board response");
    }
    this.storage.set<CachedBoard>(BOARD_CACHE_KEY, {
      response: resp.result,
      fetched_at: Date.now(),
    });
    return resp.result;
  };
}

export const bounty_board_cache = new BountyBoardCache(ffconfig);
