import { OD_INSURANCE_GUIDE_URL } from "@utils/api";
import { torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";
import {
  od_insurance_plans,
  type PayablePlan,
  type PlansState,
  payable_plans,
} from "./plans";

// OD Insurance
// - Only runs on https://www.torn.com/item.php (see shouldRun below)
// - No permanent panel: an "OD Insurance" button is added in the empty
//   space of the Xanax and Ecstasy item rows (the two insured drugs,
//   e.g. under the Drugs tab). Clicking it opens a modal with the plans;
//   clicking a plan swaps the modal to the how-to-buy view, with a back
//   button returning to the plans (same modal size in both views).
// - If no insured item row can be found on the page, a single small
//   "OD Insurance" chip is shown at the top-right instead, so the
//   feature is still reachable on layouts the row finder does not match.
// - Plans come from https://ffscouter.com/api/v1/od-insurance/plans
//   (cached for 10 minutes; hard-coded fallback if the API is unreachable)
// - Can be turned off in FF Scouter Settings: od_insurance_enabled
//   (defaults to true, so existing users get it until they opt out)

const log = logger.child("feature:od-insurance");

function od_el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string | null,
  text?: string | null,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function od_copy_fallback(text: string): void {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    // clipboard unavailable - nothing else we can do
  }
  ta.remove();
}

function od_copy(text: string, btn: HTMLButtonElement | null): void {
  const done = () => {
    if (!btn) return;
    const old = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => {
      btn.textContent = old;
    }, 1500);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => {
        od_copy_fallback(text);
        done();
      });
  } else {
    od_copy_fallback(text);
    done();
  }
}

function od_detail_row(
  parent: HTMLElement,
  label: string,
  valueNode: string | Node,
): HTMLElement {
  const row = od_el("div", "ff-od-row");
  row.appendChild(od_el("span", "ff-od-row-label", label));
  if (typeof valueNode === "string")
    row.appendChild(od_el("span", null, valueNode));
  else row.appendChild(valueNode);
  parent.appendChild(row);
  return row;
}

const OD_CSS =
  ".ff-od-row-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-glow-color);border-radius:4px;padding:5px 10px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;cursor:pointer;z-index:5;white-space:nowrap}.ff-od-row-btn:hover{background:var(--ffscouter-hover-color)}.ff-od-row-btn--tile{top:auto;bottom:8px;transform:none}.ff-od-chip{position:fixed;top:8px;right:8px;z-index:9999;background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-glow-color);border-radius:999px;padding:6px 12px;font-family:Arial,sans-serif;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)}.ff-od-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px 10px 48px;box-sizing:border-box}.ff-od-modal{width:420px;max-width:calc(100vw - 20px);max-height:100%;display:flex;flex-direction:column;background:var(--ffscouter-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-border-color);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.4);font-family:Arial,sans-serif;font-size:13px;box-sizing:border-box}.ff-od-modal *{box-sizing:border-box}.ff-od-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:var(--ffscouter-alt-bg-color);border-bottom:1px solid var(--ffscouter-border-color);border-radius:7px 7px 0 0}.ff-od-title{font-size:14px;font-weight:700;margin:0;line-height:1.2}.ff-od-sub{font-size:11px;opacity:.75;margin-top:1px}.ff-od-close{background:none;border:none;color:inherit;cursor:pointer;font-size:18px;font-weight:700;padding:2px 6px;line-height:1;flex:none}.ff-od-body{padding:8px 12px 12px;overflow-y:auto}.ff-od-intro{margin:4px 0 8px;line-height:1.4}.ff-od-plan{display:block;width:100%;text-align:left;background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-border-color);border-radius:6px;padding:8px 10px;margin:0 0 8px;cursor:pointer;font:inherit}.ff-od-plan:hover{background:var(--ffscouter-hover-color)}.ff-od-plan.ff-od-selected{border-color:var(--ffscouter-glow-color);box-shadow:0 0 6px rgba(76,175,80,.5)}.ff-od-plan-name{display:block;font-weight:700;line-height:1.3}.ff-od-plan-meta{display:block;font-size:12px;margin-top:2px;line-height:1.4}.ff-od-detail{border-top:1px solid var(--ffscouter-border-color);margin-top:4px;padding-top:8px}.ff-od-row{display:flex;gap:6px;align-items:baseline;margin:4px 0;line-height:1.4;flex-wrap:wrap}.ff-od-row-label{font-weight:700;flex:none}.ff-od-code{font-family:monospace;background:var(--ffscouter-alt-bg-color);border:1px solid var(--ffscouter-border-color);border-radius:3px;padding:1px 5px;overflow-wrap:anywhere}.ff-od-copy{background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-border-color);border-radius:3px;padding:2px 8px;font-size:12px;cursor:pointer}.ff-od-back{background:var(--ffscouter-alt-bg-color);color:var(--ffscouter-text-color);border:1px solid var(--ffscouter-border-color);border-radius:4px;padding:5px 12px;font-size:13px;font-weight:700;cursor:pointer;margin:0 0 4px}.ff-od-note{font-size:12px;line-height:1.4;margin:8px 0 0}.ff-od-footer{font-size:11px;opacity:.75;margin-top:10px;line-height:1.4}.ff-od-modal a{color:inherit;font-weight:700}";

function od_add_styles(): void {
  if (document.getElementById("ff-od-styles")) return;
  const style = document.createElement("style");
  style.id = "ff-od-styles";
  style.textContent = OD_CSS;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------
// Modal (built once, hidden until a row button / chip is clicked)
// ---------------------------------------------------------------------

interface OdModal {
  overlay: HTMLElement;
  state: PlansState;
  destroy: () => void;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

let od_modal: OdModal | null = null;

function od_build_modal(state: PlansState): OdModal {
  const overlay = od_el("div", "ff-od-overlay");
  overlay.id = "ffscouter-od-insurance";
  overlay.style.display = "none";
  const modal = od_el("div", "ff-od-modal");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "OD Insurance");
  overlay.appendChild(modal);
  const header = od_el("div", "ff-od-header");
  const titleWrap = od_el("div");
  titleWrap.appendChild(od_el("div", "ff-od-title", "OD Insurance"));
  const data =
    state.status === "failed"
      ? { manager_player_id: null, manager_name: null, plans: [] }
      : state.response;
  if (data.manager_player_id !== null) {
    const managerName = data.manager_name ?? "";
    titleWrap.appendChild(
      od_el(
        "div",
        "ff-od-sub",
        `Managed by ${managerName} [${data.manager_player_id}]`.trim(),
      ),
    );
  }
  header.appendChild(titleWrap);
  const closeBtn = od_el("button", "ff-od-close", "×");
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close OD Insurance");
  header.appendChild(closeBtn);
  modal.appendChild(header);
  const body = od_el("div", "ff-od-body");
  modal.appendChild(body);
  const listView = od_el("div", "ff-od-view");
  body.appendChild(listView);
  const plans = payable_plans(data);
  let introText =
    plans.length > 0
      ? "Tap a plan to see how to buy it."
      : "OD Insurance is not taking new policies right now.";
  if (state.status === "failed") introText = "Plans did not load.";
  if (state.status === "stale")
    introText += ` Showing plans saved ${new Date(state.fetched_at).toLocaleString()}. The live list did not load.`;
  listView.appendChild(od_el("p", "ff-od-intro", introText));
  if (state.status === "failed") {
    const retry = od_el("button", "ff-od-back", "Retry");
    retry.type = "button";
    retry.addEventListener("click", () => {
      od_open_modal();
    });
    listView.appendChild(retry);
  }
  if (plans.length === 0) {
    const guide = od_el("a", null, "Open the OD Insurance page");
    guide.href = OD_INSURANCE_GUIDE_URL;
    guide.target = "_blank";
    guide.rel = "noreferrer";
    listView.appendChild(guide);
  }
  const detailView = od_el("div", "ff-od-view");
  detailView.style.display = "none";
  const backBtn = od_el("button", "ff-od-back", "← Back to plans");
  backBtn.type = "button";
  detailView.appendChild(backBtn);
  const detail = od_el("div", "ff-od-detail");
  detailView.appendChild(detail);
  backBtn.addEventListener("click", () => {
    detailView.style.display = "none";
    listView.style.display = "block";
    body.scrollTop = 0;
  });
  const planButtons: HTMLButtonElement[] = [];
  const lockViewHeight = () => {
    const lh = listView.offsetHeight;
    if (lh > 0) {
      listView.style.minHeight = `${lh}px`;
      detailView.style.minHeight = `${lh}px`;
    }
  };
  const selectPlan = (plan: PayablePlan, btn: HTMLButtonElement | null) => {
    planButtons.forEach((b) => {
      b.classList.remove("ff-od-selected");
    });
    if (btn) btn.classList.add("ff-od-selected");
    const pay = plan.payment;
    const payQty = pay.xanax_quantity;
    const payId = pay.recipient_player_id;
    const payName = pay.recipient_name ?? `player [${payId}]`;
    const payMsg = pay.message;
    detail.textContent = "";
    od_detail_row(detail, "Plan:", plan.name);
    od_detail_row(detail, "Send:", `${payQty}x Xanax`);
    const toLink = od_el(
      "a",
      null,
      pay.recipient_name ? `${pay.recipient_name} [${payId}]` : `[${payId}]`,
    );
    toLink.href = `https://www.torn.com/profiles.php?XID=${payId}`;
    toLink.target = "_blank";
    toLink.rel = "noreferrer";
    od_detail_row(detail, "To:", toLink);
    const msgWrap = od_el("span");
    msgWrap.appendChild(od_el("span", "ff-od-code", payMsg));
    const copyMsg = od_el("button", "ff-od-copy", "Copy");
    copyMsg.type = "button";
    copyMsg.addEventListener("click", () => {
      od_copy(payMsg, copyMsg);
    });
    msgWrap.appendChild(document.createTextNode(" "));
    msgWrap.appendChild(copyMsg);
    od_detail_row(detail, "Message:", msgWrap);
    od_detail_row(detail, "Coverage:", plan.duration_label || "");
    od_detail_row(detail, "Multiplier:", `Up to ${plan.max_multiplier}x`);
    od_detail_row(
      detail,
      "Standard payout:",
      `${plan.standard_payout_xanax} Xanax`,
    );
    od_detail_row(
      detail,
      "Overdose X payout:",
      `${plan.overdose_payout_xanax} Xanax`,
    );
    const note = od_el(
      "p",
      "ff-od-note",
      `Send the Xanax from your items with exactly that message. Your cover starts when ${payName} receives it.`,
    );
    detail.appendChild(note);
    listView.style.display = "none";
    detailView.style.display = "block";
    body.scrollTop = 0;
  };
  plans.forEach((plan) => {
    const btn = od_el("button", "ff-od-plan");
    btn.type = "button";
    btn.appendChild(od_el("span", "ff-od-plan-name", plan.name));
    btn.appendChild(
      od_el(
        "span",
        "ff-od-plan-meta",
        `${plan.xanax_quantity}x Xanax · ${plan.duration_label} · Standard payout ${plan.standard_payout_xanax} Xanax · Overdose X payout ${plan.overdose_payout_xanax} Xanax · Up to ${plan.max_multiplier}x`,
      ),
    );
    btn.addEventListener("click", () => {
      selectPlan(plan, btn);
    });
    planButtons.push(btn);
    listView.appendChild(btn);
  });
  body.appendChild(detailView);
  body.appendChild(
    od_el(
      "div",
      "ff-od-footer",
      "You can turn this off in FF Scouter Settings (on your profile page).",
    ),
  );
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && api.isOpen()) api.close();
  };
  const api: OdModal = {
    overlay,
    state,
    destroy: () => {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
    },
    open: () => {
      detailView.style.display = "none";
      listView.style.display = "block";
      body.scrollTop = 0;
      overlay.style.display = "flex";
      if (window.requestAnimationFrame)
        window.requestAnimationFrame(lockViewHeight);
      else lockViewHeight();
    },
    close: () => {
      overlay.style.display = "none";
    },
    isOpen: () => overlay.style.display !== "none",
  };
  closeBtn.addEventListener("click", api.close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) api.close();
  });
  document.addEventListener("keydown", onKeydown);
  document.body.appendChild(overlay);
  return api;
}

// Each open asks the cache: a fresh list costs no request, an expired one is
// fetched again, and a failed load can be retried. The modal is rebuilt only
// when the answer changed.
function od_open_modal(): void {
  od_insurance_plans
    .get()
    .then((state) => {
      od_apply_plans(state);
      if (!ffconfig.od_insurance_enabled) return;
      if (od_modal?.state !== state) {
        od_modal?.destroy();
        od_modal = od_build_modal(state);
      }
      od_modal.open();
    })
    .catch((err) => {
      log.error("OD Insurance modal failed", err);
    });
}

// A list with no payable plan means nothing can be bought: the row buttons
// go away. A failed load keeps them, so the modal can offer Retry.
let od_no_plans = false;

function od_apply_plans(state: PlansState): void {
  od_no_plans =
    state.status !== "failed" && payable_plans(state.response).length === 0;
  if (od_no_plans) {
    document.querySelectorAll(".ff-od-row-btn").forEach((b) => {
      b.remove();
    });
  }
}

// ---------------------------------------------------------------------
// Row buttons: find Xanax / Ecstasy item rows and use their empty space
// ---------------------------------------------------------------------

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
  if (!ffconfig.od_insurance_enabled || od_no_plans) return 0;
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
    if (el.closest("#ffscouter-od-insurance")) return;
    if (el.closest("a, button")) return;
    const row = od_row_for(el);
    if (!row || row.closest("#ffscouter-od-insurance")) return;
    if (row.querySelector(".ff-od-row-btn")) return;
    if (row.offsetWidth && row.offsetWidth < 180) return;
    if (
      window.getComputedStyle &&
      window.getComputedStyle(row).position === "static"
    ) {
      row.style.position = "relative";
    }
    const btn = od_el("button", "ff-od-row-btn", "OD Insurance");
    btn.type = "button";
    if (row.offsetHeight && row.offsetHeight > 120)
      btn.classList.add("ff-od-row-btn--tile");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      od_open_modal();
    });
    row.appendChild(btn);
    added++;
  });
  return added;
}

function od_remove_all(): void {
  document.querySelectorAll(".ff-od-row-btn, .ff-od-chip").forEach((b) => {
    b.remove();
  });
  od_modal?.destroy();
  od_modal = null;
  od_no_plans = false;
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
    od_add_styles();
    // Fetch on every item.php load unless the stored list is fresh, so the
    // buttons can go away when no plan is payable.
    if (!od_insurance_plans.is_fresh()) {
      void od_insurance_plans.get().then(od_apply_plans);
    }
    let scanTimer: ReturnType<typeof setTimeout> | null = null;
    const scan = () => {
      if (!ffconfig.od_insurance_enabled) return;
      od_scan_rows();
      const chip = document.querySelector(".ff-od-chip");
      if (chip && document.querySelector(".ff-od-row-btn")) chip.remove();
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
    scan();
    // Fallback: if no insured row was found shortly after load, offer one
    // small chip instead of nothing (different layouts / empty inventory).
    setTimeout(() => {
      if (!ffconfig.od_insurance_enabled) return;
      if (document.querySelector(".ff-od-row-btn")) return;
      if (document.querySelector(".ff-od-chip")) return;
      const chip = od_el("button", "ff-od-chip", "OD Insurance");
      chip.type = "button";
      chip.addEventListener("click", () => {
        od_open_modal();
      });
      document.body.appendChild(chip);
    }, 8000);
    log.debug("OD Insurance feature installed");
  },
};

export default feature;
