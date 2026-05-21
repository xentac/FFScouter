import { extract_id_from_url, torn_page, wait_for_element } from "@utils/dom";
import "@ui/flight-status";
import { type Feature, StartTime } from "../feature";

function is_flying(status: Element) {
  return status.classList.contains("travelling");
}

export default {
  name: "Profile flight tracking",
  description: "Display flight estimates on player profiles if they're flying",
  executionTime: StartTime.DocumentBody,

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

    const status = await wait_for_element(".profile-status", 10_000);
    if (!status) {
      return;
    }

    const element = document.createElement("ff-flight-profile-status");
    element.playerId = player_id;

    const check_and_update = () => {
      if (is_flying(status)) {
        const description = status.querySelector(".description");
        if (description === null) {
          return;
        }
        if (!description.contains(element)) {
          console.log("Appending child", element);
          description.appendChild(element);
        }
      } else {
        element.remove();
      }
    };

    const status_observer = new MutationObserver(check_and_update);

    status_observer.observe(status, {
      attributes: true,
      attributeFilter: ["class"],
    });

    check_and_update();
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
