import { OdInsurance } from "@ui/od-insurance";
import { torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { od_insurance_plans } from "@utils/od_insurance";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";
import { add_row_slots, remove_row_slots } from "./rows";

// OD Insurance: an "OD Insurance" button on the Xanax and Ecstasy item rows
// of item.php opens a modal with the ffscouter.com plans and how to buy one.
// Default on; the od_insurance_enabled toggle in Settings turns it off.

const log = logger.child("feature:od-insurance");

// Single tracked root (ADR 0010) on document.body, outside Torn's swapped
// content. It renders the modal and, through portals, a button in each row
// slot.
let mounted: { root: Root; container: HTMLElement } | null = null;
const slots: HTMLElement[] = [];

const load_plans = () => od_insurance_plans.get();

function render() {
  if (!mounted) {
    const container = document.createElement("div");
    container.id = "ffscouter-od-insurance";
    document.body.appendChild(container);
    mounted = { root: createRoot(container), container };
  }
  mounted.root.render(
    createElement(OdInsurance, { slots: [...slots], load: load_plans }),
  );
}

// Adds slots for new insured rows and forgets slots whose row Torn removed
// (a tab change or a new search replaces the panel's rows).
function od_scan_rows(): void {
  if (!ffconfig.od_insurance_enabled) return;
  const added = add_row_slots(document);
  const kept = slots.filter((slot) => slot.isConnected);
  if (added.length === 0 && kept.length === slots.length) return;
  slots.splice(0, slots.length, ...kept, ...added);
  render();
}

function od_remove_all(): void {
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = null;
  remove_row_slots(document);
  slots.length = 0;
}

const feature: Feature = {
  name: "OD Insurance",
  description:
    "OD Insurance buttons on Xanax/Ecstasy item rows (item.php only) opening a plans modal",
  executionTime: StartTime.DocumentBody,
  async shouldRun() {
    return !!ffconfig.od_insurance_enabled && torn_page("item");
  },
  async run() {
    let scanTimer: ReturnType<typeof setTimeout> | null = null;
    const scan = () => {
      if (!ffconfig.od_insurance_enabled) return;
      od_scan_rows();
    };
    const scheduleScan = () => {
      if (scanTimer) return;
      scanTimer = setTimeout(() => {
        scanTimer = null;
        scan();
      }, 150);
    };
    window.addEventListener("ff-config-updated", () => {
      if (!ffconfig.od_insurance_enabled) od_remove_all();
      else scheduleScan();
    });
    if (typeof MutationObserver !== "undefined" && document.body) {
      new MutationObserver(scheduleScan).observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
    // Mounting the root fetches the plans unless the stored list is fresh,
    // so the buttons can go away when no plan is payable.
    render();
    scan();
    log.debug("OD Insurance feature installed");
  },
};

export default feature;
