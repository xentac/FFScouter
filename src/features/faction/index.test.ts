// @vitest-environment jsdom

import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, expect, test, vi } from "vitest";
import { apply_ff_columns } from "./index";

vi.mock("@utils/ffscouter", () => {
  return {
    ffscouter: {
      get: vi.fn(),
      complete: vi.fn(),
    },
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  localStorage.clear();
});

test("apply_ff_columns injects FF column header and cells when configured to FAIR_FIGHT", async () => {
  ffconfig.factions_col_display = FactionsColDisplay.FAIR_FIGHT;

  vi.mocked(ffscouter.get).mockImplementation(async (id) => {
    if (id === 111) {
      return {
        player_id: 111,
        no_data: false,
        fair_fight: 2.5,
        last_updated: Date.now() / 1000,
        bs_estimate: 1000000,
        bs_estimate_human: "1M",
        bss_public: 1,
        source: "api",
        premium_insights_available: false,
      };
    }
    return {
      player_id: id as PlayerId,
      no_data: true,
    };
  });

  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <ul class="table-header">
      <li class="member">Member</li>
      <li class="lvl">Lvl</li>
    </ul>
    <ul class="table-body">
      <li class="table-row">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="lvl">50</div>
      </li>
      <li class="table-row">
        <div class="member"><a href="/profiles.php?XID=222">Player 222</a></div>
        <div class="lvl">60</div>
      </li>
    </ul>
  `;
  document.body.appendChild(container);

  await apply_ff_columns(container);

  const header = container.querySelector(".ffscouter-header");
  expect(header).not.toBeNull();
  expect(header?.textContent).toBe("FF");

  const cells = container.querySelectorAll(".ffscouter-cell");
  expect(cells.length).toBe(2);

  const cell0 = cells[0] as HTMLElement;
  const cell1 = cells[1] as HTMLElement;
  expect(cell0.textContent).toBe("2.50");
  expect(cell0.style.backgroundColor).not.toBe("");

  expect(cell1.textContent).toBe("-");
});

test("apply_ff_columns injects Est column header and cells with distribution tooltip when configured to BATTLE_STATS", async () => {
  ffconfig.factions_col_display = FactionsColDisplay.BATTLE_STATS;

  vi.mocked(ffscouter.get).mockImplementation(async (id) => {
    if (id === 111) {
      return {
        player_id: 111,
        no_data: false,
        fair_fight: 4.5,
        last_updated: Date.now() / 1000,
        bs_estimate: 2000000,
        bs_estimate_human: "2M",
        bss_public: 1,
        source: "api",
        premium_insights_available: true,
        distribution: {
          last_updated: Date.now() / 1000,
          distribution_human: "Strength: 50%, Speed: 20%",
          stats_percentage: {},
        },
      };
    }
    return {
      player_id: id as PlayerId,
      no_data: true,
    };
  });

  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <ul class="table-header">
      <li class="member">Member</li>
      <li class="lvl">Lvl</li>
    </ul>
    <ul class="table-body">
      <li class="table-row">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="lvl">50</div>
      </li>
    </ul>
  `;
  document.body.appendChild(container);

  await apply_ff_columns(container);

  const header = container.querySelector(".ffscouter-header");
  expect(header).not.toBeNull();
  expect(header?.textContent).toBe("Est");

  const cells = container.querySelectorAll(".ffscouter-cell");
  expect(cells.length).toBe(1);

  const cell0 = cells[0] as HTMLElement;
  expect(cell0.textContent).toBe("2M");
  expect(cell0.title).toContain("Top Stats: Strength: 50%, Speed: 20%");
});
