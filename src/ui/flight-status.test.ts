// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import "./flight-status";
import { FFApiError } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";

vi.mock("@utils/check_key", () => {
  return {
    check_key_status: {
      is_premium: vi.fn().mockResolvedValue(false),
    },
  };
});

vi.mock("@utils/ffscouter", () => {
  return {
    ffscouter: {
      get_flights: vi.fn(),
    },
  };
});

const originalNow = Date.now;
const mockNowTime = new Date("2026-05-20T00:00:00Z").getTime();

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  // Mock Date.now to return a controllable time
  Date.now = () => mockNowTime;
});

afterEach(() => {
  Date.now = originalNow;
});

test("renders premium upgrade link for non-premium user", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.innerHTML).toContain("Upgrade to FFScouter Flight Tracking");
  expect(ffscouter.get_flights).not.toHaveBeenCalled();
});

test("renders landing unavailable when no current flight data", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: null,
    recent_flights: [],
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("Landing: unavailable for current route");
});

test("renders imminent landing countdown when within range", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const nowUnix = mockNowTime / 1000;
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix - 1800,
      status_description: "flying",
      earliest_arrival_time: nowUnix - 300, // 5 min ago
      latest_arrival_time: nowUnix + 600, // 10 min from now
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("Landing: imminent");
  expect(el.textContent).toContain("10m 0s");
});

test("renders landed when latest arrival time is in the past", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const nowUnix = mockNowTime / 1000;
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix - 3600,
      status_description: "flying",
      earliest_arrival_time: nowUnix - 1200,
      latest_arrival_time: nowUnix - 300, // 5 min ago
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("Landing: just landed");
});

test("renders landing window range when earliest arrival is in the future", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const nowUnix = mockNowTime / 1000;
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix - 600,
      status_description: "flying",
      earliest_arrival_time: nowUnix + 1200, // 20 min from now
      latest_arrival_time: nowUnix + 2400, // 40 min from now
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("Landing:");
  expect(el.textContent).toContain("20m 0s");
  expect(el.textContent).toContain("40m 0s");
});

test("renders specific error messages when API fails", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const apiError = new FFApiError("API Key Invalid", {
    ff_api_error: { code: 2, error: "Incorrect key" },
  });
  vi.mocked(ffscouter.get_flights).mockRejectedValue(apiError);

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("Error: Invalid API key");
});

test("renders rechecking message when flight is in rechecking state", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const nowMs = mockNowTime;
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: nowMs + 10000, // 10 seconds from now
    recheck_until: nowMs + 180000,
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.textContent).toContain("No data. Rechecking in 10 seconds.");
});

test("ticker triggers a new fetch when next_retry_at is reached", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);

  const nowMs = mockNowTime;
  // First call returns a rechecking state where next_retry_at is in the past
  vi.mocked(ffscouter.get_flights).mockResolvedValueOnce({
    player_id: 123,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: nowMs - 5000, // already in the past
    recheck_until: nowMs + 180000,
  });

  const el = document.createElement("ff-flight-profile-status");
  el.playerId = 123;
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(ffscouter.get_flights).toHaveBeenCalledTimes(1);

  // Wait 1.1 seconds for the tick interval to run
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // The tick interval should detect next_retry_at is in the past and trigger fetch_data
  expect(ffscouter.get_flights).toHaveBeenCalledTimes(2);
});
