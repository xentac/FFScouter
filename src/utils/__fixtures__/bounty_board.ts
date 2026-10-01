// Fixtures derived from the FFScouter OpenAPI spec (v1.9.0) examples for the
// Bounty Board seller endpoints (https://ffscouter.com/openapi/spec.yaml).
// The player target, seller, and claims blocks are the spec's own example
// values; the faction target is derived from the BountyBoardTarget schema
// (the spec example has no faction target) with a full member list.
import type {
  BountyClaimCreateResponse,
  BountyClaims,
  BountyPolicyAcceptResponse,
  BountySellerBoardResponse,
  FFError,
} from "../api";

export const PLAYER_TARGET = {
  target_player_id: 267456763,
  target_name: "Arcanine",
  estimate: 2989885521,
  estimate_available: true,
  tiers: [
    { price_per_hit: 700000, quantity_remaining: 3 },
    { price_per_hit: 500000, quantity_remaining: 6 },
  ],
  max_price_per_hit: 700000,
  total_remaining: 9,
  first_activated_at: 1769997200,
  updated_at: 1770001200,
  disabled: false,
  disabled_reason: null,
};

export const FACTION_TARGET = {
  target_player_id: null,
  target_faction_id: 6731,
  target_faction_name: "Kanto Starters",
  target_faction_tag: "KNTO",
  member_count: 3,
  members: [
    {
      player_id: 400001,
      name: "Blastoise",
      estimate: 950000000,
      estimate_available: true,
    },
    {
      player_id: 400002,
      name: "Wartortle",
      estimate: null,
      estimate_available: false,
    },
    {
      player_id: 400003,
      name: "Squirtle",
      estimate: 120000000,
      estimate_available: true,
    },
  ],
  members_truncated: false,
  all_members_stronger: false,
  target_name: "Kanto Starters",
  estimate: null,
  estimate_available: null,
  tiers: [{ price_per_hit: 300000, quantity_remaining: 10 }],
  max_price_per_hit: 300000,
  total_remaining: 10,
  first_activated_at: 1769998000,
  updated_at: 1770001300,
  disabled: false,
  disabled_reason: null,
};

export const CLAIMS: BountyClaims = {
  pending_claims: [
    {
      claim_id: 42,
      target_player_id: 267456763,
      target_faction_id: null,
      target_name: "Arcanine",
      state: "verifying",
      successful_checks: 2,
      required_checks: 5,
      failed_attempts: 0,
      last_failure_reason: null,
      credited_hits: 0,
      created_at: 1770001300,
    },
  ],
  recent_hits: [
    {
      hit_id: 99,
      target_player_id: 267456763,
      target_faction_id: null,
      target_name: "Arcanine",
      reward_amount: 500000,
      credited_at: 1770001100,
      payout_status: "queued",
      payment_reference: null,
      paid_at: null,
    },
  ],
  claim_history: [
    {
      claim_id: 41,
      target_player_id: 267456763,
      target_faction_id: null,
      target_name: "Arcanine",
      state: "completed",
      successful_checks: 5,
      required_checks: 5,
      credited_hits: 1,
      created_at: 1769999000,
      completed_at: 1770001000,
    },
  ],
};

export const SELLER_BOARD_RESPONSE: BountySellerBoardResponse = {
  board: {
    targets: [PLAYER_TARGET, FACTION_TARGET],
    seller: {
      player_id: 3003,
      estimate: 1500000000,
    },
    generated_at: 1770001400,
  },
  claims: CLAIMS,
};

export const POLICY_ACCEPT_RESPONSE: BountyPolicyAcceptResponse = {
  ok: true,
  player_id: 3003,
  tool: "bounty-board",
  policy_version: 1,
};

export const CLAIM_CREATE_RESPONSE: BountyClaimCreateResponse = {
  claim: {
    id: 43,
    target_player_id: 267456763,
    target_faction_id: null,
    state: "verifying",
    successful_checks: 0,
    required_checks: 5,
    credited_hits: 0,
  },
  claims: {
    pending_claims: [
      {
        claim_id: 43,
        target_player_id: 267456763,
        target_faction_id: null,
        target_name: "Arcanine",
        state: "verifying",
        successful_checks: 0,
        required_checks: 5,
        failed_attempts: 0,
        last_failure_reason: null,
        credited_hits: 0,
        created_at: 1770001500,
      },
    ],
    recent_hits: [],
    claim_history: [],
  },
};

export const FACTION_CLAIM_CREATE_RESPONSE: BountyClaimCreateResponse = {
  claim: {
    id: 44,
    target_player_id: null,
    target_faction_id: 6731,
    state: "verifying",
    successful_checks: 0,
    required_checks: 5,
    credited_hits: 0,
  },
  claims: {
    pending_claims: [
      {
        claim_id: 44,
        target_player_id: null,
        target_faction_id: 6731,
        target_name: "Kanto Starters",
        state: "verifying",
        successful_checks: 0,
        required_checks: 5,
        failed_attempts: 0,
        last_failure_reason: null,
        credited_hits: 0,
        created_at: 1770001600,
      },
    ],
    recent_hits: [],
    claim_history: [],
  },
};

// Error bodies from the spec's per-status examples
export const ERROR_CONSENT_REQUIRED: FFError = {
  code: 86,
  error:
    "Accept the Bounty Board Data Policy and Rules before viewing bounties.",
  source: "ffscouter",
};

export const ERROR_INVALID_KEY: FFError = {
  code: 6,
  error: "Invalid API key",
  source: "ffscouter",
};

export const ERROR_NO_OPEN_BOUNTIES: FFError = {
  code: 91,
  error: "No open bounties available.",
  source: "ffscouter",
};

export const ERROR_TORN_REJECTED_KEY: FFError = {
  code: 87,
  error:
    "Torn rejected this API key. Ensure it is a valid Limited, Full or Custom key with attacks access.",
  source: "ffscouter",
};

export const ERROR_RATE_LIMITED: FFError = {
  code: 21,
  error: "Rate limit exceeded. Please retry shortly.",
  retry_after_seconds: 12,
};
