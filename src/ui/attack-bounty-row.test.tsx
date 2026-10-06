// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import type { BountyMatch } from "@utils/bounty_match";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AttackBountyRow } from "./attack-bounty-row";

// Claiming itself (the POST and its toasts) is the attack feature's; the row
// only renders the claim state it's given.
const IDLE = { claimPending: false, claimed: false, onClaim: () => {} };

const PLAYER_MATCH: BountyMatch = {
  claim_target: { target_player_id: 267456763 },
  tiers: [
    { price_per_hit: 700000, quantity_remaining: 3 },
    { price_per_hit: 500000, quantity_remaining: 6 },
  ],
  total_remaining: 9,
};

const FACTION_MATCH: BountyMatch = {
  claim_target: { target_faction_id: 6731 },
  tiers: [{ price_per_hit: 300000, quantity_remaining: 10 }],
  total_remaining: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("AttackBountyRow", () => {
  test("shows the FF Scouter branding, price per hit and hits remaining", () => {
    render(<AttackBountyRow {...IDLE} match={PLAYER_MATCH} />);
    const row = document.getElementById("ffscouter-attack-bounty-row");
    expect(row?.textContent).toContain("FF Scouter Bounty:");
    expect(row?.textContent).toContain("$700k per hit");
    expect(row?.textContent).toContain("9 hits remaining");
  });

  test("discloses the tier ladder, since the price drops once the top tier is spent", () => {
    render(<AttackBountyRow {...IDLE} match={PLAYER_MATCH} />);
    expect(screen.getByText("$700k per hit").getAttribute("title")).toBe(
      "$700k × 3, then $500k × 6",
    );
  });

  test("uses the singular for one hit remaining", () => {
    render(
      <AttackBountyRow
        {...IDLE}
        match={{
          ...FACTION_MATCH,
          tiers: [{ price_per_hit: 300000, quantity_remaining: 1 }],
          total_remaining: 1,
        }}
      />,
    );
    expect(screen.getByText("1 hit remaining")).toBeTruthy();
  });

  test("Claim calls onClaim", () => {
    const onClaim = vi.fn();
    render(
      <AttackBountyRow {...IDLE} match={PLAYER_MATCH} onClaim={onClaim} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  test("Claim is disabled while a claim is pending", () => {
    render(<AttackBountyRow {...IDLE} match={PLAYER_MATCH} claimPending />);
    const claim = screen.getByRole<HTMLButtonElement>("button");
    expect(claim.disabled).toBe(true);
  });

  test("a claim that went in shows a checkmark and stays clickable", () => {
    render(<AttackBountyRow {...IDLE} match={PLAYER_MATCH} claimed />);
    const claim = screen.getByRole<HTMLButtonElement>("button");
    expect(claim.textContent).toBe("Claim ✓");
    expect(claim.disabled).toBe(false);
  });
});
