// Shared FF Scouter Bounties row shapes. Container-agnostic on purpose: the
// desktop floating modal and the narrow/mobile in-flow section render these
// unchanged.
import {
  format_ff_score,
  format_suffix_number,
  get_contrast_color,
  get_ff_colour,
} from "@utils/strings";
import type { FFData } from "@utils/types";
import type { ReactNode } from "react";
import { cls } from "./bounty-board-classes";
import type { FactionCardModel, PlayerRowModel } from "./bounty-board-rows";
import { format_tier_label } from "./bounty-board-rows";

type BountyRowProps = {
  row: PlayerRowModel;
  // undefined = FF lookup not resolved yet.
  ff: FFData | undefined;
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

export function BountyRow({
  row,
  ff,
  expanded,
  onToggleExpanded,
  onAttack,
  onClaim,
  claimPending,
}: BountyRowProps) {
  const [top, ...rest] = row.tiers;
  return (
    <li className={cls.row}>
      <div className={cls.rowMain}>
        <a
          className={cls.name}
          href={`https://www.torn.com/profiles.php?XID=${row.player_id}`}
        >
          {row.name}
        </a>
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
      </div>
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
    <li className={cls.factionCard}>
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
      {expanded ? (
        <ul className={cls.memberList}>{card.members.map(renderMember)}</ul>
      ) : null}
    </li>
  );
}
