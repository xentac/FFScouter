import {
  apply_ff_gauge,
  type HandlerFnOptions,
  MonitorElements,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { type Feature, StartTime } from "../feature";

const FEATURE_NAME = "rr";

export default {
  name: "Russian Roulette FF display",
  description: "Shows FF on the Russian Roulette page",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return torn_page("page", { sid: "russianRoulette" });
  },

  async run() {
    const rows_wrapper = await wait_for_element(
      '[class*="rowsWrap__"]',
      20_000,
    );
    if (!rows_wrapper || !(rows_wrapper instanceof HTMLElement)) {
      return;
    }

    const row_matcher = (node: HTMLElement) => {
      const user_info_wrapper = node.querySelector(
        '.honor-text-wrap, [class*="userInfoBlock__"]',
      );
      return user_info_wrapper !== null;
    };
    const row_handler = (options: HandlerFnOptions) => {
      if (!options.added) {
        return;
      }
      const honor_bar = options.added.querySelector(".honor-text-wrap");
      if (honor_bar) {
        apply_ff_gauge(honor_bar, FEATURE_NAME);
        return;
      }
      const user_info_wrapper = options.added.querySelector(
        '[class*="userInfoBlock__"]',
      );
      if (user_info_wrapper) {
        apply_ff_gauge(user_info_wrapper, FEATURE_NAME);
        return;
      }
    };

    const rows_monitor = new MonitorElements(
      row_matcher,
      row_handler,
      rows_wrapper,
      true,
      { added: true },
      0,
    );
    rows_monitor.start();
  },
} satisfies Feature;
