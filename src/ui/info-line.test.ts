// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import "./info-line";
import { check_key_status } from "@utils/check_key";

vi.mock("@utils/check_key", () => {
  return {
    check_key_status: {
      isPremium: vi.fn().mockResolvedValue(false),
    },
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("renders 'No data' when data is null", async () => {
  const el = document.createElement("ff-info-line");
  document.body.appendChild(el);
  await el.updateComplete;

  expect(el.innerHTML).toContain("No data");
});

test("renders 'No data' when no_data is true", async () => {
  const el = document.createElement("ff-info-line");
  el.data = { player_id: 123, no_data: true };
  document.body.appendChild(el);
  await el.updateComplete;

  expect(el.innerHTML).toContain("No data");
});

test("renders basic stats for non-premium user when premium is not available", async () => {
  vi.mocked(check_key_status.isPremium).mockResolvedValue(false);

  const el = document.createElement("ff-info-line");
  const nowSec = Date.now() / 1000;
  el.data = {
    player_id: 123,
    no_data: false,
    fair_fight: 2.5,
    last_updated: nowSec - 100,
    bs_estimate: 5000,
    bs_estimate_human: "5k",
    bss_public: 20,
    source: "bss",
    premium_insights_available: false,
  };
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.innerHTML).toContain("FairFight:");
  expect(el.textContent).toContain("2.50");
  expect(el.textContent).toContain("Moderately difficult");
  expect(el.innerHTML).toContain("Est. Stats:");
  expect(el.textContent).toContain("5k");
  expect(el.innerHTML).not.toContain("Premium Data Available");
});

test("renders premium upgrade link for non-premium user when premium insights are available", async () => {
  vi.mocked(check_key_status.isPremium).mockResolvedValue(false);

  const el = document.createElement("ff-info-line");
  const nowSec = Date.now() / 1000;
  el.data = {
    player_id: 123,
    no_data: false,
    fair_fight: 3.2,
    last_updated: nowSec - 100,
    bs_estimate: 10000,
    bs_estimate_human: "10k",
    bss_public: 30,
    source: "bss",
    premium_insights_available: true,
  };
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.innerHTML).toContain("FairFight:");
  expect(el.innerHTML).toContain("Premium Data Available - Upgrade To View");
});

test("renders top stats and distribution for premium user", async () => {
  vi.mocked(check_key_status.isPremium).mockResolvedValue(true);

  const el = document.createElement("ff-info-line");
  const nowSec = Date.now() / 1000;
  el.data = {
    player_id: 123,
    no_data: false,
    fair_fight: 4.5,
    last_updated: nowSec - 100,
    bs_estimate: 25000,
    bs_estimate_human: "25k",
    bss_public: 50,
    source: "bss",
    premium_insights_available: true,
    distribution: {
      last_updated: nowSec - 50,
      distribution_human: "STR: 40%, SPD: 30%",
      stats_percentage: {
        strength: 40,
        speed: 30,
      },
    },
  };
  document.body.appendChild(el);

  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;

  expect(el.innerHTML).toContain("FairFight:");
  expect(el.innerHTML).toContain("Top Stats:");
  expect(el.innerHTML).toContain("STR: 40%, SPD: 30%");
  expect(el.innerHTML).not.toContain("Premium Data Available");
});
