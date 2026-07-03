// @vitest-environment jsdom

import { extract_id_from_url, torn_page, wait_for_element } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, expect, test, vi } from "vitest";
import profileHistory from "./index";

vi.mock("@utils/dom", () => {
  return {
    torn_page: vi.fn(),
    extract_id_from_url: vi.fn(),
    wait_for_element: vi.fn(),
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  localStorage.clear();
});

test("shouldRun returns true when on profiles page", async () => {
  vi.mocked(torn_page).mockReturnValue(true);
  const result = await profileHistory.shouldRun();
  expect(torn_page).toHaveBeenCalledWith("profiles");
  expect(result).toBe(true);
});

test("run exits early if player_id is not extracted", async () => {
  vi.mocked(extract_id_from_url).mockReturnValue(null);

  await profileHistory.run();

  expect(wait_for_element).not.toHaveBeenCalled();
});

test("run exits early if ff_history_enabled is false", async () => {
  vi.mocked(extract_id_from_url).mockReturnValue(123 as any);
  ffconfig.ff_history_enabled = false;

  await profileHistory.run();

  expect(wait_for_element).not.toHaveBeenCalled();
});

test("run exits early if button is already present", async () => {
  vi.mocked(extract_id_from_url).mockReturnValue(123 as any);
  ffconfig.ff_history_enabled = true;

  // Add button to DOM
  const existingBtn = document.createElement("div");
  existingBtn.className = "ff-scouter-history-btn";
  document.body.appendChild(existingBtn);

  await profileHistory.run();

  expect(wait_for_element).not.toHaveBeenCalled();
});

test("run injects history button when enabled and not already present", async () => {
  vi.mocked(extract_id_from_url).mockReturnValue(123 as any);
  ffconfig.ff_history_enabled = true;

  const buttonsList = document.createElement("div");
  buttonsList.className = "buttons-list";
  document.body.appendChild(buttonsList);

  vi.mocked(wait_for_element).mockResolvedValue(buttonsList);

  await profileHistory.run();

  expect(wait_for_element).toHaveBeenCalledWith(
    ".profile-buttons.profile-action .buttons-list",
    10000,
  );

  const injectedBtn = buttonsList.querySelector(
    ".ff-scouter-history-btn",
  ) as HTMLAnchorElement;
  expect(injectedBtn).not.toBeNull();
  expect(injectedBtn.getAttribute("href")).toBe(
    "https://ffscouter.com/player-view?player_id=123",
  );
  expect(injectedBtn.className).toContain("profile-button");
  expect(injectedBtn.className).toContain("ff-scouter-history-btn");
  expect(injectedBtn.getAttribute("target")).toBe("_blank");
  expect(injectedBtn.getAttribute("rel")).toBe("noopener noreferrer");
});
