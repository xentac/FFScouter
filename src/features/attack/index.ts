import {
  create_info_line,
  extract_id_from_url,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import "@ui/info-line";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

async function inject_info_line(info_line: Element) {
  // Figure out where to inject the info line
  const h4 = await wait_for_element("h4", 10_000);
  if (!h4) {
    return;
  }
  h4.parentNode?.parentNode?.parentNode?.insertBefore(
    info_line,
    h4.parentNode?.parentNode?.nextSibling,
  );
}

export default {
  name: "Attack FF display",
  description: "Shows FF on top left of any attack page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the attack page
    return torn_page("page", { sid: "attack" });
  },

  async run() {
    // Extract the player id from the URL
    const player_id = extract_id_from_url(window.location.href);
    if (!player_id) {
      return;
    }

    logger.debug("On the attack page, found player_id", player_id);

    // Create container to hold info line
    const info_line = create_info_line();

    // Query ff scouter for FFData
    ffscouter.get(player_id).then(async (data: FFData) => {
      const line = document.createElement("ff-info-line");
      line.data = data;
      info_line.appendChild(line);
      inject_info_line(info_line);
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
