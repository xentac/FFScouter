import {
  type FactionFilterBoxHandle,
  type FactionFilterSnapshot,
  FFFactionFilterBox,
  getFilterBoxHandle,
} from "@ui/faction-filter-box";
import {
  apply_ff_gauge_selector,
  GaugeAttachMode,
  on_navigation,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { type FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { type Feature, StartTime } from "../feature";
import { apply_ff_columns, poll_traveling_flights } from "./column-population";
import {
  apply_filters_and_sort,
  is_applying,
  update_header_sort_indicator,
} from "./filter-sort-engine";

const log = logger.child("feature:faction");

const FEATURE_NAME = "faction";

// ============================================================================
// SHARED ELEMENT-LIFECYCLE HELPERS
// Generic "wait for a condition inside a root, then run setup" and "run cleanup
// once a previously-connected element leaves the DOM" helpers. Both the standard
// members/chain-attack flow (SECTION 3) and the Ranked War flow (SECTION 4)
// otherwise wire up the same MutationObserver + isConnected-poll boilerplate
// independently per list shape.
// ============================================================================
function cleanup_when_detached(el: HTMLElement, dispose: () => void) {
  const cleanupInterval = setInterval(() => {
    if (!el.isConnected) {
      clearInterval(cleanupInterval);
      dispose();
    }
  }, 10_000);
}

function run_when_ready(
  root: HTMLElement,
  isReady: () => boolean,
  onReady: () => void,
) {
  if (isReady()) {
    onReady();
    return;
  }

  const loadObserver = new MutationObserver((_mutations, obs) => {
    if (isReady()) {
      obs.disconnect();
      onReady();
    }
  });
  loadObserver.observe(root, { childList: true, subtree: true });
  cleanup_when_detached(root, () => loadObserver.disconnect());
}

// ============================================================================
// FILTER BOX MOUNTING HELPERS
// ============================================================================

// Re-exported so feature tests can import it from the feature module.
export { getFilterBoxHandle };

function mountFilterBox(
  mode: "faction" | "war",
  onFilterChange: (snapshot: FactionFilterSnapshot) => void,
): HTMLElement {
  const container = document.createElement("div");
  container.style.display = "contents";
  container.setAttribute("data-ff-filter-box", "true");
  container.setAttribute("data-mode", mode);

  const ref: { current: FactionFilterBoxHandle | null } = { current: null };
  // Set true once the component's mount effect completes (after its initial
  // loadState dispatch). Until then, imperative calls are buffered so they
  // aren't clobbered by that initial dispatch — and reads return defaults.
  let ready = false;
  // Track hasLastActionData locally so we can seed it before React mounts.
  let hasLastActionDataProp = false;
  // Operations invoked before the component is ready, replayed in order once
  // onReady fires. createRoot commits asynchronously, so feature code / tests
  // that call handle methods right after mounting would otherwise be lost.
  const pending: Array<(h: FactionFilterBoxHandle) => void> = [];

  const runOrBuffer = (fn: (h: FactionFilterBoxHandle) => void) => {
    if (ready && ref.current) {
      fn(ref.current);
    } else {
      pending.push(fn);
    }
  };

  const onReady = () => {
    ready = true;
    if (ref.current && pending.length > 0) {
      for (const fn of pending) fn(ref.current);
      pending.length = 0;
    }
  };

  // A stable handle proxy that delegates to the mounted instance (buffering
  // until it is ready). Feature code and tests access this via
  // getFilterBoxHandle(container).
  const handle: FactionFilterBoxHandle = {
    get ready() {
      return ready;
    },
    get sortBy() {
      return ready ? (ref.current?.sortBy ?? "none") : "none";
    },
    get activity() {
      return ready && ref.current
        ? ref.current.activity
        : { online: true, idle: true, offline: true };
    },
    get hasLastActionData() {
      return ready && ref.current
        ? ref.current.hasLastActionData
        : hasLastActionDataProp;
    },
    setSortBy: (val) => runOrBuffer((h) => h.setSortBy(val)),
    getFilterSnapshot: () =>
      ready && ref.current
        ? ref.current.getFilterSnapshot()
        : {
            sortBy: "none",
            filterEnabled: true,
            activity: { online: true, idle: true, offline: true },
            status: {
              okay: true,
              traveling: true,
              hospital: true,
              jail: true,
              abroad: true,
              federal: true,
              fallen: true,
            },
            levelMin: null,
            levelMax: null,
            ffMin: null,
            ffMax: null,
            statsMin: null,
            statsMax: null,
            lastActionMinSec: null,
            lastActionMaxSec: null,
          },
    setHasLastActionData: (val) => {
      hasLastActionDataProp = val;
      runOrBuffer((h) => h.setHasLastActionData(val));
    },
    setFilterState: (patch) => runOrBuffer((h) => h.setFilterState(patch)),
    dispatchChange: () => runOrBuffer((h) => h.dispatchChange()),
  };

  (container as unknown as { __ffHandle: FactionFilterBoxHandle }).__ffHandle =
    handle;

  createRoot(container).render(
    createElement(FFFactionFilterBox, {
      mode,
      onFilterChange,
      ref,
      initialHasLastActionData: hasLastActionDataProp,
      onReady,
    }),
  );

  return container;
}

// Detects whether TWSE is present (see CONTEXT.md's "TWSE Presence Detection")
// by scanning for at least one row carrying data-twse-last-action-timestamp,
// and pushes the result onto the shared filter box as a property — mirroring
// how `mode` is set today. War mode shares one filter box across both
// .enemy-faction/.your-faction lists, so the scan covers the whole war box,
// not just the one list passed in.
function update_last_action_visibility(list: HTMLElement) {
  const scope = list.closest(".faction-war") || list;
  const boxEl = (
    list.closest(".faction-war") || list.parentNode
  )?.querySelector("[data-ff-filter-box]");
  const handle = getFilterBoxHandle(boxEl);
  if (!handle) return;
  handle.setHasLastActionData(
    !!scope.querySelector("[data-twse-last-action-timestamp]"),
  );
}

// Watches a list for the status/activity attribute changes Torn's own JS makes
// in response to state-change events, debounces via rAF, and reapplies the
// current filter/sort state on top of Torn's reordering. Also watches for TWSE
// setting data-twse-last-action-timestamp on a row (TWSE runs as an
// independent script, so it may not have annotated rows yet by the time this
// watcher is set up) and re-runs update_last_action_visibility on the same rAF
// pass — safe to combine with our own row-reordering since that only performs
// childList mutations (appendChild), never attribute changes, so it can't
// retrigger this attributes-only observer. The 30s flight-poll tick below is
// a fallback for the rarer case where TWSE adds the attribute via a brand new
// row element (a childList mutation this observer doesn't watch) rather than
// annotating an existing one. Used by both the standard members flow
// (observeTarget is the .table-body, since standard lists have one) and the
// Ranked War flow (observeTarget is the list itself).
function setup_reapply_watcher(
  list: HTMLElement,
  observeTarget: Element,
  getColDisplay: () => FactionsColDisplay,
) {
  update_last_action_visibility(list);

  let rafPending = false;
  const attributeObserver = new MutationObserver((mutations) => {
    if (is_applying(list)) return;

    let shouldReapply = false;
    for (const m of mutations) {
      if (m.type === "attributes") {
        if (
          m.attributeName === "aria-label" &&
          m.target instanceof HTMLElement &&
          m.target.closest('[class*="userStatusWrap"]')
        ) {
          shouldReapply = true;
          break;
        }
        if (
          m.attributeName === "class" &&
          m.target instanceof HTMLElement &&
          m.target.closest(".status")
        ) {
          shouldReapply = true;
          break;
        }
        if (m.attributeName === "data-twse-last-action-timestamp") {
          shouldReapply = true;
          break;
        }
      }
    }

    if (shouldReapply && !rafPending) {
      rafPending = true;
      requestAnimationFrame(() => {
        rafPending = false;
        update_last_action_visibility(list);
        const boxEl = (
          list.closest(".faction-war") || list.parentNode
        )?.querySelector("[data-ff-filter-box]");
        const handle = getFilterBoxHandle(boxEl);
        if (handle?.activity) {
          apply_filters_and_sort(list, {
            ...handle.getFilterSnapshot(),
            colDisplay: getColDisplay(),
          });
        }
      });
    }
  });

  attributeObserver.observe(observeTarget, {
    attributes: true,
    attributeFilter: ["class", "aria-label", "data-twse-last-action-timestamp"],
    subtree: true,
  });

  const flightInterval = setInterval(() => {
    poll_traveling_flights(list);
    update_last_action_visibility(list);
  }, 30000);

  cleanup_when_detached(list, () => {
    clearInterval(flightInterval);
    attributeObserver.disconnect();
  });
}

// ============================================================================
// SECTION 3: STANDARD MEMBERS & CHAIN ATTACK PAGES FLOW
// Setup, observation, and initialization functions for standard faction member list
// pages. Monitors additions and status updates to dynamically keep columns and filters updated.
// ============================================================================
function inject_filter_box(membersList: HTMLElement) {
  const parent = membersList.parentNode;
  if (!parent) return;

  if (parent.querySelector("[data-ff-filter-box]")) return;

  const container = mountFilterBox("faction", (snapshot) => {
    apply_filters_and_sort(membersList, {
      ...snapshot,
      colDisplay: ffconfig.factions_col_display,
    });
    update_header_sort_indicator(membersList, snapshot.sortBy);
  });
  parent.insertBefore(container, membersList);
}

export function initialize_features(membersList: HTMLElement) {
  // Guards against re-entry (e.g. repeated SPA navigation events re-finding an
  // already-initialized list), which would otherwise race inject_filter_box's
  // check-then-await-then-insert and inject a second filter box.
  if (membersList.hasAttribute("data-ffscouter-initialized")) return;
  membersList.setAttribute("data-ffscouter-initialized", "true");

  inject_filter_box(membersList);
  setup_header_click(membersList, ".table-header", "[role='button']");
  apply_ff_columns(membersList).catch((err: unknown) => {
    log.error(err);
  });

  const target = membersList.querySelector(".table-body") || membersList;
  setup_reapply_watcher(
    membersList,
    target,
    () => ffconfig.factions_col_display,
  );
}

function setup_faction_features(membersList: HTMLElement) {
  run_when_ready(
    membersList,
    () =>
      !!membersList.querySelector(".table-body")?.querySelector(".table-row"),
    () => initialize_features(membersList),
  );
}

const monitor_member_list = (
  root: HTMLElement = document.body,
  _dynamic = false,
) => {
  const membersList = root.classList.contains("members-list")
    ? root
    : (root.querySelector(".members-list") as HTMLElement);

  if (membersList) {
    setup_faction_features(membersList);
  } else {
    // Check elements on page load dynamically
    apply_ff_members_list(root);

    const loadObserver = new MutationObserver((mutations, obs) => {
      const foundList = root.classList.contains("members-list")
        ? root
        : (root.querySelector(".members-list") as HTMLElement);
      if (foundList) {
        obs.disconnect();
        setup_faction_features(foundList);
      } else {
        let shouldUpdate = false;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (
              node instanceof HTMLElement &&
              (node.querySelector(".honor-text-wrap") ||
                node.querySelector(".member"))
            ) {
              shouldUpdate = true;
              break;
            }
          }
          if (shouldUpdate) break;
        }
        if (shouldUpdate) {
          apply_ff_members_list(root);
        }
      }
    });

    loadObserver.observe(root, { childList: true, subtree: true });
    cleanup_when_detached(root, () => loadObserver.disconnect());
  }
};

const apply_ff_members_list = (root: HTMLElement = document.body) => {
  const membersList = root.classList.contains("members-list")
    ? root
    : (root.querySelector(".members-list") as HTMLElement);

  if (membersList) {
    setup_faction_features(membersList);
    return;
  }
  apply_ff_gauge_selector(
    root.querySelectorAll(".honor-text-wrap"),
    FEATURE_NAME,
    GaugeAttachMode.HONOR_BAR,
  );
  apply_ff_gauge_selector(
    root.querySelectorAll(".member"),
    FEATURE_NAME,
    GaugeAttachMode.FALLBACK,
  );
  for (const l of root.querySelectorAll(".members-list, .chain-attacks-list")) {
    if (l instanceof HTMLElement) {
      apply_ff_members_list(l);
    }
  }
};

// ============================================================================
// SECTION 4: RANKED WAR PAGES FLOW (SIDE-BY-SIDE LISTS)
// Dynamic loader and event observers for side-by-side Ranked War faction tables.
// Sets up a single, borderless configuration panel and binds it to both tables, waiting
// for asynchronous rows (li.enemy, li.your) to load.
// ============================================================================
function setup_header_click(
  list: HTMLElement,
  headerAreaSelector: string,
  nativeTabSelector: string,
) {
  if (list.hasAttribute("data-ffscouter-header-click")) return;
  list.setAttribute("data-ffscouter-header-click", "true");

  list.addEventListener(
    "click",
    (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest(headerAreaSelector)) return;

      const scope = list.closest(".faction-war") ?? list.parentElement;
      const handle = getFilterBoxHandle(
        scope?.querySelector("[data-ff-filter-box]"),
      );
      if (!handle) return;

      if (target.closest(".ffscouter-header")) {
        e.preventDefault();
        e.stopPropagation();
        const newSort = handle.sortBy === "ff-desc" ? "ff-asc" : "ff-desc";
        handle.setSortBy(newSort);
      } else if (target.closest(nativeTabSelector)) {
        if (handle.sortBy !== "none") {
          handle.setSortBy("none");
        }
      }
    },
    { capture: true },
  );
}

export function setup_war_features(factionWar: HTMLElement) {
  run_when_ready(
    factionWar,
    () =>
      factionWar.querySelectorAll(".enemy-faction, .your-faction").length > 0,
    () =>
      initialize_war_features(
        factionWar,
        Array.from(
          factionWar.querySelectorAll(".enemy-faction, .your-faction"),
        ) as HTMLElement[],
      ),
  );
}

function initialize_war_features(
  factionWar: HTMLElement,
  lists: HTMLElement[],
) {
  // Guards against re-entry (e.g. the descriptions-mutation observer and the
  // existing_descriptions check in process_page both firing for one page load),
  // which would otherwise race the filter-box check-then-await-then-insert below.
  if (factionWar.hasAttribute("data-ffscouter-initialized")) return;
  factionWar.setAttribute("data-ffscouter-initialized", "true");

  // Inject single filter box at the top of the war box (factionWar)
  if (!factionWar.querySelector("[data-ff-filter-box][data-mode='war']")) {
    const container = mountFilterBox("war", (snapshot) => {
      const currentLists = Array.from(
        factionWar.querySelectorAll(".enemy-faction, .your-faction"),
      ) as HTMLElement[];
      const colDisplay = ffconfig.war_col_display;
      for (const list of currentLists) {
        apply_filters_and_sort(list, { ...snapshot, colDisplay });
        update_header_sort_indicator(list, snapshot.sortBy);
      }
    });
    factionWar.insertBefore(container, factionWar.firstChild);
  }

  for (const list of lists) {
    setup_war_list(list);
  }
}

function setup_war_list(list: HTMLElement) {
  run_when_ready(
    list,
    () => !!list.querySelector(".enemy, .your"),
    () => initialize_war_list(list),
  );
}

function initialize_war_list(list: HTMLElement) {
  setup_header_click(list, ".white-grad", "[class*='tab___']");
  apply_ff_columns(list).catch((err: unknown) => {
    log.error(err);
  });

  setup_reapply_watcher(list, list, () => ffconfig.war_col_display);
}

// ============================================================================
// SECTION 5: ENTRY POINTS & PAGE EVENT ROUTER
// The main page navigation observer, selector router, and extension hooks for Torn Factions step page loads.
// ============================================================================
const process_page = () => {
  wait_for_element(".members-list", 10_000)
    .then((node) => {
      if (node instanceof HTMLElement) {
        log.debug("Found members-list!");
        monitor_member_list(node);
      }
    })
    .catch((err: unknown) => {
      log.error(err);
    });

  wait_for_element(".chain-attacks-list", 10_000)
    .then((node) => {
      if (node instanceof HTMLElement) {
        log.debug("Found chain-attacks-list!");
        monitor_member_list(node, true);
      }
    })
    .catch((err: unknown) => {
      log.error(err);
    });

  // TODO: Support #faction-info and #faction-main swapping on personal faction page

  wait_for_element("#faction_war_list_id", 10_000)
    .then(async (node) => {
      if (!node) {
        return;
      }
      log.debug("Found faction_war_list_id");
      const descriptions_observer = new MutationObserver(async (mutations) => {
        // MutationObserver callbacks aren't awaited by the browser, so a
        // rejection here would otherwise surface as an unhandled promise
        // rejection instead of being routed through our logger.
        try {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (
                node instanceof HTMLElement &&
                node.classList.contains("descriptions")
              ) {
                log.debug(
                  "Observed mutation that included adding descriptions",
                  node,
                );
                const faction_war = await wait_for_element(
                  ".faction-war",
                  10_000,
                );
                if (faction_war instanceof HTMLElement) {
                  setup_war_features(faction_war);
                }
              }
            }
          }
        } catch (err) {
          log.error(err);
        }
      });
      descriptions_observer.observe(node, { childList: true });
      log.debug(
        `Set up descriptions observer on <${node.tagName.toLowerCase()}> .${[...node.classList].join(".")}`,
      );

      const existing_descriptions = node.querySelector(".descriptions");
      if (existing_descriptions) {
        const faction_war = await wait_for_element(
          " .faction-war",
          10_000,
          existing_descriptions,
        );
        if (faction_war instanceof HTMLElement) {
          setup_war_features(faction_war);
        }
      }
    })
    .catch((err: unknown) => {
      log.error(err);
    });
};

export function should_run_faction(): boolean {
  if (torn_page("factions", { step: "profile" })) {
    return true;
  }
  if (torn_page("factions", { step: "your" })) {
    if (
      window.location.hash === "" ||
      window.location.hash === "#" ||
      window.location.hash === "#/" ||
      window.location.hash.startsWith("#/war/") ||
      window.location.hash === "#/tab=info"
    ) {
      return true;
    }
  }
  return false;
}

export default {
  name: "Faction page FF display",
  description: "Shows FF arrows on both your faction and other faction pages.",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the faction pages
    return torn_page("factions");
  },

  async run() {
    on_navigation(() => {
      if (should_run_faction()) {
        process_page();
      }
    });

    window.addEventListener("ff-config-updated", () => {
      if (should_run_faction()) {
        const lists = document.querySelectorAll(
          ".members-list, .chain-attacks-list, .enemy-faction, .your-faction",
        );
        for (const list of lists) {
          if (list instanceof HTMLElement) {
            apply_ff_columns(list).catch((err: unknown) => {
              log.error(err);
            });
          }
        }
      }
    });

    if (should_run_faction()) {
      process_page();
    }
  },
} satisfies Feature;
