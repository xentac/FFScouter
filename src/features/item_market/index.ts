import { torn_page, wait_for_body, wait_for_element } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { generate_info_line } from "@utils/strings";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

function inject_info_line(h4: Element, info_line: Element) {
  h4.parentNode?.parentNode?.parentNode?.insertBefore(
    info_line,
    h4.parentNode?.parentNode?.nextSibling,
  );
}

export default {
  name: "Item market FF display",
  description: "Shows FF on the item market page",
  executionTime: StartTime.DocumentStart,

  async shouldRun() {
    // Run on the attack page
    return torn_page("page", "ItemMarket");
  },

  async run() {
    // Monitor the sellerListWrapper___PN32N for player_ids

    // Query ff scouter for FFData
    ffscouter.get(player_id).then(async (data: FFData) => {
      logger.debug("got ff scouter results");
      info_line.innerHTML = generate_info_line(data);

      // Figure out where to inject the info line
      const h4 = document.querySelector("h4");

      // The element already exists
      if (!h4) {
        if (!(await wait_for_body(10_000))) {
          return;
        }
        const elem = await wait_for_element("h4", 10_000);
        if (!elem) {
          return;
        }
        inject_info_line(elem, info_line);
      } else {
        inject_info_line(h4, info_line);
      }
    });
    ffscouter.complete();
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
