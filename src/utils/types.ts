export type TornApiKey = string;

export type PlayerId = number;

export type Timestamp = number; // ms

export type TimestampSec = number; // seconds

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

export type FFDataComplete = {
  no_data: false;
  fair_fight: number;
  last_updated: TimestampSec;
  bs_estimate: number;
  bs_estimate_human: string;
  bss_public: number;
  source: string;
  premium_insights_available: boolean;
  distribution?: FFDataDistribution;
  player_id: PlayerId;
};

export type FFData = FFDataComplete | { no_data: true; player_id: PlayerId };

export type CachedFFData = FFData & { expiry: Timestamp };

export type TravelMethod = "PI" | "Airline" | "WLT" | "BCT" | "Unknown" | null;

export type Flight = {
  takeoff_time: TimestampSec;
  status_description: string;
  earliest_arrival_time: TimestampSec;
  latest_arrival_time: TimestampSec;
  travel_method: TravelMethod;
  book_likely_being_used: boolean;
  approx_landing_time?: TimestampSec;
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
