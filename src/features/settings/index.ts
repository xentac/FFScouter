import { ffconfig } from "@utils/ffconfig";
import { type Feature, StartTime } from "../feature";
import "@ui/settings-panel";
import { torn_page, wait_for_element } from "@utils/dom";

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

    // Listen for the custom event
    panel.addEventListener("ff-save", async (e: Event) => {
      const { apiKey } = (e as CustomEvent).detail;

      // Handle save and API logic in your main script
      ffconfig.key = apiKey;
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
