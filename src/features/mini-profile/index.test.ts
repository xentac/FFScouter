// @vitest-environment jsdom
import { ffscouter } from "@utils/ffscouter";
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
