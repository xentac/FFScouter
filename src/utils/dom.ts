import { ffconfig, GaugeMarkerType } from "./ffconfig";
import { ffscouter } from "./ffscouter";
import logger from "./logger";
import {
  FF_ARROW_PATH_D,
  FF_ARROW_VIEWBOX,
  ff_to_percent,
  get_contrast_color,
  get_ff_arrow_colour,
} from "./strings";
import type { FFDataComplete, PlayerId } from "./types";

const log = logger.child("dom");

const ID_PARAMS = ["XID", "user2ID"];

export function extract_id_from_url(url: string): PlayerId | null {
  const parsed = new URL(url);
  const search = new URLSearchParams(parsed.search);

  for (const param of ID_PARAMS) {
    const v = search.get(param);
    if (v) {
      return parseInt(v, 10);
    }
  }

  return null;
}

type TornPageParams = {
  sid?: string;
  step?: string;
  page?: string;
};

export function torn_page(
  page: string,
  params: TornPageParams = {},
  match_hash: string[] = [],
) {
  const url_match = window.location.href.startsWith(
    `https://www.torn.com/${page}.php`,
  );
  if (!url_match) {
    return false;
  }

  const search = new URLSearchParams(window.location.search);
  let sid_match = true;
  let step_match = true;
  let page_match = true;
  if (params.sid) {
    const page_sid = search.get("sid");
    sid_match = page_sid !== null && params.sid === page_sid;
  }
  if (params.step) {
    const page_step = search.get("step");
    step_match = page_step !== null && params.step === page_step;
  }
  if (params.page) {
    const page_page = search.get("page");
    page_match = page_page !== null && params.page === page_page;
  }

  if (!sid_match || !step_match || !page_match) {
    return false;
  }

  let hash_match = false;
  if (match_hash.length === 0) {
    hash_match = true;
  } else {
    const hash = window.location.hash;
    for (const h of match_hash) {
      if (h.endsWith("*")) {
        const stripped = h.substring(0, h.length - 1);
        if (hash.startsWith(stripped)) {
          hash_match = true;
          break;
        }
      }
      if (hash === h) {
        hash_match = true;
        break;
      }
    }
  }

  return sid_match && step_match && page_match && hash_match;
}

function make_arrow(d: FFDataComplete): SVGElement {
  const fill = get_ff_arrow_colour(d);
  const div = document.createElement("div");
  div.innerHTML = `<svg version="1.2" id="Layer_1" x="0px" y="0px" width="20" height="13" viewBox="${FF_ARROW_VIEWBOX}" xml:space="preserve" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
	<path fill-rule="evenodd" fill="${fill}" stroke="#000000" d="${FF_ARROW_PATH_D}" id="path1" style="display:inline;stroke-width:1.50;"/>
</svg>`;

  if (!div.firstChild || !(div.firstChild instanceof SVGElement)) {
    throw new Error(
      "Wasn't able to extract just created SVG out of div element",
    );
  }
  const svg = div.firstChild;
  svg.classList.add("ffsv3-arrow");
  return svg;
}

function make_marker(d: FFDataComplete): HTMLElement | SVGElement {
  const markerType = ffconfig.gauge_marker_type;
  if (
    markerType === GaugeMarkerType.BUBBLE_FF ||
    markerType === GaugeMarkerType.BUBBLE_ESTIMATE
  ) {
    const fill = get_ff_arrow_colour(d);
    const contrastColor = get_contrast_color(fill);
    const bubble = document.createElement("div");
    bubble.classList.add("ffsv3-bubble");
    bubble.style.backgroundColor = fill;
    bubble.style.color = contrastColor;

    if (markerType === GaugeMarkerType.BUBBLE_FF) {
      bubble.textContent = d.fair_fight.toFixed(2);
    } else {
      bubble.textContent = d.bs_estimate_human || "N/A";
    }

    return bubble;
  }

  return make_arrow(d);
}

export function add_ff_arrow(element: HTMLElement, featureName = "Unknown") {
  const player_id = get_player_id_in_element(element);
  if (!player_id) {
    return;
  }

  if (
    element.querySelector(".ffsv3-gauge") ||
    element.classList.contains("ffsv3-gauge")
  ) {
    ffscouter.add_analytics_entry(featureName, player_id, "ignored");
    return;
  }

  ffscouter.get(player_id).then((d) => {
    if (d.no_data) {
      return;
    }

    if (
      element.querySelector(".ffsv3-gauge") ||
      element.classList.contains("ffsv3-gauge")
    ) {
      ffscouter.add_analytics_entry(featureName, player_id, "ignored");
      return;
    }

    const percent = ff_to_percent(d);
    element.classList.add("ffsv3-gauge");
    element.style.setProperty("--band-percent", `${percent}`);
    document.body.style.setProperty(
      "--ffsv3-marker-scale",
      `${ffconfig.gauge_marker_scale / 100}`,
    );

    const a = element.querySelector(".ffsv3-arrow, .ffsv3-bubble");
    if (a) {
      a.remove();
    }

    element.appendChild(make_marker(d));
    ffscouter.add_analytics_entry(featureName, player_id, "applied");
  });
}

function has_href(el: Element | null): el is HTMLAnchorElement {
  return el instanceof HTMLAnchorElement;
}

type TargetIdMatch =
  | {
      target_id?: string;
    }
  | undefined;

function extract_target_id(href: string, r: RegExp) {
  const match = href.match(r);
  const groups = match?.groups as TargetIdMatch;
  if (groups?.target_id) {
    return parseInt(groups.target_id, 10) as PlayerId;
  }

  return null;
}

export function get_player_id_in_element(element: Element): PlayerId | null {
  const parent = element.parentElement;

  if (has_href(parent)) {
    const xid = extract_target_id(parent.href, /.*XID=(?<target_id>\d+)/);
    if (xid) {
      return xid;
    }
  }

  const anchors = element.getElementsByTagName("a");

  for (const anchor of anchors) {
    const xid = extract_target_id(anchor.href, /.*XID=(?<target_id>\d+)/);
    if (xid) {
      return xid;
    }
    const userid = extract_target_id(anchor.href, /.*userId=(?<target_id>\d+)/);
    if (userid) {
      return userid;
    }
  }

  if (has_href(element)) {
    const xid = extract_target_id(element.href, /.*XID=(?<target_id>\d+)/);
    if (xid) {
      return xid;
    }
    const userid = extract_target_id(
      element.href,
      /.*userId=(?<target_id>\d+)/,
    );
    if (userid) {
      return userid;
    }
  }

  // This might be too risky
  const parent_anchor = element.closest("a");

  if (parent_anchor) {
    const xid = extract_target_id(
      parent_anchor.href,
      /.*XID=(?<target_id>\d+)/,
    );
    if (xid) {
      return xid;
    }
    const userid = extract_target_id(
      parent_anchor.href,
      /.*userId=(?<target_id>\d+)/,
    );
    if (userid) {
      return userid;
    }
  }

  return null;
}

const seenUnknownActivityLabels = new Set<string>();

// Torn's faction/war member rows expose online/idle/offline state via an
// aria-label ("{name} is online/offline/idle") on a userStatusWrap___* div,
// not via an <img alt> as in pre-2026-06 markup. `.icons` is no longer a safe
// scoping selector for this lookup: it's reused for unrelated row sections
// (e.g. the achievement-icon tray on the regular faction member list), so
// scope directly on the userStatusWrap class instead.
export function get_activity_status(
  row: Element,
): "online" | "idle" | "offline" | "unknown" {
  const wrap = row.querySelector('[class*="userStatusWrap"]');
  const label = wrap?.getAttribute("aria-label") || "";
  const match = label.match(/ is (online|offline|idle)$/i);
  const status = match?.[1];

  if (!status) {
    if (!seenUnknownActivityLabels.has(label)) {
      seenUnknownActivityLabels.add(label);
      log.warn(`Unrecognized activity aria-label: "${label}"`);
    }
    return "unknown";
  }

  return status.toLowerCase() as "online" | "idle" | "offline";
}

export function apply_ff_gauge_selector(
  node_list: NodeListOf<HTMLElement>,
  featureName = "Unknown",
): void {
  for (const node of node_list) {
    add_ff_arrow(node, featureName);
  }
}

export function apply_ff_gauge(
  element: Element,
  featureName = "Unknown",
): void {
  if (!(element instanceof HTMLElement)) {
    return;
  }
  add_ff_arrow(element, featureName);
}

/**
 * Waits for an element matching the querySelector to appear in the DOM
 * @param querySelector CSS selector to find the element
 * @param timeout Optional timeout in milliseconds
 * @returns Promise resolving to the found element or null if timeout reached
 */
export async function wait_for_element<T extends Element>(
  querySelector: string,
  timeout: number,
  root?: Node,
): Promise<T | null> {
  const existingElement = document.querySelector<T>(querySelector);
  if (existingElement) return existingElement;

  return new Promise<T | null>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const observer = new MutationObserver(() => {
      const element = document.querySelector<T>(querySelector);
      if (element) {
        cleanup();
        resolve(element);
      }
    });

    if (!root) {
      root = document.body;
    }
    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    if (timeout) {
      timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, timeout);
    }

    function cleanup() {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    }
  });
}

export async function wait_for_body(timeout: number): Promise<boolean> {
  const body = await wait_for_element(
    "body",
    timeout,
    document.documentElement,
  );
  return body !== null;
}

const CREATE_ELEMENT_RETRY_DELAYS_MS = [0, 50, 150];

// Per the HTML spec, if a custom element's constructor throws, `create an
// element` (used by document.createElement) reports the exception to the
// console and substitutes a generic fallback element instead of rethrowing —
// so a try/catch around createElement never sees anything to catch. Some
// browser extensions interfere with custom element upgrade in a way that
// makes the very first construction attempt fail this way (observed with
// Adblocker Ultimate breaking Lit's ReactiveElement constructor), so we have
// to check the *result* (is it actually an instance of our class?) rather
// than catching an exception, and retry if it isn't. Returns null if every
// attempt fails, so callers can degrade gracefully instead of leaving the
// page in a broken, half-initialized state.
export async function create_ff_element<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
): Promise<HTMLElementTagNameMap[K] | null> {
  const ctor = customElements.get(tagName);
  for (const delay of CREATE_ELEMENT_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    const element = document.createElement(tagName);
    if (!ctor || element instanceof ctor) {
      return element;
    }
    log.warn(`<${tagName}> construction produced a fallback element; retrying`);
  }
  log.error(
    `Failed to construct a working <${tagName}> after multiple attempts`,
  );
  return null;
}

export type HandlerFnOptions = {
  target?: HTMLElement;
  added?: HTMLElement;
  removed?: HTMLElement;
};

type NodeMatcherFn = (node: HTMLElement) => boolean;
type HandlerFn = (options: HandlerFnOptions) => void;
type MonitorElementsOptions = {
  target?: boolean;
  added?: boolean;
  removed?: boolean;
};

// Uses querySelector to
export class MonitorElements {
  private node_matcher;
  private handler;
  private root;
  private continuous;
  private options: MonitorElementsOptions = {
    target: false,
    added: false,
    removed: false,
  };

  private started: boolean = false;
  private observer: MutationObserver;

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    node_matcher: NodeMatcherFn,
    handler: HandlerFn,
    root: HTMLElement,
    continuous: boolean,
    options: MonitorElementsOptions,
    _timeout: number,
  ) {
    this.node_matcher = node_matcher;
    this.handler = handler;
    this.root = root;
    this.continuous = continuous;
    this.options = options;

    this.observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        if (
          this.options.target &&
          mutation.target instanceof HTMLElement &&
          this.node_matcher(mutation.target)
        ) {
          this.handler({ target: mutation.target });
        }
        if (this.options.added) {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement && this.node_matcher(node)) {
              this.handler({ added: node });
            }
          }
        }
        if (this.options.removed) {
          for (const node of mutation.removedNodes) {
            if (node instanceof HTMLElement && this.node_matcher(node)) {
              this.handler({ removed: node });
            }
          }
        }
      }
    });
  }

  start = () => {
    if (this.started) {
      return;
    }
    let initial = false;
    for (const child of this.root.childNodes) {
      if (child instanceof HTMLElement && this.node_matcher(child)) {
        this.handler({ added: child });
        initial = true;
      }
    }
    if (!this.continuous && initial) {
      this.started = false;
      return;
    }

    this.observer.observe(this.root, { childList: true });

    this.timer = setInterval(() => {
      if (!this.root.isConnected) {
        this.cleanup();
      }
    }, 10_000);

    this.started = true;
  };

  cleanup = () => {
    this.observer.disconnect();
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = null;
  };
}

/**
 * Gets the RFC verification token from cookies
 * This is used for CSRF protection in Torn API requests
 * @returns The RFC token value or empty string if not found
 */
export function getRFC(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)rfc_v=([^;]*)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch (e) {
    log.error("Error getting RFC token:", e);
    return "";
  }
}

/**
 * Parses URL hash into URLSearchParams
 * Handles various hash formats used in Torn's frontend
 * @param hash Optional hash string, defaults to current location.hash
 * @returns URLSearchParams object containing the parsed parameters
 */
export function getHashParameters(hash?: string): URLSearchParams {
  // Potentially "borrowed" from TornTools?
  // Really sorry if that's the case, it's been a long time since I made this :(
  let finalHash = hash || location.hash;

  if (finalHash.startsWith("#/")) {
    finalHash = finalHash.substring(2);
  } else if (finalHash.startsWith("#") || finalHash.startsWith("/")) {
    finalHash = finalHash.substring(1);
  }

  if (!finalHash.startsWith("!") && !finalHash.startsWith("?")) {
    finalHash = `?${finalHash}`;
  }

  return new URLSearchParams(finalHash);
}

/**
 * Waits for the page to become idle
 */
export function waitForDocumentReady(): Promise<void> {
  return new Promise((resolve) => {
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      resolve();
    } else {
      document.addEventListener("DOMContentLoaded", () => resolve());
    }
  });
}

/**
 * Fetches the ID of the currently logged in user via the user burger dropdown
 * @returns The current user ID or null if not found or malformed
 */
export async function getLocalUserId(): Promise<string | null> {
  const name = await wait_for_element<HTMLAnchorElement>(
    ".settings-menu > .link > a:first-child",
    15_000,
  );

  if (!name || !name.href) {
    log.debug("Failed to find the XID element.");
    return null;
  }

  try {
    const params = new URL(name.href).searchParams;
    return params.get("XID");
  } catch {
    log.debug("User XID is malformed");
    return null;
  }
}
export function create_info_line() {
  const info_line = document.createElement("div");
  info_line.className = "ffsv3-info-line";
  info_line.style.display = "block";
  info_line.style.clear = "both";
  info_line.style.margin = "5px 0";

  return info_line;
}

/**
 * Registers a callback for page navigation events (SPA hash/anchor changes and history pops).
 * Automatically delays callback execution using setTimeout to ensure window.location is fully updated.
 * Returns a cleanup function to remove all registered listeners.
 */
export function on_navigation(callback: () => void): () => void {
  // Modern Navigation API (Chromium)
  const nav = (window as any).navigation;
  if (nav) {
    nav.addEventListener("currententrychange", callback);
    return () => {
      nav.removeEventListener("currententrychange", callback);
    };
  }

  const delayedCallback = () => {
    setTimeout(callback, 0);
  };

  // Fallbacks for Firefox, Safari, and other environments
  window.addEventListener("popstate", delayedCallback);
  window.addEventListener("hashchange", delayedCallback);

  return () => {
    window.removeEventListener("popstate", delayedCallback);
    window.removeEventListener("hashchange", delayedCallback);
  };
}

/**
 * Generates the attack URL for a player
 * @param playerId The player ID
 * @returns The attack URL string
 */
export function get_attack_url(playerId: PlayerId | number | string): string {
  return `https://www.torn.com/page.php?sid=attack&user2ID=${playerId}`;
}

/**
 * Navigates to the attack page or opens it in a new tab/window
 * @param playerId The player ID
 * @param options Navigation options (e.g. override tab behavior)
 */
export function open_attack_link(
  playerId: PlayerId | number | string,
  options?: { openInNewTab?: boolean },
): void {
  const url = get_attack_url(playerId);
  const shouldOpenInNewTab =
    options?.openInNewTab !== undefined
      ? options.openInNewTab
      : ffconfig.war_quick_attack_action === "new_tab";

  if (shouldOpenInNewTab) {
    window.open(url, "_blank");
  } else {
    window.location.href = url;
  }
}

export interface SortIconClasses {
  sortIcon: string;
  desc: string;
  asc: string;
  activeIcon: string;
  tab: string;
}

// Hardcoded Torn CSS module class names per page — update if Torn changes their build hash.
// Two sets exist because Torn uses different CSS modules on different pages.
const SORT_ICON_CLASS_SETS: Record<string, Omit<SortIconClasses, "tab">> = {
  sortIcon___wbOOi: {
    sortIcon: "sortIcon___wbOOi",
    activeIcon: "activeIcon___wmLLe",
    desc: "desc___wkA0A",
    asc: "asc___y_atw",
  },
  sortIcon___LNQ9D: {
    sortIcon: "sortIcon___LNQ9D",
    activeIcon: "activeIcon___SwNJj",
    desc: "desc___ZvHWf",
    asc: "asc___YAXFZ",
  },
  sortIcon___pMyNX: {
    sortIcon: "sortIcon___pMyNX",
    activeIcon: "activeIcon___dw8TK",
    desc: "desc___TLpPc",
    asc: "asc___Q3bz5",
  },
};

export function detect_sort_icon_classes(
  root: HTMLElement,
): SortIconClasses | null {
  const existing = root.querySelector(
    "[class*='sortIcon___']:not(.ffscouter-sort-icon)",
  );
  if (!existing) return null;

  const sortIcon =
    Array.from(existing.classList).find((c) => c.startsWith("sortIcon___")) ??
    "";
  const classes = SORT_ICON_CLASS_SETS[sortIcon];
  if (!classes) return null;

  const tab =
    Array.from(existing.parentElement?.classList ?? []).find((c) =>
      c.startsWith("tab___"),
    ) ?? "";

  return { ...classes, tab };
}
