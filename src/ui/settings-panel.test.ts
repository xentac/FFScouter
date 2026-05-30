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
