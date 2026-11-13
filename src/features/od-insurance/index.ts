import { OdInsurance } from "@ui/od-insurance";
import { torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { od_insurance_plans } from "@utils/od_insurance";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { type Feature, StartTime } from "../feature";

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

function od_norm_text(s: string | null | undefined): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function od_insured_name_of(text: string | null | undefined): string | null {
  const m = od_norm_text(text).match(/^(?:x[\d,]+\s+)?(Xanax|Ecstasy)$/i);
  return m?.[1] ?? null;
}

function od_row_for(leaf: Element): HTMLElement | null {
  let node: HTMLElement | null = leaf as HTMLElement;
  for (let depth = 0; depth < 5 && node && node !== document.body; depth++) {
    node = node.parentElement as HTMLElement | null;
    if (!node) break;
    if (
      node.querySelector("img") &&
      od_norm_text(node.textContent).length <= 220
    )
      return node;
    if (node.tagName === "LI" && od_norm_text(node.textContent).length <= 220)
      return node;
  }
  return leaf.parentElement as HTMLElement | null;
}

function od_scan_rows(): number {
  if (!ffconfig.od_insurance_enabled) return 0;
  const scope =
    document.querySelector(".content-wrapper") ||
    document.querySelector(".page-template-cont") ||
    document.body;
  if (!scope) return 0;
  let added = 0;
  const all = scope.querySelectorAll("*");
  all.forEach((el) => {
    if (el.children.length > 2) return;
    if (el.querySelector("img")) return;
    if (!od_insured_name_of(el.textContent)) return;
    if (el.closest("#ffscouter-od-insurance, [data-ff-od-slot]")) return;
    if (el.closest("a, button")) return;
    const row = od_row_for(el);
    if (!row) return;
    if (row.querySelector("[data-ff-od-slot]")) return;
    if (row.offsetWidth && row.offsetWidth < 180) return;
    if (
      window.getComputedStyle &&
      window.getComputedStyle(row).position === "static"
    ) {
      row.style.position = "relative";
    }
    const slot = document.createElement("span");
    slot.setAttribute("data-ff-od-slot", "");
    row.appendChild(slot);
    slots.push(slot);
    added++;
  });
  if (added > 0) render();
  return added;
}

function od_remove_all(): void {
  mounted?.root.unmount();
  mounted?.container.remove();
  mounted = null;
  for (const slot of slots) slot.remove();
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
