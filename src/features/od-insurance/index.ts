import {
  type OdInsurancePlan as OdPlan,
  type OdInsurancePlansResponse as OdPlansData,
  query_od_insurance_plans,
} from "@utils/api";
import { torn_page } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import logger from "@utils/logger";
import { type Feature, StartTime } from "../feature";

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

const OD_CACHE_KEY = "ffscouter-od-insurance-plans-v1";
const OD_CACHE_MS = 10 * 60 * 1000;

const OD_FALLBACK: OdPlansData = {
  manager_player_id: 3281931,
  manager_name: "WTV1",
  plans: [
    {
      name: "2 Hour Ecstasy Insurance",
      xanax_quantity: 1,
      plan_key: "ecstasy",
      max_multiplier: 50,
      duration_seconds: 7200,
      duration_label: "2 hours",
      standard_payout_xanax: 22,
      overdose_payout_xanax: 26,
      payment: {
        recipient_player_id: 3281931,
        recipient_name: "WTV1",
        xanax_quantity: 1,
        message: "insurance:ecstasy",
      },
    },
    {
      name: "2 Hour Xanax Insurance",
      xanax_quantity: 1,
      plan_key: "xanax",
      max_multiplier: 50,
      duration_seconds: 7200,
      duration_label: "2 hours",
      standard_payout_xanax: 33,
      overdose_payout_xanax: 39,
      payment: {
        recipient_player_id: 3281931,
        recipient_name: "WTV1",
        xanax_quantity: 1,
        message: "insurance:xanax",
      },
    },
    {
      name: "7 Day Xanax Insurance / Multiple Xanax OD's Payout",
      xanax_quantity: 20,
      plan_key: "7days",
      max_multiplier: 10,
      duration_seconds: 604800,
      duration_label: "7 days",
      standard_payout_xanax: 31,
      overdose_payout_xanax: 37,
      payment: {
        recipient_player_id: 3281931,
        recipient_name: "WTV1",
        xanax_quantity: 20,
        message: "insurance:7days",
      },
    },
    {
      name: "30 Day Xanax Insurance / Multiple Xanax OD's Payout",
      xanax_quantity: 80,
      plan_key: "30days",
      max_multiplier: 5,
      duration_seconds: 2592000,
      duration_label: "30 days",
      standard_payout_xanax: 31,
      overdose_payout_xanax: 37,
      payment: {
        recipient_player_id: 3281931,
        recipient_name: "WTV1",
        xanax_quantity: 80,
        message: "insurance:30days",
      },
    },
  ],
};

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

interface OdCache {
  at: number;
  data: OdPlansData;
}

function od_read_cache(): OdCache | null {
  try {
    const raw = localStorage.getItem(OD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OdCache | null;
    if (!parsed?.data || !Array.isArray(parsed.data.plans)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function od_write_cache(data: OdPlansData): void {
  try {
    localStorage.setItem(
      OD_CACHE_KEY,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    // storage full/blocked - the feature still works uncached
  }
}

async function od_fetch_plans(): Promise<{
  data: OdPlansData;
  stale: boolean;
}> {
  const cached = od_read_cache();
  if (cached && Date.now() - cached.at < OD_CACHE_MS) {
    return { data: cached.data, stale: false };
  }
  try {
    const resp = await query_od_insurance_plans();
    if (resp.blank) throw new Error("OD plans response was blank");
    od_write_cache(resp.result);
    return { data: resp.result, stale: false };
  } catch (err) {
    log.warn("OD plans request failed", err);
  }
  if (cached) return { data: cached.data, stale: true };
  return { data: OD_FALLBACK, stale: true };
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
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

let od_modal: OdModal | null = null;

function od_build_modal(data: OdPlansData, stale: boolean): OdModal {
  if (od_modal) return od_modal;
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
  let introText = "Tap a plan to see how to buy it.";
  if (stale)
    introText += " Showing saved plans - the live list could not be refreshed.";
  listView.appendChild(od_el("p", "ff-od-intro", introText));
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
  const selectPlan = (plan: OdPlan, btn: HTMLButtonElement | null) => {
    planButtons.forEach((b) => {
      b.classList.remove("ff-od-selected");
    });
    if (btn) btn.classList.add("ff-od-selected");
    const pay = plan.payment;
    const payQty = pay.xanax_quantity;
    const payId = pay.recipient_player_id;
    const payName = pay.recipient_name ?? `[${payId}]`;
    const payMsg = pay.message;
    detail.textContent = "";
    od_detail_row(detail, "Plan:", plan.name);
    od_detail_row(detail, "Send:", `${payQty}x Xanax`);
    const toLink = od_el("a", null, `${payName} [${payId}]`);
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
  (data.plans || []).forEach((plan) => {
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
  const api: OdModal = {
    overlay,
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
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && api.isOpen()) api.close();
  });
  document.body.appendChild(overlay);
  od_modal = api;
  return api;
}

async function od_ensure_modal(): Promise<OdModal> {
  if (od_modal) return od_modal;
  try {
    const res = await od_fetch_plans();
    return od_build_modal(res.data, res.stale);
  } catch (err) {
    log.error("OD Insurance failed to load", err);
    return od_build_modal(OD_FALLBACK, true);
  }
}

function od_open_modal(): void {
  od_ensure_modal()
    .then((m) => {
      m.open();
    })
    .catch((err) => {
      log.error("OD Insurance modal failed", err);
    });
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
  if (od_modal) {
    od_modal.overlay.remove();
    od_modal = null;
  }
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
