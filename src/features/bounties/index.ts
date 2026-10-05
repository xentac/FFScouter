import { BountyBoard, type BountyBoardVariant } from "@ui/bounty-board";
import {
  is_narrow_layout,
  NARROW_LAYOUT_QUERY,
  on_navigation,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";

// The Bounty Board Modal shows only on the main bounty list. Torn's bounties
// page is hash-routed and writes the same route in several forms: an empty
// hash before its router runs, "#!p=main", and "#/!p=main&start=20" from its
// in-page links (pagination, the newspaper "bounties" link). Any route whose
// p is absent or "main" is the main list; "#/p=add", "#!p=mine" are not.
function is_bounty_main_route(): boolean {
  const params = new URLSearchParams(location.hash.replace(/^#\/?!?/, ""));
  const route = params.get("p");
  return route === null || route === "main";
}

// Torn replaces everything inside .content-wrapper on page changes (the node
// TornTools also watches to re-inject its bounty filter), and pagination swaps
// .page-template-cont's contents. Like TornTools, the narrow section waits
// for Torn's rendered bounty rows, then places itself first in the template:
// above the help message and the list (see the 2026-10-04
// bounties-main-narrow fixture).
const CONTENT_WRAPPER = ".content-wrapper";
const TEMPLATE = ".page-template-cont";
const BOUNTY_ROWS = `${TEMPLATE} .bounties-list > li`;
// No rows by then (markup changed, or Torn never rendered them): fall back to
// the floating modal rather than showing nothing.
export const BOUNTY_LIST_TIMEOUT_MS = 30 * 1000;

const log = logger.child("feature:bounties");

export function should_show_bounty_board(): boolean {
  return (
    ffconfig.bounty_board_enabled &&
    torn_page("bounties") &&
    is_bounty_main_route()
  );
}

// Single tracked root (ADR 0010): sync() is the only mounter and always
// unmounts before the slot is reused, so hash-route changes can never orphan
// a root (and its board/view state) behind a fresh one. A layout change, or
// Torn rewriting the page, *moves* the same container instead of remounting,
// so the board and transient state survive without a refetch. The root
// renders only once the container is placed, so nothing is fetched while it
// waits for Torn's list.
//
// Wide: the container lives on document.body, outside Torn's SPA-swapped
// content, so nothing else removes it. Narrow: it sits first in
// `.page-template-cont`, and is re-placed whenever Torn rewrites the page.
let mounted: {
  root: Root;
  container: HTMLElement;
  // The variant last rendered; null until the container is first placed.
  rendered: BountyBoardVariant | null;
} | null = null;

// Watches only the direct children of .content-wrapper and the template
// (never a subtree): whichever one Torn rewrites, sync() re-places the
// container.
let page_observer: MutationObserver | null = null;

// The in-flight wait for Torn's bounty rows. Aborted on unmount or when the
// board goes back to floating, so it never outlives its purpose.
let rows_wait: AbortController | null = null;

function create_container(): HTMLElement {
  const container = document.createElement("div");
  container.id = "ffscouter-bounty-board";
  return container;
}

function render(variant: BountyBoardVariant) {
  if (!mounted || mounted.rendered === variant) return;
  mounted.rendered = variant;
  mounted.root.render(createElement(BountyBoard, { variant }));
}

function watch_page() {
  page_observer ??= new MutationObserver(() => sync());
  page_observer.disconnect();
  for (const selector of [CONTENT_WRAPPER, TEMPLATE]) {
    const el = document.querySelector(selector);
    if (el) page_observer.observe(el, { childList: true });
  }
}

function stop_watching() {
  rows_wait?.abort();
  rows_wait = null;
  page_observer?.disconnect();
}

function float_modal() {
  if (!mounted) return;
  if (mounted.container.parentElement !== document.body) {
    document.body.appendChild(mounted.container);
  }
  render("modal");
}

function place_section() {
  if (!mounted) return;
  const template = document.querySelector(TEMPLATE);
  if (template && document.querySelector(BOUNTY_ROWS)) {
    rows_wait?.abort();
    rows_wait = null;
    if (template.firstElementChild !== mounted.container) {
      template.prepend(mounted.container);
    }
    render("section");
    watch_page();
    return;
  }

  // Torn hasn't rendered the list (yet). Whatever shows stays meanwhile: a
  // dropped section shows nothing, a floating modal keeps floating.
  if (rows_wait) return;
  const wait = new AbortController();
  rows_wait = wait;
  // Scoped to .content-wrapper (where Torn renders the list) when it exists,
  // rather than observing the whole body.
  const scope = document.querySelector(CONTENT_WRAPPER) ?? undefined;
  void wait_for_element(BOUNTY_ROWS, BOUNTY_LIST_TIMEOUT_MS, scope, {
    signal: wait.signal,
  }).then((rows) => {
    if (wait.signal.aborted) return;
    rows_wait = null;
    if (rows) {
      sync();
      return;
    }
    log.warn("Torn's bounty list didn't render; floating FF Scouter Bounties");
    float_modal();
    // Keep watching, so a list Torn renders later still moves it in-flow.
    watch_page();
  });
}

export function unmount_bounty_board() {
  stop_watching();
  if (!mounted) return;
  mounted.root.unmount();
  mounted.container.remove();
  mounted = null;
}

// Idempotent: a board already shown on a still-matching route is left alone
// (remounting would refetch and drop transient state), only re-placed if Torn
// dropped it or the layout changed. Turning the master toggle off unmounts it,
// and with it the only bounty board consumer on this page — no bounty traffic
// happens while disabled.
function sync() {
  if (!should_show_bounty_board()) {
    unmount_bounty_board();
    return;
  }
  if (!mounted) {
    const container = create_container();
    mounted = { root: createRoot(container), container, rendered: null };
  }
  if (is_narrow_layout()) {
    place_section();
  } else {
    stop_watching();
    float_modal();
  }
}

export default {
  name: "FF Scouter Bounties",
  description:
    "FF Scouter Bounties board on Torn's bounties page, floating on desktop and in-flow on narrow layouts (separate from Torn's own bounties)",
  executionTime: StartTime.DocumentBody,

  // Only the page is checked here: shouldRun() runs once at boot, so the
  // hash route and master toggle are re-evaluated in run() on every
  // navigation and settings save instead.
  async shouldRun() {
    return torn_page("bounties");
  },

  async run() {
    on_navigation(sync);
    window.addEventListener("ff-config-updated", sync);
    // Crossing Torn's 784px breakpoint swaps modal and section live.
    window.matchMedia?.(NARROW_LAYOUT_QUERY).addEventListener("change", sync);
    sync();
  },
} satisfies Feature;
