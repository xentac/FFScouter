import {
  apply_ff_gauge,
  type HandlerFnOptions,
  MonitorElements,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

const FEATURE_NAME = "item_market";

export default {
  name: "Item market FF display",
  description: "Shows FF on the item market page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the item market page
    return torn_page("page", { sid: "ItemMarket" });
  },

  async run() {
    // Monitor the sellerListWrapper___PN32N for player_ids
    const category_list = await wait_for_element(
      '[class*="itemListWrapper__"]',
      20_000,
    );
    if (!category_list || !(category_list instanceof HTMLElement)) {
      return;
    }
    logger.debug("Found category list!");
    logger.debug(category_list);

    const category_matcher = (node: HTMLElement) => {
      const item_list = node.querySelector('[class*="itemList__"]');
      return item_list !== undefined;
    };
    const category_handler = (options: HandlerFnOptions) => {
      if (!options.added) {
        return;
      }
      const item_list = options.added.querySelector('[class*="itemList__"]');
      if (!item_list || !(item_list instanceof HTMLElement)) {
        return;
      }
      logger.debug("Found item_list!");
      logger.debug(item_list);
      const item_list_monitor = new MonitorElements(
        item_list_matcher,
        item_list_handler,
        item_list,
        true,
        { added: true },
        0,
      );
      item_list_monitor.start();
    };

    const item_list_matcher = (node: HTMLElement) => {
      const seller_list_wrapper = node.className.match(/sellerListWrapper__/);
      return seller_list_wrapper !== null;
    };
    const item_list_handler = (options: HandlerFnOptions) => {
      if (!options.added) {
        return;
      }
      const seller_list_wrapper = options.added;
      logger.debug("Found seller_list_wrapper!");
      logger.debug(seller_list_wrapper);
      const seller_list_wrapper_monitor = new MonitorElements(
        seller_list_wrapper_matcher,
        seller_list_wrapper_handler,
        seller_list_wrapper,
        true,
        { added: true },
        0,
      );
      seller_list_wrapper_monitor.start();
    };

    const seller_list_wrapper_matcher = (node: HTMLElement) => {
      const seller_list = node.className.match(/sellerList__/);
      return seller_list !== undefined;
    };
    const seller_list_wrapper_handler = (options: HandlerFnOptions) => {
      if (!options.added) {
        return;
      }
      const seller_list = options.added;
      logger.debug("Found seller_list!");
      logger.debug(seller_list);
      const seller_list_monitor = new MonitorElements(
        seller_list_matcher,
        seller_list_handler,
        seller_list,
        true,
        { added: true },
        0,
      );
      seller_list_monitor.start();
    };

    const seller_list_matcher = (node: HTMLElement) => {
      const user_info_wrapper = node.querySelector(
        '.honor-text-wrap, [class*="userInfoWrapper__"]',
      );
      return user_info_wrapper !== undefined;
    };
    const seller_list_handler = (options: HandlerFnOptions) => {
      if (!options.added) {
        return;
      }
      const honor_bar = options.added.querySelector(".honor-text-wrap");
      if (honor_bar) {
        apply_ff_gauge(honor_bar, FEATURE_NAME);
        return;
      }
      const user_info_wrapper = options.added.querySelector(
        '[class*="userInfoWrapper__"]',
      );
      if (user_info_wrapper) {
        apply_ff_gauge(user_info_wrapper, FEATURE_NAME);
        return;
      }
    };

    const category_monitor = new MonitorElements(
      category_matcher,
      category_handler,
      category_list,
      true,
      { added: true },
      0,
    );
    category_monitor.start();
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
