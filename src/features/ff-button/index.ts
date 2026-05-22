import { TOAST_LEVEL, toast } from "@ui/toast";
import { type FFTarget, query_targets } from "@utils/api";
import { type CachedTargets, ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

export const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds (change to 1 * 60 * 60 * 1000 for 1 hour)

export function get_active_filters() {
  return {
    minlevel: ffconfig.chain_min_level,
    maxlevel: ffconfig.chain_max_level,
    minff: ffconfig.chain_min_ff,
    maxff: ffconfig.chain_max_ff,
    inactive: ffconfig.chain_inactive,
    factionless: ffconfig.chain_factionless,
  };
}

export function filters_changed(
  a: CachedTargets["filters"],
  b: CachedTargets["filters"],
): boolean {
  return (
    a.minlevel !== b.minlevel ||
    a.maxlevel !== b.maxlevel ||
    a.minff !== b.minff ||
    a.maxff !== b.maxff ||
    a.inactive !== b.inactive ||
    a.factionless !== b.factionless
  );
}

export async function update_ff_targets(force = false): Promise<void> {
  const key = ffconfig.key;
  if (!key) {
    logger.debug("API key not set, skipping target fetch");
    return;
  }

  const currentFilters = get_active_filters();
  const cached = ffconfig.chain_targets;

  if (
    !force &&
    cached &&
    Date.now() < cached.expiry &&
    !filters_changed(cached.filters, currentFilters)
  ) {
    logger.debug("Using cached targets, not expired and filters match");
    return;
  }

  try {
    const response = await query_targets(key, {
      minlevel: currentFilters.minlevel,
      maxlevel: currentFilters.maxlevel,
      minff: currentFilters.minff,
      maxff: currentFilters.maxff,
      inactiveonly: currentFilters.inactive ? 1 : 0,
      factionless: currentFilters.factionless ? 1 : 0,
      limit: 50,
    });

    if (response?.targets) {
      ffconfig.chain_targets = {
        targets: response.targets,
        expiry: Date.now() + POLL_INTERVAL_MS,
        filters: currentFilters,
      };
      ffconfig.chain_target_index = 0; // Reset index on successful new fetch
      logger.info(
        `Chain targets updated successfully: ${response.targets.length} targets found`,
      );
    }
  } catch (err) {
    logger.error("Failed to update chain targets:", err);
  }
}

export function get_next_target_index(maxLen: number): number {
  const val = ffconfig.chain_target_index;
  let nextVal = val + 1;
  if (nextVal >= maxLen) {
    nextVal = 0;
  }
  ffconfig.chain_target_index = nextVal;
  return val < maxLen ? val : 0;
}

export function get_random_chain_target(): FFTarget | null {
  const cached = ffconfig.chain_targets;
  if (!cached || !cached.targets || cached.targets.length === 0) {
    return null;
  }
  const index = get_next_target_index(cached.targets.length);
  return cached.targets[index] ?? null;
}

export function remove_chain_button() {
  const button = document.getElementById("ff-scouter-chain-btn");
  if (button) {
    button.remove();
  }
}

export function create_chain_button() {
  if (!ffconfig.chain_button_enabled || !ffconfig.key) {
    remove_chain_button();
    return;
  }

  if (document.getElementById("ff-scouter-chain-btn")) {
    return;
  }

  const button = document.createElement("button");
  button.id = "ff-scouter-chain-btn";
  button.innerHTML = "FF";
  button.style.position = "fixed";
  button.style.top = "32%";
  button.style.right = "0%";
  button.style.zIndex = "9999";
  button.style.backgroundColor = "green";
  button.style.color = "white";
  button.style.border = "none";
  button.style.padding = "6px";
  button.style.borderRadius = "6px";
  button.style.cursor = "pointer";

  button.addEventListener("click", async () => {
    let rando = get_random_chain_target();
    if (!rando) {
      toast("No cached targets found. Fetching...", TOAST_LEVEL.WARNING);
      await update_ff_targets(true);
      rando = get_random_chain_target();
      if (!rando) {
        toast(
          "No targets available matching your criteria.",
          TOAST_LEVEL.ERROR,
        );
        return;
      }
    }

    const linkType = ffconfig.chain_link_type;
    const tabType = ffconfig.chain_tab_type;
    let url: string;
    if (linkType === "profile") {
      url = `https://www.torn.com/profiles.php?XID=${rando.player_id}`;
    } else {
      url = `https://www.torn.com/page.php?sid=attack&user2ID=${rando.player_id}`;
    }

    if (tabType === "sametab") {
      window.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  });

  document.body.appendChild(button);
}

export default {
  name: "FF Target Finder Button",
  description:
    "Renders the floating green FF button to cycle through potential targets",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return true; // Render on all pages where script is injected
  },

  async run() {
    // If not enabled or no key, do nothing
    if (!ffconfig.chain_button_enabled || !ffconfig.key) {
      remove_chain_button();
      return;
    }

    // Try fetching/updating targets (async background)
    update_ff_targets();

    // Create the button in DOM
    create_chain_button();

    // Listen for custom settings updates
    window.addEventListener("ff-config-updated", async () => {
      if (!ffconfig.chain_button_enabled || !ffconfig.key) {
        remove_chain_button();
        return;
      }

      // Check if filters changed to trigger immediate update
      const cached = ffconfig.chain_targets;
      const currentFilters = get_active_filters();
      if (!cached || filters_changed(cached.filters, currentFilters)) {
        logger.info("Target filters changed, refetching targets immediately");
        await update_ff_targets(true);
      }

      create_chain_button();
    });
  },
} satisfies Feature;
