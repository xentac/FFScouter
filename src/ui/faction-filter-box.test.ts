// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import "./faction-filter-box";
import type { FFFactionFilterBox } from "./faction-filter-box";

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
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

  const h3 = el.querySelector("h3");
  expect(h3?.textContent).toBe("FFScouter Filter & Sort Controls");
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
    button.click(); // none -> ff-asc
    button.click(); // ff-asc -> ff-desc
  }

  expect(events[events.length - 1].sortBy).toBe("ff-desc");

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
