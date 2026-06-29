// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
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
