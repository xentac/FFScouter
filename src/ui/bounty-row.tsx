// Shared FF Scouter Bounties row shapes. Container-agnostic on purpose: the
// desktop floating modal and the narrow/mobile in-flow section render these
// unchanged.
import {
  format_duration_human,
  format_ff_score,
  format_short_age,
  format_suffix_number,
  get_contrast_color,
  get_ff_colour,
} from "@utils/strings";
import type { FFData, TornTimestampSec } from "@utils/types";
import type { ReactNode } from "react";
import { cls } from "./bounty-board-classes";
import type { FactionCardModel, PlayerRowModel } from "./bounty-board-rows";
import { format_tier_label, resolve_board_status } from "./bounty-board-rows";

const OWN_LABEL = "Your bounty – not claimable by you";
const OWN_TITLE = "You posted this bounty, so you can't attack or claim it.";

type BountyRowProps = {
  row: PlayerRowModel;
  // undefined = FF lookup not resolved yet.
  ff: FFData | undefined;
  // Torn Clock "now", for the status countdown and check age.
  now: TornTimestampSec;
  expanded: boolean;
  onToggleExpanded: (rowKey: string) => void;
  onAttack: (row: PlayerRowModel) => void;
  onClaim: (row: PlayerRowModel) => void;
  claimPending: boolean;
};

function EstimatePill({
  row,
  ff,
}: {
  row: PlayerRowModel;
  ff: FFData | undefined;
}) {
  const known = row.estimate_available && row.estimate !== null;
  const text = known ? format_suffix_number(row.estimate ?? 0) : "?";
  // The estimate is colored by the same player's FF on the FF Color Scale
  // (ADR 0002); without a resolved FF it stays uncolored.
  if (ff && !ff.no_data) {
    const background = get_ff_colour(ff);
    return (
      <span
        className={cls.estimate}
        style={{ background, color: get_contrast_color(background) }}
        title={`FF ${format_ff_score(ff)}`}
      >
        {text}
      </span>
    );
  }
  return (
    <span
      className={cls.estimate}
      title={known ? "FF unknown" : "No estimate available"}
    >
      {text}
    </span>
  );
}

// The Board Target Status label. Color only reinforces the text, which always
// names the state on its own.
function StatusLabel({
  row,
  now,
}: {
  row: PlayerRowModel;
  now: TornTimestampSec;
}) {
  const view = resolve_board_status(row.status, now);
  let text: string;
  let tone: keyof typeof STATUS_TONE;
  let detail = row.status?.description ?? null;
  switch (view.kind) {
    case "unknown":
      return null;
    case "okay":
      text = "Okay";
      tone = "okay";
      break;
    case "okay_guess":
      text = "Okay?";
      tone = "okay";
      // Torn's description still describes the ended timer.
      detail = "Timer ended, not re-checked yet";
      break;
    case "timed":
      text = `${short_state(view.state)} ${format_countdown(view.remaining)}`;
      tone = "out";
      break;
    case "static":
      text = short_state(view.state);
      tone =
        view.state === "Traveling" || view.state === "Abroad"
          ? "away"
          : view.unavailable
            ? "out"
            : "other";
      break;
  }
  const checked =
    row.status_last_checked != null
      ? `checked ${format_short_age(now - row.status_last_checked)} ago`
      : null;
  const title = [detail, checked].filter(Boolean).join(" · ");
  return (
    <span
      className={`${cls.status} ${STATUS_TONE[tone]}`}
      title={title || undefined}
    >
      {text}
    </span>
  );
}

// The label sits inline between the name and the estimate in a narrow modal,
// so the long states and long timers are shortened to leave the name room.
// Torn's description in the tooltip still names the full state.
const SHORT_STATES: Record<string, string> = {
  Hospital: "Hosp",
  Traveling: "Trav",
};

function short_state(state: string): string {
  return SHORT_STATES[state] ?? state;
}

function format_countdown(remaining: number): string {
  if (remaining >= 3600) {
    return `${Math.floor(remaining / 3600)}h+`;
  }
  return format_duration_human(remaining, true);
}

const STATUS_TONE = {
  okay: cls.statusOkay,
  out: cls.statusOut,
  away: cls.statusAway,
  other: "",
};

export function BountyRow({
  row,
  ff,
  now,
  expanded,
  onToggleExpanded,
  onAttack,
  onClaim,
  claimPending,
}: BountyRowProps) {
  const [top, ...rest] = row.tiers;
  return (
    <li className={row.own_bounty ? `${cls.row} ${cls.own}` : cls.row}>
      <div className={cls.rowMain}>
        <a
          className={cls.name}
          href={`https://www.torn.com/profiles.php?XID=${row.player_id}`}
        >
          {row.name}
        </a>
        <StatusLabel row={row} now={now} />
        <EstimatePill row={row} ff={ff} />
        {rest.length > 0 ? (
          <button
            type="button"
            className={cls.tierToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} all bounty tiers for ${row.name}`}
            onClick={() => onToggleExpanded(row.row_key)}
          >
            {top ? format_tier_label(top) : ""} {expanded ? "▴" : "▾"}
          </button>
        ) : (
          <span className={cls.tierLabel}>
            {top ? format_tier_label(top) : ""}
          </span>
        )}
        {row.own_bounty ? null : (
          <>
            <button
              type="button"
              className={cls.action}
              aria-label={`Attack ${row.name}`}
              onClick={() => onAttack(row)}
            >
              Attack
            </button>
            <button
              type="button"
              className={cls.action}
              aria-label={`Claim bounty on ${row.name}`}
              disabled={claimPending}
              onClick={() => onClaim(row)}
            >
              Claim
            </button>
          </>
        )}
      </div>
      {row.own_bounty ? (
        <div className={cls.ownLabel} title={OWN_TITLE}>
          {OWN_LABEL}
        </div>
      ) : null}
      {expanded && rest.length > 0 ? (
        <ul className={cls.tierLadder}>
          {rest.map((tier) => (
            <li key={tier.price_per_hit}>then {format_tier_label(tier)}</li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

type FactionBountyCardProps = {
  card: FactionCardModel;
  expanded: boolean;
  onToggleExpanded: (factionId: number) => void;
  renderMember: (row: PlayerRowModel) => ReactNode;
};

export function FactionBountyCard({
  card,
  expanded,
  onToggleExpanded,
  renderMember,
}: FactionBountyCardProps) {
  const top = card.tiers[0];
  const label = card.faction_tag
    ? `[${card.faction_tag}] ${card.faction_name}`
    : card.faction_name;
  return (
    <li
      className={
        card.own_bounty ? `${cls.factionCard} ${cls.own}` : cls.factionCard
      }
    >
      <button
        type="button"
        className={cls.factionHeader}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} faction bounty on ${card.faction_name}`}
        onClick={() => onToggleExpanded(card.faction_id)}
      >
        <span className={cls.name}>{label}</span>
        <span className={cls.tierLabel}>
          {top ? format_tier_label(top) : ""}
        </span>
        <span className={cls.pool}>
          {card.total_remaining} hits shared {expanded ? "▴" : "▾"}
        </span>
      </button>
      {card.own_bounty ? (
        <div className={cls.ownLabel} title={OWN_TITLE}>
          {OWN_LABEL}
        </div>
      ) : null}
      {expanded ? (
        <ul className={cls.memberList}>{card.members.map(renderMember)}</ul>
      ) : null}
    </li>
  );
}
