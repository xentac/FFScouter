import {
  create_info_line,
  extract_id_from_url,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import "@ui/info-line";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

async function inject_info_line(info_line: Element) {
  // Figure out where to inject the info line
  const h4 = await wait_for_element("h4", 10_000);
  if (!h4) {
    return;
  }
  const links_top_wrap = h4.parentNode?.querySelector(".links-top-wrap");
  if (links_top_wrap?.parentNode) {
    links_top_wrap.parentNode.insertBefore(
      info_line,
      links_top_wrap.nextSibling,
    );
  } else {
    h4.after(info_line);
  }
}

export default {
  name: "Profile FF display",
  description: "Shows FF on top left of any profile page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the profile page
    return torn_page("profiles");
  },

  async run() {
    // Create container to hold info line
    const info_line = create_info_line();

    if (!ffconfig.key) {
      info_line.innerHTML =
        "[FF Scouter V2]: Limited API key needed - enter in FF Scouter Settings below";
      inject_info_line(info_line);
    }
    // Extract the player id from the URL
    const player_id = extract_id_from_url(window.location.href);
    if (!player_id) {
      return;
    }

    // Query ff scouter for FFData
    ffscouter.get(player_id).then(async (data: FFData) => {
      const line = document.createElement("ff-header-line");
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
