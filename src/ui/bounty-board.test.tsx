// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  CLAIM_CREATE_RESPONSE,
  ERROR_CONSENT_REQUIRED,
  ERROR_INVALID_KEY,
  ERROR_NO_OPEN_BOUNTIES,
  PLAYER_TARGET,
  POLICY_ACCEPT_RESPONSE,
  SELLER_BOARD_RESPONSE,
} from "@utils/__fixtures__/bounty_board";
import {
  accept_bounty_seller_policy,
  type BountySellerBoardResponse,
  FFApiError,
  type FFError,
} from "@utils/api";
import { bounty_board_cache } from "@utils/bounty_board";
import { check_key_status } from "@utils/check_key";
import { getLocalUserId, open_attack_link } from "@utils/dom";
import { ffconfig, WarQuickAttackAction } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { FFDataComplete, PlayerId } from "@utils/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BountyBoard } from "./bounty-board";
import { TOAST_LEVEL, toast } from "./toast";

vi.mock("@utils/bounty_board", () => ({
  bounty_board_cache: {
    get_board: vi.fn(),
    submit_claim: vi.fn(),
    clear_failure: vi.fn(),
  },
}));

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_registered: vi.fn() },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get: vi.fn(), complete: vi.fn() },
}));

vi.mock("@utils/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/dom")>()),
  getLocalUserId: vi.fn(),
  open_attack_link: vi.fn(),
}));

vi.mock("@utils/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api")>()),
  accept_bounty_seller_policy: vi.fn(),
}));

vi.mock("./toast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./toast")>()),
  toast: vi.fn(),
}));

function ff_complete(player_id: PlayerId, fair_fight: number): FFDataComplete {
  return {
    player_id,
    no_data: false,
    fair_fight,
    last_updated: Date.now() / 1000,
    bs_estimate: 0,
    bs_estimate_human: "0",
    bss_public: 0,
    source: "bss",
    premium_insights_available: false,
    available_estimates: { bss: null, spies: null, premium: null },
    spies: [],
  };
}

const api_error = (body: FFError, status: number) =>
  new FFApiError(
    `API request failed. Error: ${body.error}; Code: ${body.code}`,
    {
      ff_api_error: body,
      ff_http_status: status,
    },
  );

// SELLER_BOARD_RESPONSE (a player target and the faction target) plus a
// player target disabled because the user is the target.
const BOARD: BountySellerBoardResponse = {
  ...SELLER_BOARD_RESPONSE,
  board: {
    ...SELLER_BOARD_RESPONSE.board,
    targets: [
      ...SELLER_BOARD_RESPONSE.board.targets,
      {
        ...PLAYER_TARGET,
        target_player_id: 999,
        target_name: "DisabledTarget",
        max_price_per_hit: 9_000_000,
        disabled: true,
        disabled_reason: "target",
      },
    ],
  },
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  ffconfig.key = "test-key";
  vi.mocked(check_key_status.is_registered).mockResolvedValue(true);
  vi.mocked(bounty_board_cache.get_board).mockResolvedValue(BOARD);
  vi.mocked(getLocalUserId).mockResolvedValue("1000001");
  vi.mocked(ffscouter.get).mockImplementation(async (id) =>
    id === 267456763 ? ff_complete(id, 4.5) : { no_data: true, player_id: id },
  );
});

afterEach(() => {
  ffconfig.reset();
  ffconfig.key = "";
});

// Two containers, one shared row component: every board behavior must work
// identically in the desktop modal and the narrow/mobile in-flow section.
describe.each(["modal", "section"] as const)("%s", (variant) => {
  const Shell = () => <BountyBoard variant={variant} />;
  test("renders the branded board with enabled targets sorted by top price", async () => {
    render(<Shell />);
    expect(screen.getByRole("heading").textContent).toBe("FF Scouter Bounties");

    await screen.findByText("Arcanine");
    expect(screen.queryByText("DisabledTarget")).toBeNull();
    const labels = Array.from(document.querySelectorAll("li")).map(
      (li) => li.textContent ?? "",
    );
    // Arcanine ($700k) ranks above the Kanto Starters faction card ($300k).
    const arcanine = labels.findIndex((t) => t.includes("Arcanine"));
    const kanto = labels.findIndex((t) => t.includes("Kanto Starters"));
    expect(arcanine).toBeGreaterThanOrEqual(0);
    expect(arcanine).toBeLessThan(kanto);
    expect(document.body.textContent).toContain("$700k × 3");
  });

  test("colors the estimate by the joined FF from the stats cache", async () => {
    render(<Shell />);
    await screen.findByText("Arcanine");
    await waitFor(() => {
      const pill = screen.getByText("2.99b");
      expect(pill.getAttribute("title")).toContain("FF 4.50");
      expect(pill.style.background).not.toBe("");
    });
    expect(ffscouter.get).toHaveBeenCalledWith(267456763);
    expect(ffscouter.complete).toHaveBeenCalled();
    // Collapsed faction rosters are not looked up.
    expect(ffscouter.get).not.toHaveBeenCalledWith(400001);
  });

  test("expanding a row discloses the rest of the tier ladder", async () => {
    render(<Shell />);
    await screen.findByText("Arcanine");
    expect(document.body.textContent).not.toContain("then $500k × 6");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Show all bounty tiers for Arcanine/,
      }),
    );
    expect(document.body.textContent).toContain("then $500k × 6");
  });

  test("a faction card expands into member rows and looks up their FF", async () => {
    render(<Shell />);
    await screen.findByText("Arcanine");
    expect(screen.queryByText("Blastoise")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: /Expand faction bounty on Kanto Starters/,
      }),
    );
    await screen.findByText("Blastoise");
    expect(screen.getByText("Wartortle")).toBeTruthy();
    await waitFor(() => expect(ffscouter.get).toHaveBeenCalledWith(400001));
  });

  test("filters narrow rows but never hide unknown-estimate targets", async () => {
    render(<Shell />);
    await screen.findByText("Arcanine");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Expand faction bounty on Kanto Starters/,
      }),
    );
    await screen.findByText("Blastoise");

    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Only show targets with stats less than",
      }),
      { target: { value: "500m" } },
    );
    expect(screen.queryByText("Arcanine")).toBeNull();
    expect(screen.queryByText("Blastoise")).toBeNull();
    expect(screen.getByText("Wartortle")).toBeTruthy(); // unknown estimate
    expect(screen.getByText("Squirtle")).toBeTruthy();
  });

  test("view state (filters, expansion) survives a remount", async () => {
    const first = render(<Shell />);
    await screen.findByText("Arcanine");
    fireEvent.change(
      screen.getByRole("textbox", {
        name: "Only show targets with FF less than",
      }),
      { target: { value: "3" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Expand faction bounty on Kanto Starters/,
      }),
    );
    first.unmount();

    render(<Shell />);
    await screen.findByText("Blastoise");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Only show targets with FF less than",
        }) as HTMLInputElement
      ).value,
    ).toBe("3");
    // Arcanine's FF 4.5 is hidden by the persisted FF filter.
    await waitFor(() => expect(screen.queryByText("Arcanine")).toBeNull());
  });

  test("the user's own bounty is shown and marked, with no Attack or Claim", async () => {
    vi.mocked(bounty_board_cache.get_board).mockResolvedValue({
      ...SELLER_BOARD_RESPONSE,
      board: {
        ...SELLER_BOARD_RESPONSE.board,
        targets: [
          {
            ...PLAYER_TARGET,
            target_player_id: 998,
            target_name: "OwnTarget",
            disabled: true,
            disabled_reason: "buyer",
          },
        ],
      },
    });
    render(<Shell />);
    await screen.findByText("OwnTarget");
    expect(screen.getByText("Your bounty – not claimable by you")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Attack OwnTarget" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Claim bounty on OwnTarget" }),
    ).toBeNull();
    expect(document.body.textContent).not.toContain(
      "No open FF Scouter Bounties",
    );
    expect(ffscouter.get).not.toHaveBeenCalledWith(998);
  });

  test("Attack honors the bounty attack-open setting", async () => {
    render(<Shell />);
    await screen.findByText("Arcanine");
    fireEvent.click(screen.getByRole("button", { name: "Attack Arcanine" }));
    expect(open_attack_link).toHaveBeenLastCalledWith(267456763, {
      openInNewTab: true,
    });

    ffconfig.bounty_attack_action = WarQuickAttackAction.CURRENT;
    fireEvent.click(screen.getByRole("button", { name: "Attack Arcanine" }));
    expect(open_attack_link).toHaveBeenLastCalledWith(267456763, {
      openInNewTab: false,
    });
  });

  test("Claim posts the player hint and toasts success", async () => {
    vi.mocked(bounty_board_cache.submit_claim).mockResolvedValue(
      CLAIM_CREATE_RESPONSE,
    );
    render(<Shell />);
    await screen.findByText("Arcanine");
    fireEvent.click(
      screen.getByRole("button", { name: "Claim bounty on Arcanine" }),
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Bounty claim submitted for Arcanine.",
      ),
    );
    expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
      target_player_id: 267456763,
    });
  });

  test("Claim on a faction member posts the faction hint and toasts API errors", async () => {
    vi.mocked(bounty_board_cache.submit_claim).mockRejectedValue(
      api_error(ERROR_NO_OPEN_BOUNTIES, 409),
    );
    render(<Shell />);
    await screen.findByText("Arcanine");
    fireEvent.click(
      screen.getByRole("button", {
        name: /Expand faction bounty on Kanto Starters/,
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Claim bounty on Blastoise" }),
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        ERROR_NO_OPEN_BOUNTIES.error,
        TOAST_LEVEL.ERROR,
      ),
    );
    expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
      target_faction_id: 6731,
    });
  });

  test("consent: 403 code 86 → explicit confirmation → acceptance POST → board loads in place", async () => {
    vi.mocked(bounty_board_cache.get_board)
      .mockRejectedValueOnce(api_error(ERROR_CONSENT_REQUIRED, 403))
      .mockResolvedValue(BOARD);
    vi.mocked(accept_bounty_seller_policy).mockResolvedValue({
      result: POLICY_ACCEPT_RESPONSE,
      blank: false,
    });

    render(<Shell />);
    const confirm = await screen.findByRole("button", {
      name: "I have read the rules and data policy",
    });
    expect(
      screen
        .getByRole("link", { name: "Bounty Board Data Policy and Rules" })
        .getAttribute("href"),
    ).toBe("https://ffscouter.com/claim-bounties");
    // Nothing is accepted on the user's behalf before the click.
    expect(accept_bounty_seller_policy).not.toHaveBeenCalled();

    fireEvent.click(confirm);
    await screen.findByText("Arcanine");
    expect(accept_bounty_seller_policy).toHaveBeenCalledWith("test-key", true);
    expect(bounty_board_cache.clear_failure).toHaveBeenCalled();
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(2);
  });

  test("consent acceptance failure toasts and stays on the consent state", async () => {
    vi.mocked(bounty_board_cache.get_board).mockRejectedValue(
      api_error(ERROR_CONSENT_REQUIRED, 403),
    );
    vi.mocked(accept_bounty_seller_policy).mockRejectedValue(new Error("nope"));

    render(<Shell />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "I have read the rules and data policy",
      }),
    );
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("nope", TOAST_LEVEL.ERROR),
    );
    expect(bounty_board_cache.clear_failure).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "I have read the rules and data policy",
      }),
    ).toBeTruthy();
  });

  test("a missing key shows the key nudge and never fetches the board", async () => {
    ffconfig.key = "";
    render(<Shell />);
    expect(document.body.textContent).toContain(
      "FF Scouter Bounties need your FF Scouter API key",
    );
    const link = await screen.findByRole("link", {
      name: "FF Scouter Settings",
    });
    expect(link.getAttribute("href")).toBe(
      "https://www.torn.com/profiles.php?XID=1000001#ff-scouter-api-key",
    );
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
  });

  test("an unregistered key shows the nudge (check-key false or board code 6)", async () => {
    vi.mocked(check_key_status.is_registered).mockResolvedValue(false);
    const first = render(<Shell />);
    await screen.findByText(/isn't registered/);
    expect(screen.queryByText("Arcanine")).toBeNull();
    first.unmount();

    vi.mocked(check_key_status.is_registered).mockResolvedValue(null);
    vi.mocked(bounty_board_cache.get_board).mockRejectedValue(
      api_error(ERROR_INVALID_KEY, 403),
    );
    render(<Shell />);
    await screen.findByText(/isn't registered/);
  });
});

test("minimizing hides the body and persists", async () => {
  const first = render(<BountyBoard variant="modal" />);
  await screen.findByText("Arcanine");
  fireEvent.click(
    screen.getByRole("button", { name: "Minimize FF Scouter Bounties" }),
  );
  expect(screen.queryByText("Arcanine")).toBeNull();
  first.unmount();

  render(<BountyBoard variant="modal" />);
  expect(
    screen.getByRole("button", { name: "Expand FF Scouter Bounties" }),
  ).toBeTruthy();
  expect(screen.queryByText("Arcanine")).toBeNull();
});

test("the section collapses, persists it, and stays in-flow", async () => {
  const first = render(<BountyBoard variant="section" />);
  await screen.findByText("Arcanine");
  const section = screen.getByRole("region", { name: "FF Scouter Bounties" });
  expect(section.className).toContain("ff-bounty-modal--in-flow");
  fireEvent.click(
    screen.getByRole("button", { name: "Collapse FF Scouter Bounties" }),
  );
  expect(screen.queryByText("Arcanine")).toBeNull();
  first.unmount();

  render(<BountyBoard variant="section" />);
  expect(
    screen
      .getByRole("button", { name: "Expand FF Scouter Bounties" })
      .getAttribute("aria-expanded"),
  ).toBe("false");
  expect(screen.queryByText("Arcanine")).toBeNull();
});

test("switching variants keeps the loaded board and view state", async () => {
  const { rerender } = render(<BountyBoard variant="modal" />);
  await screen.findByText("Arcanine");
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "Only show targets with FF less than",
    }),
    { target: { value: "9" } },
  );

  rerender(<BountyBoard variant="section" />);
  expect(
    screen.getByRole("region", { name: "FF Scouter Bounties" }).className,
  ).toContain("ff-bounty-modal--in-flow");
  expect(screen.getByText("Arcanine")).toBeTruthy();
  expect(
    (
      screen.getByRole("textbox", {
        name: "Only show targets with FF less than",
      }) as HTMLInputElement
    ).value,
  ).toBe("9");
  expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);

  rerender(<BountyBoard variant="modal" />);
  expect(
    screen.getByRole("region", { name: "FF Scouter Bounties" }).className,
  ).not.toContain("ff-bounty-modal--in-flow");
  expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
});
