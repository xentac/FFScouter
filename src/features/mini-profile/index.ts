import { apply_ff_gauge, get_player_id_in_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { format_ff_score, format_relative_time } from "@utils/strings";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:mini-profile");

const FEATURE_NAME = "mini-profile";

const monitor_mini_profile_root = () => {
  const miniprofile = document.querySelector("#profile-mini-root");
  if (miniprofile) {
    log.debug("profile-mini-root already exists.");
    setup_mini_observer();
    return;
  }

  const mini_body_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement && node.id === "profile-mini-root") {
          setup_mini_observer();
          mini_body_observer.disconnect();
        }
      }
    }
  });

  mini_body_observer.observe(document.body, { childList: true });
};

const setup_mini_observer = () => {
  const miniroot = document.querySelector("#profile-mini-root");
  if (!miniroot) {
    return;
  }

  let lastPlayerId: number | null = null;

  const mp_observer = new MutationObserver((mutations) => {
    // If the mutation is us, don't do any more processing
    for (const mutation of mutations) {
      if (
        mutation.target instanceof HTMLElement &&
        mutation.target.classList.contains("ffscouter-gauge")
      ) {
        return;
      }
      if (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            node.classList.contains("ffscouter-mini-desc"),
        )
      ) {
        return;
      }
    }

    // Extract player id
    const player_id = get_player_id_in_element(miniroot);

    if (!player_id) {
      lastPlayerId = null;
      return;
    }
    if (player_id === lastPlayerId) {
      return;
    }
    lastPlayerId = player_id;

    // Get FF Scouter data
    ffscouter.get(player_id).then(async (d: FFData) => {
      // Discard if the profile opened a different player in the meantime
      const current_player_id = get_player_id_in_element(miniroot);
      if (current_player_id !== player_id) {
        return;
      }

      if (d.no_data) {
        return;
      }

      log.debug(`Found mini profile update for ${player_id}, adding ff data`);

      // Render arrow
      for (const bar of miniroot.querySelectorAll(".honor-text-wrap")) {
        apply_ff_gauge(bar, FEATURE_NAME);
      }
      miniroot.querySelector(".ffscouter-mini-desc")?.remove();

      // Minimal, text-only Fair Fight string for mini-profiles
      const ff_string = format_ff_score(d);
      const fresh = format_relative_time(d.last_updated);
      const message = `FF ${ff_string} ${fresh}`;

      const lastaction = miniroot.querySelector(".last-action");
      const desc = document.createElement("span");
      desc.classList.add("ffscouter-mini-desc");
      desc.innerText = message;
      lastaction?.appendChild(document.createElement("br"));
      lastaction?.appendChild(desc);
    });
    ffscouter.complete();
  });

  mp_observer.observe(miniroot, { childList: true, subtree: true });
};

export default {
  name: "Fill mini profile",
  description: "Add FF data to mini profile",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return true;
  },

  async run() {
    monitor_mini_profile_root();
    log.debug("mini-profile installed");
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
