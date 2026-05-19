export type TornApiKey = string;

export type PlayerId = number;

export type Timestamp = number; // ms

export type TimestampSec = number; // seconds

export type FFDataComplete = {
  no_data: false;
  fair_fight: number;
  last_updated: TimestampSec;
  bs_estimate: number;
  bs_estimate_human: string;
  bss_public: number;
  player_id: PlayerId;
};

export type FFData = FFDataComplete | { no_data: true; player_id: PlayerId };

export type CachedFFData = FFData & { expiry: Timestamp };
