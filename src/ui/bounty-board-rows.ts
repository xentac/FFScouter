// Pure view-model for the FF Scouter Bounties board: turns board targets plus
// the FF lookup into sorted, filtered row models. No DOM — shared by the
// desktop floating modal and the later mobile in-flow container.
import {
  type BountyBoardTarget,
  type BountyClaimTarget,
  type BountyTargetStatus,
  type BountyTier,
  FFApiError,
} from "@utils/api";
import { sort_tiers } from "@utils/bounty_match";
import { extract_ff } from "@utils/estimate";
import { format_suffix_number } from "@utils/strings";
import type { FFData, PlayerId, TornTimestampSec } from "@utils/types";

export type BountyFilterValues = {
  // Parsed limits; null = filter not set. "less than" semantics: a row is
  // hidden only when its value is known and >= the limit — an unknown
  // estimate or FF never hides a row (unknown ≠ stronger).
  stats_less_than: number | null;
  ff_less_than: number | null;
  // Hides rows whose Board Target Status says they can't be hit right now;
  // an unknown status never hides a row (unknown ≠ unavailable).
  hide_unavailable: boolean;
};

export const NO_FILTERS: BountyFilterValues = {
  stats_less_than: null,
  ff_less_than: null,
  hide_unavailable: false,
};

export type PlayerRowModel = {
  kind: "player";
  row_key: string;
  player_id: PlayerId;
  name: string;
  estimate: number | null;
  estimate_available: boolean;
  status: BountyTargetStatus | null;
  status_last_checked: TornTimestampSec | null;
  tiers: BountyTier[];
  max_price_per_hit: number;
  // A faction member's claim hints the faction bounty, not the member: the
  // bounty entity is the faction's shared pool.
  claim_target: BountyClaimTarget;
  // The local user posted this bounty: shown, but never attackable or
  // claimable by them.
  own_bounty: boolean;
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
  own_bounty: boolean;
};

export type BoardRowModel = PlayerRowModel | FactionCardModel;

// The board disables a target per viewer. "buyer" means the viewer posted the
// bounty — still open to everyone else, so it's shown (marked, no actions).
// "target"/"member" mean the viewer is the target or in the targeted faction,
// so those stay hidden.
function is_own_bounty(target: BountyBoardTarget): boolean {
  return target.disabled && target.disabled_reason === "buyer";
}

export function is_shown_target(target: BountyBoardTarget): boolean {
  return !target.disabled || is_own_bounty(target);
}

// One resolved view of a Board Target Status, read by both the row label and
// the "Hide unavailable" filter so the two can never disagree.
export type BoardStatusView =
  | { kind: "unknown" }
  | { kind: "okay" }
  // A Hospital/Jail timer that ran out. The cache can't know about a new hit,
  // so "Okay?" is a guess, and it counts as available.
  | { kind: "okay_guess" }
  | { kind: "timed"; state: string; remaining: number }
  | { kind: "static"; state: string; unavailable: boolean };

// Only these count down. Traveling is deliberately absent: Torn gives no end
// time for travel, and a return trip ends Okay while an outbound one ends
// Abroad, which only the free-text description tells apart.
const TIMED_STATES = new Set(["Hospital", "Jail"]);

// Abroad is hidden because the board doesn't know the seller's own location
// (#33). States not listed here are shown raw and never hidden.
const UNAVAILABLE_STATES = new Set([
  "Hospital",
  "Jail",
  "Traveling",
  "Abroad",
  "Fallen",
]);

export function resolve_board_status(
  status: BountyTargetStatus | null | undefined,
  now: TornTimestampSec,
): BoardStatusView {
  const state = status?.state;
  if (!state) {
    return { kind: "unknown" };
  }
  if (state === "Okay") {
    return { kind: "okay" };
  }
  // Torn sends 0 rather than null when there is no timer.
  const until = status.until;
  if (TIMED_STATES.has(state) && until != null && until > 0) {
    const remaining = until - now;
    if (remaining <= 0) {
      return { kind: "okay_guess" };
    }
    return { kind: "timed", state, remaining };
  }
  return { kind: "static", state, unavailable: UNAVAILABLE_STATES.has(state) };
}

export function is_status_available(view: BoardStatusView): boolean {
  switch (view.kind) {
    case "unknown":
    case "okay":
    case "okay_guess":
      return true;
    case "timed":
      return false;
    case "static":
      return !view.unavailable;
  }
}

export function format_tier_label(tier: BountyTier): string {
  return `$${format_suffix_number(tier.price_per_hit)} × ${tier.quantity_remaining}`;
}

function row_passes_filters(
  row: PlayerRowModel,
  ff_lookup: ReadonlyMap<PlayerId, FFData>,
  filters: BountyFilterValues,
  now: TornTimestampSec,
): boolean {
  if (
    filters.hide_unavailable &&
    !is_status_available(resolve_board_status(row.status, now))
  ) {
    return false;
  }
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
    status: target.status ?? null,
    status_last_checked: target.status_last_checked ?? null,
    tiers: sort_tiers(target.tiers),
    max_price_per_hit: target.max_price_per_hit,
    claim_target: { target_player_id: target.target_player_id },
    own_bounty: is_own_bounty(target),
  };
}

function faction_card(target: BountyBoardTarget): FactionCardModel | null {
  const faction_id = target.target_faction_id;
  if (faction_id == null) {
    return null;
  }
  const tiers = sort_tiers(target.tiers);
  const own_bounty = is_own_bounty(target);
  const members: PlayerRowModel[] = (target.members ?? []).map((member) => ({
    kind: "player",
    row_key: `f${faction_id}:m${member.player_id}`,
    player_id: member.player_id,
    name: member.name,
    estimate: member.estimate,
    estimate_available: member.estimate_available,
    status: member.status ?? null,
    status_last_checked: member.status_last_checked ?? null,
    // Member rows share the faction bounty's tier ladder: the pool and
    // pricing belong to the bounty, not the member.
    tiers,
    max_price_per_hit: target.max_price_per_hit,
    claim_target: { target_faction_id: faction_id },
    own_bounty,
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
    own_bounty,
  };
}

export function build_board_view(
  targets: BountyBoardTarget[],
  ff_lookup: ReadonlyMap<PlayerId, FFData>,
  filters: BountyFilterValues,
  now: TornTimestampSec,
): BoardRowModel[] {
  const rows: BoardRowModel[] = [];
  for (const target of targets) {
    if (!is_shown_target(target)) {
      continue;
    }
    if (target.target_faction_id != null) {
      const card = faction_card(target);
      if (!card) {
        continue;
      }
      const had_members = card.members.length > 0;
      card.members = card.members.filter((m) =>
        row_passes_filters(m, ff_lookup, filters, now),
      );
      // A card whose every member is filtered out is itself filtered out;
      // a memberless card (e.g. truncated payload) stays visible.
      if (had_members && card.members.length === 0) {
        continue;
      }
      rows.push(card);
    } else {
      const row = player_row(target);
      if (row && row_passes_filters(row, ff_lookup, filters, now)) {
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
// nobody is looking at. The user's own bounties are disabled too: they can't
// act on them, so no FF is fetched for them.
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
