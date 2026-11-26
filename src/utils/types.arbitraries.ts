// Shared fast-check arbitraries for the FF data types in types.ts.
import { fc } from "@fast-check/vitest";
import type { EstimateSource, FFData, FFDataComplete, PlayerId } from "./types";

// An estimate for one player with the given FF value. The other fields are
// fixed. Use it for pinned examples.
export function estimate_with_ff(
  fair_fight: number,
  player_id: PlayerId = 1,
): FFDataComplete {
  return {
    no_data: false,
    fair_fight,
    last_updated: 1_700_000_000,
    bs_estimate: 1_000_000,
    bs_estimate_human: "1m",
    bss_public: 40,
    source: "bss",
    premium_insights_available: false,
    available_estimates: { bss: null, premium: null, spies: null },
    spies: [],
    player_id,
  };
}

export type FFDataArbOptions = {
  // The player IDs to draw from. The default is 1 only.
  player_id?: fc.Arbitrary<PlayerId>;
  // The FF values to draw from. The default is 1 to 10.
  fair_fight?: fc.Arbitrary<number>;
};

// FF data as the API and the cache give it: no data, or an estimate. The
// estimate varies the FF value, the battle stats, the source, and the time
// of the last update.
export function ff_data_arb(
  options: FFDataArbOptions = {},
): fc.Arbitrary<FFData> {
  const player_id = options.player_id ?? fc.constant(1);
  const fair_fight =
    options.fair_fight ?? fc.double({ min: 1, max: 10, noNaN: true });
  return fc.oneof(
    player_id.map((id): FFData => ({ no_data: true, player_id: id })),
    fc
      .record({
        player_id,
        fair_fight,
        bs_estimate: fc.integer({ min: 0, max: 10 ** 12 }),
        bss_public: fc.integer({ min: 0, max: 10_000 }),
        source: fc.constantFrom<EstimateSource>("bss", "premium", "spies"),
        last_updated: fc.integer({ min: 1_600_000_000, max: 1_900_000_000 }),
      })
      .map((fields): FFData => {
        const data = estimate_with_ff(fields.fair_fight, fields.player_id);
        data.bs_estimate = fields.bs_estimate;
        data.bs_estimate_human = `${fields.bs_estimate}`;
        data.bss_public = fields.bss_public;
        data.source = fields.source;
        data.last_updated = fields.last_updated;
        return data;
      }),
  );
}
