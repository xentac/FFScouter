// @vitest-environment jsdom

import { beforeEach, expect, test } from "vitest";
import "./settings-panel";
import type { FFSettingsPanel } from "./settings-panel";

beforeEach(() => {
  document.body.innerHTML = "";
});

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

  // Change input value and dispatch change event
  apiKeyInput.value = "test-api-key-123";
  apiKeyInput.dispatchEvent(new Event("change"));

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
  select.dispatchEvent(new Event("change"));

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

  // Toggle checkbox
  checkbox.checked = false;
  checkbox.dispatchEvent(new Event("change"));

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.networkInterceptionEnabled).toBe(false);
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

  // Toggle checkbox
  checkbox.checked = false;
  checkbox.dispatchEvent(new Event("change"));

  const saveBtn = Array.from(el.querySelectorAll("button")).find(
    (btn) => btn.textContent?.trim() === "Save Settings",
  ) as HTMLButtonElement;
  expect(saveBtn).not.toBeNull();
  saveBtn.click();

  expect(saveEvents.length).toBe(1);
  expect(saveEvents[0]?.detail?.statusAttackLinksEnabled).toBe(false);
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
  range.value = "150";
  range.dispatchEvent(new Event("input"));
  await el.updateComplete;
  expect(number.value).toBe("150");

  // Typing an out-of-range value into the number input clamps to the max
  number.value = "999";
  number.dispatchEvent(new Event("input"));
  await el.updateComplete;
  expect(range.value).toBe("200");
  expect(number.value).toBe("200");

  // Typing below the minimum clamps to the min
  number.value = "10";
  number.dispatchEvent(new Event("input"));
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

  const select = el.querySelector("#color-scheme") as HTMLSelectElement;
  select.value = "grayscale";
  select.dispatchEvent(new Event("change"));
  await el.updateComplete;

  expect(previewArrow?.getAttribute("fill")).toBe("#808080");
  expect(previewBubble.style.backgroundColor).not.toBe(classicBubbleColor);
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
  select.dispatchEvent(new Event("change"));
  await el.updateComplete;

  const grayscaleSwatches = el.querySelectorAll(".ffscouter-swatch");
  expect(grayscaleSwatches.length).toBe(11);
  expect(
    grayscaleSwatches[0]?.querySelector("path")?.getAttribute("fill"),
  ).toBe("#f0f0f0");

  select.value = "plasma";
  select.dispatchEvent(new Event("change"));
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
  // .ff-settings-section) doesn't count toward the top-level section total.
  el.chainButtonEnabled = false;
  document.body.appendChild(el);
  await el.updateComplete;

  // One grid per <h3> section: top (api/ranges), Feature Toggles, Debug Settings
  const sections = el.querySelectorAll(".ff-settings-section");
  expect(sections.length).toBe(3);

  // Plain selects/checkboxes are single grid cells
  const gaugeStyleCell = el
    .querySelector("#gauge-marker-type")
    ?.closest(".ff-settings-cell");
  expect(gaugeStyleCell).not.toBeNull();
  expect(gaugeStyleCell?.classList.contains("ff-settings-span")).toBe(false);

  const debugLogsCell = el
    .querySelector("#debug-logs")
    ?.closest(".ff-settings-cell");
  expect(debugLogsCell?.classList.contains("checkbox-cell")).toBe(true);

  // Multi-control bundles span the full grid width
  expect(
    el.querySelector("#color-scheme")?.closest(".ff-settings-span"),
  ).not.toBeNull();
  expect(
    el.querySelector("#gauge-marker-scale")?.closest(".ff-settings-span"),
  ).not.toBeNull();
  expect(
    el.querySelector("#ff-range-low")?.closest(".ff-settings-span"),
  ).not.toBeNull();
  expect(
    el.querySelector("#api-key")?.closest(".ff-settings-span"),
  ).not.toBeNull();
});

test("ff-settings-panel renders chain sub-options as a nested grid only when enabled", async () => {
  const el = document.createElement("ff-settings-panel") as FFSettingsPanel;
  el.chainButtonEnabled = false;
  document.body.appendChild(el);
  await el.updateComplete;

  expect(el.querySelector(".ff-chain-suboptions")).toBeNull();

  // Enabling the chain button reveals the nested sub-options grid
  const toggle = el.querySelector("#chain-button-toggle") as HTMLInputElement;
  toggle.checked = true;
  toggle.dispatchEvent(new Event("change"));
  await el.updateComplete;

  const suboptions = el.querySelector(".ff-chain-suboptions");
  expect(suboptions).not.toBeNull();
  expect(suboptions?.classList.contains("ff-settings-section")).toBe(true);
  // Sub-options live inside the chain bundle's full-width span
  expect(suboptions?.closest(".ff-chain-block")).not.toBeNull();
  // The compact min/max level inputs are cells within that nested grid
  expect(
    el.querySelector("#chain-min-level")?.closest(".ff-settings-cell"),
  ).not.toBeNull();

  // Number fields pair 2-up when narrow (not full-row), while the selects and
  // checkboxes span the full nested row via .ff-chain-wide.
  const numberCell = el
    .querySelector("#chain-min-level")
    ?.closest(".ff-settings-cell");
  expect(numberCell?.classList.contains("ff-chain-wide")).toBe(false);

  for (const id of ["#chain-link-type", "#chain-tab-type", "#chain-inactive"]) {
    const wideCell = el.querySelector(id)?.closest(".ff-settings-cell");
    expect(wideCell?.classList.contains("ff-chain-wide")).toBe(true);
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
