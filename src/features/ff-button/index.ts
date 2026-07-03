import { TOAST_LEVEL, toast } from "@ui/toast";
import { type FFTarget, query_targets } from "@utils/api";
import { get_attack_url } from "@utils/dom";
import { type CachedTargets, ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:ff-button");

export const CACHE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // Keep cache for 7 days
export const POLL_INTERVAL_MS = 24 * 60 * 60 * 1000; // Refresh once a day

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
    log.debug("API key not set, skipping target fetch");
    return;
  }

  const currentFilters = get_active_filters();
  const cached = ffconfig.chain_targets;

  const hasNoCacheOrExpired = !cached || Date.now() > cached.expiry;
  const filtersChanged =
    cached && filters_changed(cached.filters, currentFilters);
  const timeToRefresh =
    cached &&
    (!cached.last_updated ||
      Date.now() - cached.last_updated > POLL_INTERVAL_MS);

  if (!force && !hasNoCacheOrExpired && !filtersChanged && !timeToRefresh) {
    log.debug(
      "Using cached targets, not expired, filters match, and not time to poll yet",
    );
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
        expiry: Date.now() + CACHE_LIFETIME_MS,
        last_updated: Date.now(),
        filters: currentFilters,
      };
      ffconfig.chain_target_index = 0; // Reset index on successful new fetch
      log.info(
        `Chain targets updated successfully: ${response.targets.length} targets found`,
      );
    }
  } catch (err) {
    log.error("Failed to update chain targets:", err);
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

export function update_anchor_attributes(anchor: HTMLAnchorElement) {
  const cached = ffconfig.chain_targets;
  if (!cached || !cached.targets || cached.targets.length === 0) {
    anchor.href = "#";
    anchor.removeAttribute("target");
    return;
  }

  const idx = ffconfig.chain_target_index;
  const currentTarget = cached.targets[idx < cached.targets.length ? idx : 0];
  if (!currentTarget) {
    anchor.href = "#";
    anchor.removeAttribute("target");
    return;
  }

  const linkType = ffconfig.chain_link_type;
  anchor.href =
    linkType === "profile"
      ? `https://www.torn.com/profiles.php?XID=${currentTarget.player_id}`
      : get_attack_url(currentTarget.player_id);

  anchor.target = ffconfig.chain_tab_type === "sametab" ? "_self" : "_blank";
}

export function create_chain_button() {
  if (!ffconfig.chain_button_enabled || !ffconfig.key) {
    remove_chain_button();
    return;
  }

  const existing = document.getElementById(
    "ff-scouter-chain-btn",
  ) as HTMLAnchorElement | null;
  if (existing) {
    update_anchor_attributes(existing);
    return;
  }

  const anchor = document.createElement("a");
  anchor.id = "ff-scouter-chain-btn";
  anchor.innerHTML = "FF";
  anchor.style.position = "fixed";
  anchor.style.top = "32%";
  anchor.style.right = "0%";
  anchor.style.zIndex = "9999";
  anchor.style.backgroundColor = "green";
  anchor.style.color = "white";
  anchor.style.border = "none";
  anchor.style.padding = "6px";
  anchor.style.borderRadius = "6px";
  anchor.style.cursor = "pointer";
  anchor.style.display = "block";
  anchor.style.textDecoration = "none";

  update_anchor_attributes(anchor);

  const handler = async (e: Event) => {
    if (e instanceof KeyboardEvent) {
      if (e.key !== "Enter") {
        return;
      }
    } else if (e instanceof MouseEvent) {
      if (e.button !== 0 && e.button !== 1 && e.button !== 2) {
        return;
      }
    }

    const cached = ffconfig.chain_targets;
    if (!cached || !cached.targets || cached.targets.length === 0) {
      e.preventDefault();
      const isPrimary =
        (e instanceof MouseEvent && e.button === 0) ||
        e instanceof KeyboardEvent;
      if (isPrimary) {
        toast("No cached targets found. Fetching...", TOAST_LEVEL.WARNING);
        update_ff_targets(true).then(() => {
          const newCached = ffconfig.chain_targets;
          if (
            !newCached ||
            !newCached.targets ||
            newCached.targets.length === 0
          ) {
            toast(
              "No targets available matching your criteria.",
              TOAST_LEVEL.ERROR,
            );
            return;
          }
          update_anchor_attributes(anchor);
          toast("Targets loaded. Click to navigate!", TOAST_LEVEL.INFO);
        });
      }
      return;
    }

    get_next_target_index(cached.targets.length);
    update_anchor_attributes(anchor);
  };

  anchor.addEventListener("mousedown", handler);
  anchor.addEventListener("keydown", handler);

  document.body.appendChild(anchor);
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
    update_ff_targets().then(() => {
      const button = document.getElementById(
        "ff-scouter-chain-btn",
      ) as HTMLAnchorElement | null;
      if (button) {
        update_anchor_attributes(button);
      }
    });

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
        log.info("Target filters changed, refetching targets immediately");
        await update_ff_targets(true);
      }

      create_chain_button();
    });
  },
} satisfies Feature;
