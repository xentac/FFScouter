// Attack Page Bounty Row eligibility: a pure lookup of the attack target
// against Bounty Board Cache data. Faction member lists are complete (the
// board returns every member; members_truncated is inert server-side), so a
// miss here really means the target is on no bounty.
import type { BountyBoardTarget, BountyClaimTarget, BountyTier } from "./api";
import type { PlayerId } from "./types";

export type BountyMatch = {
  // A faction member's claim hints the faction bounty, not the member: the
  // bounty entity is the faction's shared pool.
  claim_target: BountyClaimTarget;
  // Highest price first, so tiers[0] is what the next hit pays.
  tiers: BountyTier[];
  // For a faction bounty, the single shared pool across all members
  total_remaining: number;
};

// Highest price first, so tiers[0] is the top tier the row headlines.
export function sort_tiers(tiers: BountyTier[]): BountyTier[] {
  return [...tiers].sort((a, b) => b.price_per_hit - a.price_per_hit);
}

function covers(target: BountyBoardTarget, player_id: PlayerId): boolean {
  if (target.target_faction_id != null) {
    return (target.members ?? []).some((m) => m.player_id === player_id);
  }
  return target.target_player_id === player_id;
}

// Disabled targets never match: "buyer" is the viewer's own bounty (not
// claimable by them), and "target"/"member" mean the viewer is the target or
// in the targeted faction. When several bounties cover the target, the
// best-paying one wins, a player bounty winning a price tie.
export function find_bounty_match(
  targets: BountyBoardTarget[],
  player_id: PlayerId,
): BountyMatch | null {
  let best: BountyBoardTarget | null = null;
  for (const target of targets) {
    if (target.disabled || !covers(target, player_id)) {
      continue;
    }
    if (
      !best ||
      target.max_price_per_hit > best.max_price_per_hit ||
      (target.max_price_per_hit === best.max_price_per_hit &&
        target.target_faction_id == null)
    ) {
      best = target;
    }
  }
  if (!best) {
    return null;
  }
  return {
    claim_target:
      best.target_faction_id != null
        ? { target_faction_id: best.target_faction_id }
        : { target_player_id: player_id },
    tiers: sort_tiers(best.tiers),
    total_remaining: best.total_remaining,
  };
}
