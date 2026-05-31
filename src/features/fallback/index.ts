import { apply_ff_gauge_selector, on_navigation, torn_page } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const log = logger.child("feature:fallback");

const FEATURE_NAME_HONOR_BAR = "fallback-honor-bar";
const FEATURE_NAME_USER_NAME = "fallback-user-name";
const FEATURE_NAME = "fallback";

function is_excluded_page(): boolean {
  // Exclude a bunch of safe pages that never have players on them
  switch (true) {
    case torn_page("gym"):
    case torn_page("item"):
    case torn_page("city"):
    case torn_page("casino"):
    case torn_page("calendar"):
    case torn_page("preferences"):
    case torn_page("estateagents"):
    case torn_page("profiles"):
    case torn_page("pc"):
    case torn_page("citystats"):
    case torn_page("usersonline"):
    case torn_page("displaycase"):
    case torn_page("bank"):
    case torn_page("loan"):
    case torn_page("donator"):
    case torn_page("token_shop"):
    case torn_page("freebies"):
    case torn_page("bigalgunshop"):
    case torn_page("shops"):
    case torn_page("joblist"):
    case torn_page("joblisting"):
    case torn_page("messageinc"):
    case torn_page("comics"):
    case torn_page("archives"):
    case torn_page("rules"):
    case torn_page("credits"):
    case torn_page("committee"):
    case torn_page("church"):
    case torn_page("christmas_town"):
    case torn_page("index", { page: "hunting" }):
    case torn_page("index", { page: "bank" }):
    case torn_page("page", { sid: "slotsLastRolls" }):
    case torn_page("page", { sid: "rouletteLastSpins" }):
    case torn_page("page", { sid: "highlowLastGames" }):
    case torn_page("page", { sid: "kenoLastGames" }):
    case torn_page("page", { sid: "crapsLastRolls" }):
    case torn_page("page", { sid: "blackjackLastGames" }):
    case torn_page("page", { sid: "spinTheWheelLastSpins" }):
    case torn_page("page", { sid: "bunker" }):
    case torn_page("page", { sid: "points" }):
    case torn_page("page", { sid: "itemsMods" }):
    case torn_page("page", { sid: "keepsakes" }):
    case torn_page("page", { sid: "ammo" }):
    case torn_page("page", { sid: "awards" }):
    case torn_page("page", { sid: "log" }):
    case torn_page("page", { sid: "events" }):
    case torn_page("page", { sid: "crimes" }):
    case torn_page("page", { sid: "crimesRecord" }):
    case torn_page("page", { sid: "factionWarfare" }):
    case torn_page("page", { sid: "travel" }):
    case torn_page("page", { sid: "missions" }):
    case torn_page("page", { sid: "stocks" }):
    case torn_page("page", { sid: "slots" }):
    case torn_page("page", { sid: "roulette" }):
    case torn_page("page", { sid: "highlow" }):
    case torn_page("page", { sid: "keno" }):
    case torn_page("page", { sid: "craps" }):
    case torn_page("page", { sid: "bookie" }):
    case torn_page("page", { sid: "blackjack" }):
    case torn_page("page", { sid: "spinTheWheel" }):
    case torn_page("page", { sid: "education" }):
    case torn_page("page", { sid: "itemMarket" }):
      return true;

    default:
      if (torn_page("factions", { step: "your" })) {
        const hash = window.location.hash;
        if (!(hash.startsWith("#/war/") || hash === "#/tab=info")) {
          return true;
        }
      }
      return false;
  }
}

export default {
  name: "Fallback mutation observer",
  description: "Catch all mutations and see if we can apply FF data",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on all pages globally so the navigation listener is set up
    return true;
  },

  async run() {
    let is_observing = false;

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
        await apply_ff_gauge_selector(honor_bars, FEATURE_NAME_HONOR_BAR);
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
          torn_page("messages") ||
          torn_page("index") ||
          torn_page("hospitalview") ||
          torn_page("page", { sid: "UserList" })
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".name"),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.startsWith("https://www.torn.com/bounties.php")
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll(".target, .listed"),
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
            node.querySelectorAll(
              ".last-poster, .starter, .last-post, .poster",
            ),
            FEATURE_NAME,
          );
        } else if (
          window.location.href.includes("page.php?sid=hof") ||
          torn_page("factions", { step: "profile" }) ||
          torn_page("factions", { step: "your" }, [
            "",
            "#",
            "#/",
            "#/tab=info",
            "#/war/*",
          ])
        ) {
          await apply_ff_gauge_selector(
            node.querySelectorAll('[class*="userInfoBox__"]'),
            FEATURE_NAME,
          );
        } else if (name_elems.length > 0) {
          // Fallback for anyone without honor bars enabled
          await apply_ff_gauge_selector(name_elems, FEATURE_NAME_USER_NAME);
        }
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

    const update_observer_state = () => {
      const excluded = is_excluded_page();
      if (excluded) {
        if (is_observing) {
          ff_gauge_observer.disconnect();
          is_observing = false;
          log.debug("Disconnected fallback MutationObserver (excluded page)");
        }
      } else {
        if (!is_observing) {
          ff_gauge_observer.observe(document, {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: true,
          });
          is_observing = true;
          log.debug("Connected fallback MutationObserver (included page)");

          if (document.body) {
            check_mutation(document.body);
          }
        }
      }
    };

    // Register navigation listener
    on_navigation(() => {
      log.debug("Navigation detected, re-evaluating fallback observer state");
      update_observer_state();
    });

    // Run initial state setup
    update_observer_state();
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
