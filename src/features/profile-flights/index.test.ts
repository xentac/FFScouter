// @vitest-environment jsdom
import { ffscouter } from "@utils/ffscouter";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import profileFlights from "./index";

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_premium: vi.fn().mockResolvedValue(true) },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get_flights: vi.fn(), clear_flight_cache: vi.fn() },
}));

vi.mock("@utils/dom", () => ({
  extract_id_from_url: () => 123456,
  torn_page: () => true,
  wait_for_element: (selector: string) =>
    Promise.resolve(document.querySelector(selector)),
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123456,
    current: null,
    recent_flights: [],
  });
});

afterEach(async () => {
  // Let React scheduler finish rendering inside JSDOM before environment teardown
  await new Promise((resolve) => setTimeout(resolve, 150));
});

function buildStatus(travelling: boolean) {
  const status = document.createElement("div");
  status.className = `profile-status${travelling ? " travelling" : " hospital"}`;
  const desc = document.createElement("div");
  desc.className = "description";
  status.appendChild(desc);
  document.body.appendChild(status);
  return { status, desc };
}

test("does not fetch flights for a player who isn't travelling", async () => {
  const { desc } = buildStatus(false);

  await profileFlights.run();
  await settle();

  expect(ffscouter.get_flights).not.toHaveBeenCalled();
  expect(desc.querySelector(".ff-flight-element")).toBeNull();
});

test("fetches flights and shows the tracker for a travelling player", async () => {
  const { desc } = buildStatus(true);

  await profileFlights.run();
  await settle();

  expect(ffscouter.get_flights).toHaveBeenCalledWith(123456);
  expect(desc.querySelector(".ff-flight-element")).not.toBeNull();
});

test("starts fetching on takeoff and stops on landing", async () => {
  const { status, desc } = buildStatus(false);

  await profileFlights.run();
  await settle();
  expect(ffscouter.get_flights).not.toHaveBeenCalled();

  status.className = "profile-status travelling";
  await settle();
  expect(ffscouter.get_flights).toHaveBeenCalledTimes(1);
  expect(desc.querySelector(".ff-flight-element")).not.toBeNull();

  status.className = "profile-status okay";
  await settle();
  expect(desc.querySelector(".ff-flight-element")).toBeNull();
  expect(document.querySelector(".ff-scouter-profile-flight-info")).toBeNull();
  expect(ffscouter.clear_flight_cache).toHaveBeenCalledWith(123456);
});
