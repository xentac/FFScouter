import {
  apply_ff_gauge_selector,
  GaugeAttachMode,
  on_navigation,
  torn_page,
  wait_for_body,
  wait_for_element,
} from "@utils/dom";
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
        if (
          !(
            hash.startsWith("#/war/") ||
            hash === "#/tab=info" ||
            hash.startsWith("#/tab=controls")
          )
        ) {
          return true;
        }
      }
      return false;
  }
}

async function find_mutation_target() {
  const content_wrapper = await wait_for_element(".content-wrapper", 10_000);
  if (content_wrapper) {
    return content_wrapper;
  }
  await wait_for_body(10_000);
  return document.body;
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
    interface PageConfig {
      has_page_specific: boolean;
      page_specific_selectors: string[];
      combined_selector: string;
    }

    const IGNORED_TAGS = new Set([
      "SCRIPT",
      "STYLE",
      "LINK",
      "META",
      "SVG",
      "PATH",
      "BR",
      "HR",
      "HEAD",
      "TITLE",
    ]);

    const get_page_selectors = (): PageConfig => {
      const href = window.location.href;
      let page_specific: string[] = [];

      if (href.startsWith("https://www.torn.com/companies.php")) {
        page_specific = [".employee", ".director"];
      } else if (
        href.startsWith("https://www.torn.com/page.php?sid=competition#/team")
      ) {
        page_specific = ['[class*="name__"]'];
      } else if (href.startsWith("https://www.torn.com/joblist.php")) {
        page_specific = [".employee", ".director"];
      } else if (
        torn_page("messages") ||
        torn_page("index") ||
        torn_page("page", { sid: "UserList" })
      ) {
        page_specific = [".name"];
      } else if (href.startsWith("https://www.torn.com/bounties.php")) {
        page_specific = [".target, .listed"];
      } else if (
        href.startsWith("https://www.torn.com/page.php?sid=attackLog")
      ) {
        page_specific = ["ul.participants-list li"];
      } else if (href.startsWith("https://www.torn.com/forums.php")) {
        page_specific = [".last-poster, .starter, .last-post, .poster"];
      } else if (
        href.includes("page.php?sid=hof") ||
        torn_page("factions", { step: "profile" }) ||
        torn_page("factions", { step: "your" }, [
          "",
          "#",
          "#/",
          "#/tab=info",
          "#/war/*",
        ])
      ) {
        page_specific = ['[class*="userInfoBox__"]'];
      }

      if (page_specific.length > 0) {
        const combined = [".honor-text-wrap", ...page_specific].join(", ");
        return {
          has_page_specific: true,
          page_specific_selectors: page_specific,
          combined_selector: combined,
        };
      }

      return {
        has_page_specific: false,
        page_specific_selectors: [],
        combined_selector: ".honor-text-wrap, .user-wrap.user-name, .user.name",
      };
    };

    let current_config: PageConfig = get_page_selectors();
    let is_observing = false;

    const check_mutation = async (node: Element) => {
      if (!node.querySelectorAll || IGNORED_TAGS.has(node.tagName)) {
        return;
      }

      // Fast-fail check: skip elements that don't match and don't contain any target selector
      if (
        !node.matches(current_config.combined_selector) &&
        !node.querySelector(current_config.combined_selector)
      ) {
        return;
      }

      const honor_bars = node.querySelectorAll(
        ".honor-text-wrap",
      ) as NodeListOf<HTMLElement>;

      if (honor_bars.length > 0) {
        apply_ff_gauge_selector(
          honor_bars,
          FEATURE_NAME_HONOR_BAR,
          GaugeAttachMode.HONOR_BAR,
        );
      } else if (current_config.has_page_specific) {
        for (const selector of current_config.page_specific_selectors) {
          apply_ff_gauge_selector(
            node.querySelectorAll(selector),
            FEATURE_NAME,
            GaugeAttachMode.FALLBACK,
          );
        }
      } else {
        const userwrap = node.querySelectorAll(
          ".user-wrap.user-name",
        ) as NodeListOf<HTMLElement>;
        if (userwrap.length > 0) {
          apply_ff_gauge_selector(
            userwrap,
            FEATURE_NAME_USER_NAME,
            GaugeAttachMode.FALLBACK,
          );
          return;
        }
        const username = node.querySelectorAll(
          ".user.name",
        ) as NodeListOf<HTMLElement>;
        if (username.length > 0) {
          apply_ff_gauge_selector(
            username,
            FEATURE_NAME_USER_NAME,
            GaugeAttachMode.FALLBACK,
          );
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

    const update_observer_state = async () => {
      const excluded = is_excluded_page();
      if (excluded) {
        if (is_observing) {
          ff_gauge_observer.disconnect();
          is_observing = false;
          log.debug("Disconnected fallback MutationObserver (excluded page)");
        }
      } else {
        current_config = get_page_selectors();
        if (!is_observing) {
          const target = await find_mutation_target();
          ff_gauge_observer.observe(target, {
            attributes: false,
            childList: true,
            characterData: false,
            subtree: true,
          });
          is_observing = true;
          log.debug("Connected fallback MutationObserver (included page)");

          if (target) {
            check_mutation(target);
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
