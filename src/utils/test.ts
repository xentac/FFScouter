import type { FFData, PlayerId } from "./types";

export const generate_test_ff_data = (id: PlayerId): FFData => {
  if (id % 10 === 0) {
    // All ids that end in 0 will be no_datas
    return { player_id: id, no_data: true };
  }

  const fair_fight = (id % 90) / 10 + 1;
  const last_updated = new Date(2012, 1, 1, 0, 0, 0).getTime() - id * 10000;
  const bs_estimate = id * 1000;
  const bs_estimate_human = `${id * 1000}`;
  const bss_public = id * 10;

  return {
    player_id: id,
    fair_fight,
    last_updated,
    bs_estimate,
    bs_estimate_human,
    bss_public,
    source: "bss",
    premium_insights_available: false,
    available_estimates: {
      bss: {
        bss_public,
        bs_estimate,
        bs_estimate_human,
        last_updated,
        fair_fight,
      },
      premium: null,
      spies: null,
    },
    spies: [],
    no_data: false,
  };
};
