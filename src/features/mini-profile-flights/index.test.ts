// @vitest-environment jsdom

import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import miniProfileFlights from "./index";

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_premium: vi.fn().mockResolvedValue(false) },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get_flights: vi.fn(), clear_flight_cache: vi.fn() },
}));

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

afterEach(async () => {
  // Let React scheduler finish rendering inside JSDOM before environment teardown
  await new Promise((resolve) => setTimeout(resolve, 150));
});

function buildMiniRoot(travelling: boolean) {
  const root = document.createElement("div");
  root.id = "profile-mini-root";

  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123456";
  root.appendChild(anchor);

  // Initial check uses .profile-status; observer uses .profile-container.
  // Both share the same element in these tests.
  const status = document.createElement("div");
  status.className = `profile-status profile-container${travelling ? " travelling" : " hospital"}`;
  const desc = document.createElement("div");
  desc.className = "description";
  status.appendChild(desc);
  root.appendChild(status);

  return { root, desc };
}

test("shouldRun returns true", async () => {
  expect(await miniProfileFlights.shouldRun()).toBe(true);
});

test("adds flight tracker container if player is travelling", async () => {
  const { root, desc } = buildMiniRoot(true);
  document.body.appendChild(root);

  await miniProfileFlights.run();

  expect(desc.querySelector(".ff-flight-element")).not.toBeNull();
});

test("does not add flight tracker if player is not travelling", async () => {
  const { root, desc } = buildMiniRoot(false);
  document.body.appendChild(root);

  await miniProfileFlights.run();

  expect(desc.querySelector(".ff-flight-element")).toBeNull();
});

test("only fetches flights for a travelling player", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123456,
    current: null,
    recent_flights: [],
  });

  const grounded = buildMiniRoot(false);
  document.body.appendChild(grounded.root);
  await miniProfileFlights.run();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(ffscouter.get_flights).not.toHaveBeenCalled();
  expect(ffscouter.clear_flight_cache).not.toHaveBeenCalled();

  document.body.innerHTML = "";
  const flying = buildMiniRoot(true);
  document.body.appendChild(flying.root);
  await miniProfileFlights.run();
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(ffscouter.get_flights).toHaveBeenCalledWith(123456);
});
