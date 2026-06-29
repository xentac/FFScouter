// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { FFApiError } from "@utils/api";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { FFFlightProfileStatus } from "./flight-status";

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_premium: vi.fn().mockResolvedValue(false) },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get_flights: vi.fn() },
}));

const originalNow = Date.now;
const mockNowTime = new Date("2026-05-20T00:00:00Z").getTime();

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
  Date.now = () => mockNowTime;
});

afterEach(() => {
  Date.now = originalNow;
});

const nowUnix = () => mockNowTime / 1000;

test("renders premium upgrade link for non-premium user", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.innerHTML).toContain(
      "Upgrade to FFScouter Flight Tracking",
    ),
  );
  expect(ffscouter.get_flights).not.toHaveBeenCalled();
});

test("renders landing unavailable when no current flight data", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: null,
    recent_flights: [],
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain(
      "Landing: unavailable for current route",
    ),
  );
});

test("renders imminent landing countdown when within range", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix() - 1800,
      status_description: "flying",
      earliest_arrival_time: nowUnix() - 300,
      latest_arrival_time: nowUnix() + 600,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain("Landing: imminent"),
  );
  expect(container.textContent).toContain("10m 0s");
});

test("renders landed when latest arrival time is in the past", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix() - 3600,
      status_description: "flying",
      earliest_arrival_time: nowUnix() - 1200,
      latest_arrival_time: nowUnix() - 120,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain("Landing: just landed"),
  );
});

test("renders estimate wrong when latest arrival time is more than 5 minutes in the past", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix() - 3600,
      status_description: "flying",
      earliest_arrival_time: nowUnix() - 1200,
      latest_arrival_time: nowUnix() - 360,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain(
      "Landing: Late, probably flight delayed.",
    ),
  );
});

test("renders landing window range when earliest arrival is in the future", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix() - 600,
      status_description: "flying",
      earliest_arrival_time: nowUnix() + 1200,
      latest_arrival_time: nowUnix() + 2400,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() => expect(container.textContent).toContain("Landing:"));
  expect(container.textContent).toContain("20m 0s");
  expect(container.textContent).toContain("40m 0s");
});

test("renders compact landing window range when compact prop is true", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: {
      takeoff_time: nowUnix() - 600,
      status_description: "flying",
      earliest_arrival_time: nowUnix() + 1200,
      latest_arrival_time: nowUnix() + 2400,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const { container } = render(
    <FFFlightProfileStatus playerId={123} compact />,
  );

  await waitFor(() => expect(container.textContent).toContain("20m0s"));
  expect(container.textContent).not.toContain("Landing:");
  expect(container.textContent).toContain("40m0s");
});

test("renders specific error messages when API fails", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockRejectedValue(
    new FFApiError("API Key Invalid", {
      ff_api_error: { code: 2, error: "Incorrect key" },
    }),
  );

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain("Error: Invalid API key"),
  );
});

test("renders rechecking message when flight is in rechecking state", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 123,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: mockNowTime + 10000,
    recheck_until: mockNowTime + 180000,
  });

  const { container } = render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() =>
    expect(container.textContent).toContain(
      "No data. Rechecking in 10 seconds.",
    ),
  );
});

test("ticker triggers a new fetch when next_retry_at is reached", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValueOnce({
    player_id: 123,
    current: null,
    recent_flights: [],
    rechecking: true,
    next_retry_at: mockNowTime - 5000, // already in the past
    recheck_until: mockNowTime + 180000,
  });

  render(<FFFlightProfileStatus playerId={123} />);

  await waitFor(() => expect(ffscouter.get_flights).toHaveBeenCalledTimes(1));

  // Wait for the 1s tick to detect next_retry_at is past and trigger another fetch.
  await waitFor(() => expect(ffscouter.get_flights).toHaveBeenCalledTimes(2), {
    timeout: 2000,
  });
});
