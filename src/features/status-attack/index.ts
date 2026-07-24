import {
  get_player_id_in_element,
  getLocalUserId,
  open_attack_link,
  torn_page,
} from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:status-attack");

function updateBodyClass() {
  const isEnabled = ffconfig.status_attack_links_enabled;
  if (isEnabled) {
    document.body.setAttribute("data-ff-status-attack-enabled", "true");
  } else {
    document.body.removeAttribute("data-ff-status-attack-enabled");
  }
}

// Forums status checks to distinguish activity dot from level/subscriber badges
function isForumStatusIcon(el: HTMLElement): boolean {
  const title = (el.getAttribute("title") || "").toLowerCase();
  const ariaLabel = (
    el.querySelector("a")?.getAttribute("aria-label") || ""
  ).toLowerCase();
  return (
    title.includes("online") ||
    title.includes("offline") ||
    title.includes("away") ||
    title.includes("idle") ||
    ariaLabel.includes("online") ||
    ariaLabel.includes("offline") ||
    ariaLabel.includes("away") ||
    ariaLabel.includes("idle")
  );
}

function labelForumStatuses(root: Element = document.body) {
  const elements = root.querySelectorAll(
    'li[id^="icon"][id*="___"].iconShow:not(.ffscouter-forum-status)',
  );
  for (const el of elements) {
    if (el instanceof HTMLElement && isForumStatusIcon(el)) {
      el.classList.add("ffscouter-forum-status");
    }
  }
}

let forumObserver: MutationObserver | null = null;

function setupForumObserver() {
  if (forumObserver) {
    forumObserver.disconnect();
    forumObserver = null;
  }

  if (!torn_page("forums")) return;

  labelForumStatuses();

  forumObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          labelForumStatuses(node);
        }
      }
    }
  });

  const content = document.querySelector(".content-wrapper") || document.body;
  forumObserver.observe(content, {
    childList: true,
    subtree: true,
  });
  log.debug("Forum status observer connected");
}

// Keep track of logged-in user ID to prevent self-clicking
let localUserId: number | null = null;

async function fetchLocalUserId() {
  try {
    const idStr = await getLocalUserId();
    if (idStr) {
      localUserId = parseInt(idStr, 10);
      log.debug("Logged-in user ID cached:", localUserId);
    }
  } catch (err) {
    log.error("Failed to retrieve logged-in user ID", err);
  }
}

function handleStatusClick(e: MouseEvent) {
  if (!ffconfig.status_attack_links_enabled) return;

  const target = e.target as HTMLElement;

  // Intercept click on the status wrapper or icons
  const statusEl = target.closest(`
    [class*="userStatusWrap__"],
    li[id^="icon"][id*="-profile-"].user-status-16-Online,
    li[id^="icon"][id*="-profile-"].user-status-16-Away,
    li[id^="icon"][id*="-profile-"].user-status-16-Offline,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Online,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Away,
    #profile-mini-root li[id^="icon"][id*="-mini-profile-"].user-status-16-Offline,
    li[id^="icon"][id*="___"].iconShow.ffscouter-forum-status
  `);

  if (!statusEl) return;

  // Extract Player ID based on page contexts
  let playerId: number | null = null;
  const idAttr = statusEl.id || "";

  // 1. Profile ID extraction (O(1) regex match)
  if (idAttr?.includes("-profile-")) {
    const match = idAttr.match(/profile-(\d+)$/);
    if (match?.[1]) {
      playerId = parseInt(match[1], 10);
    }
  }

  // 2. Mini-profile ID extraction (O(1) regex match)
  if (!playerId && idAttr && idAttr.includes("-mini-profile-")) {
    const match = idAttr.match(/mini-profile-(\d+)$/);
    if (match?.[1]) {
      playerId = parseInt(match[1], 10);
    }
  }

  // 3. Factions page ID extraction
  if (!playerId && torn_page("factions")) {
    const row = statusEl.closest(".table-row, .enemy, .your, .member");
    if (row) {
      playerId = get_player_id_in_element(row);
    }
  }

  // 4. Forums page ID extraction (strictly scoped to poster/starter sidebar/header, supporting CSS modules)
  if (!playerId && torn_page("forums")) {
    const container = statusEl.closest(`
      [class*="poster"], .poster,
      [class*="lastPost"], .lastPost,
      [class*="last-poster"], .last-poster,
      [class*="last-post"], .last-post,
      [class*="starter"], .starter
    `);
    if (container) {
      playerId = get_player_id_in_element(container);
    }
  }

  // 5. Profile page fallback
  if (!playerId && torn_page("profiles")) {
    const match = window.location.href.match(/XID=(\d+)/);
    if (match?.[1]) {
      playerId = parseInt(match[1], 10);
    }
  }

  // 6. Mini-profile fallback
  if (!playerId) {
    const miniRoot = document.getElementById("profile-mini-root");
    if (miniRoot?.contains(statusEl)) {
      playerId = get_player_id_in_element(miniRoot);
    }
  }

  // 7. Generic userInfoBox fallback (Item Market and other pages using Torn's
  // shared userInfoBox__/userInfoWrapper__ widget; scoped to the closest box
  // so a listing grid's neighboring player can't be picked up instead)
  if (!playerId) {
    const container = statusEl.closest('[class*="userInfoBox__"]');
    if (container) {
      playerId = get_player_id_in_element(container);
    }
  }

  if (!playerId) {
    log.debug("Failed to extract playerId from status icon click");
    return;
  }

  // Prevent self-attacking
  if (localUserId && playerId === localUserId) {
    log.debug("Bypassing click-to-attack: clicked own status icon.");
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  log.debug("Initiating attack on user:", playerId);

  const forceNewTab = e.ctrlKey || e.metaKey || e.button === 1;
  open_attack_link(playerId, {
    openInNewTab: forceNewTab ? true : undefined,
  });
}

export default {
  name: "Online Status Attack Links",
  description:
    "Converts online/idle/offline status indicators into clickable quick-attack links.",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return true; // Capture clicks globally via delegation
  },

  async run() {
    updateBodyClass();
    fetchLocalUserId();

    // Hook into SPA navigation
    const initPage = () => {
      setupForumObserver();
    };

    // Use capturing event listener to intercept click before standard navigation links
    document.body.addEventListener("click", handleStatusClick, true);

    window.addEventListener("ff-config-updated", () => {
      updateBodyClass();
    });

    // Handle navigation
    if (typeof window !== "undefined") {
      // Re-run setup on page transitions
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        setTimeout(initPage, 100);
      };

      window.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        setTimeout(initPage, 100);
      };

      window.addEventListener("popstate", () => {
        setTimeout(initPage, 100);
      });
    }

    initPage();
    log.debug("Online Status Attack Links feature installed successfully.");
  },
} satisfies Feature;
