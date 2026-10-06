// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  api_error,
  CLAIM_CREATE_RESPONSE,
  FACTION_CLAIM_CREATE_RESPONSE,
} from "@utils/__fixtures__/bounty_board";
import { bounty_board_cache } from "@utils/bounty_board";
import type { BountyMatch } from "@utils/bounty_match";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AttackBountyRow } from "./attack-bounty-row";
import { TOAST_LEVEL, toast } from "./toast";

vi.mock("@utils/bounty_board", () => ({
  bounty_board_cache: { submit_claim: vi.fn() },
}));

vi.mock("./toast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./toast")>()),
  toast: vi.fn(),
}));

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
    render(<AttackBountyRow match={PLAYER_MATCH} />);
    const row = document.getElementById("ffscouter-attack-bounty-row");
    expect(row?.textContent).toContain("FF Scouter Bounty:");
    expect(row?.textContent).toContain("$700k per hit");
    expect(row?.textContent).toContain("9 hits remaining");
  });

  test("discloses the tier ladder, since the price drops once the top tier is spent", () => {
    render(<AttackBountyRow match={PLAYER_MATCH} />);
    expect(screen.getByText("$700k per hit").getAttribute("title")).toBe(
      "$700k × 3, then $500k × 6",
    );
  });

  test("uses the singular for one hit remaining", () => {
    render(
      <AttackBountyRow
        match={{
          ...FACTION_MATCH,
          tiers: [{ price_per_hit: 300000, quantity_remaining: 1 }],
          total_remaining: 1,
        }}
      />,
    );
    expect(screen.getByText("1 hit remaining")).toBeTruthy();
  });

  test("claim POSTs the player target and toasts success", async () => {
    vi.mocked(bounty_board_cache.submit_claim).mockResolvedValue(
      CLAIM_CREATE_RESPONSE,
    );
    render(<AttackBountyRow match={PLAYER_MATCH} />);
    const claim = screen.getByRole("button", { name: "Claim" });
    fireEvent.click(claim);
    expect((claim as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Bounty claim submitted."),
    );
    // The cache supplies referrer_player_id and never monitoring_started_at.
    expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
      target_player_id: 267456763,
    });
    expect((claim as HTMLButtonElement).disabled).toBe(false);
  });

  test("claim on a faction member POSTs the faction target", async () => {
    vi.mocked(bounty_board_cache.submit_claim).mockResolvedValue(
      FACTION_CLAIM_CREATE_RESPONSE,
    );
    render(<AttackBountyRow match={FACTION_MATCH} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
      target_faction_id: 6731,
    });
  });

  test.each([
    [
      "409 code 91 (exhausted or raced)",
      { code: 91, error: "Bounty exhausted or already claimed." },
      409,
    ],
    [
      "400 code 87 (key lacks attacks access)",
      { code: 87, error: "Your API key lacks attacks access." },
      400,
    ],
  ])("claim failure %s toasts the API's message", async (_label, err, status) => {
    vi.mocked(bounty_board_cache.submit_claim).mockRejectedValue(
      api_error(err, status),
    );
    render(<AttackBountyRow match={PLAYER_MATCH} />);
    fireEvent.click(screen.getByRole("button", { name: "Claim" }));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(err.error, TOAST_LEVEL.ERROR),
    );
  });
});
