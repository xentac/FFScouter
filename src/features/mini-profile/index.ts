import {
  apply_ff_gauge,
  get_player_id_in_element,
  wait_for_body,
} from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import {
  format_difficulty_text,
  format_ff_score,
  format_relative_time,
} from "@utils/strings";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

const monitor_mini_profile_root = () => {
  const miniprofile = document.querySelector("#profile-mini-root");
  if (miniprofile) {
    logger.debug("profile-mini-root already exists.");
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

  const mp_observer = new MutationObserver((mutations) => {
    // If the mutation is us, don't do any more processing
    for (const mutation of mutations) {
      if (
        mutation.target instanceof HTMLElement &&
        mutation.target.classList.contains("ffsv3-gauge")
      ) {
        return;
      }
      if (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            node.classList.contains("ffsv3-mini-desc"),
        )
      ) {
        return;
      }
    }

    // Extract player id
    const player_id = get_player_id_in_element(miniroot);

    if (!player_id) {
      return;
    }
    // Get FF Scouter data
    ffscouter.get(player_id).then(async (d: FFData) => {
      if (d.no_data) {
        return;
      }

      logger.debug(
        `Found mini profile update for ${player_id}, adding ff data`,
      );

      // Render arrow
      for (const bar of miniroot.querySelectorAll(".honor-text-wrap")) {
        apply_ff_gauge(bar);
      }
      miniroot.querySelector(".ffsv3-mini-desc")?.remove();

      // Minimal, text-only Fair Fight string for mini-profiles
      const ff_string = format_ff_score(d);
      const difficulty = format_difficulty_text(d);
      const fresh = format_relative_time(d);
      const message = `FF ${ff_string} (${difficulty}) ${fresh}`;

      const description = miniroot.querySelector(".description");
      const desc = document.createElement("span");
      desc.classList.add("ffsv3-mini-desc");
      desc.innerText = message;
      description?.appendChild(desc);
    });
    ffscouter.complete();
  });

  mp_observer.observe(miniroot, { childList: true, subtree: true });
};

export default {
  name: "Fill mini profile",
  description: "Add FF data to mini profile",
  executionTime: StartTime.DocumentStart,

  async shouldRun() {
    return true;
  },

  async run() {
    await wait_for_body(10_000);
    monitor_mini_profile_root();
    logger.debug("mini-profile installed");
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
