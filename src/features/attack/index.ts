import { AttackBountyRow, CLAIM_SUBMITTED } from "@ui/attack-bounty-row";
import { classify_board_error } from "@ui/bounty-board-rows";
import { submit_claim_with_toast } from "@ui/bounty-claim";
import { FFHeaderLine } from "@ui/info-line";
import {
  is_attack_bounty_silenced,
  silence_attack_bounty,
} from "@utils/bounty_attack_silence";
import { bounty_board_cache } from "@utils/bounty_board";
import { type BountyMatch, find_bounty_match } from "@utils/bounty_match";
import { check_key_status } from "@utils/check_key";
import {
  create_info_line,
  extract_id_from_url,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { mountComponent } from "@utils/react";
import type { PlayerId } from "@utils/types";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:attack");

// The defender dialog's fight button: "Start fight", or "Join fight" when
// someone is already attacking — the same button with different text.
const FIGHT_BUTTON = '[class*="dialogButtons"] button';

// The Attack Page Bounty Row's state: the page's target and info line, and
// the single tracked row root (ADR 0010), rendered inside the info line so it
// sits directly below it wherever the info line is placed.
let attack_target: { player_id: PlayerId; info_line: Element } | null = null;
let bounty_row: {
  root: Root;
  container: HTMLElement;
  // Last-known eligibility: auto-claim posts on this, never waiting on a
  // board read, because the POST itself is authoritative.
  match: BountyMatch;
  // Claims in flight (auto-claim never waits on one) and whether any went in.
  in_flight: number;
  claimed: boolean;
} | null = null;
// Bumped on every sync, so a slow board read never overwrites a newer one.
let sync_generation = 0;
let listening = false;

export function unmount_bounty_row() {
  if (!bounty_row) return;
  bounty_row.root.unmount();
  bounty_row.container.remove();
  bounty_row = null;
}

// Gates are silent here: keyless, unconsented, and unregistered users get no
// row and no prompt — consent is collected only in the Bounty Board Modal.
// The master toggle off removes the row and stops all bounty traffic.
async function sync_bounty_row() {
  const gen = ++sync_generation;
  if (
    !attack_target ||
    !ffconfig.bounty_board_enabled ||
    !ffconfig.key ||
    is_attack_bounty_silenced()
  ) {
    unmount_bounty_row();
    return;
  }
  const { player_id, info_line } = attack_target;

  // The board read goes through the shared Bounty Board Cache: its freshness
  // floor decides whether a real fetch happens, so opening an attack seconds
  // after the bounties page doesn't double-fetch.
  const [registered, result] = await Promise.all([
    check_key_status.is_registered().catch(() => null),
    bounty_board_cache.get_board().then(
      (response) => ({ ok: true as const, response }),
      (err: unknown) => ({ ok: false as const, err }),
    ),
  ]);
  if (gen !== sync_generation) return;

  // Only an explicit false silences; null (unknown) fails open.
  let gate_failed = registered === false;
  if (!result.ok) {
    const phase = classify_board_error(result.err).phase;
    gate_failed ||= phase === "consent" || phase === "key_unregistered";
    if (!gate_failed) {
      log.error("Bounty board read failed on the attack page", result.err);
    }
  }
  if (gate_failed) {
    silence_attack_bounty();
  }
  const match =
    !gate_failed && result.ok
      ? find_bounty_match(result.response.board.targets, player_id)
      : null;
  if (!match) {
    unmount_bounty_row();
    return;
  }

  if (!bounty_row) {
    const container = document.createElement("div");
    bounty_row = {
      root: createRoot(container),
      container,
      match,
      in_flight: 0,
      claimed: false,
    };
  }
  bounty_row.match = match;
  if (bounty_row.container.parentElement !== info_line) {
    info_line.appendChild(bounty_row.container);
  }
  render_bounty_row();
}

function render_bounty_row() {
  if (!bounty_row) return;
  bounty_row.root.render(
    createElement(AttackBountyRow, {
      match: bounty_row.match,
      claimPending: bounty_row.in_flight > 0,
      claimed: bounty_row.claimed,
      onClaim: () => void claim(`${CLAIM_SUBMITTED}.`),
    }),
  );
}

// Fire-and-acknowledge, as on the board. A failure leaves the button in its
// manually-clickable state, with the API's message toasted.
async function claim(success_message: string) {
  const row = bounty_row;
  if (!row) return;
  row.in_flight++;
  render_bounty_row();
  const ok = await submit_claim_with_toast(
    row.match.claim_target,
    success_message,
  );
  row.in_flight--;
  row.claimed ||= ok;
  if (row === bounty_row) render_bounty_row();
}

// The end-of-fight dialog's finishing moves share the dialogButtons container
// with Start/Join fight; Torn renders their text lowercase.
const FINISHING_MOVES = ["leave", "mug", "hospitalize"] as const;
type FinishingMove = (typeof FINISHING_MOVES)[number];

function finishing_move(button: Element): FinishingMove | null {
  const text = button.textContent?.trim().toLowerCase() ?? "";
  return FINISHING_MOVES.find((move) => move === text) ?? null;
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("ff-config-updated", () => void sync_bounty_row());
  // Capture phase, so Torn's own handlers can't swallow the click first.
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest(FIGHT_BUTTON);
      if (!button) return;
      const move = finishing_move(button);
      if (move === "hospitalize") {
        // Only hospitalizations pay, so only the hospitalize finishing move
        // claims — every time it's clicked, since a target who meds out can be
        // hospitalized again. No row means no eligible bounty (or bounties are
        // off): no claim.
        void claim(`${CLAIM_SUBMITTED} automatically.`);
      } else if (!move) {
        void sync_bounty_row();
      }
    },
    true,
  );
}

async function inject_info_line(info_line: Element) {
  // Figure out where to inject the info line
  const h4 = await wait_for_element("h4", 10_000);
  if (!h4) {
    return;
  }
  h4.parentNode?.parentNode?.parentNode?.insertBefore(
    info_line,
    h4.parentNode?.parentNode?.nextSibling,
  );
}

export default {
  name: "Attack FF display",
  description: "Shows FF on top left of any attack page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the attack page
    return torn_page("page", { sid: "attack" });
  },

  async run() {
    // Extract the player id from the URL
    const player_id = extract_id_from_url(window.location.href);
    if (!player_id) {
      return;
    }

    log.debug("On the attack page, found player_id", player_id);

    // Create container to hold info line
    const info_line = create_info_line();
    mountComponent(
      createElement(FFHeaderLine, { playerId: player_id }),
      info_line,
    );
    await inject_info_line(info_line);
    // No info line placed (Torn's header never rendered): nowhere to show a
    // bounty row, so no board read either.
    if (!info_line.isConnected) {
      return;
    }

    attack_target = { player_id, info_line };
    listen();
    await sync_bounty_row();
  },

  httpIntercept: {
    before(_url, _init) {
      // something
      return undefined;
    },

    after(_bodyText, _response, _ctx) {
      // even more things
      return undefined;
    },
  },
} satisfies Feature;
