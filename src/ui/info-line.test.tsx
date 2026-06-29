// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import { beforeEach, expect, test, vi } from "vitest";
import { FFHeaderLine } from "./info-line";

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_premium: vi.fn().mockResolvedValue(false) },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get: vi.fn() },
}));

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const nowSec = () => Date.now() / 1000;

test("renders 'Loading...' before data arrives", () => {
  vi.mocked(ffscouter.get).mockReturnValue(new Promise(() => {}));
  const { container } = render(<FFHeaderLine playerId={123} />);
  expect(container.textContent).toContain("Loading...");
  expect(container.textContent).not.toContain("No data");
});

test("renders 'No data' when ffscouter returns no_data", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({ player_id: 123, no_data: true });
  const { container } = render(<FFHeaderLine playerId={123} />);
  await waitFor(() => expect(ffscouter.get).toHaveBeenCalledWith(123));
  expect(container.textContent).toContain("No data");
});

test("renders basic stats for non-premium user when premium is not available", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 2.5,
    last_updated: nowSec() - 100,
    bs_estimate: 5000,
    bs_estimate_human: "5k",
    bss_public: 20,
    source: "bss",
    premium_insights_available: false,
  });

  const { container } = render(<FFHeaderLine playerId={123} />);

  await waitFor(() => expect(container.textContent).toContain("2.50"));

  expect(container.innerHTML).toContain("FairFight:");
  expect(container.textContent).toContain("Moderately difficult");
  expect(container.innerHTML).toContain("Est. Stats:");
  expect(container.textContent).toContain("5k");
  expect(container.innerHTML).not.toContain("Premium Data Available");
});

test("renders premium upgrade link for non-premium user when premium insights are available", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 3.2,
    last_updated: nowSec() - 100,
    bs_estimate: 10000,
    bs_estimate_human: "10k",
    bss_public: 30,
    source: "bss",
    premium_insights_available: true,
  });

  const { container } = render(<FFHeaderLine playerId={123} />);

  await waitFor(() =>
    expect(container.innerHTML).toContain("Premium Data Available"),
  );
  expect(container.innerHTML).toContain("FairFight:");
  expect(container.innerHTML).toContain(
    "Premium Data Available - Upgrade To View",
  );
});

test("renders top stats and distribution for premium user", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 4.5,
    last_updated: nowSec() - 100,
    bs_estimate: 25000,
    bs_estimate_human: "25k",
    bss_public: 50,
    source: "bss",
    premium_insights_available: true,
    distribution: {
      last_updated: nowSec() - 50,
      distribution_human: "STR: 40%, SPD: 30%",
      stats_percentage: { strength: 40, speed: 30 },
    },
  });

  const { container } = render(<FFHeaderLine playerId={123} />);

  await waitFor(() => expect(container.innerHTML).toContain("Top Stats:"));
  expect(container.innerHTML).toContain("FairFight:");
  expect(container.innerHTML).toContain("STR: 40%, SPD: 30%");
  expect(container.innerHTML).not.toContain("Premium Data Available");
});
