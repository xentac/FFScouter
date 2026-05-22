// @vitest-environment jsdom

import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, expect, test, vi } from "vitest";
import { apply_ff_columns, apply_filters_and_sort } from "./index";

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

test("apply_filters_and_sort filters and sorts member rows correctly", () => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="members-list">
      <div class="table-body">
        <div class="table-row" id="row-1" data-ff-value="2.5" data-est-value="1000000">
          <div class="member">
            <span class="icons"><img alt="Online" /></span>
            <a href="/profiles.php?XID=111">Player 111</a>
          </div>
          <div class="lvl">50</div>
          <div class="status okay">Okay</div>
        </div>
        <div class="table-row" id="row-2" data-ff-value="4.5" data-est-value="5000000">
          <div class="member">
            <span class="icons"><img alt="Offline" /></span>
            <a href="/profiles.php?XID=222">Player 222</a>
          </div>
          <div class="lvl">60</div>
          <div class="status hospital">Hospital</div>
        </div>
        <div class="table-row" id="row-3" data-ff-value="1.5" data-est-value="500000">
          <div class="member">
            <span class="icons"><img alt="Idle" /></span>
            <a href="/profiles.php?XID=333">Player 333</a>
          </div>
          <div class="lvl">40</div>
          <div class="status jail">Jail</div>
        </div>
      </div>
    </div>
  `;

  const tbody = container.querySelector(".table-body") as HTMLElement;

  // Test 1: Filter activity - show only Online and Idle
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      activity: { online: true, idle: true, offline: false },
      status: {
        okay: true,
        hospital: true,
        jail: true,
        abroad: true,
        traveling: true,
      },
      levelMin: null,
      levelMax: null,
      ffMin: null,
      ffMax: null,
    },
  );

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe(
    "none",
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe("");

  // Test 2: Filter status - show only Hospital
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      activity: { online: true, idle: true, offline: true },
      status: {
        okay: false,
        hospital: true,
        jail: false,
        abroad: false,
        traveling: false,
      },
      levelMin: null,
      levelMax: null,
      ffMin: null,
      ffMax: null,
    },
  );

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe(
    "none",
  );
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe(
    "none",
  );

  // Test 3: Filter level range - level >= 45 and <= 55 (only Player 111 - level 50)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      activity: { online: true, idle: true, offline: true },
      status: {
        okay: true,
        hospital: true,
        jail: true,
        abroad: true,
        traveling: true,
      },
      levelMin: 45,
      levelMax: 55,
      ffMin: null,
      ffMax: null,
    },
  );

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe(
    "none",
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe(
    "none",
  );

  // Test 4: Filter FF range - ff >= 2.0 and <= 3.0 (only Player 111 - 2.5)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      activity: { online: true, idle: true, offline: true },
      status: {
        okay: true,
        hospital: true,
        jail: true,
        abroad: true,
        traveling: true,
      },
      levelMin: null,
      levelMax: null,
      ffMin: 2.0,
      ffMax: 3.0,
    },
  );

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe(
    "none",
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe(
    "none",
  );

  // Test 5: Sort by FF Descending (Row 2, then Row 1, then Row 3)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "ff-desc",
      activity: { online: true, idle: true, offline: true },
      status: {
        okay: true,
        hospital: true,
        jail: true,
        abroad: true,
        traveling: true,
      },
      levelMin: null,
      levelMax: null,
      ffMin: null,
      ffMax: null,
    },
  );

  let rows = Array.from(tbody.querySelectorAll(".table-row")) as HTMLElement[];
  expect(rows[0]?.id).toBe("row-2");
  expect(rows[1]?.id).toBe("row-1");
  expect(rows[2]?.id).toBe("row-3");

  // Test 6: Sort by FF Ascending (Row 3, then Row 1, then Row 2)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "ff-asc",
      activity: { online: true, idle: true, offline: true },
      status: {
        okay: true,
        hospital: true,
        jail: true,
        abroad: true,
        traveling: true,
      },
      levelMin: null,
      levelMax: null,
      ffMin: null,
      ffMax: null,
    },
  );

  rows = Array.from(tbody.querySelectorAll(".table-row")) as HTMLElement[];
  expect(rows[0]?.id).toBe("row-3");
  expect(rows[1]?.id).toBe("row-1");
  expect(rows[2]?.id).toBe("row-2");
});
