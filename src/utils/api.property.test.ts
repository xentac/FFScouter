// Properties for the FFScouter API responses. The body comes from a server
// that the script does not control, so query_stats must handle any status
// and any body.
import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import { FFApiError, type gmRequest, query_stats } from "./api";
import type { FFData, PlayerId } from "./types";

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
): Promise<{ result: Map<PlayerId, FFData> } | { error: unknown }> {
  try {
    const resp = await query_stats(
      "key",
      requested,
      respond_with(status, body),
    );
    return { result: resp.result };
  } catch (error) {
    return { error };
  }
}

// ============================================================================
// Properties
// ============================================================================
// The first two properties state one rule: for any status and any body,
// query_stats resolves with a map keyed by exactly the requested IDs, or
// rejects with an FFApiError. Callers branch on FFApiError and read one
// entry for each requested ID. The rule is split in two, one property for
// each part. The third property checks the entries that have data.

describe("query_stats properties", () => {
  // Rule: query_stats rejects only with an FFApiError. Source: query_stats
  // and FFApiError, which carries the rate-limit data. A 200 body of "{}"
  // once reached .forEach and threw a TypeError (#66).
  test.prop([requested_arb, status_arb, body_arb], {
    examples: [[[1], 200, "{}"]],
  })(
    "query_stats rejects only with an FFApiError",
    async (requested, status, body) => {
      const outcome = await outcome_of(requested, status, body);
      if ("error" in outcome) expect(outcome.error).toBeInstanceOf(FFApiError);
    },
  );

  // Rule: a resolved result map is keyed by exactly the requested IDs.
  // Source: query_stats, which adds a no_data entry for each requested ID
  // that the body does not name. Precondition: query_stats resolves. A
  // record for an ID that was not requested once added that ID (#69).
  test.prop([requested_arb, status_arb, body_arb], {
    examples: [
      [[1], 200, '[{"player_id":2}]'],
      [[1], 200, '[{"player_id":"1"}]'],
    ],
  })(
    "a resolved query_stats map is keyed by exactly the requested ids",
    async (requested, status, body) => {
      const outcome = await outcome_of(requested, status, body);
      if ("error" in outcome) return;
      // Map keys and requested IDs have no repeats, so sets compare them.
      expect(new Set(outcome.result.keys())).toEqual(new Set(requested));
    },
  );

  // Rule: an entry with data has its required fields, each of the right
  // type, and no 0 values. Source: query_stats, which reads any other
  // record as no data. A wrongly typed field once passed through (#66).
  test.prop([requested_arb, status_arb, body_arb], {
    examples: [
      [[1], 200, JSON.stringify([{ ...valid_record(1), fair_fight: "abc" }])],
      [[1], 200, JSON.stringify([{ ...valid_record(1), source: "future" }])],
    ],
  })("an entry with data has valid fields", async (requested, status, body) => {
    const outcome = await outcome_of(requested, status, body);
    if ("error" in outcome) return;
    for (const data of outcome.result.values()) {
      if (data.no_data) continue;
      for (const value of [
        data.fair_fight,
        data.bs_estimate,
        data.bss_public,
        data.last_updated,
      ]) {
        expect(Number.isFinite(value) && value > 0).toBe(true);
      }
      expect(typeof data.bs_estimate_human).toBe("string");
      expect(data.bs_estimate_human).not.toBe("");
      expect(["bss", "premium", "spies"]).toContain(data.source);
      expect(typeof data.premium_insights_available).toBe("boolean");
      expect(Array.isArray(data.spies)).toBe(true);
      expect(typeof data.available_estimates).toBe("object");
      expect(data.available_estimates).not.toBeNull();
    }
  });
});
