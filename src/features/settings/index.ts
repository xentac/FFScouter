import { ffconfig } from "@utils/ffconfig";
import { type Feature, StartTime } from "../feature";
import "@ui/settings-panel";
import { TOAST_LEVEL, toast } from "@ui/toast";
import { check_key_status } from "@utils/check_key";
import { torn_page, wait_for_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";

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
    panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
    panel.factionsColDisplay = ffconfig.factions_col_display;
    panel.debugLogs = ffconfig.debug_logs;
    panel.isPremium = await check_key_status.isPremium(true);

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
      ffconfig.ff_history_enabled = detail.ffHistoryEnabled;
      ffconfig.factions_col_display = detail.factionsColDisplay;
      ffconfig.debug_logs = detail.debugLogs;
      panel.isPremium = await check_key_status.isPremium(true);

      toast("Settings saved successfully!");
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
      panel.ffHistoryEnabled = ffconfig.ff_history_enabled;
      panel.factionsColDisplay = ffconfig.factions_col_display;
      panel.debugLogs = ffconfig.debug_logs;

      toast("Settings reset to defaults!");
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
