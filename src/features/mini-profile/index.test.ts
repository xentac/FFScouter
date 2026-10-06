// @vitest-environment jsdom
import { ffconfig, MiniProfileDisplay } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { FFData, FFDataComplete } from "@utils/types";
import { beforeEach, expect, test, vi } from "vitest";
import featureModule from "./index";

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get: vi.fn(), complete: vi.fn() },
}));

vi.mock("@utils/dom", async () => {
  const actual =
    await vi.importActual<typeof import("@utils/dom")>("@utils/dom");
  return { ...actual, apply_ff_gauge: vi.fn() };
});

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

function setup_mini_root() {
  document.body.innerHTML = `
    <div id="profile-mini-root">
      <a href="https://www.torn.com/profiles.php?XID=123">
        <div class="honor-text-wrap"></div>
      </a>
      <div class="last-action"></div>
    </div>
  `;
  return document.querySelector("#profile-mini-root") as HTMLElement;
}

test("adds an FF line with a source-marker badge for spy data", async () => {
  const miniroot = setup_mini_root();
  vi.mocked(ffscouter.get).mockResolvedValue({
    no_data: false,
    player_id: 123,
    fair_fight: 3.0,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "spies",
    premium_insights_available: false,
    available_estimates: {
      bss: null,
      premium: null,
      spies: {
        bs_estimate: 1000,
        bs_estimate_human: "1k",
        last_updated: Date.now() / 1000,
        source: "tornstats",
        fair_fight: 3.0,
      },
    },
    spies: [],
  });

  await featureModule.run();
  // Observer only reacts to mutations after it starts observing.
  miniroot.appendChild(document.createElement("span"));
  await new Promise((resolve) => setTimeout(resolve, 10));

  const desc = document.querySelector(".ffscouter-mini-desc");
  expect(desc?.textContent).toContain("FF 3.00");
  const badge = desc?.querySelector(".ffscouter-inline-source-marker");
  expect(badge).not.toBeNull();
  expect(badge?.getAttribute("aria-label")).toEqual("Faction spy data");
  expect(badge?.querySelector("title")?.textContent).toEqual(
    "Faction spy data",
  );
});

test("adds an FF line with no badge for bss data", async () => {
  const miniroot = setup_mini_root();
  vi.mocked(ffscouter.get).mockResolvedValue({
    no_data: false,
    player_id: 123,
    fair_fight: 3.0,
    last_updated: Date.now() / 1000,
    bs_estimate: 1000,
    bs_estimate_human: "1k",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
    available_estimates: {
      bss: {
        bss_public: 10,
        bs_estimate: 1000,
        bs_estimate_human: "1k",
        last_updated: Date.now() / 1000,
        fair_fight: 3.0,
      },
      premium: null,
      spies: null,
    },
    spies: [],
  });

  await featureModule.run();
  miniroot.appendChild(document.createElement("span"));
  await new Promise((resolve) => setTimeout(resolve, 10));

  const desc = document.querySelector(".ffscouter-mini-desc");
  expect(desc?.textContent).toContain("FF 3.00");
  expect(desc?.querySelector(".ffscouter-inline-source-marker")).toBeNull();
});

function bss_data(last_updated: number): FFDataComplete {
  return {
    no_data: false,
    player_id: 123,
    fair_fight: 3.0,
    last_updated,
    bs_estimate: 1230000000,
    bs_estimate_human: "1.23b",
    bss_public: 10,
    source: "bss",
    premium_insights_available: false,
    available_estimates: {
      bss: {
        bss_public: 10,
        bs_estimate: 1230000000,
        bs_estimate_human: "1.23b",
        last_updated,
        fair_fight: 3.0,
      },
      premium: null,
      spies: null,
    },
    spies: [],
  };
}

async function render_mini_desc(data: FFData) {
  const miniroot = setup_mini_root();
  vi.mocked(ffscouter.get).mockResolvedValue(data);

  await featureModule.run();
  miniroot.appendChild(document.createElement("span"));
  await new Promise((resolve) => setTimeout(resolve, 10));

  return document.querySelector(".ffscouter-mini-desc");
}

test("shows the FF value by default", async () => {
  const desc = await render_mini_desc(bss_data(Date.now() / 1000));
  expect(desc?.textContent).toContain("FF 3.00");
  expect(desc?.textContent).not.toContain("Est");
});

test("shows the BS estimate instead of FF when set to battle_stats", async () => {
  ffconfig.mini_profile_display = MiniProfileDisplay.BATTLE_STATS;
  const desc = await render_mini_desc(bss_data(Date.now() / 1000));
  expect(desc?.textContent).toContain("Est 1.23b");
  expect(desc?.textContent).not.toContain("1.23b?");
  expect(desc?.textContent).not.toContain("FF");
});

test("marks a stale BS estimate with ? when set to battle_stats", async () => {
  ffconfig.mini_profile_display = MiniProfileDisplay.BATTLE_STATS;
  const desc = await render_mini_desc(
    bss_data(Date.now() / 1000 - 15 * 24 * 60 * 60),
  );
  expect(desc?.textContent).toContain("Est 1.23b?");
});

test("keeps the source marker and age text when set to battle_stats", async () => {
  ffconfig.mini_profile_display = MiniProfileDisplay.BATTLE_STATS;
  const last_updated = Date.now() / 1000 - 15 * 24 * 60 * 60;
  const desc = await render_mini_desc({
    ...bss_data(last_updated),
    source: "spies",
    available_estimates: {
      bss: null,
      premium: null,
      spies: {
        bs_estimate: 1230000000,
        bs_estimate_human: "1.23b",
        last_updated,
        source: "tornstats",
        fair_fight: 3.0,
      },
    },
  });
  expect(desc?.textContent).toContain("Est 1.23b?");
  expect(desc?.textContent).toContain("(15 days old)");
  const badge = desc?.querySelector(".ffscouter-inline-source-marker");
  expect(badge?.getAttribute("aria-label")).toEqual("Faction spy data");
});
