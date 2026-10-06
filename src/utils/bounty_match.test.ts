import { describe, expect, test } from "vitest";
import { FACTION_TARGET, PLAYER_TARGET } from "./__fixtures__/bounty_board";
import type { BountyBoardTarget } from "./api";
import { find_bounty_match } from "./bounty_match";

describe("find_bounty_match", () => {
  test("matches a player target by its player id", () => {
    const match = find_bounty_match(
      [FACTION_TARGET, PLAYER_TARGET],
      PLAYER_TARGET.target_player_id,
    );
    expect(match).toEqual({
      claim_target: { target_player_id: PLAYER_TARGET.target_player_id },
      tiers: [
        { price_per_hit: 700000, quantity_remaining: 3 },
        { price_per_hit: 500000, quantity_remaining: 6 },
      ],
      total_remaining: 9,
    });
  });

  test("matches a bountied faction's member and hints the faction", () => {
    const match = find_bounty_match([PLAYER_TARGET, FACTION_TARGET], 400002);
    expect(match).toEqual({
      claim_target: { target_faction_id: FACTION_TARGET.target_faction_id },
      tiers: FACTION_TARGET.tiers,
      total_remaining: FACTION_TARGET.total_remaining,
    });
  });

  test("returns null for a target on no bounty", () => {
    expect(find_bounty_match([PLAYER_TARGET, FACTION_TARGET], 1)).toBeNull();
  });

  test("ignores disabled targets", () => {
    const targets: BountyBoardTarget[] = [
      { ...PLAYER_TARGET, disabled: true, disabled_reason: "buyer" },
      { ...FACTION_TARGET, disabled: true, disabled_reason: "member" },
    ];
    expect(
      find_bounty_match(targets, PLAYER_TARGET.target_player_id),
    ).toBeNull();
    expect(find_bounty_match(targets, 400001)).toBeNull();
  });

  test("sorts tiers highest price first", () => {
    const target = {
      ...PLAYER_TARGET,
      tiers: [...PLAYER_TARGET.tiers].reverse(),
    };
    const match = find_bounty_match([target], PLAYER_TARGET.target_player_id);
    expect(match?.tiers[0]?.price_per_hit).toBe(700000);
  });

  test("picks the best-paying match when several bounties cover the target", () => {
    const member_player = {
      ...PLAYER_TARGET,
      target_player_id: 400001,
      tiers: [{ price_per_hit: 100000, quantity_remaining: 2 }],
      max_price_per_hit: 100000,
    };
    const match = find_bounty_match([member_player, FACTION_TARGET], 400001);
    expect(match?.claim_target).toEqual({
      target_faction_id: FACTION_TARGET.target_faction_id,
    });
  });

  test("prefers the player bounty on a price tie", () => {
    const member_player = {
      ...PLAYER_TARGET,
      target_player_id: 400001,
      max_price_per_hit: FACTION_TARGET.max_price_per_hit,
    };
    const match = find_bounty_match([FACTION_TARGET, member_player], 400001);
    expect(match?.claim_target).toEqual({ target_player_id: 400001 });
  });
});
