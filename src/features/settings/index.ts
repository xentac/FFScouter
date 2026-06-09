import { ffconfig } from "@utils/ffconfig";
import { type Feature, StartTime } from "../feature";
import "@ui/settings-panel";
import { TOAST_LEVEL, toast } from "@ui/toast";
import { check_key, type FFApiCheckResponse } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import { torn_page, wait_for_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger, { LogLevel } from "@utils/logger";
import { format_timestamp } from "@utils/strings";

export default {
  name: "FF Scouter settings panel",
  description:
    "Give users a FF Scouter settings box injected on the profile page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the profile page
    return torn_page("profiles");
  },

  async run() {
    const panel = document.createElement("ff-settings-panel");

    // Inject data
    panel.apiKey = ffconfig.key || "";
    panel.lowRange = ffconfig.low_ff_range;
    panel.highRange = ffconfig.high_ff_range;
    panel.maxRange = ffconfig.max_ff_range;
    panel.chainButtonEnabled = ffconfig.chain_button_enabled;
    panel.chainLinkType = ffconfig.chain_link_type;
    panel.chainTabType = ffconfig.chain_tab_type;
    panel.chainFFTarget = ffconfig.chain_ff_target;
    panel.chainMinLevel = ffconfig.chain_min_level;
    panel.chainMaxLevel = ffconfig.chain_max_level;
    panel.chainInactive = ffconfig.chain_inactive;
    panel.chainMinFF = ffconfig.chain_min_ff;
    panel.chainMaxFF = ffconfig.chain_max_ff;
    panel.chainFactionless = ffconfig.chain_factionless;
    panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
    panel.factionsColDisplay = ffconfig.factions_col_display;
    panel.warColDisplay = ffconfig.war_col_display;
    panel.debugLogs = ffconfig.debug_logs;
    panel.analyticsEnabled = ffconfig.analytics_enabled;
    panel.networkInterceptionEnabled = ffconfig.network_interception_enabled;
    panel.gaugeMarkerType = ffconfig.gauge_marker_type;
    panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
    panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
    panel.isPremium = await check_key_status.is_premium(true);

    // Listen for the custom save event
    panel.addEventListener("ff-save", async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      ffconfig.key = detail.apiKey;
      ffconfig.low_ff_range = detail.lowRange;
      ffconfig.high_ff_range = detail.highRange;
      ffconfig.max_ff_range = detail.maxRange;
      ffconfig.chain_button_enabled = detail.chainButtonEnabled;
      ffconfig.chain_link_type = detail.chainLinkType;
      ffconfig.chain_tab_type = detail.chainTabType;
      ffconfig.chain_ff_target = detail.chainFFTarget;
      ffconfig.chain_min_level = detail.chainMinLevel;
      ffconfig.chain_max_level = detail.chainMaxLevel;
      ffconfig.chain_inactive = detail.chainInactive;
      ffconfig.chain_min_ff = detail.chainMinFF;
      ffconfig.chain_max_ff = detail.chainMaxFF;
      ffconfig.chain_factionless = detail.chainFactionless;
      ffconfig.ff_history_enabled = detail.ffHistoryEnabled;
      ffconfig.factions_col_display = detail.factionsColDisplay;
      ffconfig.war_col_display = detail.warColDisplay;
      ffconfig.debug_logs = detail.debugLogs;
      if (detail.debugLogs) {
        logger.setLevel(LogLevel.DEBUG);
      } else {
        logger.setLevel(LogLevel.INFO);
      }
      ffconfig.analytics_enabled = detail.analyticsEnabled;
      ffconfig.network_interception_enabled = detail.networkInterceptionEnabled;
      ffconfig.gauge_marker_type = detail.gaugeMarkerType;
      ffconfig.war_quick_attack_action = detail.warQuickAttackAction;
      ffconfig.status_attack_links_enabled = detail.statusAttackLinksEnabled;
      panel.isPremium = await check_key_status.is_premium(true);

      toast("Settings saved successfully!");
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
    });

    // Listen for the custom reset event
    panel.addEventListener("ff-reset", () => {
      ffconfig.reset();

      // Push defaults back to panel properties to update UI
      panel.apiKey = ffconfig.key || "";
      panel.lowRange = ffconfig.low_ff_range;
      panel.highRange = ffconfig.high_ff_range;
      panel.maxRange = ffconfig.max_ff_range;
      panel.chainButtonEnabled = ffconfig.chain_button_enabled;
      panel.chainLinkType = ffconfig.chain_link_type;
      panel.chainTabType = ffconfig.chain_tab_type;
      panel.chainFFTarget = ffconfig.chain_ff_target;
      panel.chainMinLevel = ffconfig.chain_min_level;
      panel.chainMaxLevel = ffconfig.chain_max_level;
      panel.chainInactive = ffconfig.chain_inactive;
      panel.chainMinFF = ffconfig.chain_min_ff;
      panel.chainMaxFF = ffconfig.chain_max_ff;
      panel.chainFactionless = ffconfig.chain_factionless;
      panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
      panel.factionsColDisplay = ffconfig.factions_col_display;
      panel.warColDisplay = ffconfig.war_col_display;
      panel.debugLogs = ffconfig.debug_logs;
      panel.analyticsEnabled = ffconfig.analytics_enabled;
      panel.networkInterceptionEnabled = ffconfig.network_interception_enabled;
      panel.gaugeMarkerType = ffconfig.gauge_marker_type;
      panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
      panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;

      toast("Settings reset to defaults!");
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
    });

    // Listen for the custom clear cache event
    panel.addEventListener("ff-clear-cache", async () => {
      try {
        ffscouter.clear_cache();
        toast("FF Scouter cache cleared successfully!");
      } catch (err) {
        console.error("Failed to delete IndexedDB cache", err);
        toast("Failed to clear cache database", TOAST_LEVEL.ERROR);
      }
    });

    // Listen for the custom save key event (autosave)
    panel.addEventListener("ff-save-key", async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      ffconfig.key = detail.apiKey;
      panel.apiKey = detail.apiKey;
      panel.isPremium = await check_key_status.is_premium(true);

      toast("API key saved successfully!");
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
    });

    panel.addEventListener("ff-verify", async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      let result: FFApiCheckResponse | null = null;
      try {
        result = await check_key(detail.apiKey);
      } catch (err) {
        toast(`${err}`, TOAST_LEVEL.ERROR);
        return;
      }
      if (result == null || result.blank) {
        toast(
          "Problem querying ffscouter.com API. Please wait a few seconds and try again.",
          TOAST_LEVEL.WARNING,
        );
        return;
      }

      let message = `FF Scouter not configured. API key (${result.result.key}) not registered.`;
      let level = TOAST_LEVEL.ERROR;
      if (result.result.is_registered) {
        message = `FF Scouter successfully configured. API key (${result.result.key}) was registered on ${format_timestamp(result.result.registered_at)} and last used ${format_timestamp(result.result.last_used)}.`;
        level = TOAST_LEVEL.INFO;

        if (detail.apiKey === ffconfig.key) {
          await check_key_status.is_premium(true);
        }
      }
      toast(message, level);
    });

    // Wait for profile wrapper to be available
    const profileWrapper = await wait_for_element(".profile-wrapper", 15_000);
    if (!profileWrapper) {
      console.error(
        "[FF Scouter V2] Could not find profile wrapper for settings panel",
      );
      return;
    }

    profileWrapper.parentNode?.insertBefore(panel, profileWrapper.nextSibling);
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
