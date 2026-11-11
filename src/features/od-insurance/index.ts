import { OdInsurance } from "@ui/od-insurance";
import { SendHelper } from "@ui/od-send-helper";
import { toast } from "@ui/toast";
import { torn_page, wait_for_element } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import {
  covered_item_ids,
  od_insurance_plans,
  type PayablePlan,
} from "@utils/od_insurance";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";
import { add_row_slots, remove_row_slots } from "./rows";
import {
  apply,
  first_shown,
  type HelperState,
  open_send_form,
  press,
  type SelectedPlan,
  step_list,
} from "./send-helper/page";

// OD Insurance: an "OD Insurance" button on the item.php rows of the items
// that the payable plans cover (each plan's covered_item) opens a modal with
// the ffscouter.com plans and how to buy one. A plan picked "with helper"
// shows the Send Helper, which walks the player through the Xanax send, one
// press for each change (ADR 0014). Default on; the od_insurance_enabled
// toggle in Settings turns both off.

const log = logger.child("feature:od-insurance");

// Torn renders every item panel (each category tab and the search panel)
// inside #category-wrap, and replaces a panel's rows on a tab change or a new
// search.
const CATEGORY_WRAP = "#category-wrap";
// Torn renders #category-wrap with the page; if it never shows up, the
// markup changed and there is nothing to attach to.
export const CATEGORY_WRAP_TIMEOUT_MS = 30 * 1000;

// Single tracked root (ADR 0010) on document.body, outside Torn's swapped
// content. It renders the modal and, through portals, a button in each row
// slot.
let mounted: { root: Root; container: HTMLElement } | null = null;
const slots: HTMLElement[] = [];

// One observer, on #category-wrap only. Disconnected when the feature turns
// off. It watches the subtree, unlike the bounties feature's childList-only
// observers: Torn fills the panel <ul>s inside #category-wrap and swaps their
// rows, so direct children are not enough. The callback runs one selector
// query and renders only when the slots changed, so the busy item page stays
// cheap.
let page_observer: MutationObserver | null = null;
let wrap_wait: AbortController | null = null;

// The item IDs whose rows get a button, from the last plans that loaded.
// Empty until the first load. A failed load keeps the IDs it had: a failed
// Retry in the modal must not take the buttons away.
let covered: number[] = [];

// The Selected Plan and where the Send Helper is (ADR 0014). Page memory
// only: a reload, the helper's X, the end of a successful send, or turning
// the feature off clears it. A new pick replaces it.
let helper: { selected: SelectedPlan; state: HelperState } | null = null;

function pick(plan: PayablePlan, multiplier: number): void {
  const selected = { plan, multiplier };
  // A send form that is already open is from before this pick, so the next
  // press closes it.
  helper = {
    selected,
    state: first_shown(document, selected, open_send_form(document)),
  };
  render();
}

// One press: at most one change on the page.
function press_helper(): void {
  if (!helper) return;
  const result = press(document, helper.selected, helper.state);
  apply(result.action);
  helper = result.finished ? null : { ...helper, state: result.state };
  render();
}

function cancel_helper(): void {
  helper = null;
  render();
}

// The modal's "Hide OD Insurance" button. It saves the toggle the same way
// the Settings Panel does, and the event runs sync(), which removes the
// buttons and the modal.
function hide_feature(): void {
  ffconfig.od_insurance_enabled = false;
  toast("OD Insurance hidden. Turn it back on in FF Scouter Settings.");
  window.dispatchEvent(new CustomEvent("ff-config-updated"));
}

const same_ids = (a: readonly number[], b: readonly number[]) => {
  const in_b = new Set(b);
  return a.length === b.length && a.every((id) => in_b.has(id));
};

// Every plans load goes through here (the first one on mount, and each open
// or Retry in the modal), so a change in the covered items updates the rows.
// One function for the life of the module, so the component's mount effect
// does not run again on a render.
async function load_plans() {
  const state = await od_insurance_plans.get();
  // The feature can turn off while the request runs.
  if (mounted && state.status !== "failed") {
    set_covered(covered_item_ids(state.response));
  }
  return state;
}

function set_covered(ids: number[]): void {
  if (same_ids(ids, covered)) return;
  covered = ids;
  remove_row_slots(document);
  slots.length = 0;
  const wrap = document.querySelector(CATEGORY_WRAP);
  if (page_observer && wrap) slots.push(...add_row_slots(wrap, covered));
  render();
}

function render() {
  if (!mounted) {
    const container = document.createElement("div");
    container.id = "ffscouter-od-insurance";
    document.body.appendChild(container);
    mounted = { root: createRoot(container), container };
  }
  mounted.root.render(
    createElement(OdInsurance, {
      slots: [...slots],
      load: load_plans,
      onHide: hide_feature,
      onPick: pick,
      helper: helper
        ? createElement(SendHelper, {
            label: helper.state.shown.label,
            problem: helper.state.shown.problem !== undefined,
            steps: step_list(helper.state.shown),
            onPress: press_helper,
            onCancel: cancel_helper,
          })
        : null,
    }),
  );
}

// Adds slots for new covered rows and forgets slots whose row Torn removed.
// Only re-renders when the slots changed, so the button render it causes
// does not loop back through the observer.
function scan_rows(wrap: Element): void {
  const added = add_row_slots(wrap, covered);
  const kept = slots.filter((slot) => slot.isConnected);
  if (added.length === 0 && kept.length === slots.length) return;
  slots.splice(0, slots.length, ...kept, ...added);
  render();
}

function watch(wrap: Element): void {
  page_observer ??= new MutationObserver(() => {
    const current = document.querySelector(CATEGORY_WRAP);
    if (current) scan_rows(current);
  });
  page_observer.disconnect();
  page_observer.observe(wrap, { childList: true, subtree: true });
  scan_rows(wrap);
}

function start(): void {
  // Mounting the root loads the plans (no request while the stored list is
  // fresh). Rows get buttons once the plans say which items they cover.
  if (!mounted) render();
  if (page_observer || wrap_wait) return;
  const wait = new AbortController();
  wrap_wait = wait;
  void wait_for_element(CATEGORY_WRAP, CATEGORY_WRAP_TIMEOUT_MS, undefined, {
    signal: wait.signal,
  }).then((wrap) => {
    if (wait.signal.aborted) return;
    wrap_wait = null;
    if (!wrap) {
      log.warn("Torn's #category-wrap did not render; no OD Insurance rows");
      return;
    }
    watch(wrap);
  });
}

export function stop_od_insurance(): void {
  wrap_wait?.abort();
  wrap_wait = null;
  page_observer?.disconnect();
  page_observer = null;
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = null;
  remove_row_slots(document);
  slots.length = 0;
  covered = [];
  helper = null;
}

// Idempotent: reads the toggle each time, so a settings save can turn the
// feature on or off without a reload.
function sync(): void {
  if (ffconfig.od_insurance_enabled) start();
  else stop_od_insurance();
}

export default {
  name: "OD Insurance",
  description:
    "OD Insurance buttons on the item rows the plans cover (item.php only) opening a plans modal",
  executionTime: StartTime.DocumentBody,

  // Only the page is checked here: shouldRun() runs once at boot, so the
  // toggle is read in sync() on every settings save instead.
  async shouldRun() {
    return torn_page("item");
  },

  async run() {
    window.addEventListener("ff-config-updated", sync);
    sync();
  },
} satisfies Feature;
