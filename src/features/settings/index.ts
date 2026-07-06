import { ffconfig } from "@utils/ffconfig";
import { type Feature, StartTime } from "../feature";
import "@ui/settings-panel";
import { TOAST_LEVEL, toast } from "@ui/toast";
import { check_key, type FFApiCheckResponse } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import {
  create_ff_element,
  extract_id_from_url,
  getLocalUserId,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger, { LogLevel } from "@utils/logger";
import { clear_v2_data } from "@utils/migrate";
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
    // Own-profile-only is opt-in and checked here rather than in shouldRun():
    // getLocalUserId() can wait up to 15s for the native settings-menu link to
    // appear, and shouldRun() is awaited sequentially for every feature in the
    // boot loop (src/index.ts) — a slow lookup there would stall every feature
    // queued after this one. See ADR 0008.
    if (ffconfig.settings_panel_own_profile_only) {
      const viewedId = extract_id_from_url(window.location.href);
      if (viewedId === null) {
        // No XID on the profile page at all means Torn is showing its own
        // "profile not found" error state, not an implicit self-view.
        return;
      }

      const localIdStr = await getLocalUserId();
      const localId = localIdStr !== null ? parseInt(localIdStr, 10) : null;
      // Fail open when the logged-in user's own id can't be determined
      // (localId null/NaN): an opt-in restriction silently hiding the whole
      // panel is worse than it occasionally not applying.
      if (localId !== null && !Number.isNaN(localId) && viewedId !== localId) {
        return;
      }
    }

    const panel = await create_ff_element("ff-settings-panel");
    if (!panel) {
      toast(
        "FF Scouter settings failed to load. This may be caused by a conflicting browser extension (e.g. AdBlocker Ultimate).",
        TOAST_LEVEL.ERROR,
      );
      return;
    }

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
    panel.gaugeMarkerScale = ffconfig.gauge_marker_scale;
    panel.gaugeMarkerBorderWidth = ffconfig.gauge_marker_border_width;
    panel.colorScheme = ffconfig.color_scheme;
    panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
    panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
    panel.debugDisablePdaHttp = ffconfig.debug_disable_pda_http;
    panel.debugForceReactFallback = ffconfig.debug_force_react_fallback;
    panel.settingsPanelOwnProfileOnly =
      ffconfig.settings_panel_own_profile_only;
    // isPremium starts as null (Unknown) and is resolved asynchronously after injection

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
      ffconfig.gauge_marker_scale = detail.gaugeMarkerScale;
      ffconfig.gauge_marker_border_width = detail.gaugeMarkerBorderWidth;
      document.body.style.setProperty(
        "--ffscouter-marker-scale",
        `${detail.gaugeMarkerScale / 100}`,
      );
      ffconfig.color_scheme = detail.colorScheme;
      ffconfig.war_quick_attack_action = detail.warQuickAttackAction;
      ffconfig.status_attack_links_enabled = detail.statusAttackLinksEnabled;
      ffconfig.debug_disable_pda_http = detail.debugDisablePdaHttp;
      ffconfig.debug_force_react_fallback = detail.debugForceReactFallback;
      ffconfig.settings_panel_own_profile_only =
        detail.settingsPanelOwnProfileOnly;
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
      panel.gaugeMarkerScale = ffconfig.gauge_marker_scale;
      panel.gaugeMarkerBorderWidth = ffconfig.gauge_marker_border_width;
      document.body.style.setProperty(
        "--ffscouter-marker-scale",
        `${ffconfig.gauge_marker_scale / 100}`,
      );
      panel.colorScheme = ffconfig.color_scheme;
      panel.warQuickAttackAction = ffconfig.war_quick_attack_action;
      panel.statusAttackLinksEnabled = ffconfig.status_attack_links_enabled;
      panel.debugDisablePdaHttp = ffconfig.debug_disable_pda_http;
      panel.debugForceReactFallback = ffconfig.debug_force_react_fallback;
      panel.settingsPanelOwnProfileOnly =
        ffconfig.settings_panel_own_profile_only;

      toast("Settings reset to defaults!");
      window.dispatchEvent(new CustomEvent("ff-config-updated"));
    });

    // Listen for the custom clear cache event
    panel.addEventListener("ff-clear-cache", async () => {
      try {
        ffscouter.clear_cache();
        clear_v2_data();
        toast("FF Scouter cache cleared successfully!");
      } catch (err) {
        logger.error("Failed to delete IndexedDB cache", err);
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
      if (!detail.apiKey) {
        toast("Please enter an API key.", TOAST_LEVEL.ERROR);
        return;
      }
      panel.isPremium = null;
      let result: FFApiCheckResponse | null = null;
      try {
        result = await check_key(detail.apiKey);
      } catch (err) {
        panel.isPremium = null;
        toast(`${err}`, TOAST_LEVEL.ERROR);
        return;
      }
      if (result == null || result.blank) {
        panel.isPremium = null;
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

        ffconfig.key = detail.apiKey;
        panel.apiKey = detail.apiKey;
        panel.isPremium = result.result.is_premium;
        check_key_status.clear();
      } else {
        panel.isPremium = false;
      }
      toast(message, level);
    });

    // Wait for profile wrapper to be available
    const profileWrapper = await wait_for_element(".profile-wrapper", 15_000);
    if (!profileWrapper) {
      logger.error("Could not find profile wrapper for settings panel");
      return;
    }

    profileWrapper.parentNode?.insertBefore(panel, profileWrapper.nextSibling);

    // Check premium status in the background so it never blocks panel injection
    check_key_status.is_premium(true).then((result) => {
      panel.isPremium = result;
    });
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
