// Properties for the FFScouter API responses. The body comes from a server
// that the script does not control, so query_stats must handle any status
// and any body.
import { fc } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { prop_with_known_bugs } from "../tests/known-bugs";
import { FFApiError, type gmRequest, query_stats } from "./api";
import type { PlayerId } from "./types";

// ============================================================================
// Arbitraries
// ============================================================================

// Player IDs from a small range, so the requested IDs and the IDs in a
// response body often overlap.
const player_id_arb = fc.integer({ min: 1, max: 6 });

// The requested IDs: no repeats, as process_api sends them.
const requested_arb = fc.uniqueArray(player_id_arb, {
  minLength: 1,
  maxLength: 4,
});

// Mostly 200, the status of a success, plus any HTTP status.
const status_arb = fc.oneof(
  fc.constant(200),
  fc.integer({ min: 100, max: 599 }),
);

// One record of a valid get-stats response.
function valid_record(player_id: PlayerId): Record<string, unknown> {
  return {
    player_id,
    fair_fight: 2.5,
    bs_estimate: 1_000_000,
    bs_estimate_human: "1m",
    bss_public: 40,
    last_updated: 1_700_000_000,
    source: "bss",
    premium_insights_available: false,
    distribution: {
      last_updated: 1_700_000_000,
      distribution_human: "Balanced",
      stats_percentage: { strength: 25, speed: 25, defense: 25, dexterity: 25 },
    },
    available_estimates: { bss: null, premium: null, spies: null },
    spies: [],
  };
}

// A near-valid record: a valid record with one field replaced by any JSON
// value or removed. These pass the first shape tests, so they reach deeper
// code than pure noise does.
const near_valid_record_arb = fc
  .record({
    player_id: player_id_arb,
    change: fc.option(
      fc.record({
        field: fc.constantFrom(...Object.keys(valid_record(1))),
        value: fc.option(fc.jsonValue(), { nil: undefined }),
      }),
    ),
  })
  .map(({ player_id, change }) => {
    const record = valid_record(player_id);
    if (change) record[change.field] = change.value;
    return record;
  });

// A response body: any text, any JSON value, an API error object, or a
// near-valid array of records.
const body_arb = fc.oneof(
  fc.string(),
  fc.jsonValue().map((value) => JSON.stringify(value)),
  fc
    .record({ code: fc.integer(), error: fc.string() })
    .map((value) => JSON.stringify(value)),
  fc
    .array(near_valid_record_arb, { maxLength: 5 })
    .map((value) => JSON.stringify(value)),
);

// A requester that returns the given status and body, as gmRequest does.
function respond_with(status: number, body: string): typeof gmRequest {
  const response = { status, responseText: body, responseHeaders: "" };
  return (async () => response) as unknown as typeof gmRequest;
}

// Runs query_stats against the given response. Returns the result map, or
// the error that it threw.
async function outcome_of(
  requested: PlayerId[],
  status: number,
  body: string,
): Promise<{ keys: PlayerId[] } | { error: unknown }> {
  try {
    const resp = await query_stats(
      "key",
      requested,
      respond_with(status, body),
    );
    return { keys: [...resp.result.keys()] };
  } catch (error) {
    return { error };
  }
}

// ============================================================================
// Properties
// ============================================================================
// Together, the two properties state one rule: for any status and any body,
// query_stats resolves with a map keyed by exactly the requested IDs, or
// rejects with an FFApiError. Callers branch on FFApiError and read one
// entry for each requested ID. The rule is split in two, one property for
// each part.

// The parsed body, or undefined when the body is not JSON.
function parsed(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

describe("query_stats properties", () => {
  // Rule: query_stats rejects only with an FFApiError. Source: query_stats
  // and FFApiError, which carries the rate-limit data.
  prop_with_known_bugs(
    [requested_arb, status_arb, body_arb],
    [
      {
        // A 200 body that is JSON, not null, not an array, and has no code
        // passes as a success, and .forEach then throws a TypeError.
        issue: "https://github.com/xentac/FFScouter/issues/66",
        example: [[1], 200, "{}"],
        applies: (_requested, status, body) => {
          const value = parsed(body);
          return (
            status === 200 &&
            value !== undefined &&
            value !== null &&
            !Array.isArray(value) &&
            (value as { code?: unknown }).code === undefined
          );
        },
      },
    ],
  )(
    "query_stats rejects only with an FFApiError",
    async (requested, status, body) => {
      const outcome = await outcome_of(requested, status, body);
      if ("error" in outcome) expect(outcome.error).toBeInstanceOf(FFApiError);
    },
  );

  // Rule: a resolved result map is keyed by exactly the requested IDs.
  // Source: query_stats, which adds a no_data entry for each requested ID
  // that the body does not name. Precondition: query_stats resolves.
  prop_with_known_bugs(
    [requested_arb, status_arb, body_arb],
    [
      {
        // A 200 body array that names an ID that was not requested adds
        // that ID to the map.
        issue: "https://github.com/xentac/FFScouter/issues/69",
        example: [[1], 200, '[{"player_id":2}]'],
        applies: (requested, status, body) => {
          const value = parsed(body);
          return (
            status === 200 &&
            Array.isArray(value) &&
            value.some((item: unknown) => {
              const id = (item as { player_id?: unknown } | null)?.player_id;
              return Boolean(id) && !requested.includes(id as PlayerId);
            })
          );
        },
      },
    ],
  )(
    "a resolved query_stats map is keyed by exactly the requested ids",
    async (requested, status, body) => {
      const outcome = await outcome_of(requested, status, body);
      if ("error" in outcome) return;
      // Map keys and requested IDs have no repeats, so sets compare them.
      expect(new Set(outcome.keys)).toEqual(new Set(requested));
    },
  );
});
