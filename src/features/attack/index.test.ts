// @vitest-environment jsdom

import { TOAST_LEVEL, toast } from "@ui/toast";
import {
  api_error,
  CLAIM_CREATE_RESPONSE,
  ERROR_CONSENT_REQUIRED,
  ERROR_INVALID_KEY,
  ERROR_NO_OPEN_BOUNTIES,
  ERROR_RATE_LIMITED,
  ERROR_TORN_REJECTED_KEY,
  FACTION_TARGET,
  PLAYER_TARGET,
  SELLER_BOARD_RESPONSE,
} from "@utils/__fixtures__/bounty_board";
import type { BountySellerBoardResponse } from "@utils/api";
import {
  is_attack_bounty_silenced,
  silence_attack_bounty,
} from "@utils/bounty_attack_silence";
import { bounty_board_cache } from "@utils/bounty_board";
import { check_key_status } from "@utils/check_key";
import { ffconfig } from "@utils/ffconfig";
import type { PlayerId } from "@utils/types";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import attack, { unmount_bounty_row } from "./index";

vi.mock("@ui/info-line", () => ({
  FFHeaderLine: () => null,
}));

vi.mock("@utils/bounty_board", () => ({
  bounty_board_cache: { get_board: vi.fn(), submit_claim: vi.fn() },
}));

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_registered: vi.fn() },
}));

vi.mock("@ui/toast", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ui/toast")>()),
  toast: vi.fn(),
}));

// The attack page's header (h4 three levels down, as the info line injection
// expects) and the defender dialog's Start fight button, per the attack-page
// capture on issue #11. Join fight is the same button with different text.
const ATTACK_MARKUP = `
  <div id="attack-root"><div class="coreWrap"><div class="appHeaderWrapper">
    <div class="topSection"><div class="titleContainer"><h4>Attacking</h4></div></div>
  </div></div></div>
  <div class="dialog"><div class="dialogButtons___QBHoa">
    <button type="submit" class="torn-btn">Start fight</button>
  </div></div>`;

const open_attack = async (player_id: PlayerId) => {
  vi.stubGlobal("location", {
    href: `https://www.torn.com/page.php?sid=attack&user2ID=${player_id}`,
    search: `?sid=attack&user2ID=${player_id}`,
    hash: "",
  });
  document.body.innerHTML = ATTACK_MARKUP;
  await attack.run();
  await flush();
};

// The end-of-fight dialog replaces Start fight with the finishing moves, in
// the same dialogButtons container, per the capture on issue #12.
const finish_fight = (move: "leave" | "mug" | "hospitalize") => {
  const buttons = document.querySelector('[class*="dialogButtons"]');
  if (!buttons) throw new Error("No dialog buttons");
  buttons.innerHTML = `
    <button type="submit" class="torn-btn btn____CYQW silver">leave</button>
    <button type="submit" class="torn-btn btn____CYQW silver">mug</button>
    <button type="submit" class="torn-btn btn____CYQW silver">hospitalize</button>`;
  const button = [...buttons.querySelectorAll("button")].find(
    (b) => b.textContent === move,
  );
  button?.click();
};

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const row = () =>
  document.querySelector(".ffscouter-info-line #ffscouter-attack-bounty-row");

const claim_button = () =>
  row()?.querySelector<HTMLButtonElement>("button") ?? null;

const board_with = (
  targets: BountySellerBoardResponse["board"]["targets"],
): BountySellerBoardResponse => ({
  ...SELLER_BOARD_RESPONSE,
  board: { ...SELLER_BOARD_RESPONSE.board, targets },
});

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  ffconfig.key = "test-key";
  vi.mocked(check_key_status.is_registered).mockResolvedValue(true);
  vi.mocked(bounty_board_cache.get_board).mockResolvedValue(
    board_with([PLAYER_TARGET, FACTION_TARGET]),
  );
  vi.mocked(bounty_board_cache.submit_claim).mockResolvedValue(
    CLAIM_CREATE_RESPONSE,
  );
});

afterEach(() => {
  unmount_bounty_row();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  ffconfig.reset();
  ffconfig.key = "";
});

describe("attack page bounty row", () => {
  test("a player bounty target gets the row below the info line", async () => {
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()?.textContent).toContain("$700k per hit");
    expect(row()?.textContent).toContain("9 hits remaining");
    // Board reads go through the shared cache, whose freshness floor decides
    // whether a real fetch happens.
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });

  test("a bountied faction's member gets the faction pool's row", async () => {
    await open_attack(400003);
    expect(row()?.textContent).toContain("$300k per hit");
    expect(row()?.textContent).toContain("10 hits remaining");
  });

  test("a target on no bounty gets nothing", async () => {
    await open_attack(1);
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
    expect(row()).toBeNull();
  });

  test("master toggle off: no board read, no row", async () => {
    ffconfig.bounty_board_enabled = false;
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
    expect(row()).toBeNull();
  });

  test("turning the master toggle off removes the row; back on restores it", async () => {
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).not.toBeNull();

    ffconfig.bounty_board_enabled = false;
    window.dispatchEvent(new Event("ff-config-updated"));
    await flush();
    expect(row()).toBeNull();

    ffconfig.bounty_board_enabled = true;
    window.dispatchEvent(new Event("ff-config-updated"));
    await flush();
    expect(row()).not.toBeNull();
  });

  test("keyless: no board read, no row, no prompt", async () => {
    ffconfig.key = "";
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
    expect(row()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  test.each([
    ["unconsented (403 code 86)", api_error(ERROR_CONSENT_REQUIRED, 403)],
    ["invalid key (code 6)", api_error(ERROR_INVALID_KEY, 401)],
  ])("%s: no row, no prompt, silenced for the hourly re-check", async (_label, err) => {
    vi.mocked(bounty_board_cache.get_board).mockRejectedValue(err);
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(document.querySelector("button")?.textContent).toBe("Start fight");
    expect(is_attack_bounty_silenced()).toBe(true);
  });

  test("unregistered key: no row, no prompt, silenced", async () => {
    vi.mocked(check_key_status.is_registered).mockResolvedValue(false);
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(is_attack_bounty_silenced()).toBe(true);
  });

  test("an unknown registration status fails open", async () => {
    vi.mocked(check_key_status.is_registered).mockResolvedValue(null);
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).not.toBeNull();
  });

  test("while silenced the attack page makes no board read", async () => {
    silence_attack_bounty();
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
    expect(check_key_status.is_registered).not.toHaveBeenCalled();
    expect(row()).toBeNull();
  });

  test("a transient board failure shows no row and does not silence", async () => {
    vi.mocked(bounty_board_cache.get_board).mockRejectedValue(
      new Error("Network error"),
    );
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(is_attack_bounty_silenced()).toBe(false);
  });

  test("Start/Join fight clicks re-read the board and update the row", async () => {
    await open_attack(PLAYER_TARGET.target_player_id);
    expect(row()).not.toBeNull();

    // The bounty was exhausted between page open and the click.
    vi.mocked(bounty_board_cache.get_board).mockResolvedValue(
      board_with([FACTION_TARGET]),
    );
    const start = document.querySelector<HTMLButtonElement>(
      '[class*="dialogButtons"] button',
    );
    start?.click();
    await flush();
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(2);
    expect(row()).toBeNull();
  });

  describe("auto-claim", () => {
    test("hospitalize on a player bounty target POSTs the claim without reading the board", async () => {
      await open_attack(PLAYER_TARGET.target_player_id);
      finish_fight("hospitalize");
      await flush();
      // The cache supplies referrer_player_id and never monitoring_started_at;
      // eligibility is last-known.
      expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
        target_player_id: PLAYER_TARGET.target_player_id,
      });
      expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
    });

    test("success toasts and gives the claim button a checkmark", async () => {
      await open_attack(PLAYER_TARGET.target_player_id);
      expect(claim_button()?.textContent).toBe("Claim");
      finish_fight("hospitalize");
      await flush();
      expect(toast).toHaveBeenCalledWith(
        "Bounty claim submitted automatically.",
      );
      expect(claim_button()?.textContent).toBe("Claim ✓");
      expect(claim_button()?.disabled).toBe(false);
    });

    test("hospitalizing a bountied faction's member POSTs the faction target", async () => {
      await open_attack(400003);
      finish_fight("hospitalize");
      await flush();
      expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
        target_faction_id: FACTION_TARGET.target_faction_id,
      });
    });

    test.each([
      ["409 code 91 (exhausted or raced)", ERROR_NO_OPEN_BOUNTIES, 409],
      ["a rate limit", ERROR_RATE_LIMITED, 429],
    ])("failure on %s toasts the API's message and leaves the manual button", async (_label, body, status) => {
      vi.mocked(bounty_board_cache.submit_claim).mockRejectedValue(
        api_error(body, status),
      );
      await open_attack(PLAYER_TARGET.target_player_id);
      finish_fight("hospitalize");
      await flush();
      expect(toast).toHaveBeenCalledWith(body.error, TOAST_LEVEL.ERROR);
      expect(claim_button()?.textContent).toBe("Claim");
      expect(claim_button()?.disabled).toBe(false);
    });

    test.each([
      "leave",
      "mug",
    ] as const)("%s claims nothing and doesn't re-read the board", async (move) => {
      await open_attack(PLAYER_TARGET.target_player_id);
      finish_fight(move);
      await flush();
      expect(bounty_board_cache.submit_claim).not.toHaveBeenCalled();
      expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
    });

    test("hospitalizing a target on no bounty claims nothing", async () => {
      await open_attack(1);
      finish_fight("hospitalize");
      await flush();
      expect(bounty_board_cache.submit_claim).not.toHaveBeenCalled();
    });

    test("bounties turned off: hospitalize claims nothing", async () => {
      await open_attack(PLAYER_TARGET.target_player_id);
      ffconfig.bounty_board_enabled = false;
      window.dispatchEvent(new Event("ff-config-updated"));
      await flush();
      finish_fight("hospitalize");
      await flush();
      expect(bounty_board_cache.submit_claim).not.toHaveBeenCalled();
    });

    test("every hospitalize claims again, since a target who meds out can be hospitalized again", async () => {
      await open_attack(PLAYER_TARGET.target_player_id);
      finish_fight("hospitalize");
      await flush();
      finish_fight("hospitalize");
      await flush();
      expect(bounty_board_cache.submit_claim).toHaveBeenCalledTimes(2);
    });

    test("a manual claim after auto-claim surfaces no error", async () => {
      await open_attack(PLAYER_TARGET.target_player_id);
      finish_fight("hospitalize");
      await flush();
      claim_button()?.click();
      await flush();
      expect(bounty_board_cache.submit_claim).toHaveBeenCalledTimes(2);
      expect(toast).not.toHaveBeenCalledWith(
        expect.anything(),
        TOAST_LEVEL.ERROR,
      );
      expect(claim_button()?.textContent).toBe("Claim ✓");
    });
  });

  describe("manual claim", () => {
    test("Claim POSTs the target, toasts success and shows the checkmark", async () => {
      let resolve_claim = () => {};
      vi.mocked(bounty_board_cache.submit_claim).mockReturnValue(
        new Promise((resolve) => {
          resolve_claim = () => resolve(CLAIM_CREATE_RESPONSE);
        }),
      );
      await open_attack(PLAYER_TARGET.target_player_id);
      claim_button()?.click();
      await flush();
      expect(claim_button()?.disabled).toBe(true);
      resolve_claim();
      await flush();
      expect(bounty_board_cache.submit_claim).toHaveBeenCalledWith({
        target_player_id: PLAYER_TARGET.target_player_id,
      });
      expect(toast).toHaveBeenCalledWith("Bounty claim submitted.");
      expect(claim_button()?.textContent).toBe("Claim ✓");
      expect(claim_button()?.disabled).toBe(false);
    });

    test("400 code 87 (key lacks attacks access) toasts the API's message", async () => {
      vi.mocked(bounty_board_cache.submit_claim).mockRejectedValue(
        api_error(ERROR_TORN_REJECTED_KEY, 400),
      );
      await open_attack(PLAYER_TARGET.target_player_id);
      claim_button()?.click();
      await flush();
      expect(toast).toHaveBeenCalledWith(
        ERROR_TORN_REJECTED_KEY.error,
        TOAST_LEVEL.ERROR,
      );
      expect(claim_button()?.textContent).toBe("Claim");
    });
  });

  test("other clicks don't re-read the board", async () => {
    await open_attack(PLAYER_TARGET.target_player_id);
    document.querySelector("h4")?.click();
    await flush();
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });
});
