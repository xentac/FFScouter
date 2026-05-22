// @vitest-environment jsdom

import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, expect, test, vi } from "vitest";
import {
  apply_ff_columns,
  apply_filters_and_sort,
  setup_war_features,
} from "./index";

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

  // Test 7: Filter Stats range - stats >= 1,000,000 and <= 4,000,000 (only Player 111 - 1M)
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
      ffMin: null,
      ffMax: null,
      statsMin: 1000000,
      statsMax: 4000000,
    },
  );

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe(
    "none",
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe(
    "none",
  );

  // Test 8: Empty activity and status filters act as if everything is checked
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      activity: { online: false, idle: false, offline: false },
      status: {
        okay: false,
        hospital: false,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-2") as HTMLElement).style.display).toBe("");
  expect((tbody.querySelector("#row-3") as HTMLElement).style.display).toBe("");

  // Test 9: Sort by BS Estimate Descending when configured to BATTLE_STATS (Row 2 [5M], then Row 1 [1M], then Row 3 [500k])
  ffconfig.factions_col_display = FactionsColDisplay.BATTLE_STATS;
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

  rows = Array.from(tbody.querySelectorAll(".table-row")) as HTMLElement[];
  expect(rows[0]?.id).toBe("row-2");
  expect(rows[1]?.id).toBe("row-1");
  expect(rows[2]?.id).toBe("row-3");

  // Test 10: Sort by BS Estimate Ascending when configured to BATTLE_STATS (Row 3 [500k], then Row 1 [1M], then Row 2 [5M])
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

test("faction features react to ff-config-updated events", async () => {
  ffconfig.factions_col_display = FactionsColDisplay.FAIR_FIGHT;

  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: false,
    fair_fight: 3.2,
    bs_estimate: 4000000,
    bs_estimate_human: "4M",
  } as any);

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

  // Initialize and check starting state
  await apply_ff_columns(container);
  const header = container.querySelector(".ffscouter-header");
  const cell = container.querySelector(".ffscouter-cell");
  expect(header?.textContent).toBe("FF");
  expect(cell?.textContent).toBe("3.20");

  // Mock global feature registration or listen to updates directly as Faction Feature does
  const onConfigUpdated = () => {
    apply_ff_columns(container);
  };
  window.addEventListener("ff-config-updated", onConfigUpdated);

  try {
    // Switch display setting and fire updated event
    ffconfig.factions_col_display = FactionsColDisplay.BATTLE_STATS;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));

    // Give microtasks time to run
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(header?.textContent).toBe("Est");
    expect(cell?.textContent).toBe("4M");
  } finally {
    window.removeEventListener("ff-config-updated", onConfigUpdated);
  }
});

test("apply_ff_columns removes elements when configured to NONE but populates datasets for sorting", async () => {
  ffconfig.factions_col_display = FactionsColDisplay.NONE;

  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: false,
    fair_fight: 3.5,
    bs_estimate: 5000000,
    bs_estimate_human: "5M",
  } as any);

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

  // Apply with NONE first: should not inject header or cell, but should set dataset values
  await apply_ff_columns(container);

  const header = container.querySelector(".ffscouter-header");
  const cell = container.querySelector(".ffscouter-cell");
  expect(header).toBeNull();
  expect(cell).toBeNull();

  const row = container.querySelector(".table-row") as HTMLElement;
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["ffValue"]).toBe("3.5");
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["estValue"]).toBe("5000000");

  // Now change config to FAIR_FIGHT to inject elements
  ffconfig.factions_col_display = FactionsColDisplay.FAIR_FIGHT;
  await apply_ff_columns(container);

  expect(container.querySelector(".ffscouter-header")).not.toBeNull();
  expect(container.querySelector(".ffscouter-cell")).not.toBeNull();

  // Switch back to NONE: elements should be removed from the DOM
  ffconfig.factions_col_display = FactionsColDisplay.NONE;
  await apply_ff_columns(container);

  expect(container.querySelector(".ffscouter-header")).toBeNull();
  expect(container.querySelector(".ffscouter-cell")).toBeNull();
  // Dataset values should still remain populated for sorting/filtering
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["ffValue"]).toBe("3.5");
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["estValue"]).toBe("5000000");
});

test("apply_ff_columns forces NONE column display when members-list is inside .faction-war", async () => {
  // Configured to display FAIR_FIGHT columns by default
  ffconfig.factions_col_display = FactionsColDisplay.FAIR_FIGHT;

  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: false,
    fair_fight: 3.5,
    bs_estimate: 5000000,
    bs_estimate_human: "5M",
  } as any);

  const factionWar = document.createElement("div");
  factionWar.className = "faction-war";

  const list = document.createElement("div");
  list.className = "members-list";
  list.innerHTML = `
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
  factionWar.appendChild(list);
  document.body.appendChild(factionWar);

  await apply_ff_columns(list);

  // Columns should NOT be injected since it is inside .faction-war (embedded mode)
  expect(list.querySelector(".ffscouter-header")).toBeNull();
  expect(list.querySelector(".ffscouter-cell")).toBeNull();

  // But data values should still be populated for filtering/sorting
  const row = list.querySelector(".table-row") as HTMLElement;
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["ffValue"]).toBe("3.5");
});

test("apply_filters_and_sort sets and removes data-ffscouter-active-filter attribute", () => {
  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <div class="table-body">
      <div class="table-row" id="row-1" data-ff-value="2.5">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="lvl">50</div>
        <div class="status okay">Okay</div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const defaultFilters = {
    sortBy: "none" as const,
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
  };

  // 1. With default/cleared filters, attribute should not be present
  apply_filters_and_sort(container, defaultFilters);
  expect(container.getAttribute("data-ffscouter-active-filter")).toBeNull();

  // 2. Active sorting should set the attribute
  apply_filters_and_sort(container, { ...defaultFilters, sortBy: "ff-desc" });
  expect(container.getAttribute("data-ffscouter-active-filter")).toBe("true");

  // 3. Reset filters: attribute should be removed
  apply_filters_and_sort(container, defaultFilters);
  expect(container.getAttribute("data-ffscouter-active-filter")).toBeNull();

  // 4. Active filtering should set the attribute
  apply_filters_and_sort(container, {
    ...defaultFilters,
    activity: { online: true, idle: true, offline: false },
  });
  expect(container.getAttribute("data-ffscouter-active-filter")).toBe("true");
});

test("setup_war_features detects enemy-faction and your-faction lists and setup filter box", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  const factionWar = document.createElement("div");
  factionWar.className = "faction-war";

  const enemyList = document.createElement("ul");
  enemyList.className = "enemy-faction";
  enemyList.innerHTML = `
    <li class="table-header"><div class="lvl">Lvl</div></li>
    <li class="enemy" id="enemy-1">
      <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
      <div class="lvl">50</div>
    </li>
  `;

  const yourList = document.createElement("ul");
  yourList.className = "your-faction";
  yourList.innerHTML = `
    <li class="table-header"><div class="lvl">Lvl</div></li>
    <li class="your" id="your-2">
      <div class="member"><a href="/profiles.php?XID=222">Your 222</a></div>
      <div class="lvl">60</div>
    </li>
  `;

  factionWar.appendChild(enemyList);
  factionWar.appendChild(yourList);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);

  // Filter box should be injected at the top of the war box container
  const filterBox = factionWar.querySelector(
    "ff-faction-filter-box[mode='war']",
  );
  expect(filterBox).not.toBeNull();

  // Clean up
  factionWar.remove();
});
