import type { PayablePlan } from "@utils/od_insurance";

// The Send Helper's page logic (ADR 0014). The page is the only state: each
// press reads the page, finds the first step that is not done, and returns
// at most one Action. The helper does the step only when it is the step the
// label showed; otherwise the press only moves the label.
//
// Torn hides the send panel on Close but keeps the old form, confirm, or
// result inside it, so every rule reads visible elements only.

/** Torn's item ID for Xanax. Every plan is paid in Xanax. */
export const XANAX_ITEM_ID = 206;

/** A plan and the multiplier the player picked in the modal. */
export type SelectedPlan = { plan: PayablePlan; multiplier: number };

export function plan_total(selected: SelectedPlan): number {
  return selected.plan.payment.xanax_quantity * selected.multiplier;
}

/** The recipient as the helper fills it: Torn reads only the bracketed ID. */
export function recipient_text(selected: SelectedPlan): string {
  const pay = selected.plan.payment;
  return `${pay.recipient_name ?? "player"} [${pay.recipient_player_id}]`;
}

// The steps, numbered as in issue #38: 0 only when no Xanax row is visible,
// 1 to 7 for the send, and the Close after a success. In Torn's narrow
// layout, Open Xanax row comes first, and the send has 8 steps.
export const STEPS = [
  { id: "open_drugs", label: "Open Drugs", number: 0 },
  { id: "open_row", label: "Open Xanax row", number: 0 },
  { id: "open_send", label: "Open send", number: 1 },
  { id: "fill_recipient", label: "Fill recipient", number: 2 },
  { id: "fill_amount", label: "Fill amount", number: 3 },
  { id: "add_message", label: "Add message", number: 4 },
  { id: "fill_message", label: "Fill message", number: 5 },
  { id: "send", label: "Send", number: 6 },
  { id: "confirm", label: "Yes", number: 7 },
  { id: "close_result", label: "Sent! Close", number: 7 },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

const step_info = (id: StepId) =>
  STEPS.find((s) => s.id === id) as (typeof STEPS)[number];

// The step's number, counted with Open Xanax row in the narrow layout.
const step_number = (id: StepId, narrow: boolean) => {
  if (id === "open_row") return 1;
  const { number } = step_info(id);
  return narrow && number >= 1 ? number + 1 : number;
};
const step_count = (narrow: boolean) => (narrow ? 8 : 7);

/** One change on the page, or none. A press returns exactly one. */
export type Action =
  | { kind: "none" }
  | { kind: "click"; target: HTMLElement }
  | {
      kind: "fill";
      target: HTMLInputElement;
      value: string;
      // Events that let Torn's own widgets see the new value.
      events: readonly string[];
    };

const NONE: Action = { kind: "none" };

/**
 * What the helper shows: the step the page is at, and what a press there
 * does. `key` tells two situations apart, so a press can see whether the
 * page moved since the label was drawn.
 */
export type Shown = {
  key: string;
  // The step the page is at, for the count and the step list.
  step: StepId;
  // Torn's narrow layout: each row opens like an accordion, so the send
  // starts with Open Xanax row.
  narrow: boolean;
  label: string;
  // Set when something keeps the helper from its step.
  problem?: string;
  // Fills the plan cleared after this step is done.
  finishes?: boolean;
};

type Situation = Shown & { action: Action };

export type HelperState = {
  shown: Shown;
  // A send form that was open when the player picked this plan. The next
  // press closes it, so the send starts from a fresh form.
  stale_form: Element | null;
};

export type ListedStep = { label: string; done: boolean; current: boolean };

/**
 * The steps for the expanded helper, with done steps checked. Open Drugs
 * shows only while it is the step, and the Close after a success only then.
 */
export function step_list(shown: Shown): ListedStep[] {
  const number = (id: StepId) => step_number(id, shown.narrow);
  const current = step_info(shown.step);
  const core = STEPS.filter(
    (s) =>
      (s.number >= 1 || (s.id === "open_row" && shown.narrow)) &&
      s.id !== "close_result",
  );
  const listed = [
    ...(shown.step === "open_drugs" ? [current] : []),
    ...core,
    ...(shown.step === "close_result" ? [current] : []),
  ];
  return listed.map((s) => ({
    label: s.label,
    done:
      s.id !== shown.step &&
      (shown.step === "close_result" || number(s.id) < number(shown.step)),
    current: s.id === shown.step,
  }));
}

/** Visible: no ancestor (or the element) has display: none. */
export function is_visible(el: Element | null): boolean {
  if (!el?.isConnected) return false;
  const view = el.ownerDocument.defaultView;
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (view?.getComputedStyle(e).display === "none") return false;
  }
  return true;
}

const visible_in = <T extends Element>(root: ParentNode, sel: string) =>
  [...root.querySelectorAll<T>(sel)].find(is_visible) ?? null;

const flat_text = (el: Element) =>
  (el.textContent ?? "").replace(/\s+/g, " ").trim();

const count_of = (text: string | null | undefined) => {
  const n = Number.parseInt((text ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
};

const step_label = (step: StepId, narrow: boolean) =>
  `${step_info(step).label} ${step_number(step, narrow)}/${step_count(narrow)}`;

// A situation before the layout is known. situation() adds the layout and,
// for a step without a problem, the label.
type Read = Omit<Situation, "narrow" | "label"> & { label?: string };

const at_step = (step: StepId, action: Action, extra: Partial<Read> = {}) =>
  ({ key: step, step, action, ...extra }) satisfies Read;

const blocked = (step: StepId, key: string, problem: string): Read => ({
  key: `blocked:${key}`,
  step,
  label: problem,
  problem,
  action: NONE,
});

const not_enough = (have: number, need: number) =>
  blocked("open_send", "not_enough", `Not enough Xanax: ${have} of ${need}`);

// Torn reads only the ID inside the brackets of the recipient field.
const bracket_id = (value: string) => value.match(/\[(\d+)\]\s*$/)?.[1] ?? null;

function read_send_form(form: HTMLFormElement, selected: SelectedPlan): Read {
  const pay = selected.plan.payment;
  const total = plan_total(selected);
  const user = form.querySelector<HTMLInputElement>("input.user-id");
  const amount = visible_in<HTMLInputElement>(form, "input.amount");
  const hidden_amount = form.querySelector<HTMLInputElement>(
    'input[type="hidden"][name="amount"]',
  );
  const message = form.querySelector<HTMLInputElement>(
    'input.message[name="tag"]',
  );
  const add_message = form.querySelector<HTMLElement>("a.action-message");
  const send = form.querySelector<HTMLElement>('input.torn-btn[value="SEND"]');
  if (!user || !amount || !hidden_amount || !message || !add_message || !send) {
    return blocked("open_send", "form", "Torn's send form looks different");
  }

  const have = count_of(amount.getAttribute("data-max"));
  if (have !== null && have < total) return not_enough(have, total);

  if (bracket_id(user.value) !== String(pay.recipient_player_id)) {
    return at_step("fill_recipient", {
      kind: "fill",
      target: user,
      value: recipient_text(selected),
      // No key or input events: those start Torn's player search.
      events: [],
    });
  }
  // Torn's money widget can show the amount with commas.
  if (
    count_of(amount.value) !== total ||
    count_of(hidden_amount.value) !== total
  ) {
    return at_step("fill_amount", {
      kind: "fill",
      target: amount,
      value: String(total),
      events: ["input", "keyup", "change"],
    });
  }
  // The link is a toggle: a click while the message shows removes it.
  if (!is_visible(message)) {
    return at_step("add_message", { kind: "click", target: add_message });
  }
  if (message.value !== pay.message) {
    return at_step("fill_message", {
      kind: "fill",
      target: message,
      value: pay.message,
      events: ["input", "change"],
    });
  }
  return at_step("send", { kind: "click", target: send });
}

function confirm_differences(
  form: HTMLFormElement,
  selected: SelectedPlan,
): string[] {
  const pay = selected.plan.payment;
  const value = (name: string) =>
    form.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)
      ?.value ?? "";
  const diffs: string[] = [];
  const user = value("userID");
  if (user !== String(pay.recipient_player_id)) {
    // Torn resolved the ID to a name: "... to <b>name</b> ..."
    const text = form.querySelector("p")?.textContent ?? "";
    const name = text.match(/ to (.+?)(?: with the message:.*)?\?\s*$/)?.[1];
    diffs.push(
      `to ${name ?? "player"} [${user}], not ${recipient_text(selected)}`,
    );
  }
  const amount = value("amount");
  if (amount !== String(plan_total(selected))) {
    diffs.push(`${amount} Xanax, not ${plan_total(selected)}`);
  }
  const tag = value("tag");
  if (tag !== pay.message) {
    diffs.push(`message "${tag}", not "${pay.message}"`);
  }
  return diffs;
}

// Torn's result: "You sent <b>20x</b> <b>Xanax</b> to <a XID>…</a> with the
// message: …". For one item Torn writes "some" in place of "1x". Matches only
// when the ID, the amount, and the message do.
function result_matches(result: Element, selected: SelectedPlan): boolean {
  const pay = selected.plan.payment;
  const text = flat_text(result);
  const sent = text.match(/^You sent (?:(\d[\d,]*)x|(some)) Xanax /);
  const amount = sent?.[2] ? 1 : count_of(sent?.[1]);
  const link = result.querySelector<HTMLAnchorElement>('a[href*="XID="]');
  const id = link?.getAttribute("href")?.match(/XID=(\d+)/)?.[1];
  const message = text.match(/ with the message: (.*)$/)?.[1] ?? "";
  return (
    amount === plan_total(selected) &&
    id === String(pay.recipient_player_id) &&
    message === pay.message
  );
}

function read_send_panel(
  wrap: Element,
  selected: SelectedPlan,
  stale_form: Element | null,
): Read {
  const confirm = visible_in<HTMLFormElement>(wrap, 'form[data-confirm="1"]');
  if (confirm) {
    const diffs = confirm_differences(confirm, selected);
    const close = confirm.querySelector<HTMLElement>("a.close-act");
    const yes = confirm.querySelector<HTMLElement>("a.next-act");
    if (diffs.length === 0 && yes) {
      return at_step("confirm", { kind: "click", target: yes });
    }
    const problem = `Torn's confirm does not match: ${diffs.join("; ") || "no Yes link"}. Press to close it.`;
    return {
      key: "close_confirm",
      step: "send",
      label: problem,
      problem,
      action: close ? { kind: "click", target: close } : NONE,
    };
  }

  const form = visible_in<HTMLFormElement>(wrap, "form");
  if (form) {
    if (stale_form && form === stale_form) {
      const close = wrap.querySelector<HTMLElement>("button.close-icon");
      const problem =
        "This form is from before your new pick. Press to close it.";
      return {
        key: "close_form",
        step: "open_send",
        label: problem,
        problem,
        action: close ? { kind: "click", target: close } : NONE,
      };
    }
    return read_send_form(form, selected);
  }

  // The result is a <p>; the Close link sits in a second one.
  const result = [...wrap.querySelectorAll("p")].find(
    (p) => is_visible(p) && flat_text(p).startsWith("You sent"),
  );
  if (result) {
    const close = visible_in<HTMLElement>(wrap, "a.close-act");
    if (result_matches(result, selected)) {
      return at_step(
        "close_result",
        close ? { kind: "click", target: close } : NONE,
        { finishes: true },
      );
    }
    const problem = "This send result is not for your plan. Press to close it.";
    return {
      key: "close_other_result",
      step: "open_send",
      label: problem,
      problem,
      action: close ? { kind: "click", target: close } : NONE,
    };
  }
  // No form and no result: Torn's error text. The helper stays on Send.
  const text = flat_text(wrap);
  return blocked("send", `error:${text}`, text || "Torn shows an error");
}

const XANAX_ROW = `ul.items-cont > li[data-item="${XANAX_ITEM_ID}"][data-rowkey]`;

/** Reads the page and returns where the send is now. */
function situation(
  doc: Document,
  selected: SelectedPlan,
  stale_form: Element | null,
): Situation {
  const row = visible_in<HTMLElement>(doc, XANAX_ROW);
  // Below 784px Torn turns each item panel into a jQuery UI accordion. With
  // no Xanax row yet, any accordion panel tells the layout.
  const narrow = row
    ? row.querySelector(":scope > .cont-wrap.ui-accordion-content") !== null
    : doc.querySelector("ul.items-cont.ui-accordion") !== null;
  const read = read_page(doc, row, selected, stale_form);
  return {
    ...read,
    narrow,
    label: read.label ?? step_label(read.step, narrow),
  };
}

function read_page(
  doc: Document,
  row: HTMLElement | null,
  selected: SelectedPlan,
  stale_form: Element | null,
): Read {
  // Another item's send panel blocks Xanax's: Torn opens one at a time.
  for (const wrap of doc.querySelectorAll("ul.items-cont > li .send-act")) {
    const row = wrap.closest("li[data-item]");
    if (row?.getAttribute("data-item") === String(XANAX_ITEM_ID)) continue;
    if (!is_visible(wrap)) continue;
    const name =
      row?.querySelector(".name")?.textContent?.trim() ?? "another item";
    return blocked(
      "open_send",
      "other_form",
      `Close the ${name} send form first`,
    );
  }

  if (!row) {
    const tab = doc.querySelector<HTMLElement>('li[data-type="Drug"]');
    const link = tab?.querySelector<HTMLElement>("a.drugs-category-icon");
    if (tab?.matches(".ui-state-disabled, .no-items")) {
      return blocked("open_drugs", "no_xanax", "You hold no Xanax");
    }
    if (link && !is_visible(doc.querySelector("#drugs-items"))) {
      return at_step("open_drugs", { kind: "click", target: link });
    }
    return blocked("open_drugs", "no_row", "No Xanax row on the page");
  }

  const wrap = visible_in(row, ".send-act");
  if (wrap) return read_send_panel(wrap, selected, stale_form);

  const have = count_of(row.querySelector(".item-amount")?.textContent);
  const total = plan_total(selected);
  if (have !== null && have < total) return not_enough(have, total);

  // In the narrow layout the actions show only in an open row. The header
  // is a toggle, so the helper taps it only while the row is closed.
  const content = row.querySelector(":scope > .cont-wrap.ui-accordion-content");
  if (content && !is_visible(content)) {
    const header = row.querySelector<HTMLElement>(
      ":scope > .title-wrap.ui-accordion-header",
    );
    if (!header) return blocked("open_row", "no_header", "Tap the Xanax row");
    return at_step("open_row", { kind: "click", target: header });
  }
  const send = row.querySelector<HTMLElement>(
    'li[data-action="send"] button.option-send',
  );
  if (!send) return blocked("open_send", "no_send", "No send button on Xanax");
  return at_step("open_send", { kind: "click", target: send });
}

const shown_of = ({ action: _, ...shown }: Situation): Shown => shown;

/** The helper's state right after a pick. */
export function first_shown(
  doc: Document,
  selected: SelectedPlan,
  stale_form: Element | null = null,
): HelperState {
  return { shown: shown_of(situation(doc, selected, stale_form)), stale_form };
}

/** The send form that is open for Xanax now, if any. */
export function open_send_form(doc: Document): Element | null {
  const row = visible_in(doc, XANAX_ROW);
  const wrap = row && visible_in(row, ".send-act");
  return wrap ? visible_in(wrap, "form:not([data-confirm])") : null;
}

// What the label shows after the step is done. A click works through Torn,
// which can take a moment, so the label moves to the step after it; if the
// page did not follow, the next press only moves the label back.
function after(done: Situation): Shown {
  const { narrow } = done;
  const index = STEPS.findIndex((s) => s.id === done.step);
  let next: StepId =
    done.key === "close_confirm" ||
    done.key === "close_form" ||
    done.key === "close_other_result"
      ? "open_send"
      : (STEPS[Math.min(index + 1, STEPS.length - 1)]?.id ?? "open_send");
  if (next === "open_row" && !narrow) next = "open_send";
  return { key: next, step: next, narrow, label: step_label(next, narrow) };
}

export type PressResult = {
  action: Action;
  state: HelperState;
  // The send is over: the Selected Plan clears.
  finished: boolean;
};

/**
 * One press. Reads the page; if the page is at the shown step, returns that
 * step's one Action, and otherwise returns no Action and shows where the page
 * is.
 */
export function press(
  doc: Document,
  selected: SelectedPlan,
  state: HelperState,
): PressResult {
  // The stale form counts only while it is still the open form.
  const stale =
    state.stale_form && is_visible(state.stale_form) ? state.stale_form : null;
  const now = situation(doc, selected, stale);
  if (now.key !== state.shown.key || now.action.kind === "none") {
    return {
      action: NONE,
      state: { shown: shown_of(now), stale_form: stale },
      finished: false,
    };
  }
  return {
    action: now.action,
    state: {
      shown: after(now),
      stale_form: now.key === "close_form" ? null : stale,
    },
    finished: now.finishes === true,
  };
}

/** Makes the one change an Action describes. */
export function apply(action: Action): void {
  if (action.kind === "click") {
    action.target.click();
  } else if (action.kind === "fill") {
    action.target.value = action.value;
    for (const type of action.events) {
      action.target.dispatchEvent(new Event(type, { bubbles: true }));
    }
  }
}
