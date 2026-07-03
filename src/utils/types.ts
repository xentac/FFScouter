export type TornApiKey = string;

export type PlayerId = number;

export type Timestamp = number; // ms, relative to the browser's own clock (Date.now())

export type TimestampSec = number; // seconds, see Timestamp

export type TornTimestamp = number; // ms, relative to Torn's server clock (window.getCurrentTimestamp()), not the browser clock

export type TornTimestampSec = number; // seconds, see TornTimestamp

export type FFDataDistribution = {
  last_updated: TimestampSec;
  distribution_human: string;
  stats_percentage: {
    strength?: number;
    speed?: number;
    defense?: number;
    dexterity?: number;
  };
};

// Which of the three estimate sources FFScouter's own merge picked as `source`,
// and the key each is filed under in `available_estimates`.
export type EstimateSource = "bss" | "premium" | "spies";

// One candidate estimate inside `available_estimates`. Not every field applies
// to every source: `bss_public` only appears on the "bss" candidate, and
// `source` only appears on the "spies" candidate (the raw per-spy data source,
// e.g. "tornstats" — distinct from the outer EstimateSource key).
export type EstimateCandidate = {
  bs_estimate: number | null;
  bs_estimate_human: string | null;
  last_updated: TimestampSec | null;
  fair_fight: number | null;
  bss_public?: number | null;
  source?: string;
};

// The three estimate candidates FFScouter computed, keyed by EstimateSource,
// so a priority policy can pick among them without refetching. A null value
// means that source had no data to offer (e.g. `premium` for a non-premium key).
export type AvailableEstimates = Record<
  EstimateSource,
  EstimateCandidate | null
>;

export type SpySnapshot = {
  strength: number;
  speed: number;
  defense: number;
  dexterity: number;
  total: number;
  last_updated: TimestampSec;
  source: string;
  source_faction_id: number;
};

export type FFDataComplete = {
  no_data: false;
  fair_fight: number;
  last_updated: TimestampSec;
  bs_estimate: number;
  bs_estimate_human: string;
  bss_public: number;
  source: EstimateSource;
  premium_insights_available: boolean;
  distribution?: FFDataDistribution;
  available_estimates: AvailableEstimates;
  spies: SpySnapshot[];
  player_id: PlayerId;
};

export type FFData = FFDataComplete | { no_data: true; player_id: PlayerId };

export type CachedFFData = FFData & { expiry: Timestamp };

export type TravelMethod = "PI" | "Airline" | "WLT" | "BCT" | "Unknown" | null;

export type Flight = {
  takeoff_time: TornTimestampSec;
  status_description: string;
  earliest_arrival_time: TornTimestampSec;
  latest_arrival_time: TornTimestampSec;
  travel_method: TravelMethod;
  book_likely_being_used: boolean;
  approx_landing_time?: TornTimestampSec;
};

export type PlayerFlightsResponse = {
  player_id: PlayerId;
  current: Flight | null;
  recent_flights: Flight[];
  rechecking?: boolean;
  next_retry_at?: number;
  recheck_until?: number;
};

export type CachedFlightData = PlayerFlightsResponse & { expiry: Timestamp };

export interface AnalyticsEntry {
  id?: number;
  feature: string;
  player_id: PlayerId;
  status: "applied" | "ignored";
  url: string;
  params: string;
  hash: string;
  timestamp: Timestamp;
}

export interface AggregateAnalyticsRow {
  url: string;
  param: string;
  feature: string;
  status: "applied" | "ignored";
  count: number;
}
