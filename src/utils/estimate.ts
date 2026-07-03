import type { EstimateSource, FFDataComplete, TimestampSec } from "./types";

type ResolvedEstimate = {
  source: EstimateSource;
  bs_estimate: number;
  bs_estimate_human: string;
  last_updated: TimestampSec;
  fair_fight: number;
};

// The one place estimate-source priority logic lives. v1 just mirrors the
// server's own merge decision (`data.source`) so this is a no-op versus
// today's behavior; a future priority policy (age cutoff, premium-over-standard,
// etc.) only needs to change this function — every extract_* below stays untouched.
//
// Falls back field-by-field to the top-level values (guaranteed present on
// FFDataComplete) whenever the chosen candidate is missing entirely, or has a
// null value for that particular field — we always want to give the caller
// something rather than nothing.
function resolve_estimate(data: FFDataComplete): ResolvedEstimate {
  // Optional chaining, not a direct index: `available_estimates` is typed as
  // required, but IndexedDB may still hold FFDataComplete records cached by a
  // pre-available_estimates build (cache TTL is 1 hour, so this is transient
  // but real) — those records have no such field at runtime, and indexing
  // into undefined would throw instead of falling through to the field-level
  // fallbacks below.
  const candidate = data.available_estimates?.[data.source];
  return {
    source: data.source,
    bs_estimate: candidate?.bs_estimate ?? data.bs_estimate,
    bs_estimate_human: candidate?.bs_estimate_human ?? data.bs_estimate_human,
    last_updated: candidate?.last_updated ?? data.last_updated,
    fair_fight: candidate?.fair_fight ?? data.fair_fight,
  };
}

export function extract_ff(data: FFDataComplete): number {
  return resolve_estimate(data).fair_fight;
}

export function extract_bs_estimate(data: FFDataComplete): number {
  return resolve_estimate(data).bs_estimate;
}

export function extract_bs_estimate_human(data: FFDataComplete): string {
  return resolve_estimate(data).bs_estimate_human;
}

export function extract_source(data: FFDataComplete): EstimateSource {
  return resolve_estimate(data).source;
}

export function extract_last_updated(data: FFDataComplete): TimestampSec {
  return resolve_estimate(data).last_updated;
}
