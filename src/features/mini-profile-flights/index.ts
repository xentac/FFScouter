import { create_ff_element, get_player_id_in_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import "@ui/flight-status";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:mini-profile-flights");

function is_flying(status: Element) {
  return status.classList.contains("travelling");
}

const monitor_mini_profile_root = () => {
  const miniprofile = document.querySelector("#profile-mini-root");
  if (miniprofile) {
    log.debug("profile-mini-root already exists.");
    setup_mini_flight_observer();
    return;
  }

  const mini_body_observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement && node.id === "profile-mini-root") {
          setup_mini_flight_observer();
          mini_body_observer.disconnect();
        }
      }
    }
  });

  mini_body_observer.observe(document.body, { childList: true });
};

const setup_mini_flight_observer = async () => {
  const miniroot = document.querySelector("#profile-mini-root");
  if (!miniroot) {
    return;
  }

  const flight_element = await create_ff_element("ff-flight-profile-status");
  if (!flight_element) {
    return;
  }
  flight_element.compact = true;

  let lastPlayerId: number | null = null;

  const mp_observer = new MutationObserver((mutations) => {
    // Prevent infinite loop from our own changes
    for (const mutation of mutations) {
      if (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.tagName.toLowerCase() === "ff-flight-profile-status" ||
              node.classList.contains("ff-scouter-profile-flight-info")),
        )
      ) {
        return;
      }
    }

    const player_id = get_player_id_in_element(miniroot);
    if (!player_id) {
      lastPlayerId = null;
      return;
    }
    if (player_id === lastPlayerId) {
      return;
    }
    lastPlayerId = player_id;

    const status = miniroot.querySelector(".profile-container");
    if (!status) {
      return;
    }

    flight_element.playerId = player_id;

    if (is_flying(status)) {
      const description = status.querySelector(".description");
      if (description && !description.contains(flight_element)) {
        log.debug(
          `Player ${player_id} is flying, adding flight tracker to mini-profile`,
        );
        description.appendChild(flight_element);
      }
    } else {
      flight_element.remove();
      ffscouter.clear_flight_cache(player_id);
    }
  });

  mp_observer.observe(miniroot, { childList: true, subtree: true });

  // Initial check
  const player_id = get_player_id_in_element(miniroot);
  const status = miniroot.querySelector(".profile-status");
  if (player_id && status) {
    flight_element.playerId = player_id;
    if (is_flying(status)) {
      const description = status.querySelector(".description");
      if (description && !description.contains(flight_element)) {
        description.appendChild(flight_element);
      }
    }
  }
};

export default {
  name: "Mini profile flight tracking",
  description:
    "Display flight estimates on player mini-profiles if they're flying",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return true;
  },

  async run() {
    monitor_mini_profile_root();
    log.debug("mini-profile-flights installed");
  },

  httpIntercept: {
    before(_url, _init) {
      return undefined;
    },

    after(_bodyText, _response, _ctx) {
      return undefined;
    },
  },
} satisfies Feature;
