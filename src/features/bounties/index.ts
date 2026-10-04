import { BountyBoardModal } from "@ui/bounty-board";
import { on_navigation, torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";

// The Bounty Board Modal shows only on the main bounty list. Torn's bounties
// page is hash-routed: an empty hash is the main list before Torn's router
// writes "#!p=main", and the trailing * covers "#!p=main&start=20" pagination.
const BOUNTY_MAIN_HASHES = ["", "#", "#!p=main*"];

export function should_show_bounty_modal(): boolean {
  return (
    ffconfig.bounty_board_enabled &&
    torn_page("bounties", {}, BOUNTY_MAIN_HASHES)
  );
}

// Single tracked root (ADR 0010): sync() is the only mounter and always
// unmounts before the slot is reused, so hash-route changes can never orphan
// a root (and its board/view state) behind a fresh one. The container lives
// on document.body, outside Torn's SPA-swapped content, so nothing else
// removes it.
let mounted: { root: Root; container: HTMLElement } | null = null;

function mount() {
  const container = document.createElement("div");
  container.id = "ffscouter-bounty-board";
  document.body.appendChild(container);
  const root = createRoot(container);
  root.render(createElement(BountyBoardModal));
  mounted = { root, container };
}

export function unmount_bounty_modal() {
  if (!mounted) return;
  mounted.root.unmount();
  mounted.container.remove();
  mounted = null;
}

// Idempotent: a modal already mounted on a still-matching route is left
// alone (remounting would refetch and drop transient state). Turning the
// master toggle off unmounts it, and with it the only bounty board consumer
// on this page — no bounty traffic happens while disabled.
function sync() {
  if (should_show_bounty_modal()) {
    if (!mounted) mount();
  } else {
    unmount_bounty_modal();
  }
}

export default {
  name: "FF Scouter Bounties",
  description:
    "Floating FF Scouter Bounties board on Torn's bounties page (separate from Torn's own bounties)",
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
    sync();
  },
} satisfies Feature;
