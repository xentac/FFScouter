import { apply_ff_gauge, torn_page, wait_for_element } from "@utils/dom";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const monitor_member_list = (
  root: HTMLElement = document.body,
  dynamic = false,
) => {
  apply_ff_members_list(root);

  if (dynamic) {
    const m = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            (node.querySelector(".honor-text-wrap") ||
              node.querySelector(".member"))
          ) {
            apply_ff_members_list(root);
            return;
          }
        }
      }
    });
    m.observe(root, { childList: true, subtree: true });

    const cleanupInterval = setInterval(() => {
      if (!root.isConnected) {
        clearInterval(cleanupInterval);
        m.disconnect();
      }
    }, 10_000);
  }
};

const apply_ff_members_list = (root: HTMLElement = document.body) => {
  let found_honor = false;
  for (const bar of root.querySelectorAll(".honor-text-wrap")) {
    apply_ff_gauge(bar);
    found_honor = true;
  }
  if (found_honor) {
    return;
  }
  for (const bar of root.querySelectorAll(".member")) {
    apply_ff_gauge(bar);
  }
  for (const l of root.querySelectorAll(".members-list, .chain-attacks-list")) {
    if (l instanceof HTMLElement) {
      apply_ff_members_list(l);
    }
  }
};

export default {
  name: "Faction page FF display",
  description: "Shows FF arrows on both your faction and other faction pages.",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the attack page
    return (
      torn_page("factions", { step: "profile" }) ||
      torn_page("factions", { step: "your" })
    );
  },

  async run() {
    wait_for_element(".members-list", 10_000).then((node) => {
      if (node instanceof HTMLElement) {
        logger.debug("Found members-list!");
        monitor_member_list(node);
      }
    });

    wait_for_element(".chain-attacks-list", 10_000).then((node) => {
      if (node instanceof HTMLElement) {
        logger.debug("Found chain-attacks-list!");
        monitor_member_list(node, true);
      }
    });

    // TODO: Support #faction-info and #faction-main swapping on personal faction page

    wait_for_element("#faction_war_list_id", 10_000).then(async (node) => {
      if (!node) {
        return;
      }
      logger.debug("Found faction_war_list_id");
      const descriptions_observer = new MutationObserver(async (mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof HTMLElement &&
              node.classList.contains("descriptions")
            ) {
              logger.debug(
                "Observed mutation that included adding descriptions",
                node,
              );
              const faction_war = await wait_for_element(
                ".faction-war",
                10_000,
              );
              if (faction_war instanceof HTMLElement) {
                monitor_member_list(faction_war, true);
              }
            }
          }
        }
      });
      descriptions_observer.observe(node, { childList: true });
      logger.debug("Set up descriptions observer on", node);

      const existing_descriptions = node.querySelector(".descriptions");
      if (existing_descriptions) {
        const faction_war = await wait_for_element(
          ".faction-war",
          10_000,
          existing_descriptions,
        );
        if (faction_war instanceof HTMLElement) {
          apply_ff_members_list(faction_war);
        }
      }
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
