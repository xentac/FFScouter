// Pure view-model for the FF Scouter Bounties board: turns board targets plus
// the FF lookup into sorted, filtered row models. No DOM — shared by the
// desktop floating modal and the later mobile in-flow container.
import {
  type BountyBoardTarget,
  type BountyClaimTarget,
  type BountyTier,
  FFApiError,
} from "@utils/api";
import { extract_ff } from "@utils/estimate";
import { format_suffix_number } from "@utils/strings";
import type { FFData, PlayerId } from "@utils/types";

export type BountyFilterValues = {
  // Parsed limits; null = filter not set. "less than" semantics: a row is
  // hidden only when its value is known and >= the limit — an unknown
  // estimate or FF never hides a row (unknown ≠ stronger).
  stats_less_than: number | null;
  ff_less_than: number | null;
};

export const NO_FILTERS: BountyFilterValues = {
  stats_less_than: null,
  ff_less_than: null,
};

export type PlayerRowModel = {
  kind: "player";
  row_key: string;
  player_id: PlayerId;
  name: string;
  estimate: number | null;
  estimate_available: boolean;
  tiers: BountyTier[];
  max_price_per_hit: number;
  // A faction member's claim hints the faction bounty, not the member: the
  // bounty entity is the faction's shared pool.
  claim_target: BountyClaimTarget;
};

export type FactionCardModel = {
  kind: "faction";
  row_key: string;
  faction_id: number;
  faction_name: string;
  faction_tag: string | null;
  total_remaining: number;
  max_price_per_hit: number;
  tiers: BountyTier[];
  members: PlayerRowModel[];
};

export type BoardRowModel = PlayerRowModel | FactionCardModel;

export function format_tier_label(tier: BountyTier): string {
  return `$${format_suffix_number(tier.price_per_hit)} × ${tier.quantity_remaining}`;
}

// Highest price first, so tiers[0] is the top tier the row headlines.
function sort_tiers(tiers: BountyTier[]): BountyTier[] {
  return [...tiers].sort((a, b) => b.price_per_hit - a.price_per_hit);
}

function row_passes_filters(
  row: PlayerRowModel,
  ff_lookup: ReadonlyMap<PlayerId, FFData>,
  filters: BountyFilterValues,
): boolean {
  if (
    filters.stats_less_than !== null &&
    row.estimate_available &&
    row.estimate !== null &&
    row.estimate >= filters.stats_less_than
  ) {
    return false;
  }
  if (filters.ff_less_than !== null) {
    const ff = ff_lookup.get(row.player_id);
    if (ff && !ff.no_data && extract_ff(ff) >= filters.ff_less_than) {
      return false;
    }
  }
  return true;
}

function player_row(target: BountyBoardTarget): PlayerRowModel | null {
  if (target.target_player_id == null) {
    return null;
  }
  return {
    kind: "player",
    row_key: `p${target.target_player_id}`,
    player_id: target.target_player_id,
    name: target.target_name,
    estimate: target.estimate ?? null,
    estimate_available: target.estimate_available ?? false,
    tiers: sort_tiers(target.tiers),
    max_price_per_hit: target.max_price_per_hit,
    claim_target: { target_player_id: target.target_player_id },
  };
}

function faction_card(target: BountyBoardTarget): FactionCardModel | null {
  const faction_id = target.target_faction_id;
  if (faction_id == null) {
    return null;
  }
  const tiers = sort_tiers(target.tiers);
  const members: PlayerRowModel[] = (target.members ?? []).map((member) => ({
    kind: "player",
    row_key: `f${faction_id}:m${member.player_id}`,
    player_id: member.player_id,
    name: member.name,
    estimate: member.estimate,
    estimate_available: member.estimate_available,
    // Member rows share the faction bounty's tier ladder: the pool and
    // pricing belong to the bounty, not the member.
    tiers,
    max_price_per_hit: target.max_price_per_hit,
    claim_target: { target_faction_id: faction_id },
  }));
  return {
    kind: "faction",
    row_key: `f${faction_id}`,
    faction_id,
    faction_name: target.target_faction_name ?? target.target_name,
    faction_tag: target.target_faction_tag ?? null,
    total_remaining: target.total_remaining,
    max_price_per_hit: target.max_price_per_hit,
    tiers,
    members,
  };
}

export function build_board_view(
  targets: BountyBoardTarget[],
  ff_lookup: ReadonlyMap<PlayerId, FFData>,
  filters: BountyFilterValues,
): BoardRowModel[] {
  const rows: BoardRowModel[] = [];
  for (const target of targets) {
    if (target.disabled) {
      continue;
    }
    if (target.target_faction_id != null) {
      const card = faction_card(target);
      if (!card) {
        continue;
      }
      const had_members = card.members.length > 0;
      card.members = card.members.filter((m) =>
        row_passes_filters(m, ff_lookup, filters),
      );
      // A card whose every member is filtered out is itself filtered out;
      // a memberless card (e.g. truncated payload) stays visible.
      if (had_members && card.members.length === 0) {
        continue;
      }
      rows.push(card);
    } else {
      const row = player_row(target);
      if (row && row_passes_filters(row, ff_lookup, filters)) {
        rows.push(row);
      }
    }
  }
  rows.sort((a, b) => b.max_price_per_hit - a.max_price_per_hit);
  return rows;
}

// Player ids whose FF the board needs: every enabled player target, plus the
// members of faction cards the user has expanded — collapsed rosters are not
// looked up, so a large faction bounty doesn't trigger a bulk stats query
// nobody is looking at.
export function ff_ids_to_load(
  targets: BountyBoardTarget[],
  expanded_factions: number[],
): PlayerId[] {
  const expanded = new Set(expanded_factions);
  const ids: PlayerId[] = [];
  for (const target of targets) {
    if (target.disabled) {
      continue;
    }
    if (target.target_faction_id != null) {
      if (expanded.has(target.target_faction_id)) {
        for (const member of target.members ?? []) {
          ids.push(member.player_id);
        }
      }
    } else if (target.target_player_id != null) {
      ids.push(target.target_player_id);
    }
  }
  return ids;
}

// The API's own error text when the error carries one, so toasts read
// "Accept the Bounty Board Data Policy…" rather than the wrapper's
// "API request failed. Error: …; Code: N".
export function api_error_message(err: unknown): string {
  if (err instanceof FFApiError && err.ff_api_error?.error) {
    return err.ff_api_error.error;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export type BoardErrorPhase =
  | { phase: "consent" }
  | { phase: "key_missing" }
  | { phase: "key_unregistered" }
  | { phase: "error"; message: string };

const CODE_INVALID_KEY = 6;
const CODE_CONSENT_REQUIRED = 86;

export function classify_board_error(err: unknown): BoardErrorPhase {
  if (err instanceof FFApiError) {
    const code = err.ff_api_error?.code;
    if (code === CODE_CONSENT_REQUIRED) {
      return { phase: "consent" };
    }
    if (code === CODE_INVALID_KEY) {
      return { phase: "key_unregistered" };
    }
  } else if (err instanceof Error && err.message === "No API key configured") {
    return { phase: "key_missing" };
  }
  return { phase: "error", message: api_error_message(err) };
}
