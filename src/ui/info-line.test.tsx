// @vitest-environment jsdom
import { fireEvent, render, waitFor } from "@testing-library/react";
import { check_key_status } from "@utils/check_key";
import { ffscouter } from "@utils/ffscouter";
import type { EstimateSource, FFDataComplete } from "@utils/types";
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
  await waitFor(() => expect(container.textContent).toContain("No data"));
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
    available_estimates: {
      bss: {
        bss_public: 20,
        bs_estimate: 5000,
        bs_estimate_human: "5k",
        last_updated: nowSec() - 100,
        fair_fight: 2.5,
      },
      premium: null,
      spies: null,
    },
    spies: [],
  });

  const { container } = render(<FFHeaderLine playerId={123} />);

  await waitFor(() => expect(container.textContent).toContain("2.50"));

  expect(container.innerHTML).toContain("FairFight:");
  expect(container.textContent).toContain("Moderately difficult");
  expect(container.innerHTML).toContain("Est. Stats:");
  expect(container.textContent).toContain("5k");
  expect(container.innerHTML).not.toContain("Premium Data Available");
  // "bss" is the ordinary source — no source-marker icon.
  expect(container.querySelector(".ffscouter-inline-source-marker")).toBeNull();
});

test("renders a source-marker icon next to the FF badge for spy data", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 123,
    no_data: false,
    fair_fight: 4.1,
    last_updated: nowSec() - 100,
    bs_estimate: 8000,
    bs_estimate_human: "8k",
    bss_public: 20,
    source: "spies",
    premium_insights_available: false,
    available_estimates: {
      bss: null,
      premium: null,
      spies: {
        bs_estimate: 8000,
        bs_estimate_human: "8k",
        last_updated: nowSec() - 100,
        source: "tornstats",
        fair_fight: 4.1,
      },
    },
    spies: [],
  });

  const { container } = render(<FFHeaderLine playerId={123} />);

  await waitFor(() => expect(container.textContent).toContain("4.10"));
  const badge = container.querySelector(".ffscouter-inline-source-marker");
  expect(badge).not.toBeNull();
  expect(badge?.getAttribute("aria-label")).toEqual("Faction spy data");
  expect(badge?.querySelector("title")?.textContent).toEqual(
    "Faction spy data",
  );
  expect(badge?.querySelector("circle")).not.toBeNull();
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
    available_estimates: {
      bss: {
        bss_public: 30,
        bs_estimate: 10000,
        bs_estimate_human: "10k",
        last_updated: nowSec() - 100,
        fair_fight: 3.2,
      },
      premium: null,
      spies: null,
    },
    spies: [],
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

const DAY = 24 * 60 * 60;

// Estimate whose bss candidate (and top-level mirror) is `ageDays` old.
function estimate_data(
  source: EstimateSource,
  ageDays: number,
): FFDataComplete {
  const last_updated = nowSec() - ageDays * DAY;
  const candidate = {
    bss_public: 20,
    bs_estimate: 5000,
    bs_estimate_human: "5k",
    last_updated,
    fair_fight: 2.5,
  };
  return {
    player_id: 123,
    no_data: false,
    fair_fight: 2.5,
    last_updated,
    bs_estimate: 5000,
    bs_estimate_human: "5k",
    bss_public: 20,
    source,
    premium_insights_available: false,
    available_estimates: {
      bss: source === "bss" ? candidate : null,
      premium: source === "premium" ? candidate : null,
      spies: source === "spies" ? { ...candidate, source: "tornstats" } : null,
    },
    spies: [],
  };
}

function glyph_button(container: HTMLElement) {
  return container.querySelector<HTMLButtonElement>(
    'button[aria-label="Explain this estimate"]',
  );
}

function freshness_button(container: HTMLElement) {
  const buttons = [...container.querySelectorAll("button")];
  return buttons.find((b) => b.textContent?.includes("days old")) ?? null;
}

test("no explainer trigger renders when showExplainer is not set", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("bss", 12));
  const { container } = render(<FFHeaderLine playerId={123} />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));
  expect(container.querySelector("button")).toBeNull();
});

test("no explainer trigger renders while loading", () => {
  vi.mocked(ffscouter.get).mockReturnValue(new Promise(() => {}));
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  expect(container.textContent).toContain("Loading...");
  expect(container.querySelector("button")).toBeNull();
});

test("freshness text toggles the explainer card open and closed", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("bss", 12));
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));

  const fresh = freshness_button(container);
  expect(fresh).not.toBeNull();
  expect(fresh?.getAttribute("aria-expanded")).toEqual("false");
  expect(container.textContent).not.toContain("This player's estimate");

  fireEvent.click(fresh as HTMLButtonElement);
  expect(fresh?.getAttribute("aria-expanded")).toEqual("true");
  expect(container.textContent).toContain(
    "This player's estimate comes from Fair Fight data and is 12 days old.",
  );

  fireEvent.click(fresh as HTMLButtonElement);
  expect(container.textContent).not.toContain("This player's estimate");
});

test("info glyph toggles the card and the × closes it", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("bss", 12));
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));

  const glyph = glyph_button(container);
  expect(glyph).not.toBeNull();
  // Hand-drawn SVG glyph, not an emoji/text glyph.
  expect(glyph?.querySelector("svg")).not.toBeNull();

  fireEvent.click(glyph as HTMLButtonElement);
  expect(glyph?.getAttribute("aria-expanded")).toEqual("true");
  expect(container.textContent).toContain("Read how it works");
  expect(container.textContent).toContain("More in the FAQ");

  const links = [...container.querySelectorAll<HTMLAnchorElement>("a")];
  const guide = links.find((a) => a.textContent === "Read how it works");
  const faq = links.find((a) => a.textContent === "More in the FAQ");
  expect(guide?.href).toEqual(
    "https://ffscouter.com/guides/fair-fight-explained",
  );
  expect(faq?.href).toEqual(
    "https://ffscouter.com/faq#profile-stats-old-inaccurate",
  );
  for (const link of [guide, faq]) {
    expect(link?.target).toEqual("_blank");
    expect(link?.rel).toEqual("noopener noreferrer");
  }

  const close = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Close"]',
  );
  expect(close).not.toBeNull();
  fireEvent.click(close as HTMLButtonElement);
  expect(container.textContent).not.toContain("This player's estimate");
});

test("dynamic line names the premium and spy sources", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("premium", 45));
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));
  fireEvent.click(glyph_button(container) as HTMLButtonElement);
  expect(container.textContent).toContain(
    "This player's estimate comes from Premium data and is 1 month old.",
  );

  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("spies", 2));
  const { container: spyContainer } = render(
    <FFHeaderLine playerId={124} showExplainer />,
  );
  await waitFor(() => expect(spyContainer.textContent).toContain("2.50"));
  fireEvent.click(glyph_button(spyContainer) as HTMLButtonElement);
  expect(spyContainer.textContent).toContain(
    "This player's estimate comes from Faction spy data and is 2 days old.",
  );
});

test("under-a-day estimate: glyph is the sole trigger and the line says 'less than a day old'", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(estimate_data("bss", 0.2));
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));

  expect(freshness_button(container)).toBeNull();
  const glyph = glyph_button(container);
  expect(glyph).not.toBeNull();
  fireEvent.click(glyph as HTMLButtonElement);
  expect(container.textContent).toContain(
    "This player's estimate comes from Fair Fight data and is less than a day old.",
  );
});

test("unknown source drops the source clause", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue(
    estimate_data("mystery" as EstimateSource, 12),
  );
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("2.50"));
  fireEvent.click(glyph_button(container) as HTMLButtonElement);
  expect(container.textContent).toContain(
    "This player's estimate is 12 days old.",
  );
  expect(container.textContent).not.toContain("comes from");
});

test("no_data renders the glyph as sole trigger with the no-estimate card variant", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({ player_id: 123, no_data: true });
  const { container } = render(<FFHeaderLine playerId={123} showExplainer />);
  await waitFor(() => expect(container.textContent).toContain("No data"));

  const glyph = glyph_button(container);
  expect(glyph).not.toBeNull();
  fireEvent.click(glyph as HTMLButtonElement);
  expect(container.textContent).toContain(
    "FFScouter has no estimate for this player yet.",
  );
  expect(container.textContent).toContain(
    "Brand-new players and rarely-attacked players often have no estimate at all",
  );
  expect(container.textContent).toContain("Read how it works");
  expect(container.textContent).toContain("More in the FAQ");
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
    available_estimates: {
      bss: {
        bss_public: 50,
        bs_estimate: 25000,
        bs_estimate_human: "25k",
        last_updated: nowSec() - 100,
        fair_fight: 4.5,
      },
      premium: null,
      spies: null,
    },
    spies: [],
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
