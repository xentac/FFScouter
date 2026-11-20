import { extract_id_from_url, torn_page, wait_for_element } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { type Feature, StartTime } from "../feature";

// The CSS-module class Torn's own profile buttons use for their icon, minus
// state classes such as disabled___xxxxx.
function torn_icon_class(buttonsList: Element): string | null {
  for (const svg of buttonsList.querySelectorAll(".profile-button svg")) {
    const cls = [...svg.classList].find((c) => c.startsWith("icon___"));
    if (cls) return cls;
  }
  return null;
}

export default {
  name: "Profile FF history",
  description: "Add a button to all user's profiles to link to ffscouter.com",
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

    if (!ffconfig.ff_history_enabled) return;
    if (document.querySelector(".ff-scouter-history-btn")) return;

    const buttonsList = await wait_for_element(
      ".profile-buttons.profile-action .buttons-list",
      10_000,
    );
    if (!buttonsList) return;

    const btn = document.createElement("a");
    btn.href = `https://ffscouter.com/player-view?player_id=${player_id}`;
    btn.target = "_blank";
    btn.rel = "noopener noreferrer";
    btn.className = "profile-button ff-scouter-history-btn";
    btn.title = "View Stats History on FFScouter";

    // Semi-transparent background clock/history icon
    const container = document.createElement("div");
    container.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" viewBox="640 178 46 46" stroke="currentColor">
  <g fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Clock face outline representing history/time -->
    <circle cx="663" cy="201" r="17" />
    <!-- Clock hands pointing to 10:10 -->
    <path d="M663,201 L663,191 M663,201 L671,197" />
  </g>
  <g fill="none" stroke-width="1">
    <text x="657" y="212">FF</text>
  </g>
</svg>`;

    const svg = container.firstElementChild;
    if (svg) {
      // Torn colors its button icons through a CSS-module class whose hash
      // changes between deploys (icon___GP196 became icon___IAtmY), so
      // borrow whatever class a sibling icon has today. The stroke attribute
      // is the fallback: Torn's class rule overrides it when it matches.
      const iconClass = torn_icon_class(buttonsList);
      if (iconClass) svg.setAttribute("class", iconClass);
      btn.appendChild(svg);
    }

    // "FF\nHistory" label on top
    const label = document.createElement("span");
    label.className = "ff-history-label";
    label.textContent = "FF\nHistory";
    //btn.appendChild(label);

    buttonsList.appendChild(btn);
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
