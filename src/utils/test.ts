import type { FFData, PlayerId } from "./types";

export const generate_test_ff_data = (id: PlayerId): FFData => {
  if (id % 10 === 0) {
    // All ids that end in 0 will be no_datas
    return { player_id: id, no_data: true };
  }

  return {
    player_id: id,
    fair_fight: (id % 90) / 10 + 1,
    last_updated: new Date(2012, 1, 1, 0, 0, 0).getTime() - id * 10000,
    bs_estimate: id * 1000,
    bs_estimate_human: `${id * 1000}`,
    bss_public: id * 10,
    no_data: false,
  };
};
