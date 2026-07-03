import { FFFlightProfileStatus } from "@ui/flight-status";
import { get_player_id_in_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { createElement } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:mini-profile-flights");

// Marker class so the mutation observer can identify our own container additions
// and avoid processing them as player changes.
const FLIGHT_CONTAINER_CLASS = "ff-flight-element";

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

  const container = document.createElement("div");
  container.classList.add(FLIGHT_CONTAINER_CLASS);
  let root: Root | null = null;

  let lastPlayerId: number | null = null;

  const renderForPlayer = (player_id: number) => {
    if (!root) {
      root = createRoot(container);
    }
    root.render(
      createElement(FFFlightProfileStatus, {
        playerId: player_id,
        compact: true,
      }),
    );
  };

  const mp_observer = new MutationObserver((mutations) => {
    // Prevent infinite loop from our own container being added
    for (const mutation of mutations) {
      if (
        Array.from(mutation.addedNodes).some(
          (node) =>
            node instanceof HTMLElement &&
            (node.classList.contains(FLIGHT_CONTAINER_CLASS) ||
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

    renderForPlayer(player_id);

    if (is_flying(status)) {
      const description = status.querySelector(".description");
      if (description && !description.contains(container)) {
        log.debug(
          `Player ${player_id} is flying, adding flight tracker to mini-profile`,
        );
        description.appendChild(container);
      }
    } else {
      container.remove();
      ffscouter.clear_flight_cache(player_id);
    }
  });

  mp_observer.observe(miniroot, { childList: true, subtree: true });

  // Initial check
  const player_id = get_player_id_in_element(miniroot);
  const status = miniroot.querySelector(".profile-status");
  if (player_id && status) {
    renderForPlayer(player_id);
    lastPlayerId = player_id;
    if (is_flying(status)) {
      const description = status.querySelector(".description");
      if (description && !description.contains(container)) {
        description.appendChild(container);
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
