import { ffscouter } from "./ffscouter";
import logger from "./logger";
import { ff_to_percent, get_ff_arrow_colour } from "./strings";
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
  if (params.sid) {
    const page_sid = search.get("sid");
    sid_match = page_sid !== null && params.sid === page_sid;
  }
  if (params.step) {
    const page_step = search.get("step");
    step_match = page_step !== null && params.step === page_step;
  }

  if (!sid_match || !step_match) {
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

  return sid_match && step_match && hash_match;
}

function make_arrow(d: FFDataComplete): SVGElement {
  const fill = get_ff_arrow_colour(d);
  const div = document.createElement("div");
  div.innerHTML = `<svg version="1.2" id="Layer_1" x="0px" y="0px" width="20" height="13" viewBox="0 0 20 13" xml:space="preserve" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">
	<path fill-rule="evenodd" fill="${fill}" stroke="#000000" d="M 0,0 H 13 20 L 10,12 Z" id="path1" style="display:inline;stroke-width:1.50;"/>
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

    const a = element.querySelector(".ffsv3-arrow");
    if (a) {
      a.remove();
    }

    element.appendChild(make_arrow(d));
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

export async function apply_ff_gauge_selector(
  node_list: NodeListOf<HTMLElement>,
  featureName = "Unknown",
) {
  for (const node of node_list) {
    add_ff_arrow(node, featureName);
  }
}

export async function apply_ff_gauge(
  element: Element,
  featureName = "Unknown",
) {
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
