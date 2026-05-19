import {
  create_info_line,
  extract_id_from_url,
  torn_page,
  wait_for_body,
  wait_for_element,
} from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import { generate_info_line } from "@utils/strings";
import type { FFData } from "@utils/types";
import { type Feature, StartTime } from "../feature";

function inject_info_line(h4: Element, info_line: Element) {
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
  executionTime: StartTime.DocumentStart,

  async shouldRun() {
    // Run on the profile page
    return torn_page("profiles");
  },

  async run() {
    // Extract the player id from the URL
    const player_id = extract_id_from_url(window.location.href);
    if (!player_id) {
      return;
    }

    // Create container to hold info line
    const info_line = create_info_line();

    // Query ff scouter for FFData
    ffscouter.get(player_id).then(async (data: FFData) => {
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
