import { apply_ff_gauge_selector } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import { type Feature, StartTime } from "../feature";

const FEATURE_NAME = "fallback";

export default {
  name: "Fallback mutation observer",
  description: "Catch all mutations and see if we can apply FF data",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on all pages
    return true;
  },

  async run() {
    const check_mutation = async (node: Element) => {
      if (!node.querySelectorAll) {
        return;
      }
      var honor_bars = node.querySelectorAll(
        ".honor-text-wrap",
      ) as NodeListOf<HTMLElement>;
      var name_elems = node.querySelectorAll(
        ".user.name",
      ) as NodeListOf<HTMLElement>;
      if (honor_bars.length > 0) {
        await apply_ff_gauge_selector(honor_bars, FEATURE_NAME);
      } else {
        if (
          window.location.href.startsWith("https://www.torn.com/companies.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".employee"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith(
            "https://www.torn.com/page.php?sid=competition#/team",
          )
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll('[class*="name__"]'),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/joblist.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".employee"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/messages.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".name"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/index.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".name"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith(
            "https://www.torn.com/hospitalview.php",
          )
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".name"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith(
            "https://www.torn.com/page.php?sid=UserList",
          )
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".name"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/bounties.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".target"),
            FEATURE_NAME,
          );
          await apply_ff_gauge_selector(
            node.querySelectorAll(".listed"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith(
            "https://www.torn.com/page.php?sid=attackLog",
          )
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll("ul.participants-list li"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/forums.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".last-poster"),
            FEATURE_NAME,
          );
          await apply_ff_gauge_selector(
            node.querySelectorAll(".starter"),
            FEATURE_NAME,
          );
          await apply_ff_gauge_selector(
            node.querySelectorAll(".last-post"),
            FEATURE_NAME,
          );
          await apply_ff_gauge_selector(
            node.querySelectorAll(".poster"),
            FEATURE_NAME,
          );
        } else if (window.location.href.includes("page.php?sid=hof")) {
          await apply_ff_gauge_selector(
            node.querySelectorAll('[class*="userInfoBox__"]'),
            FEATURE_NAME,
          );
        } else if (name_elems.length > 0) {
          // Fallback for anyone without honor bars enabled
          await apply_ff_gauge_selector(name_elems, FEATURE_NAME);
        }
      }
      if (
        window.location.href.startsWith(
          "https://www.torn.com/page.php?sid=ItemMarket",
        )
      ) {
        await apply_ff_gauge_selector(
          node.querySelectorAll(
            "div.bazaar-listing-card div:first-child div:first-child > a",
          ),
          FEATURE_NAME,
        );
      }
      ffscouter.complete();
    };

    const ff_gauge_observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            check_mutation(node);
          }
        }
      }
    });

    ff_gauge_observer.observe(document, {
      attributes: false,
      childList: true,
      characterData: false,
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
