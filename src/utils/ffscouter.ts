import {
  type FFApiError,
  type FFApiFlightsResponse,
  type FFApiQueryResponse,
  type FFApiRateLimits,
  query_flights,
  query_stats,
} from "./api";
import { check_key_status } from "./check_key";
import { FFCache } from "./ffcache";
import { type FFConfig, ffconfig } from "./ffconfig";
import logger from "./logger";
import type {
  AggregateAnalyticsRow,
  AnalyticsEntry,
  CachedFlightData,
  FFData,
  PlayerFlightsResponse,
  PlayerId,
} from "./types";

const log = logger.child("api");

const DB_NAME = "FFSV3-cache";

const RECHECK_RETRY_DELAY = 60 * 1000; // 60 seconds (1 minute)
const RECHECK_WINDOW_DURATION = 3 * 60 * 1000; // 3 minutes
const FINALIZED_NO_FLIGHT_TTL = 30 * 60 * 1000; // 30 minutes

type Job<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  api_attempts: number;
};

export class FFScouter {
  private config: FFConfig;

  private cache: FFCache = new FFCache(DB_NAME);

  private pending = new Map<PlayerId, Job<FFData>>();

  private cache_queue = new Set<PlayerId>();
  private cache_delay = 10;
  private cache_timer: ReturnType<typeof setTimeout> | null = null;

  private api_queue = new Set<PlayerId>();
  private api_max_batch_size = 200;
  private api_initial_delay = 100;
  private api_default_delay = 1000;
  private api_timer: ReturnType<typeof setTimeout> | null = null;
  private api_attempts = 5;

  constructor(config: FFConfig, cache?: FFCache) {
    this.config = config;

    if (cache) {
      this.cache = cache;
    }
  }

  schedule = (fn: () => void, delay: number) => {
    return setTimeout(fn, delay);
  };

  clear = (timer: ReturnType<typeof setTimeout> | null | undefined) => {
    if (timer) {
      clearTimeout(timer);
    }
  };

  // Queue request to get estimate from cache or api, batching both types of requests
  get = (player_id: PlayerId): Promise<FFData> => {
    // If a request is already in the queue, return the Promise to the calling
    const p = this.pending.get(player_id);
    if (p) {
      return p.promise;
    }

    let resolve!: (v: FFData) => void;
    let reject!: (e: unknown) => void;

    const promise = new Promise<FFData>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    this.pending.set(player_id, { promise, resolve, reject, api_attempts: 0 });

    // Schedule cache lookup
    this.enqueue_cache(player_id);

    return promise;
  };

  clear_flight_cache = async (player_id: PlayerId): Promise<void> => {
    try {
      await this.cache.delete_flight(player_id);
    } catch (err) {
      log.error("Failed to delete flight from cache", err);
    }
  };

  private calculate_flight_cache_ttl = (
    result: PlayerFlightsResponse,
  ): number => {
    if (result.current) {
      const now = Date.now();
      const latest_arrival_time_ms = result.current.latest_arrival_time * 1000;
      const time_remaining = latest_arrival_time_ms - now;
      if (time_remaining > 0) {
        const segment = Math.floor(time_remaining / 3);
        const min_ttl = 60 * 1000; // 1 minute minimum
        const max_ttl = 30 * 60 * 1000; // 30 minutes maximum cap
        return Math.max(min_ttl, Math.min(segment, max_ttl));
      }
    }
    return FINALIZED_NO_FLIGHT_TTL;
  };

  // Get flights for a player, utilizing cache, bypassing batch queueing
  get_flights = async (player_id: PlayerId): Promise<PlayerFlightsResponse> => {
    log.debug(`get_flights called for ${player_id}`);

    // Check cache
    let cached: CachedFlightData | null = null;
    try {
      cached = await this.cache.get_flight(player_id);
    } catch (err) {
      log.error("Failed to query flight cache", err);
    }

    if (cached) {
      log.debug(`Flight cache hit for player ${player_id}`);
      if (cached.rechecking) {
        const now = Date.now();
        // If we exceeded the rechecking window, finalize as no-flight
        if (cached.recheck_until && now >= cached.recheck_until) {
          log.debug(
            `Rechecking window expired for player ${player_id}. Finalizing no data.`,
          );
          const final_response: PlayerFlightsResponse = {
            player_id: cached.player_id,
            current: null,
            recent_flights: cached.recent_flights,
            rechecking: false,
          };
          try {
            await this.cache.update_flight(
              final_response,
              FINALIZED_NO_FLIGHT_TTL,
            );
          } catch (err) {
            log.error("Failed to finalize flight cache", err);
          }
          return final_response;
        }

        // If it's time to retry the API call
        if (cached.next_retry_at && now >= cached.next_retry_at) {
          log.debug(
            `Retrying API call for player ${player_id} during recheck window`,
          );
          let response: FFApiFlightsResponse;
          try {
            response = await query_flights(this.config.key, player_id);
          } catch (err) {
            log.error(
              `Received error response querying ffscouter player-flights API for ${player_id}:`,
              err,
            );
            throw err;
          }

          if (response.blank) {
            throw new Error(
              `Empty flight response returned for player ${player_id}`,
            );
          }

          if (response.result.current) {
            log.debug(
              `Flight successfully tracked for player ${player_id} on retry.`,
            );
            // Update cache with dynamic TTL
            try {
              const ttl = this.calculate_flight_cache_ttl(response.result);
              await this.cache.update_flight(response.result, ttl);
            } catch (err) {
              log.error("Failed to update flight cache", err);
            }
            return response.result;
          }

          log.debug(
            `Player ${player_id} still has no flight. Scheduling next retry.`,
          );
          const next_retry_at = Date.now() + RECHECK_RETRY_DELAY;
          const updated_response: PlayerFlightsResponse = {
            player_id: cached.player_id,
            current: null,
            recent_flights: response.result.recent_flights,
            rechecking: true,
            next_retry_at,
            recheck_until: cached.recheck_until,
          };
          const remaining_ttl = Math.max(
            0,
            (cached.recheck_until ?? now) - Date.now(),
          );
          try {
            await this.cache.update_flight(updated_response, remaining_ttl);
          } catch (err) {
            log.error("Failed to update flight cache during recheck", err);
          }
          return updated_response;
        }

        // Return the cached rechecking status if it's not time to retry yet
        return {
          player_id: cached.player_id,
          current: cached.current,
          recent_flights: cached.recent_flights,
          rechecking: true,
          next_retry_at: cached.next_retry_at,
          recheck_until: cached.recheck_until,
        };
      }

      // If not rechecking, just return the cached data
      return {
        player_id: cached.player_id,
        current: cached.current,
        recent_flights: cached.recent_flights,
      };
    }

    log.debug(`Flight cache miss for player ${player_id}. Querying API.`);

    // Query API
    let response: FFApiFlightsResponse;
    try {
      response = await query_flights(this.config.key, player_id);
    } catch (err) {
      log.error(
        `Received error response querying ffscouter player-flights API for ${player_id}:`,
        err,
      );
      throw err;
    }

    if (response.blank) {
      throw new Error(`Empty flight response returned for player ${player_id}`);
    }

    if (response.result.current) {
      // Update cache with dynamic TTL
      try {
        const ttl = this.calculate_flight_cache_ttl(response.result);
        await this.cache.update_flight(response.result, ttl);
      } catch (err) {
        log.error("Failed to update flight cache", err);
      }
    } else {
      // Start the rechecking cycle
      log.debug(`Start rechecking cycle for player ${player_id}`);
      const now = Date.now();
      const next_retry_at = now + RECHECK_RETRY_DELAY;
      const recheck_until = now + RECHECK_WINDOW_DURATION;
      const rechecking_response: PlayerFlightsResponse = {
        player_id: response.result.player_id,
        current: null,
        recent_flights: response.result.recent_flights,
        rechecking: true,
        next_retry_at,
        recheck_until,
      };
      try {
        await this.cache.update_flight(
          rechecking_response,
          RECHECK_WINDOW_DURATION,
        );
      } catch (err) {
        log.error("Failed to update flight cache", err);
      }
      response = { result: rechecking_response, blank: false };
    }

    // Clean expired cache entries
    try {
      await this.cache.clean_expired();
    } catch (err) {
      log.error("Failed to clean expired cache entries", err);
    }

    return response.result;
  };

  // Tell the batch engine that the list of requests is complete for now so start processing
  // NOTE: Processing may have started earlier for some elements if queuing took longer than processing intervals
  complete = () => {
    this.process_cache();
  };

  enqueue_cache = (player_id: PlayerId) => {
    log.debug(`Enqueuing cache ${player_id}`);
    this.cache_queue.add(player_id);

    this.schedule_cache();
  };

  schedule_cache = () => {
    if (this.cache_timer) {
      log.debug(`schedule_cache called but job already scheduled`);
      return;
    }
    log.debug(
      `schedule_cache called and job scheduled for ${this.cache_delay} ms`,
    );
    this.cache_timer = this.schedule(this.process_cache, this.cache_delay);
  };

  process_cache = async () => {
    if (this.cache_timer) {
      this.clear(this.cache_timer);
      this.cache_timer = null;
    }

    const ids = Array.from(this.cache_queue);
    this.cache_queue.clear();

    if (ids.length <= 0) {
      return;
    }

    let results: Map<PlayerId, FFData | null>;
    try {
      results = await this.cache.get(ids);
    } catch (_) {
      // Cache failure is usually non-fatal; fall through to API
      results = new Map();
    }
    log.debug("Received results", results);

    for (const id of ids) {
      const v = results.get(id);
      if (v) {
        log.debug("Id", id, "found in cache. Resolving value.");
        this.resolve(id, v);
      } else {
        log.debug("Id", id, "not found in cache. Scheduling api call.");
        this.enqueue_api(id);
      }
    }
  };

  clear_cache = () => {
    this.cache.delete_db();
    check_key_status.clear();
  };

  enqueue_api = (player_id: PlayerId) => {
    log.debug(`Enqueuing api ${player_id}`);
    this.api_queue.add(player_id);

    this.schedule_api();
  };

  schedule_api = (delay = this.api_initial_delay) => {
    if (this.api_timer) {
      log.debug(`schedule_api called but job already scheduled`);
      return;
    }
    log.debug(`schedule_api called and job scheduled for ${delay} ms`);
    this.api_timer = this.schedule(this.process_api, delay);
  };

  process_api = async () => {
    log.debug("process_api called");
    if (this.api_timer) {
      this.clear(this.api_timer);
      this.api_timer = null;
    }

    let ids = Array.from(this.api_queue);
    if (ids.length > this.api_max_batch_size) {
      ids = ids.slice(0, this.api_max_batch_size);
    }
    for (const id of ids) {
      this.api_queue.delete(id);
    }
    log.debug(`Processing ${ids} api requests`);

    if (ids.length <= 0) {
      log.debug("No ids found to query");
      return;
    }

    let next_run: number | undefined = this.api_default_delay;
    let results: FFApiQueryResponse;
    try {
      log.debug("Calling query_stats with", this.config.key, ",", ids);
      results = await query_stats(this.config.key, ids);
    } catch (err) {
      log.error("Received error response querying ffscouter api:", err);
      for (const id of ids) {
        this.reject(id, err);
      }

      const ff_error = err as FFApiError;
      results = {
        result: new Map(),
        blank: true,
        limits: ff_error.ff_api_limits,
      };
    }
    log.debug("Received results", results);

    // This is the case where we made too many requests close in time and Torn PDA returned nothing
    if (results.blank) {
      for (const id of ids) {
        this.requeue_api(id);
      }
    } else {
      await this.cache.update(Array.from(results.result.values()));
      for (const id of ids) {
        const v = results.result.get(id);
        if (v) {
          log.debug("Id", id, "found in results. Resolving value.");
          this.resolve(id, v);
        } else {
          log.debug("Id", id, "not found in results. Resolving no_data.");
          this.resolve(id, { player_id: id, no_data: true });
        }
      }
    }

    if (results.limits) {
      next_run = this.calculate_next_api_run(results.limits);
    }

    this.schedule_api(next_run);

    // At the end of every queue processing, clean expired stats
    await this.cache.clean_expired();
  };

  calculate_next_api_run = (limits: FFApiRateLimits): number => {
    // If we have no more requests, wait till the limit resets
    if (limits.remaining <= 0) {
      return limits.reset_time.getTime() - Date.now();
      // If we've passed the reset time
    } else if (limits.reset_time < new Date()) {
      return this.api_initial_delay;
    }
    // If we are in our first 25% of requests, let them spam quickly
    else if (limits.rate_limit * 0.75 < limits.remaining) {
      return this.api_default_delay;
    } else {
      const ms_left = limits.reset_time.getTime() - Date.now();
      return ms_left / limits.remaining;
    }
  };

  /**
   * Promise lifecycle helpers
   */
  private resolve = (id: PlayerId, value: FFData) => {
    const entry = this.pending.get(id);
    if (!entry) return;

    entry.resolve(value);
    this.pending.delete(id);
  };

  private reject = (id: PlayerId, err: unknown) => {
    const entry = this.pending.get(id);
    if (!entry) return;

    entry.reject(err);
    this.pending.delete(id);
  };

  private requeue_api = (id: PlayerId) => {
    const entry = this.pending.get(id);
    if (!entry) return;

    entry.api_attempts++;
    if (entry.api_attempts > this.api_attempts) {
      this.reject(
        id,
        new Error(`Too many failed attempts to get stats for ${id}.`),
      );
      return false;
    }

    this.enqueue_api(id);
    return true;
  };

  add_analytics_entry = async (
    feature: string,
    player_id: PlayerId,
    status: "applied" | "ignored",
  ): Promise<void> => {
    if (!this.config.analytics_enabled) {
      return;
    }
    try {
      const url = window.location.origin + window.location.pathname;
      const params = window.location.search;
      const hash = window.location.hash;
      await this.cache.add_analytics({
        feature,
        player_id,
        status,
        url,
        params,
        hash,
      });
    } catch (err) {
      log.error("Failed to add analytics entry", err);
    }
  };

  get_analytics_entries = async (): Promise<AnalyticsEntry[]> => {
    try {
      return await this.cache.get_analytics();
    } catch (err) {
      log.error("Failed to get analytics entries", err);
      return [];
    }
  };

  get_aggregated_analytics = async (): Promise<AggregateAnalyticsRow[]> => {
    const entries = await this.get_analytics_entries();
    const aggregationMap = new Map<string, AggregateAnalyticsRow>();

    for (const entry of entries) {
      let param = "";
      if (entry.params) {
        const searchParams = new URLSearchParams(entry.params);
        param = searchParams.get("sid") || searchParams.get("step") || "";
      }
      if (!param && entry.hash) {
        let hashClean = entry.hash;
        if (hashClean.startsWith("#/")) {
          hashClean = hashClean.substring(2);
        } else if (hashClean.startsWith("#") || hashClean.startsWith("/")) {
          hashClean = hashClean.substring(1);
        }
        if (!hashClean.startsWith("!") && !hashClean.startsWith("?")) {
          hashClean = `?${hashClean}`;
        }
        const hashParams = new URLSearchParams(hashClean);
        param = hashParams.get("sid") || hashParams.get("step") || "";
      }

      const key = `${entry.url}|${param}|${entry.feature}|${entry.status}`;
      const existing = aggregationMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        aggregationMap.set(key, {
          url: entry.url,
          param: param || "-",
          feature: entry.feature,
          status: entry.status,
          count: 1,
        });
      }
    }

    return Array.from(aggregationMap.values());
  };

  get analytics_enabled(): boolean {
    return this.config.analytics_enabled;
  }

  clear_analytics = async (): Promise<void> => {
    try {
      await this.cache.clear_analytics();
    } catch (err) {
      log.error("Failed to clear analytics entries", err);
    }
  };
}

export const ffscouter = new FFScouter(ffconfig);
