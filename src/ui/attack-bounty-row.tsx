// The Attack Page Bounty Row: informational before the fight (price per hit
// and hits remaining, so the bounty can factor into the finishing-move
// choice — only hospitalizations pay) and the manual Claim fallback. Branded
// FF Scouter so it never reads as a Torn Bounty.
import type { BountyMatch } from "@utils/bounty_match";
import { format_suffix_number } from "@utils/strings";
import styles from "./attack-bounty-row.module.css";
import { format_tier_label } from "./bounty-board-rows";

const cls = {
  row: styles["ffscouter-attack-bounty-row"],
  label: styles["ffscouter-attack-bounty-row__label"],
  claim: styles["ffscouter-attack-bounty-row__claim"],
};

export const CLAIM_SUBMITTED = "Bounty claim submitted";

// Claim state lives with the attack feature, which shares it between the
// manual button and auto-claim on hospitalize.
export function AttackBountyRow({
  match,
  claimPending,
  claimed,
  onClaim,
}: {
  match: BountyMatch;
  claimPending: boolean;
  // A claim went in: the checkmark makes a manual click unnecessary, but the
  // button stays clickable as the fallback (re-claiming is harmless).
  claimed: boolean;
  onClaim: () => void;
}) {
  const top = match.tiers[0];
  const remaining = match.total_remaining;

  return (
    <div id="ffscouter-attack-bounty-row" className={cls.row}>
      <span className={cls.label}>FF Scouter Bounty:</span>
      {top ? (
        // Once the top tier is spent the payout drops, so the full ladder is
        // disclosed rather than only the headline price.
        <span title={match.tiers.map(format_tier_label).join(", then ")}>
          ${format_suffix_number(top.price_per_hit)} per hit
        </span>
      ) : null}
      <span>
        {remaining} {remaining === 1 ? "hit" : "hits"} remaining
      </span>
      <button
        type="button"
        className={cls.claim}
        disabled={claimPending}
        title={claimed ? CLAIM_SUBMITTED : undefined}
        onClick={onClaim}
      >
        {claimed ? "Claim ✓" : "Claim"}
      </button>
    </div>
  );
}
