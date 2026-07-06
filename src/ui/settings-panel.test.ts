// @vitest-environment jsdom

import { beforeEach, expect, test } from "vitest";
import "./settings-panel";
import type { FFSettingsPanel } from "./settings-panel";

beforeEach(() => {
  document.body.innerHTML = "";
});

// Simulate a real user edit: the browser sets the input's value natively
// (outside React's value tracker) and fires a bubbling "input" event, which is
// what React's onChange listens for. Assigning `.value` directly in JS goes
// through React's tracker, so React would treat it as a no-op and never fire
// onChange -- the same controlled-input machinery this panel's bug was about.
function userInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

test("ff-settings-panel dispatches ff-save-key on change event of the API key input", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const events: CustomEvent[] = [];
  el.addEventListener("ff-save-key", (e: Event) => {
    events.push(e as CustomEvent);
  });

  const apiKeyInput = el.querySelector("#api-key") as HTMLInputElement;
  expect(apiKeyInput).not.toBeNull();

  // Type the key (input) then commit it by blurring the field (focusout).
  apiKeyInput.value = "test-api-key-123";
  apiKeyInput.dispatchEvent(new Event("input", { bubbles: true }));
  apiKeyInput.dispatchEvent(new Event("focusout", { bubbles: true }));

  expect(events.length).toBe(1);
  expect(events[0]).toBeDefined();
  expect(events[0]?.detail?.apiKey).toBe("test-api-key-123");
});

test("ff-settings-panel dispatches ff-save event with correct gaugeMarkerType when saved", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const select = el.querySelector("#gauge-marker-type") as HTMLSelectElement;
  expect(select).not.toBeNull();

  // Change selection to bubble_ff
  select.value = "bubble_ff";
  select.dispatchEvent(new Event("change", { bubbles: true }));

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.gaugeMarkerType).toBe("bubble_ff");
});

test("ff-settings-panel dispatches ff-save event with correct networkInterceptionEnabled when saved", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const checkbox = el.querySelector(
    "#network-interception-toggle",
  ) as HTMLInputElement;
  expect(checkbox).not.toBeNull();
  // Default is off; a real click toggles it on.
  expect(checkbox.checked).toBe(false);

  checkbox.click();
  await el.updateComplete;
  expect(checkbox.checked).toBe(true);

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.networkInterceptionEnabled).toBe(true);
});

test("ff-settings-panel dispatches ff-save event with correct statusAttackLinksEnabled when saved", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const checkbox = el.querySelector(
    "#status-attack-links-toggle",
  ) as HTMLInputElement;
  expect(checkbox).not.toBeNull();
  // Default is on; a real click toggles it off.
  expect(checkbox.checked).toBe(true);

  checkbox.click();
  await el.updateComplete;
  expect(checkbox.checked).toBe(false);

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.statusAttackLinksEnabled).toBe(false);
});

test("ff-settings-panel dispatches ff-save event with correct settingsPanelOwnProfileOnly when saved", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const checkbox = el.querySelector(
    "#settings-panel-own-profile-only-toggle",
  ) as HTMLInputElement;
  expect(checkbox).not.toBeNull();
  // Default is off; a real click toggles it on.
  expect(checkbox.checked).toBe(false);

  checkbox.click();
  await el.updateComplete;
  expect(checkbox.checked).toBe(true);

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.settingsPanelOwnProfileOnly).toBe(true);
});

test("ff-settings-panel syncs the marker-size slider and number input, clamps out-of-range values, and dispatches gaugeMarkerScale on save", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const range = el.querySelector("#gauge-marker-scale") as HTMLInputElement;
  const number = el.querySelector(
    "#gauge-marker-scale-number",
  ) as HTMLInputElement;
  expect(range).not.toBeNull();
  expect(number).not.toBeNull();
  expect(range.value).toBe("100");
  expect(number.value).toBe("100");

  // Moving the slider updates the synced number input
  userInput(range, "150");
  await el.updateComplete;
  expect(number.value).toBe("150");

  // Typing an out-of-range value into the number input clamps to the max
  userInput(number, "999");
  await el.updateComplete;
  expect(range.value).toBe("200");
  expect(number.value).toBe("200");

  // Typing below the minimum clamps to the min
  userInput(number, "10");
  await el.updateComplete;
  expect(range.value).toBe("50");
  expect(number.value).toBe("50");

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.gaugeMarkerScale).toBe(50);
});

test("ff-settings-panel syncs the border-thickness slider and number input, clamps out-of-range values, and dispatches gaugeMarkerBorderWidth on save", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const saveEvents: CustomEvent[] = [];
  el.addEventListener("ff-save", (e: Event) => {
    saveEvents.push(e as CustomEvent);
  });

  const range = el.querySelector(
    "#gauge-marker-border-width",
  ) as HTMLInputElement;
  const number = el.querySelector(
    "#gauge-marker-border-width-number",
  ) as HTMLInputElement;
  expect(range).not.toBeNull();
  expect(number).not.toBeNull();
  expect(range.value).toBe("1");
  expect(number.value).toBe("1");

  // Moving the slider updates the synced number input
  userInput(range, "2");
  await el.updateComplete;
  expect(number.value).toBe("2");

  // Typing an out-of-range value into the number input clamps to the max
  userInput(number, "999");
  await el.updateComplete;
  expect(range.value).toBe("3");
  expect(number.value).toBe("3");

  // Typing below the minimum clamps to the min
  userInput(number, "-1");
  await el.updateComplete;
  expect(range.value).toBe("0");
  expect(number.value).toBe("0");

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.gaugeMarkerBorderWidth).toBe(0);
});

test("ff-settings-panel renders a live marker-size preview that updates with the color scheme dropdown", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const previewArrow = el.querySelector(".ffscouter-preview-arrow path");
  const previewBubble = el.querySelector(
    ".ffscouter-preview-bubble",
  ) as HTMLElement;
  expect(previewArrow).not.toBeNull();
  expect(previewBubble).not.toBeNull();
  expect(previewBubble.textContent?.trim()).toBe("2.34");
  expect(previewArrow?.getAttribute("fill")).toBe("#34e817");
  const classicBubbleColor = previewBubble.style.backgroundColor;
  expect(classicBubbleColor).not.toBe("");

  // Preview also demos the source-marker badge (always "spy") so users can see
  // how it scales with Marker Scale without needing a live Torn page.
  const markerBadges = el.querySelectorAll(".ffscouter-source-marker");
  expect(markerBadges).toHaveLength(2);
  for (const badge of markerBadges) {
    expect(badge.tagName.toLowerCase()).toBe("svg");
    expect(badge.getAttribute("aria-label")).toBe("Faction spy data");
    expect(badge.querySelector("title")?.textContent).toBe("Faction spy data");
    expect(badge.querySelector("circle")).not.toBeNull();
  }

  const select = el.querySelector("#color-scheme") as HTMLSelectElement;
  select.value = "grayscale";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await el.updateComplete;

  expect(previewArrow?.getAttribute("fill")).toBe("#808080");
  expect(previewBubble.style.backgroundColor).not.toBe(classicBubbleColor);

  // Border thickness also drives the preview, scaled by the draft marker size
  expect(previewArrow?.getAttribute("stroke-width")).toBe("1");
  expect(previewBubble.style.borderWidth).toBe("1px");

  const borderRange = el.querySelector(
    "#gauge-marker-border-width",
  ) as HTMLInputElement;
  userInput(borderRange, "3");
  await el.updateComplete;

  expect(previewArrow?.getAttribute("stroke-width")).toBe("3");
  expect(previewBubble.style.borderWidth).toBe("3px");
});

test("ff-settings-panel renders a live swatch preview that updates with the color scheme dropdown", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const select = el.querySelector("#color-scheme") as HTMLSelectElement;
  expect(select).not.toBeNull();
  expect(select.querySelectorAll("option").length).toBe(8);

  const classicSwatches = el.querySelectorAll(".ffscouter-swatch");
  expect(classicSwatches.length).toBe(11);
  expect(classicSwatches[0]?.querySelector("path")?.getAttribute("fill")).toBe(
    "#1734e8",
  );

  select.value = "grayscale";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await el.updateComplete;

  const grayscaleSwatches = el.querySelectorAll(".ffscouter-swatch");
  expect(grayscaleSwatches.length).toBe(11);
  expect(
    grayscaleSwatches[0]?.querySelector("path")?.getAttribute("fill"),
  ).toBe("#f0f0f0");

  select.value = "plasma";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await el.updateComplete;

  const plasmaSwatches = el.querySelectorAll(".ffscouter-swatch");
  expect(plasmaSwatches.length).toBe(11);
  expect(plasmaSwatches[0]?.querySelector("path")?.getAttribute("fill")).toBe(
    "#0d0887",
  );
});

test("ff-settings-panel lays each section out as a grid with full-width bundles spanning all columns", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  // Disable the chain button so the nested chain sub-options grid (itself a
  // .ff-settings-panel__section) doesn't count toward the top-level section total.
  el.chainButtonEnabled = false;
  document.body.appendChild(el);
  await el.updateComplete;

  // One grid per section: API Key & Premium, Gauge Marker Settings, Feature
  // Toggles, Debug Settings -- each nested in its own visually distinct
  // .ff-settings-panel__group
  const sections = el.querySelectorAll(".ff-settings-panel__section");
  expect(sections.length).toBe(4);

  const groups = el.querySelectorAll(".ff-settings-panel__group");
  expect(groups.length).toBe(4);

  // Gauge Marker Style, Marker Size, Color Scheme, Border Thickness, and FF
  // Ranges all live together in the visually distinct Gauge Marker Settings
  // group, not in Feature Toggles
  expect(
    el
      .querySelector("#gauge-marker-type")
      ?.closest(".ff-settings-panel__group"),
  ).not.toBeNull();
  expect(
    el
      .querySelector("#gauge-marker-border-width")
      ?.closest(".ff-settings-panel__group"),
  ).not.toBeNull();

  // API key/Premium, Feature Toggles, and Debug Settings are each wrapped in
  // their own visually distinct group too
  expect(
    el.querySelector("#api-key")?.closest(".ff-settings-panel__group"),
  ).not.toBeNull();
  expect(
    el
      .querySelector("#chain-button-toggle")
      ?.closest(".ff-settings-panel__group"),
  ).not.toBeNull();
  expect(
    el.querySelector("#debug-logs")?.closest(".ff-settings-panel__group"),
  ).not.toBeNull();

  // Plain selects/checkboxes are single grid cells
  const gaugeStyleCell = el
    .querySelector("#gauge-marker-type")
    ?.closest(".ff-settings-panel__cell");
  expect(gaugeStyleCell).not.toBeNull();
  expect(gaugeStyleCell?.classList.contains("ff-settings-panel__span")).toBe(
    false,
  );

  const debugLogsCell = el
    .querySelector("#debug-logs")
    ?.closest(".ff-settings-panel__cell");
  expect(
    debugLogsCell?.classList.contains("ff-settings-panel__cell--checkbox"),
  ).toBe(true);

  // Multi-control bundles span the full grid width
  expect(
    el.querySelector("#color-scheme")?.closest(".ff-settings-panel__span"),
  ).not.toBeNull();
  expect(
    el
      .querySelector("#gauge-marker-scale")
      ?.closest(".ff-settings-panel__span"),
  ).not.toBeNull();
  expect(
    el.querySelector("#ff-range-low")?.closest(".ff-settings-panel__span"),
  ).not.toBeNull();
  expect(
    el.querySelector("#api-key")?.closest(".ff-settings-panel__span"),
  ).not.toBeNull();
});

test("ff-settings-panel renders chain sub-options as a nested grid only when enabled", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  el.chainButtonEnabled = false;
  document.body.appendChild(el);
  await el.updateComplete;

  expect(el.querySelector(".ff-settings-panel__chain-suboptions")).toBeNull();

  // Enabling the chain button reveals the nested sub-options grid
  const toggle = el.querySelector("#chain-button-toggle") as HTMLInputElement;
  toggle.click();
  await el.updateComplete;

  const suboptions = el.querySelector(".ff-settings-panel__chain-suboptions");
  expect(suboptions).not.toBeNull();
  expect(suboptions?.classList.contains("ff-settings-panel__section")).toBe(
    true,
  );
  // Sub-options live inside the chain bundle's full-width span
  expect(suboptions?.closest(".ff-chain-block")).not.toBeNull();
  // The compact min/max level inputs are cells within that nested grid
  expect(
    el.querySelector("#chain-min-level")?.closest(".ff-settings-panel__cell"),
  ).not.toBeNull();

  // Number fields pair 2-up when narrow (not full-row), while the selects and
  // checkboxes span the full nested row via .ff-settings-panel__chain-wide.
  const numberCell = el
    .querySelector("#chain-min-level")
    ?.closest(".ff-settings-panel__cell");
  expect(numberCell?.classList.contains("ff-settings-panel__chain-wide")).toBe(
    false,
  );

  for (const id of ["#chain-link-type", "#chain-tab-type", "#chain-inactive"]) {
    const wideCell = el.querySelector(id)?.closest(".ff-settings-panel__cell");
    expect(wideCell?.classList.contains("ff-settings-panel__chain-wide")).toBe(
      true,
    );
  }
});

test("ff-settings-panel retains unsaved draft changes for other properties when a single property is updated externally", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  document.body.appendChild(el);
  await el.updateComplete;

  const panel = el as any;
  // Make an unsaved draft edit
  panel.draftLowRange = 1.5;

  // Simulate an external property update from the parent (e.g. key verification success)
  el.apiKey = "new-verified-key";
  await el.updateComplete;

  // Verify that apiKey was updated, but the unsaved draft change was not reset
  expect(panel.draftApiKey).toBe("new-verified-key");
  expect(panel.draftLowRange).toBe(1.5);
});
