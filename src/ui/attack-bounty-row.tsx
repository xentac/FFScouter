// The Attack Page Bounty Row: informational before the fight (price per hit
// and hits remaining, so the bounty can factor into the finishing-move
// choice — only hospitalizations pay) and the manual Claim fallback. Branded
// FF Scouter so it never reads as a Torn Bounty.
import type { BountyMatch } from "@utils/bounty_match";
import { format_suffix_number } from "@utils/strings";
import { useState } from "react";
import styles from "./attack-bounty-row.module.css";
import { format_tier_label } from "./bounty-board-rows";
import { submit_claim_with_toast } from "./bounty-claim";

const cls = {
  row: styles["ffscouter-attack-bounty-row"],
  label: styles["ffscouter-attack-bounty-row__label"],
  claim: styles["ffscouter-attack-bounty-row__claim"],
};

export function AttackBountyRow({ match }: { match: BountyMatch }) {
  const [claimPending, setClaimPending] = useState(false);
  const top = match.tiers[0];
  const remaining = match.total_remaining;

  // Fire-and-acknowledge, as on the board.
  const handleClaim = () => {
    setClaimPending(true);
    void submit_claim_with_toast(
      match.claim_target,
      "Bounty claim submitted.",
    ).finally(() => {
      setClaimPending(false);
    });
  };

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
        onClick={handleClaim}
      >
        Claim
      </button>
    </div>
  );
}
