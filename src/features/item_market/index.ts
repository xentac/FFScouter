import {
  apply_ff_gauge,
  apply_ff_gauge_selector,
  type HandlerFnOptions,
  MonitorElements,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import logger, { LogLevel } from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const FEATURE_NAME = "item_market";

export default {
  name: "Item market FF display",
  description: "Shows FF on the item market page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the item market page
    return torn_page("page", { sid: "ItemMarket" });
  },

  async run() {
    // Monitor the sellerListWrapper___PN32N for player_ids
    const root = await wait_for_element('[class*="itemListWrapper__"', 10_000);
    if (!root) {
      return;
    }
    console.log("Found item list wrapper!");
    console.log(root);

    const process = () => {
      apply_ff_gauge_selector(
        root.querySelectorAll(
          "div.bazaar-listing-card div:first-child div:first-child > a",
        ),
        FEATURE_NAME,
      );

      // Support Bazaar + TE Info Final (Integrated & Fixed) (https://greasyfork.org/en/scripts/554659-bazaar-te-info-final-integrated-fixed)
      apply_ff_gauge_selector(
        root.querySelectorAll(".bazaar-card a"),
        FEATURE_NAME,
      );

      apply_ff_gauge_selector(
        root.querySelectorAll(".honor-text-wrap"),
        FEATURE_NAME,
      );
      apply_ff_gauge_selector(
        root.querySelectorAll('[class*="userInfoWrapper__"]'),
        FEATURE_NAME,
      );
    };

    const observer = new MutationObserver(process);
    observer.observe(root, {
      childList: true,
      subtree: true,
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
