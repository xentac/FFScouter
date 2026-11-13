// @vitest-environment jsdom
import { WEEKLY_PLAN } from "@utils/__fixtures__/od_insurance";
import type { PayablePlan } from "@utils/od_insurance";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import skeleton from "../__fixtures__/torn-markup/2026-11-12/item-category-wrap-skeleton.html?raw";
import drugsPlain from "../__fixtures__/torn-markup/2026-11-12/item-drugs-plain.html?raw";
import drugsNarrow from "../__fixtures__/torn-markup/2026-11-13/item-drugs-narrow.html?raw";
import sendConfirm from "../__fixtures__/torn-markup/2026-11-13/send-confirm.html?raw";
import sendForm from "../__fixtures__/torn-markup/2026-11-13/send-form.html?raw";
import sendResult from "../__fixtures__/torn-markup/2026-11-13/send-result.html?raw";
import {
  apply,
  first_shown,
  type HelperState,
  open_send_form,
  press,
  type SelectedPlan,
  type StepId,
  step_list,
} from "./page";

// 7 Day plan, multiplier 1: 20 Xanax to InsuranceManager [700001] with
// "insurance:7days". The fixture player holds 243 Xanax.
const PLAN = WEEKLY_PLAN as PayablePlan;
const SELECTED: SelectedPlan = { plan: PLAN, multiplier: 1 };
const RECIPIENT = "InsuranceManager [700001]";

const $ = <T extends Element = HTMLElement>(
  sel: string,
  root: ParentNode = document,
) => root.querySelector<T>(sel);

const xanax_row = () => $('#drugs-items > li[data-item="206"]') as HTMLElement;

// Torn fills the Drugs panel the way the feature tests do: the captured
// panel replaces the empty one in the skeleton.
const open_drugs_panel = (html = drugsPlain) => {
  const panel = document.createElement("div");
  panel.innerHTML = html;
  const ul = panel.querySelector("ul.items-cont") as HTMLElement;
  document.getElementById(ul.id)?.replaceWith(ul);
};

// Puts a send panel snippet into a row, the way Torn does: the row gets the
// class "act", and any older panel goes away.
const show_send_panel = (html: string, row = xanax_row()) => {
  row.querySelector(".send-act")?.remove();
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const wrap = holder.querySelector(".send-act") as HTMLElement;
  row.querySelector(".cont-wrap")?.appendChild(wrap);
  row.classList.add("act");
  // Torn's money widget copies the visible amount into the hidden one. The
  // tests stand in for it.
  const [visible, hidden] =
    wrap.querySelectorAll<HTMLInputElement>("input.amount");
  visible?.addEventListener("input", () => {
    if (hidden) hidden.value = visible.value;
  });
  return wrap;
};

// Torn's Close: hides the panel and keeps what it held.
const close_send_panel = (row = xanax_row()) => {
  (row.querySelector(".send-act") as HTMLElement).style.display = "none";
  row.classList.remove("act");
};

const field = (sel: string) => $<HTMLInputElement>(sel) as HTMLInputElement;
const recipient = () => field(".send-act input.user-id");
const amount = () => field(".send-act input.amount:not([type=hidden])");
const hidden_amount = () =>
  field('.send-act input[type=hidden][name="amount"]');
const message = () => field('.send-act input.message[name="tag"]');
const show_message = () => {
  (message().parentElement as HTMLElement).style.display = "";
};

// Everything a press could change on the page: field values and clicks.
type Change = string;
let changes: Change[] = [];
const record_clicks = (e: Event) => {
  const el = e.target as HTMLElement;
  changes.push(
    `click ${el.tagName.toLowerCase()}.${[...el.classList].join(".")}`,
  );
  e.preventDefault();
};
// Hidden inputs are left out: only Torn's own widget writes those.
const values = () =>
  [
    ...document.querySelectorAll<HTMLInputElement>("input:not([type=hidden])"),
  ].map((i) => i.value);

// One press, as the helper's button does it. Returns the changes it made.
const do_press = (state: HelperState, selected = SELECTED) => {
  changes = [];
  const before = values();
  const result = press(document, selected, state);
  apply(result.action);
  const after = values();
  after.forEach((v, i) => {
    if (v !== before[i]) changes.push(`fill ${v}`);
  });
  return { ...result, changes };
};

beforeEach(() => {
  document.body.innerHTML = skeleton;
  document.addEventListener("click", record_clicks, true);
});

afterEach(() => {
  document.removeEventListener("click", record_clicks, true);
  document.body.innerHTML = "";
});

describe("press", () => {
  test("opens the Xanax send form", () => {
    open_drugs_panel();
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Open send 1/7");

    const result = do_press(state);
    expect(result.changes).toEqual(["click button.option-send.wai-btn"]);
    expect(result.state.shown.label).toBe("Fill recipient 2/7");
  });

  test("walks the whole send, one change for each press", () => {
    open_drugs_panel();
    let state = first_shown(document, SELECTED);
    const step = (expected: Change[]) => {
      const result = do_press(state);
      expect(result.changes).toEqual(expected);
      state = result.state;
      return result;
    };

    step(["click button.option-send.wai-btn"]);
    show_send_panel(sendForm); // Torn answers the click

    step([`fill ${RECIPIENT}`]);
    expect(recipient().value).toBe(RECIPIENT);
    expect(state.shown.label).toBe("Fill amount 3/7");

    step(["fill 20"]);
    expect(amount().value).toBe("20");
    expect(hidden_amount().value).toBe("20");

    step(["click a.action-message.left"]);
    show_message(); // Torn shows the message box

    step(["fill insurance:7days"]);
    expect(state.shown.label).toBe("Send 6/7");

    step(["click input.torn-btn"]);
    show_send_panel(sendConfirm);
    expect(state.shown.label).toBe("Yes 7/7");

    step(["click a.next-act.m-left10.t-blue.h"]);
    show_send_panel(sendResult);

    const last = step(["click a.close-act.t-gray3.h.refresh-act"]);
    expect(last.finished).toBe(true);
  });

  test("fills the recipient without key or input events", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    const seen: string[] = [];
    for (const type of ["keydown", "keyup", "input", "change"]) {
      recipient().addEventListener(type, () => seen.push(type));
    }
    do_press(first_shown(document, SELECTED));
    expect(recipient().value).toBe(RECIPIENT);
    expect(seen).toEqual([]);
  });

  test("a press on a step done by hand changes nothing and moves on", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Fill recipient 2/7");

    // The player picks the recipient from Torn's suggestions.
    recipient().value = "insurancemanager [700001]";
    const result = do_press(state);
    expect(result.changes).toEqual([]);
    expect(result.state.shown.label).toBe("Fill amount 3/7");
  });

  test("a click Torn has not answered yet is not repeated", () => {
    open_drugs_panel();
    const first = do_press(first_shown(document, SELECTED));
    expect(first.changes).toHaveLength(1);
    // Torn has not opened the form yet.
    const second = do_press(first.state);
    expect(second.changes).toEqual([]);
    expect(second.state.shown.label).toBe("Open send 1/7");
  });

  test("overwrites a wrong amount on the next press", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    recipient().value = RECIPIENT;
    amount().value = "2";
    hidden_amount().value = "2";
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Fill amount 3/7");
    expect(do_press(state).changes).toEqual(["fill 20"]);
  });

  test("does not count a visible amount that Torn did not copy", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    recipient().value = RECIPIENT;
    amount().value = "20"; // the hidden amount stays 1
    expect(first_shown(document, SELECTED).shown.step).toBe("fill_amount");
  });

  test("does not click the add-message toggle while the message shows", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    recipient().value = RECIPIENT;
    amount().value = "20";
    hidden_amount().value = "20";
    show_message();
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("fill_message");
    expect(do_press(state).changes).toEqual(["fill insurance:7days"]);
  });

  test("goes back a step when the player closes the form", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    recipient().value = RECIPIENT;
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("fill_amount");
    close_send_panel();
    const result = do_press(state);
    expect(result.changes).toEqual([]);
    expect(result.state.shown.label).toBe("Open send 1/7");
  });

  test("opens Drugs when no Xanax row is visible", () => {
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Open Drugs 0/7");
    expect(do_press(state).changes).toEqual([
      "click a.drugs-category-icon.ui-tabs-anchor",
    ]);
  });

  test("says the player holds no Xanax when the Drugs tab is empty", () => {
    $('li[data-type="Drug"]')?.classList.add("ui-state-disabled", "no-items");
    const state = first_shown(document, SELECTED);
    expect(state.shown.problem).toBe("You hold no Xanax");
    expect(do_press(state).changes).toEqual([]);
  });

  test("names the problem when Drugs is open without a Xanax row", () => {
    open_drugs_panel();
    xanax_row().remove();
    const state = first_shown(document, SELECTED);
    expect(state.shown.problem).toBe("No Xanax row on the page");
    expect(do_press(state).changes).toEqual([]);
  });

  test("does nothing when the player holds fewer Xanax than the total", () => {
    open_drugs_panel();
    const big: SelectedPlan = { plan: PLAN, multiplier: 13 }; // 260 > 243
    const state = first_shown(document, big);
    expect(state.shown.label).toBe("Not enough Xanax: 243 of 260");
    const result = press(document, big, state);
    expect(result.action.kind).toBe("none");
  });

  test("reads the count from .item-amount, not the stale data-qty", () => {
    open_drugs_panel();
    // After a send of 20, Torn updates the visible count only.
    ($(".item-amount", xanax_row()) as HTMLElement).textContent = "223";
    const big: SelectedPlan = { plan: PLAN, multiplier: 12 }; // 240
    expect(first_shown(document, big).shown.label).toBe(
      "Not enough Xanax: 223 of 240",
    );
  });

  test("waits while another item's send form is open", () => {
    open_drugs_panel();
    const ecstasy = $('#drugs-items > li[data-item="197"]') as HTMLElement;
    show_send_panel(sendForm, ecstasy);
    const state = first_shown(document, SELECTED);
    expect(state.shown.problem).toBe("Close the Ecstasy send form first");
    expect(do_press(state).changes).toEqual([]);
  });

  test("ignores a hidden stale result from an earlier send", () => {
    open_drugs_panel();
    show_send_panel(sendResult);
    close_send_panel();
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Open send 1/7");
    expect(do_press(state).finished).toBe(false);
  });

  test("counts a matching result as success after Yes by hand", () => {
    open_drugs_panel();
    show_send_panel(sendResult);
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("close_result");
    const result = do_press(state);
    expect(result.changes).toEqual(["click a.close-act.t-gray3.h.refresh-act"]);
    expect(result.finished).toBe(true);
  });

  test("closes a result that does not match the plan", () => {
    open_drugs_panel();
    show_send_panel(sendResult);
    const small: SelectedPlan = { plan: PLAN, multiplier: 2 };
    const state = first_shown(document, small);
    expect(state.shown.problem).toContain("not for your plan");
    const result = do_press(state, small);
    expect(result.changes).toEqual(["click a.close-act.t-gray3.h.refresh-act"]);
    expect(result.finished).toBe(false);
    expect(result.state.shown.step).toBe("open_send");
  });

  test("a hidden old result inside a visible panel is not a success", () => {
    open_drugs_panel();
    const wrap = show_send_panel(sendResult);
    ($("p", wrap) as HTMLElement).style.display = "none";
    wrap.insertAdjacentHTML("afterbegin", "<p>Something went wrong.</p>");
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("send");
    expect(do_press(state).finished).toBe(false);
  });

  test("counts an amount that Torn shows with commas", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    const big: SelectedPlan = { plan: PLAN, multiplier: 10 }; // 200
    recipient().value = RECIPIENT;
    amount().setAttribute("data-max", "5000");
    amount().value = "200";
    hidden_amount().value = "200";
    expect(first_shown(document, big).shown.step).toBe("add_message");
    amount().value = "1,000";
    hidden_amount().value = "1000";
    const thousand: SelectedPlan = {
      plan: { ...PLAN, max_multiplier: 50 },
      multiplier: 50,
    };
    expect(first_shown(document, thousand).shown.step).toBe("add_message");
  });

  test("shows Torn's error text and stays on Send", () => {
    open_drugs_panel();
    const wrap = show_send_panel(sendResult);
    wrap.innerHTML = "<p>That player cannot receive items.</p>";
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("That player cannot receive items.");
    expect(state.shown.step).toBe("send");
    expect(do_press(state).changes).toEqual([]);
  });
});

describe("never clicks Send or Yes on a mismatch", () => {
  const fill_form = () => {
    recipient().value = RECIPIENT;
    amount().value = "20";
    hidden_amount().value = "20";
    show_message();
    message().value = "insurance:7days";
  };

  test("sends when every field matches", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    fill_form();
    expect(first_shown(document, SELECTED).shown.step).toBe("send");
  });

  test.each([
    [
      "recipient",
      () => (recipient().value = "Someone [1000001]"),
      "fill_recipient",
    ],
    ["hidden amount", () => (hidden_amount().value = "2"), "fill_amount"],
    ["message", () => (message().value = "insurance:ecstasy"), "fill_message"],
  ])("goes back to the fill when the %s differs", (_, spoil, step) => {
    open_drugs_panel();
    show_send_panel(sendForm);
    fill_form();
    spoil();
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe(step);
    expect(do_press(state).changes).not.toContain("click input.torn-btn");
  });

  test.each([
    [
      "userID",
      "1000001",
      "to OtherPlayer [1000001], not InsuranceManager [700001]",
    ],
    ["amount", "2", "2 Xanax, not 20"],
    ["tag", "", 'message "", not "insurance:7days"'],
  ])("closes a confirm whose %s differs", (name, value, diff) => {
    open_drugs_panel();
    const wrap = show_send_panel(sendConfirm);
    field(`.send-act input[name="${name}"]`).value = value;
    if (name === "userID") {
      ($("b:last-of-type", wrap) as HTMLElement).textContent = "OtherPlayer";
    }
    let state = first_shown(document, SELECTED);
    expect(state.shown.problem).toContain(diff);
    // The label already shows the difference, so the press closes.
    const result = do_press(state);
    expect(result.changes).toEqual(["click a.close-act.t-gray3.h"]);
    state = result.state;
    expect(state.shown.label).toBe("Open send 1/7");
  });

  test("a confirm that turns wrong after the label showed Yes is not clicked", () => {
    open_drugs_panel();
    const wrap = show_send_panel(sendConfirm);
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("confirm");
    ($('input[name="amount"]', wrap) as HTMLInputElement).value = "200";
    const result = do_press(state);
    expect(result.changes).toEqual([]);
    expect(result.state.shown.problem).toContain("200 Xanax, not 20");
  });
});

describe("a new pick while a send form is open", () => {
  test("the next press closes the old form, then the helper starts again", () => {
    open_drugs_panel();
    show_send_panel(sendForm);
    recipient().value = "Someone [1000001]";
    const stale = open_send_form(document);
    let state = first_shown(document, SELECTED, stale);
    expect(state.shown.key).toBe("close_form");

    const result = do_press(state);
    expect(result.changes).toEqual([
      "click button.close-icon.right.c-pointer.wai-btn",
    ]);
    state = result.state;
    expect(state.stale_form).toBeNull();

    close_send_panel(); // Torn answers the Close
    show_send_panel(sendForm); // and later opens a fresh form
    expect(do_press(state).state.shown.step).toBe("fill_recipient");
  });
});

describe("step_list", () => {
  const shown = (step: StepId) => ({
    key: step,
    step,
    narrow: false,
    label: "",
  });

  test("checks the steps before the current one", () => {
    expect(step_list(shown("fill_amount"))).toEqual([
      { label: "Open send", done: true, current: false },
      { label: "Fill recipient", done: true, current: false },
      { label: "Fill amount", done: false, current: true },
      { label: "Add message", done: false, current: false },
      { label: "Fill message", done: false, current: false },
      { label: "Send", done: false, current: false },
      { label: "Yes", done: false, current: false },
    ]);
  });

  test("lists Open Drugs only while it is the step", () => {
    const list = step_list(shown("open_drugs"));
    expect(list[0]).toEqual({
      label: "Open Drugs",
      done: false,
      current: true,
    });
    expect(list).toHaveLength(8);
    expect(step_list(shown("open_send"))[0]?.label).toBe("Open send");
  });

  test("checks every step after a success", () => {
    const list = step_list(shown("close_result"));
    expect(list.slice(0, -1).every((s) => s.done)).toBe(true);
    expect(list.at(-1)).toEqual({
      label: "Sent! Close",
      done: false,
      current: true,
    });
  });
});

describe("Torn's narrow layout", () => {
  // Below 784px, each row is a jQuery UI accordion. Its content, with the
  // actions and the send panel, shows only after a tap on the row.
  const row_content = () =>
    $(":scope > .cont-wrap", xanax_row()) as HTMLElement;
  const open_row = () => {
    row_content().style.display = "";
  };
  const close_row = () => {
    row_content().style.display = "none";
  };

  test("opens the Xanax row first, as step 1 of 8", () => {
    open_drugs_panel(drugsNarrow);
    const state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Open Xanax row 1/8");

    const result = do_press(state);
    expect(result.changes).toEqual([
      "click div.title-wrap.ui-accordion-header.ui-helper-reset.ui-state-default.ui-corner-all.ui-accordion-icons",
    ]);
    expect(result.state.shown.label).toBe("Open send 2/8");
  });

  test("walks the rest of the send with 8 steps", () => {
    open_drugs_panel(drugsNarrow);
    open_row();
    let state = first_shown(document, SELECTED);
    expect(state.shown.label).toBe("Open send 2/8");
    state = do_press(state).state;
    show_send_panel(sendForm);
    expect(state.shown.label).toBe("Fill recipient 3/8");
    state = do_press(state).state;
    expect(state.shown.label).toBe("Fill amount 4/8");
  });

  test("does not tap the row header while the row is open", () => {
    open_drugs_panel(drugsNarrow);
    open_row();
    const changes = do_press(first_shown(document, SELECTED)).changes;
    expect(changes).toEqual(["click button.option-send.wai-btn"]);
  });

  test("goes back to Open Xanax row when the player closes the row", () => {
    open_drugs_panel(drugsNarrow);
    open_row();
    show_send_panel(sendForm);
    const state = first_shown(document, SELECTED);
    expect(state.shown.step).toBe("fill_recipient");
    close_row();
    const result = do_press(state);
    expect(result.changes).toEqual([]);
    expect(result.state.shown.label).toBe("Open Xanax row 1/8");
  });

  test("lists Open Xanax row with the other steps", () => {
    open_drugs_panel(drugsNarrow);
    open_row();
    const list = step_list(first_shown(document, SELECTED).shown);
    expect(list.map((s) => s.label)).toEqual([
      "Open Xanax row",
      "Open send",
      "Fill recipient",
      "Fill amount",
      "Add message",
      "Fill message",
      "Send",
      "Yes",
    ]);
    expect(list[0]?.done).toBe(true);
    expect(list[1]?.current).toBe(true);
  });
});
