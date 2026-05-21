import { TornApiClient } from "tornapi-typescript";
import logger from "./logger";
import type {
  FFData,
  FFDataDistribution,
  PlayerFlightsResponse,
  PlayerId,
  TornApiKey,
} from "./types";

/// <reference types="tampermonkey" />

const FF_SCOUTER_BASE_URL = "https://ffscouter.com/api/v1";

// This used to be Kwack's V1 wrapper. It turned into a v1 & v2 wrapper when I annoyed DKK so much he made it lol

export const client = new TornApiClient({
  defaultComment: "FFScouterV3",
  defaultTimeout: 30,
  // you can also provide a http client implementation, but the default `fetch` will do for now
});

// Promise wrapper function
export async function gmRequest<T = object>(
  options: Tampermonkey.Request<T>,
): Promise<Tampermonkey.Response<T>> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      ...options,
      onload: (response) => resolve(response),
      onerror: (err) => reject(err),
      ontimeout: () => reject(new Error("Timeout making GM_xmlhttpRequest")),
    });
  });
}

export const make_stats_url = (key: TornApiKey, player_ids: PlayerId[]) => {
  const query = new URLSearchParams([
    ["key", key],
    ["targets", player_ids.toString()],
  ]);
  return `${FF_SCOUTER_BASE_URL}/get-stats?${query.toString()}`;
};

export type FFSuccess = {
  player_id: number;
  fair_fight: number | null;
  bs_estimate: number | null;
  bs_estimate_human: string | null;
  bss_public: number | null;
  last_updated: number | null;
  source: string;
  premium_insights_available: boolean;
  distribution: {
    last_updated: number;
    distribution_human: string;
    stats_percentage: {
      strength?: number;
      speed?: number;
      defense?: number;
      dexterity?: number;
    } | null;
  };
};

export type FFError = {
  code: number;
  error: string;
};

function is_ff_success(resp: FFSuccess[] | FFError): resp is FFSuccess[] {
  return (resp as FFError).code === undefined;
}

function is_ff_check_success(
  resp: FFCheckSuccess | FFError,
): resp is FFCheckSuccess {
  return (resp as FFError).code === undefined;
}

export type FFApiRateLimits = {
  reset_time: Date;
  remaining: number;
  rate_limit: number;
  this_minute: number;
};

export type FFApiQueryResponse = {
  result: Map<PlayerId, FFData>;
  blank: boolean;
  limits?: FFApiRateLimits;
};

export class FFApiError extends Error {
  ff_api_limits?: FFApiRateLimits;
  ff_api_error?: FFError;

  constructor(
    message: string,
    options?: {
      cause?: Error;
      ff_api_limits?: FFApiRateLimits;
      ff_api_error?: FFError;
    },
  ) {
    super(message, options);
    this.ff_api_limits = options?.ff_api_limits;
    this.ff_api_error = options?.ff_api_error;
  }
}

export type FFCheckSuccess = {
  key: string;
  is_registered: boolean;
  registered_at: number;
  last_used: number;
  policy_version: number;
  policy_update_required: boolean;
  is_premium: boolean;
  premium_expires_at: number;
  faction_id: number;
  faction_premium_expires_at: number;
  premium_entitlement_source: string;
};

export type FFApiCheckResponse =
  | {
      result: FFCheckSuccess;
      blank: false;
      limits?: FFApiRateLimits;
    }
  | {
      blank: true;
    };

export const query_stats = async (
  key: TornApiKey,
  player_ids: PlayerId[],
  requester: typeof gmRequest = gmRequest,
): Promise<FFApiQueryResponse> => {
  logger.debug("Calling query_stats with arguments", { key, player_ids });
  const url = make_stats_url(key, player_ids);

  const resp = await requester({
    method: "GET",
    url: url,
  });

  if (!resp) {
    return { result: new Map(), blank: true };
  }

  const limits = parse_limit_headers(resp.responseHeaders);
  let ff_response: FFSuccess[] | FFError | null = null;
  try {
    ff_response = JSON.parse(resp.responseText);
  } catch {
    throw new FFApiError(
      `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }
  if (ff_response == null) {
    // Shouldn't happen
    throw new FFApiError(
      `API request failed. Response not set. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  if (!is_ff_success(ff_response)) {
    throw new FFApiError(
      `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
      { ff_api_error: ff_response, ff_api_limits: limits },
    );
  }

  if (resp.status !== 200) {
    throw new FFApiError(
      `API request failed. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  const results: Map<PlayerId, FFData> = new Map();
  ff_response.forEach((result) => {
    if (result?.player_id) {
      if (
        !result.fair_fight ||
        !result.last_updated ||
        !result.bs_estimate ||
        !result.bs_estimate_human ||
        !result.bss_public ||
        !result.source
      ) {
        results.set(result.player_id, {
          no_data: true,
          player_id: result.player_id,
        });
      } else {
        let distribution: FFDataDistribution | undefined;
        if (result.distribution) {
          distribution = {
            last_updated: result.distribution.last_updated,
            distribution_human: result.distribution.distribution_human,
            stats_percentage: {
              strength: result.distribution.stats_percentage?.strength,
              speed: result.distribution.stats_percentage?.speed,
              defense: result.distribution.stats_percentage?.defense,
              dexterity: result.distribution.stats_percentage?.dexterity,
            },
          };
        }
        results.set(result.player_id, {
          no_data: false,
          fair_fight: result.fair_fight,
          last_updated: result.last_updated,
          bs_estimate: result.bs_estimate,
          bs_estimate_human: result.bs_estimate_human,
          bss_public: result.bss_public,
          source: result.source ?? "bss",
          premium_insights_available:
            result.premium_insights_available ?? false,
          distribution: distribution,
          player_id: result.player_id,
        });
      }
    }
  });

  // Make sure the results we return contains an entry for every requested id
  for (const id of player_ids) {
    if (!results.get(id)) {
      results.set(id, {
        no_data: true,
        player_id: id,
      });
    }
  }

  return { result: results, blank: false, limits: limits };
};

const parse_limit_headers = (
  responseHeaders: string,
): FFApiRateLimits | undefined => {
  const headerLines = responseHeaders.split("\n");
  const headers: Map<string, string> = new Map();
  for (const line of headerLines) {
    const [key, value] = line.split(":", 2);
    if (!key || !value) {
      continue;
    }
    headers.set(key, value.trim());
  }
  const reset_time_str = headers.get("x-ratelimit-reset-timestamp");
  const remaining_str = headers.get("x-ratelimit-remaining");
  const rate_limit_str = headers.get("x-ratelimit-limit");
  if (reset_time_str && remaining_str && rate_limit_str) {
    const remaining = parseInt(remaining_str, 10);
    const rate_limit = parseInt(rate_limit_str, 10);
    const this_minute = rate_limit - remaining;
    return {
      reset_time: new Date(parseInt(reset_time_str, 10) * 1000),
      remaining,
      rate_limit,
      this_minute,
    };
  }
};

export const check_key = async (
  key: TornApiKey,
  requester: typeof gmRequest = gmRequest,
): Promise<FFApiCheckResponse> => {
  const query = new URLSearchParams([["key", key]]);
  const url = `${FF_SCOUTER_BASE_URL}/check-key?${query.toString()}`;

  const resp = await requester({
    method: "GET",
    url: url,
  });

  if (!resp) {
    return { blank: true };
  }

  const limits = parse_limit_headers(resp.responseHeaders);
  let ff_response: FFCheckSuccess | FFError | null = null;
  try {
    ff_response = JSON.parse(resp.responseText);
  } catch {
    throw new FFApiError(
      `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }
  if (ff_response == null) {
    // Shouldn't happen
    throw new FFApiError(
      `API request failed. Response not set. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  if (!is_ff_check_success(ff_response)) {
    throw new FFApiError(
      `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
      { ff_api_error: ff_response, ff_api_limits: limits },
    );
  }

  if (resp.status !== 200) {
    throw new FFApiError(
      `API request failed. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  return { result: ff_response, blank: false, limits: limits };
};

export type FFApiFlightsResponse =
  | {
      result: PlayerFlightsResponse;
      blank: false;
      limits?: FFApiRateLimits;
    }
  | {
      blank: true;
    };

export const make_flights_url = (key: TornApiKey, target: PlayerId) => {
  const query = new URLSearchParams([
    ["key", key],
    ["target", target.toString()],
  ]);
  return `${FF_SCOUTER_BASE_URL}/player-flights?${query.toString()}`;
};

function is_flight_success(
  resp: PlayerFlightsResponse | FFError,
): resp is PlayerFlightsResponse {
  return (resp as FFError).code === undefined;
}

export const query_flights = async (
  key: TornApiKey,
  target: PlayerId,
  requester: typeof gmRequest = gmRequest,
): Promise<FFApiFlightsResponse> => {
  logger.debug("Calling query_flights with arguments", { key, target });
  const url = make_flights_url(key, target);

  const resp = await requester({
    method: "GET",
    url: url,
  });

  if (!resp) {
    return { blank: true };
  }

  const limits = parse_limit_headers(resp.responseHeaders);
  let ff_response: PlayerFlightsResponse | FFError | null = null;
  try {
    ff_response = JSON.parse(resp.responseText);
  } catch {
    throw new FFApiError(
      `API request failed. Couldn't parse response. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }
  if (ff_response == null) {
    throw new FFApiError(
      `API request failed. Response not set. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  if (!is_flight_success(ff_response)) {
    throw new FFApiError(
      `API request failed. Error: ${ff_response.error}; Code: ${ff_response.code}`,
      { ff_api_error: ff_response, ff_api_limits: limits },
    );
  }

  if (resp.status !== 200) {
    throw new FFApiError(
      `API request failed. HTTP status code: ${resp.status}`,
      { ff_api_limits: limits },
    );
  }

  return { result: ff_response, blank: false, limits: limits };
};
