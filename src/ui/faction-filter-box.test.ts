// @vitest-environment jsdom

import * as fs from "node:fs";
import * as path from "node:path";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, expect, test, vi } from "vitest";
import "./faction-filter-box";
import type { FFFactionFilterBox } from "./faction-filter-box";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  ffconfig.reset();
});

test("ff-faction-filter-box renders with default state and dispatches filter-change on connection", async () => {
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;

  const events: any[] = [];
  el.addEventListener("filter-change", (e: any) => {
    events.push(e.detail);
  });

  document.body.appendChild(el);

  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(events.length).toBe(1);
  expect(events[0].sortBy).toBe("none");
  expect(events[0].activity.online).toBe(true);
  expect(events[0].status.okay).toBe(true);

  const summary = el.querySelector("summary");
  expect(summary?.textContent?.trim()).toBe("FFScouter Filter & Sort Controls");
});

test("ff-faction-filter-box updates state and dispatches filter-change event on input change", async () => {
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const events: any[] = [];
  el.addEventListener("filter-change", (e: any) => {
    events.push(e.detail);
  });

  const button = el.querySelector("button");
  expect(button).not.toBeNull();
  if (button) {
    button.click(); // none -> ff-desc
    button.click(); // ff-desc -> ff-asc
  }

  expect(events[events.length - 1].sortBy).toBe("ff-asc");

  const onlineCheckbox = el.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement;
  expect(onlineCheckbox).not.toBeNull();
  if (onlineCheckbox) {
    onlineCheckbox.checked = false;
    onlineCheckbox.dispatchEvent(new Event("change"));
  }

  expect(events[events.length - 1].activity.online).toBe(false);

  const minLvlInput = el.querySelector(
    'input[placeholder="Min"]',
  ) as HTMLInputElement;
  expect(minLvlInput).not.toBeNull();
  if (minLvlInput) {
    minLvlInput.value = "50";
    minLvlInput.dispatchEvent(new Event("input"));
  }

  expect(events[events.length - 1].levelMin).toBe(50);

  const filterGroups = Array.from(el.querySelectorAll(".ff-filter-group"));
  const statsGroup = filterGroups.find(
    (g) => g.querySelector("strong")?.textContent === "Stats Range",
  );
  expect(statsGroup).toBeDefined();

  if (statsGroup) {
    const minInput = statsGroup.querySelector(
      'input[placeholder="Min"]',
    ) as HTMLInputElement;
    const maxInput = statsGroup.querySelector(
      'input[placeholder="Max"]',
    ) as HTMLInputElement;

    expect(minInput).not.toBeNull();
    expect(maxInput).not.toBeNull();

    minInput.value = "1.5m";
    minInput.dispatchEvent(new Event("input"));
    expect(events[events.length - 1].statsMin).toBe(1500000);

    maxInput.value = "2b";
    maxInput.dispatchEvent(new Event("input"));
    expect(events[events.length - 1].statsMax).toBe(2000000000);
  }
});

test("ff-faction-filter-box supports toggle expand/collapse state saving to localStorage", async () => {
  ffconfig.faction_filter_collapsed = true;
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const details = el.querySelector("details") as HTMLDetailsElement;
  expect(details).not.toBeNull();
  expect(details.open).toBe(false);

  // Open the accordion
  details.open = true;
  details.dispatchEvent(new Event("toggle"));
  expect(ffconfig.faction_filter_collapsed).toBe(false);

  // Collapse the accordion
  details.open = false;
  details.dispatchEvent(new Event("toggle"));
  expect(ffconfig.faction_filter_collapsed).toBe(true);
});

test("ff-faction-filter-box handles display mode dropdown and dynamic config updates", async () => {
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const select = el.querySelector(
    "#factions-col-display-filter",
  ) as HTMLSelectElement;
  expect(select).not.toBeNull();
  expect(select.value).toBe("battle_stats");

  // Listen for config update event
  let updatedEventFired = false;
  const onConfigUpdated = () => {
    updatedEventFired = true;
  };
  window.addEventListener("ff-config-updated", onConfigUpdated);

  try {
    // Change display to fair fight
    select.value = "fair_fight";
    select.dispatchEvent(new Event("change"));

    expect(ffconfig.factions_col_display).toBe("fair_fight");
    expect(updatedEventFired).toBe(true);

    // Wait for display mode update to render
    await el.updateComplete;

    // Check that the sort button label changes to reflect "FF" instead of "Stats"
    const button = el.querySelector("button");
    button?.click(); // none -> ff-desc
    await el.updateComplete;
    expect(button?.textContent?.trim()).toContain("FF ▼");

    // Simulate updating from settings panel (external configuration update)
    ffconfig.factions_col_display = "battle_stats" as any;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    await el.updateComplete;

    expect(select.value).toBe("battle_stats");
    expect(button?.textContent?.trim()).toContain("Stats ▼");

    // Change display to none
    select.value = "none";
    select.dispatchEvent(new Event("change"));

    expect(ffconfig.factions_col_display).toBe("none");
    await el.updateComplete;
    expect(button?.textContent?.trim()).toContain("FF ▼");
  } finally {
    window.removeEventListener("ff-config-updated", onConfigUpdated);
  }
});

test("ff-faction-filter-box supports mode='war' styling and independent configs", async () => {
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 1. Check no-borders class
  const details = el.querySelector("details") as HTMLDetailsElement;
  expect(details).not.toBeNull();
  expect(details.classList.contains("no-borders")).toBe(true);

  // 2. Check that war display select is rendered and loads correct config
  const select = el.querySelector(
    "#war-col-display-filter",
  ) as HTMLSelectElement;
  expect(select).not.toBeNull();
  expect(select.value).toBe("battle_stats");

  // Change selection and verify it updates ffconfig.war_col_display
  select.value = "fair_fight";
  select.dispatchEvent(new Event("change"));
  expect(ffconfig.war_col_display).toBe("fair_fight");
  expect(ffconfig.factions_col_display).toBe("battle_stats");

  // 3. Test saving/loading collapsed state in war mode
  ffconfig.war_filter_collapsed = true;
  el.disconnectedCallback();
  el.connectedCallback();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(details.open).toBe(false);

  // Toggle open
  details.open = true;
  details.dispatchEvent(new Event("toggle"));
  expect(ffconfig.war_filter_collapsed).toBe(false);

  // 4. Test saving state to war_filter_state
  const onlineCheckbox = el.querySelector(
    'input[type="checkbox"]',
  ) as HTMLInputElement;
  expect(onlineCheckbox).not.toBeNull();
  if (onlineCheckbox) {
    onlineCheckbox.checked = false;
    onlineCheckbox.dispatchEvent(new Event("change"));
  }

  expect(ffconfig.war_filter_state?.activity?.online).toBe(false);
  expect(ffconfig.faction_filter_state).toBeNull(); // faction config untouched
});

test("ff-faction-filter-box supports column visibility toggles and reactive container attributes in mode='war'", async () => {
  // Create a wrapper faction-war container to simulate the Torn war view
  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  warWrapper.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // 1. Verify Visible Columns section exists
  const grpColumns = el.querySelector(".grp-columns");
  expect(grpColumns).not.toBeNull();
  expect(grpColumns?.querySelector("strong")?.textContent).toBe(
    "Visible Columns",
  );

  // 2. Checkboxes exist and are checked by default
  const checkboxes = Array.from(
    grpColumns?.querySelectorAll('input[type="checkbox"]') || [],
  ) as [HTMLInputElement, HTMLInputElement, HTMLInputElement];
  expect(checkboxes.length).toBe(3); // Level, Status, Score

  const [lvlCheckbox, statusCheckbox, scoreCheckbox] = checkboxes;
  expect(lvlCheckbox.checked).toBe(true);
  expect(statusCheckbox.checked).toBe(true);
  expect(scoreCheckbox.checked).toBe(true);

  // 3. Verify no hiding attributes on wrapper initially
  expect(warWrapper.hasAttribute("data-ffscouter-hide-level")).toBe(false);
  expect(warWrapper.hasAttribute("data-ffscouter-hide-status")).toBe(false);
  expect(warWrapper.hasAttribute("data-ffscouter-hide-score")).toBe(false);

  // 4. Toggle Level visibility checkbox to off (hide) and verify wrapper attribute is set
  lvlCheckbox.checked = false;
  lvlCheckbox.dispatchEvent(new Event("change"));
  await el.updateComplete;

  expect(warWrapper.getAttribute("data-ffscouter-hide-level")).toBe("true");
  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(true);

  // Toggle Level back on and verify attribute is removed
  lvlCheckbox.checked = true;
  lvlCheckbox.dispatchEvent(new Event("change"));
  await el.updateComplete;

  expect(warWrapper.hasAttribute("data-ffscouter-hide-level")).toBe(false);
  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false);

  // 5. Verify the columns checkboxes are NOT rendered when mode is 'faction'
  el.mode = "faction";
  await el.updateComplete;
  expect(el.querySelector(".grp-columns")).toBeNull();
});

test("ff-faction-filter-box renders compare activity button only in mode='war'", async () => {
  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // In faction mode, button is NOT present
  expect(el.querySelector("#compare-faction-activity-btn")).toBeNull();

  // In war mode, button IS present
  el.mode = "war";
  await el.updateComplete;
  expect(el.querySelector("#compare-faction-activity-btn")).not.toBeNull();
});

test("ff-faction-filter-box compare activity button opens correct URL when links are inside the container", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const link1 = document.createElement("a");
  link1.href = "factions.php?step=profile&ID=9524";
  warWrapper.appendChild(link1);

  const link2 = document.createElement("a");
  link2.href = "factions.php?step=profile&ID=22295";
  warWrapper.appendChild(link2);

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  warWrapper.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const compareBtn = el.querySelector(
    "#compare-faction-activity-btn",
  ) as HTMLButtonElement;
  expect(compareBtn).not.toBeNull();

  compareBtn.click();

  expect(openSpy).toHaveBeenCalled();
  const urlStr = openSpy.mock.calls[0]![0] as string;
  const url = new URL(urlStr);
  expect(url.origin).toBe("https://ffscouter.com");
  expect(url.pathname).toBe("/faction-activity-comparison");
  expect(url.searchParams.get("faction_id_1")).toBe("9524");
  expect(url.searchParams.get("faction_id_2")).toBe("22295");
  expect(url.searchParams.get("bucket_minutes")).toBe("5");

  const startAt = url.searchParams.get("start_at");
  const endAt = url.searchParams.get("end_at");
  expect(startAt).not.toBeNull();
  expect(endAt).not.toBeNull();
  if (startAt && endAt) {
    const startDate = new Date(`${startAt}Z`);
    const endDate = new Date(`${endAt}Z`);
    expect(endDate.getTime() - startDate.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  }

  openSpy.mockRestore();
});

test("ff-faction-filter-box compare activity button falls back to document links if not inside container", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

  const link1 = document.createElement("a");
  link1.href = "factions.php?step=profile&ID=9524";
  document.body.appendChild(link1);

  const link2 = document.createElement("a");
  link2.href = "factions.php?step=profile&ID=22295";
  document.body.appendChild(link2);

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const compareBtn = el.querySelector(
    "#compare-faction-activity-btn",
  ) as HTMLButtonElement;
  expect(compareBtn).not.toBeNull();

  compareBtn.click();

  expect(openSpy).toHaveBeenCalled();
  const urlStr = openSpy.mock.calls[0]![0] as string;
  const url = new URL(urlStr);
  expect(url.origin).toBe("https://ffscouter.com");
  expect(url.pathname).toBe("/faction-activity-comparison");
  expect(url.searchParams.get("faction_id_1")).toBe("9524");
  expect(url.searchParams.get("faction_id_2")).toBe("22295");
  expect(url.searchParams.get("bucket_minutes")).toBe("5");

  openSpy.mockRestore();
});

test("ff-faction-filter-box compare activity button logs warning and does not redirect if faction IDs are missing", async () => {
  const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  document.body.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const compareBtn = el.querySelector(
    "#compare-faction-activity-btn",
  ) as HTMLButtonElement;
  expect(compareBtn).not.toBeNull();

  compareBtn.click();

  expect(openSpy).not.toHaveBeenCalled();
  expect(warnSpy).toHaveBeenCalledWith(
    "Could not find faction IDs to compare activity.",
  );

  openSpy.mockRestore();
  warnSpy.mockRestore();
});

test("ff-faction-filter-box defaults to level column hidden on mobile viewport", async () => {
  // Simulate mobile view width
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 375,
  });

  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  warWrapper.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Verify Level checkbox is unchecked (hidden)
  const grpColumns = el.querySelector(".grp-columns");
  expect(grpColumns).not.toBeNull();
  const [lvlCheckbox] = Array.from(
    grpColumns?.querySelectorAll('input[type="checkbox"]') || [],
  ) as [HTMLInputElement];
  expect(lvlCheckbox.checked).toBe(false); // level is hidden by default on mobile

  // Verify hiding attribute is set on wrapper
  expect(warWrapper.getAttribute("data-ffscouter-hide-level")).toBe("true");

  // Cleanup
  document.body.removeChild(warWrapper);
});

test("ff-faction-filter-box separates desktop and mobile visible column settings", async () => {
  // A. Start on desktop
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1024,
  });

  const warWrapper = document.createElement("div");
  warWrapper.className = "faction-war";
  document.body.appendChild(warWrapper);

  const el = document.createElement(
    "ff-faction-filter-box",
  ) as FFFactionFilterBox;
  el.mode = "war";
  warWrapper.appendChild(el);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Toggling Level checkbox on desktop to unchecked (hidden)
  const grpColumns = el.querySelector(".grp-columns");
  const [lvlCheckbox] = Array.from(
    grpColumns?.querySelectorAll('input[type="checkbox"]') || [],
  ) as [HTMLInputElement];
  expect(lvlCheckbox.checked).toBe(true); // default visible on desktop

  lvlCheckbox.click();
  await el.updateComplete;

  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(true);
  expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(true); // mobile default level hidden is true

  // Now, toggle Level back to checked (visible) on desktop
  lvlCheckbox.click();
  await el.updateComplete;

  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false);
  expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(true); // mobile setting should remain true

  // B. Switch to mobile view (reload state)
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 375,
  });
  // Re-trigger loadState/resize simulation
  window.dispatchEvent(new Event("resize"));
  await el.updateComplete;

  // Level should load as mobile preference (hidden)
  const [lvlCheckboxMobile] = Array.from(
    el
      .querySelector(".grp-columns")
      ?.querySelectorAll('input[type="checkbox"]') || [],
  ) as [HTMLInputElement];
  expect(lvlCheckboxMobile.checked).toBe(false);

  // Now, on mobile, toggle Level to checked (visible)
  lvlCheckboxMobile.click();
  await el.updateComplete;

  expect(ffconfig.war_filter_state?.hiddenColumns?.level).toBe(false); // desktop visible remains false/visible
  expect(ffconfig.war_filter_state?.hiddenColumnsMobile?.level).toBe(false); // mobile visible is now false/visible

  // Cleanup
  document.body.removeChild(warWrapper);
});

test("ff-faction-filter-box has correct mobile order for filter groups", async () => {
  const cssPath = path.resolve(__dirname, "./styles.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const styleEl = document.createElement("style");
  styleEl.textContent = cssContent;
  document.head.appendChild(styleEl);

  try {
    const el = document.createElement(
      "ff-faction-filter-box",
    ) as FFFactionFilterBox;
    el.mode = "war";
    document.body.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const getOrder = (selector: string): string => {
      const target = el.querySelector(selector);
      if (!target) return "";
      const style = window.getComputedStyle(target);
      return style.order;
    };

    expect(getOrder(".grp-sort")).toBe("1");
    expect(getOrder(".grp-level")).toBe("2");
    expect(getOrder(".grp-activity")).toBe("3");
    expect(getOrder(".grp-status")).toBe("4");
    expect(getOrder(".grp-ff")).toBe("5");
    expect(getOrder(".grp-stats")).toBe("6");
    expect(getOrder(".grp-columns")).toBe("7");
  } finally {
    document.head.removeChild(styleEl);
  }
});
