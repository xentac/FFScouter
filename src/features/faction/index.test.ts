// @vitest-environment jsdom

import * as fs from "node:fs";
import * as path from "node:path";
import { check_key_status } from "@utils/check_key";
import { on_navigation } from "@utils/dom";
import {
  FactionsColDisplay,
  ffconfig,
  WarQuickAttackAction,
} from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  apply_ff_columns,
  apply_filters_and_sort,
  default as factionFeature,
  initialize_features,
  poll_traveling_flights,
  setup_war_features,
  should_run_faction,
} from "./index";

const navigationListeners: (() => void)[] = [];

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: vi.fn((page, params, match_hash) => {
      return original.torn_page(page, params, match_hash);
    }),
    on_navigation: vi.fn((callback) => {
      navigationListeners.push(callback);
      return () => {
        const index = navigationListeners.indexOf(callback);
        if (index > -1) navigationListeners.splice(index, 1);
      };
    }),
  };
});

vi.mock("@utils/ffscouter", () => {
  return {
    ffscouter: {
      get: vi.fn(),
      get_flights: vi.fn(),
      clear_flight_cache: vi.fn(),
      complete: vi.fn(),
    },
  };
});

vi.mock("@utils/check_key", () => {
  return {
    check_key_status: {
      is_premium: vi.fn(),
    },
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  localStorage.clear();
  navigationListeners.length = 0;
  window.location.hash = "";
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
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Test 2: Filter status - show only Hospital
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );

  // Test 3: Filter level range - level >= 45 and <= 55 (only Player 111 - level 50)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );

  // Test 4: Filter FF range - ff >= 2.0 and <= 3.0 (only Player 111 - 2.5)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );

  // Test 5: Sort by FF Descending (Row 2, then Row 1, then Row 3)
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "ff-desc",
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(
    true,
  );

  // Test 8: Empty activity and status filters act as if everything is checked
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "none",
      colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  expect((tbody.querySelector("#row-1") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-2") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect((tbody.querySelector("#row-3") as HTMLElement).hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Test 9: Sort by BS Estimate Descending when configured to BATTLE_STATS (Row 2 [5M], then Row 1 [1M], then Row 3 [500k])
  apply_filters_and_sort(
    container.querySelector(".members-list") as HTMLElement,
    {
      sortBy: "ff-desc",
      colDisplay: FactionsColDisplay.BATTLE_STATS,
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
      colDisplay: FactionsColDisplay.BATTLE_STATS,
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

test("apply_ff_columns supports configurable display via real DOM elements when members-list is inside .faction-war", async () => {
  // Configured to display FAIR_FIGHT war columns by default
  ffconfig.war_col_display = FactionsColDisplay.FAIR_FIGHT;
  ffconfig.war_quick_attack_action = WarQuickAttackAction.NEW_TAB;

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
    <div class="white-grad">
      <div class="member">Member</div>
      <div class="level">Lvl</div>
    </div>
    <ul class="table-body">
      <li class="table-row">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="level">50</div>
        <div class="icons"><img src="" alt="Offline" /></div>
      </li>
    </ul>
  `;
  factionWar.appendChild(list);
  document.body.appendChild(factionWar);

  await apply_ff_columns(list);

  // 1. Columns should be injected as standard physical nodes in war mode
  const header = list.querySelector(".ffscouter-header") as HTMLElement;
  expect(header).not.toBeNull();
  expect(header.textContent).toBe("FF");
  expect(header.tagName).toBe("DIV");

  const cell = list.querySelector(".ffscouter-cell") as HTMLElement;
  expect(cell).not.toBeNull();
  expect(cell.textContent).toBe("3.50");
  expect(cell.style.backgroundColor).not.toBe("");
  expect(cell.style.color).not.toBe("");
  expect(cell.tagName).toBe("DIV");
  expect(cell.onclick).toBeTypeOf("function");

  // Check same tab preference
  ffconfig.war_quick_attack_action = WarQuickAttackAction.CURRENT;
  await apply_ff_columns(list);

  const cellSameTab = list.querySelector(".ffscouter-cell") as HTMLElement;
  expect(cellSameTab.onclick).toBeTypeOf("function");

  // Reset to default new_tab
  ffconfig.war_quick_attack_action = WarQuickAttackAction.NEW_TAB;

  const row = list.querySelector(".table-row") as HTMLElement;
  // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
  expect(row.dataset["ffValue"]).toBe("3.5");

  // 2. If configured to NONE, physical elements should be removed from the DOM
  ffconfig.war_col_display = FactionsColDisplay.NONE;
  await apply_ff_columns(list);

  expect(list.querySelector(".ffscouter-header")).toBeNull();
  expect(list.querySelector(".ffscouter-cell")).toBeNull();
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
    colDisplay: FactionsColDisplay.FAIR_FIGHT,
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

  const tbody = container.querySelector(".table-body") as HTMLElement;

  // 1. With default/cleared filters, attribute should not be present
  apply_filters_and_sort(container, defaultFilters);
  expect(tbody.getAttribute("data-ffscouter-active-filter")).toBeNull();

  // 2. Active sorting should set the attribute
  apply_filters_and_sort(container, { ...defaultFilters, sortBy: "ff-desc" });
  expect(tbody.getAttribute("data-ffscouter-active-filter")).toBe("true");

  // 3. Reset filters: attribute should be removed
  apply_filters_and_sort(container, defaultFilters);
  expect(tbody.getAttribute("data-ffscouter-active-filter")).toBeNull();

  // 4. Activity/status filtering alone should NOT set the attribute (only sortBy does)
  apply_filters_and_sort(container, {
    ...defaultFilters,
    activity: { online: true, idle: true, offline: false },
  });
  expect(tbody.getAttribute("data-ffscouter-active-filter")).toBeNull();
});

test("apply_filters_and_sort bypasses filtering but still sorts when filterEnabled is false", () => {
  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <div class="table-body">
      <div class="table-row" id="row-1" data-ff-value="1.5" data-est-value="1000">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="lvl">50</div>
        <div class="status traveling">Traveling</div>
        <div class="icons"><img alt="Offline" /></div>
      </div>
      <div class="table-row" id="row-2" data-ff-value="3.5" data-est-value="5000">
        <div class="member"><a href="/profiles.php?XID=222">Player 222</a></div>
        <div class="lvl">60</div>
        <div class="status okay">Okay</div>
        <div class="icons"><img alt="Online" /></div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const filters = {
    sortBy: "ff-desc" as const,
    filterEnabled: false,
    colDisplay: FactionsColDisplay.FAIR_FIGHT,
    activity: { online: true, idle: false, offline: false },
    status: {
      okay: true,
      hospital: false,
      jail: false,
      abroad: false,
      traveling: false,
    },
    levelMin: 55,
    levelMax: null,
    ffMin: null,
    ffMax: null,
  };

  const row1 = container.querySelector("#row-1") as HTMLElement;
  const row2 = container.querySelector("#row-2") as HTMLElement;

  apply_filters_and_sort(container, filters);

  // Both rows should be visible because filtering is disabled
  expect(row1.hasAttribute("data-ffscouter-hidden")).toBe(false);
  expect(row2.hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Sorting should still have occurred (ff-desc, so row-2 (3.5) before row-1 (1.5))
  const rows = Array.from(container.querySelectorAll(".table-row"));
  expect(rows[0]?.id).toBe("row-2");
  expect(rows[1]?.id).toBe("row-1");

  document.body.removeChild(container);
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

test("poll_traveling_flights adds data-earliest-arrival and data-latest-arrival to traveling players if user is premium", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(true);
  vi.mocked(ffscouter.get_flights).mockResolvedValue({
    player_id: 111,
    current: {
      takeoff_time: 1700000000,
      status_description: "Traveling to Japan",
      earliest_arrival_time: 1700005000,
      latest_arrival_time: 1700006000,
      travel_method: "Airline",
      book_likely_being_used: false,
    },
    recent_flights: [],
  });

  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <ul class="table-body">
      <li class="enemy" id="enemy-1">
        <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
        <div class="status">Traveling</div>
      </li>
      <li class="your" id="your-1">
        <div class="member"><a href="/profiles.php?XID=222">Your 222</a></div>
        <div class="status">Okay</div>
      </li>
    </ul>
  `;
  document.body.appendChild(container);

  await poll_traveling_flights(container);

  const enemyRow = container.querySelector("#enemy-1") as HTMLElement;
  const yourRow = container.querySelector("#your-1") as HTMLElement;

  expect(enemyRow.getAttribute("data-earliest-arrival")).toBe("1700005000");
  expect(enemyRow.getAttribute("data-latest-arrival")).toBe("1700006000");

  expect(yourRow.getAttribute("data-earliest-arrival")).toBeNull();
  expect(yourRow.getAttribute("data-latest-arrival")).toBeNull();

  // Test that if status changes, attributes are removed
  const statusCell = enemyRow.querySelector(".status") as HTMLElement;
  statusCell.textContent = "Okay";
  await poll_traveling_flights(container);

  expect(enemyRow.getAttribute("data-earliest-arrival")).toBeNull();
  expect(enemyRow.getAttribute("data-latest-arrival")).toBeNull();

  container.remove();
});

test("poll_traveling_flights does not add data-earliest-arrival and data-latest-arrival if user is NOT premium", async () => {
  vi.mocked(check_key_status.is_premium).mockResolvedValue(false);

  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <ul class="table-body">
      <li class="enemy" id="enemy-1" data-earliest-arrival="1700005000" data-latest-arrival="1700006000">
        <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
        <div class="status">Traveling</div>
      </li>
    </ul>
  `;
  document.body.appendChild(container);

  await poll_traveling_flights(container);

  const enemyRow = container.querySelector("#enemy-1") as HTMLElement;
  expect(enemyRow.getAttribute("data-earliest-arrival")).toBeNull();
  expect(enemyRow.getAttribute("data-latest-arrival")).toBeNull();

  container.remove();
});

test("initialize_features MutationObserver reacts to status class changes and filters correctly", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  const container = document.createElement("div");
  container.className = "members-list";
  container.innerHTML = `
    <ul class="table-header">
      <li class="member">Member</li>
      <li class="lvl">Lvl</li>
    </ul>
    <div class="table-body">
      <div class="table-row" id="row-1">
        <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
        <div class="lvl">50</div>
        <div class="status traveling">Traveling</div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // Initialize features (which sets up MutationObserver)
  initialize_features(container);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Find the injected filterBox
  const filterBox = container.parentNode?.querySelector(
    "ff-faction-filter-box",
  ) as any;
  expect(filterBox).not.toBeNull();

  // Set filter state: keep Okay, filter out Traveling
  filterBox.status = {
    okay: true,
    hospital: false,
    jail: false,
    abroad: false,
    traveling: false,
  };
  filterBox.dispatchChange();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const row = container.querySelector("#row-1") as HTMLElement;
  // Row has status 'traveling', so it should be hidden
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(true);

  // Dynamically change status class to okay
  const statusCell = row.querySelector(".status") as HTMLElement;
  statusCell.className = "status okay";

  // Wait for MutationObserver and rAF debounce to run (jsdom rAF fires at ~16ms)
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Row should now be visible!
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(false);

  container.remove();
});

test("setup_war_features MutationObserver in Ranked War reacts to status changes and filters correctly", async () => {
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
      <div class="status traveling">Traveling</div>
    </li>
  `;

  factionWar.appendChild(enemyList);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Find the injected filterBox
  const filterBox = factionWar.querySelector(
    "ff-faction-filter-box[mode='war']",
  ) as any;
  expect(filterBox).not.toBeNull();

  // Set filter state: keep Traveling, filter out Okay
  filterBox.status = {
    okay: false,
    hospital: false,
    jail: false,
    abroad: false,
    traveling: true,
  };
  filterBox.dispatchChange();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const row = enemyList.querySelector("#enemy-1") as HTMLElement;
  // Row has status 'traveling', so it should be visible
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Dynamically change status class to okay
  const statusCell = row.querySelector(".status") as HTMLElement;
  statusCell.className = "status okay";

  // Wait for MutationObserver and rAF debounce to run (jsdom rAF fires at ~16ms)
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Row should now be hidden!
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(true);

  factionWar.remove();
});

test("war header click toggles sort between ff-desc and ff-asc, and native column click resets to none", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  const factionWar = document.createElement("div");
  factionWar.className = "faction-war";

  const list = document.createElement("div");
  list.className = "enemy-faction";
  list.innerHTML = `
    <div class="white-grad">
      <div class="member tab___abc">Members</div>
      <div class="level">Level</div>
    </div>
    <li class="enemy">
      <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
      <div class="level">50</div>
    </li>
  `;

  factionWar.appendChild(list);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const filterBox = factionWar.querySelector("ff-faction-filter-box") as any;
  expect(filterBox).not.toBeNull();

  const ffHeader = list.querySelector(".ffscouter-header") as HTMLElement;
  expect(ffHeader).not.toBeNull();

  // First click: none -> ff-desc
  ffHeader.click();
  expect(filterBox.sortBy).toBe("ff-desc");

  // Second click: ff-desc -> ff-asc
  ffHeader.click();
  expect(filterBox.sortBy).toBe("ff-asc");

  // Click a native tab column: should reset to none
  const nativeHeader = list.querySelector("[class*='tab___']") as HTMLElement;
  nativeHeader.click();
  expect(filterBox.sortBy).toBe("none");

  factionWar.remove();
});

test("war header click does not reset sort when native column is clicked and sort is already none", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  const factionWar = document.createElement("div");
  factionWar.className = "faction-war";

  const list = document.createElement("div");
  list.className = "enemy-faction";
  list.innerHTML = `
    <div class="white-grad">
      <div class="member tab___abc">Members</div>
      <div class="level">Level</div>
    </div>
    <li class="enemy">
      <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
      <div class="level">50</div>
    </li>
  `;

  factionWar.appendChild(list);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const filterBox = factionWar.querySelector("ff-faction-filter-box") as any;
  expect(filterBox.sortBy).toBe("none");

  const setSortBySpy = vi.spyOn(filterBox, "setSortBy");

  const nativeHeader = list.querySelector("[class*='tab___']") as HTMLElement;
  nativeHeader.click();

  // setSortBy should not have been called since sort was already none
  expect(setSortBySpy).not.toHaveBeenCalled();

  factionWar.remove();
});

test("war header sort indicator attribute tracks sort state changes", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  const factionWar = document.createElement("div");
  factionWar.className = "faction-war";

  const list = document.createElement("div");
  list.className = "enemy-faction";
  list.innerHTML = `
    <div class="white-grad">
      <div class="level">Level</div>
    </div>
    <li class="enemy">
      <div class="member"><a href="/profiles.php?XID=111">Enemy 111</a></div>
      <div class="level">50</div>
    </li>
  `;

  factionWar.appendChild(list);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const ffHeader = list.querySelector(".ffscouter-header") as HTMLElement;
  expect(ffHeader).not.toBeNull();
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBeNull();

  const filterBox = factionWar.querySelector("ff-faction-filter-box") as any;

  // Set to ff-desc via setSortBy — indicator should update via filter-change
  filterBox.setSortBy("ff-desc");
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBe("desc");

  // Set to ff-asc
  filterBox.setSortBy("ff-asc");
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBe("asc");

  // Reset to none
  filterBox.setSortBy("none");
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBeNull();

  factionWar.remove();
});

describe("should_run_faction URL and hash matching", () => {
  test("returns true for step=profile with any ID", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=profile&ID=22492",
      search: "?step=profile&ID=22492",
      hash: "",
    });
    expect(should_run_faction()).toBe(true);
  });

  test("returns true for step=your with empty hash", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your",
      search: "?step=your",
      hash: "",
    });
    expect(should_run_faction()).toBe(true);
  });

  test("returns true for step=your with #/tab=info hash", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your&type=1#/tab=info",
      search: "?step=your&type=1",
      hash: "#/tab=info",
    });
    expect(should_run_faction()).toBe(true);
  });

  test("returns true for step=your with #/ hash", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your&type=1#/",
      search: "?step=your&type=1",
      hash: "#/",
    });
    expect(should_run_faction()).toBe(true);
  });

  test("returns true for step=your with # hash", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your&type=1#",
      search: "?step=your&type=1",
      hash: "#",
    });
    expect(should_run_faction()).toBe(true);
  });

  test("returns false for step=your with other hashes (like tab=crimes or tab=controls)", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your#/tab=crimes",
      search: "?step=your",
      hash: "#/tab=crimes",
    });
    expect(should_run_faction()).toBe(false);

    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your#/tab=controls",
      search: "?step=your",
      hash: "#/tab=controls",
    });
    expect(should_run_faction()).toBe(false);
  });

  test("returns false for other steps", () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=crimes",
      search: "?step=crimes",
      hash: "",
    });
    expect(should_run_faction()).toBe(false);
  });
});

describe("Faction feature shouldRun lifecycle", () => {
  test("shouldRun returns true when on any factions page", async () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php",
      search: "",
      hash: "",
    });
    const result = await factionFeature.shouldRun();
    expect(result).toBe(true);
  });

  test("shouldRun returns false when not on a factions page", async () => {
    vi.stubGlobal("location", {
      href: "https://www.torn.com/gym.php",
      search: "",
      hash: "",
    });
    const result = await factionFeature.shouldRun();
    expect(result).toBe(false);
  });
});

describe("Faction feature run and dynamic navigation integration", () => {
  test("does not run process_page initially or on navigation if not a matched faction page", async () => {
    // 1. Initial load on factions crimes (should NOT run process_page)
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=crimes",
      search: "?step=crimes",
      hash: "",
    });

    const waitForSpy = vi.spyOn(await import("@utils/dom"), "wait_for_element");

    await factionFeature.run();

    expect(on_navigation).toHaveBeenCalled();
    expect(waitForSpy).not.toHaveBeenCalled();

    // 2. Simulate navigation to /tab=crimes (still should NOT run process_page)
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your#/tab=crimes",
      search: "?step=your",
      hash: "#/tab=crimes",
    });

    for (const listener of navigationListeners) {
      listener();
    }

    expect(waitForSpy).not.toHaveBeenCalled();
  });

  test("runs process_page initially or on navigation if it matches a valid faction page", async () => {
    const waitForSpy = vi.spyOn(await import("@utils/dom"), "wait_for_element");

    // 1. Start on factions step your (should run process_page)
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=your",
      search: "?step=your",
      hash: "",
    });

    await factionFeature.run();

    expect(waitForSpy).toHaveBeenCalled();
    waitForSpy.mockClear();

    // 2. Simulate navigation to another valid step profile
    vi.stubGlobal("location", {
      href: "https://www.torn.com/factions.php?step=profile&ID=22492",
      search: "?step=profile&ID=22492",
      hash: "",
    });

    for (const listener of navigationListeners) {
      listener();
    }

    expect(waitForSpy).toHaveBeenCalled();
  });

  test("columns are correctly hidden via display none when data-attributes are set on .faction-war", async () => {
    // 1. Read and inject the stylesheet styles.css into JSDOM head
    const cssPath = path.resolve(__dirname, "../../ui/styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    const styleEl = document.createElement("style");
    styleEl.textContent = cssContent;
    document.head.appendChild(styleEl);

    // 2. Configured to display FAIR_FIGHT war columns by default
    ffconfig.war_col_display = FactionsColDisplay.FAIR_FIGHT;

    vi.mocked(ffscouter.get).mockResolvedValue({
      player_id: 111 as PlayerId,
      no_data: false,
      fair_fight: 3.5,
      bs_estimate: 5000000,
      bs_estimate_human: "5M",
    } as any);

    // 3. Create the table inside faction-war wrapper
    const factionWar = document.createElement("div");
    factionWar.className = "faction-war";

    const list = document.createElement("div");
    list.className = "members-list";
    list.innerHTML = `
      <div class="white-grad">
        <div class="member">Member</div>
        <div class="level">Lvl</div>
        <div class="status">Status</div>
        <div class="points">Points</div>
      </div>
      <ul class="table-body">
        <li class="table-row">
          <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
          <div class="level">50</div>
          <div class="status">Idle</div>
          <div class="points">10</div>
        </li>
      </ul>
    `;
    factionWar.appendChild(list);
    document.body.appendChild(factionWar);

    // 4. Inject the columns
    await apply_ff_columns(list);

    // Get reference to original elements and injected elements
    const originalHeaderLvl = list.querySelector(
      ".white-grad > .level:not(.ffscouter-header)",
    ) as HTMLElement;
    const originalCellLvl = list.querySelector(
      ".table-row > .level:not(.ffscouter-cell)",
    ) as HTMLElement;
    const originalHeaderStatus = list.querySelector(
      ".white-grad > .status",
    ) as HTMLElement;
    const originalCellStatus = list.querySelector(
      ".table-row > .status",
    ) as HTMLElement;
    const originalHeaderPoints = list.querySelector(
      ".white-grad > .points",
    ) as HTMLElement;
    const originalCellPoints = list.querySelector(
      ".table-row > .points",
    ) as HTMLElement;

    const injectedHeader = list.querySelector(
      ".ffscouter-header",
    ) as HTMLElement;
    const injectedCell = list.querySelector(".ffscouter-cell") as HTMLElement;

    // Verify display is not "none" initially
    expect(window.getComputedStyle(originalHeaderLvl).display).not.toBe("none");
    expect(window.getComputedStyle(originalCellLvl).display).not.toBe("none");
    expect(window.getComputedStyle(originalHeaderStatus).display).not.toBe(
      "none",
    );
    expect(window.getComputedStyle(originalCellStatus).display).not.toBe(
      "none",
    );
    expect(window.getComputedStyle(originalHeaderPoints).display).not.toBe(
      "none",
    );
    expect(window.getComputedStyle(originalCellPoints).display).not.toBe(
      "none",
    );
    expect(window.getComputedStyle(injectedHeader).display).not.toBe("none");
    expect(window.getComputedStyle(injectedCell).display).not.toBe("none");

    // Test Level Hiding
    factionWar.setAttribute("data-ffscouter-hide-level", "true");
    expect(window.getComputedStyle(originalHeaderLvl).display).toBe("none");
    expect(window.getComputedStyle(originalCellLvl).display).toBe("none");
    expect(window.getComputedStyle(injectedHeader).display).not.toBe("none");
    expect(window.getComputedStyle(injectedCell).display).not.toBe("none");

    // Test Status Hiding
    factionWar.setAttribute("data-ffscouter-hide-status", "true");
    expect(window.getComputedStyle(originalHeaderStatus).display).toBe("none");
    expect(window.getComputedStyle(originalCellStatus).display).toBe("none");

    // Test Points Hiding
    factionWar.setAttribute("data-ffscouter-hide-score", "true");
    expect(window.getComputedStyle(originalHeaderPoints).display).toBe("none");
    expect(window.getComputedStyle(originalCellPoints).display).toBe("none");

    // Cleanup
    document.head.removeChild(styleEl);
    document.body.removeChild(factionWar);
  });

  test("column widths are correctly reduced when custom columns are active and level is visible", async () => {
    // 1. Read and inject the stylesheet styles.css into JSDOM head
    const cssPath = path.resolve(__dirname, "../../ui/styles.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    const styleEl = document.createElement("style");
    styleEl.textContent = cssContent;
    document.head.appendChild(styleEl);

    // 2. Create the table inside faction-war wrapper
    const factionWar = document.createElement("div");
    factionWar.className = "faction-war";

    const list = document.createElement("div");
    list.className = "members-list";
    list.innerHTML = `
      <div class="white-grad">
        <div class="member">Member</div>
        <div class="level">Lvl</div>
        <div class="status">Status</div>
        <div class="points">Points</div>
      </div>
      <ul class="table-body">
        <li class="table-row">
          <div class="member"><a href="/profiles.php?XID=111">Player 111</a></div>
          <div class="level">50</div>
          <div class="status">Idle</div>
          <div class="points">10</div>
        </li>
      </ul>
    `;
    factionWar.appendChild(list);
    document.body.appendChild(factionWar);

    // Get reference to original elements
    const originalHeaderMember = list.querySelector(
      ".white-grad > .member",
    ) as HTMLElement;
    const originalCellMember = list.querySelector(
      ".table-row > .member",
    ) as HTMLElement;
    const originalHeaderLvl = list.querySelector(
      ".white-grad > .level",
    ) as HTMLElement;
    const originalCellLvl = list.querySelector(
      ".table-row > .level",
    ) as HTMLElement;
    const originalHeaderStatus = list.querySelector(
      ".white-grad > .status",
    ) as HTMLElement;
    const originalCellStatus = list.querySelector(
      ".table-row > .status",
    ) as HTMLElement;

    // A. Initially, with display = NONE, they should not have reduced widths
    ffconfig.war_col_display = FactionsColDisplay.NONE;
    await apply_ff_columns(list);

    expect(factionWar.getAttribute("data-ffscouter-col-display")).toBe("none");
    expect(window.getComputedStyle(originalHeaderMember).width).toBe("");
    expect(window.getComputedStyle(originalHeaderLvl).width).toBe("");

    // B. With display = FAIR_FIGHT, they should have reduced widths
    ffconfig.war_col_display = FactionsColDisplay.FAIR_FIGHT;
    await apply_ff_columns(list);

    expect(factionWar.getAttribute("data-ffscouter-col-display")).toBe(
      "fair_fight",
    );
    expect(window.getComputedStyle(originalHeaderMember).width).toBe("");
    expect(window.getComputedStyle(originalCellMember).width).toBe("");
    expect(window.getComputedStyle(originalHeaderLvl).width).toBe("29px");
    expect(window.getComputedStyle(originalCellLvl).width).toBe("29px");
    expect(window.getComputedStyle(originalHeaderStatus).width).toBe("50px");
    expect(window.getComputedStyle(originalCellStatus).width).toBe("50px");

    const originalHeaderPoints = list.querySelector(
      ".white-grad > .points",
    ) as HTMLElement;
    const originalCellPoints = list.querySelector(
      ".table-row > .points",
    ) as HTMLElement;
    expect(window.getComputedStyle(originalHeaderPoints).width).toBe("38px");
    expect(window.getComputedStyle(originalCellPoints).width).toBe("38px");

    // C. With display = BATTLE_STATS, they should have reduced widths
    ffconfig.war_col_display = FactionsColDisplay.BATTLE_STATS;
    await apply_ff_columns(list);

    expect(factionWar.getAttribute("data-ffscouter-col-display")).toBe(
      "battle_stats",
    );
    expect(window.getComputedStyle(originalHeaderMember).width).toBe("");
    expect(window.getComputedStyle(originalCellMember).width).toBe("");
    expect(window.getComputedStyle(originalHeaderLvl).width).toBe("29px");
    expect(window.getComputedStyle(originalCellLvl).width).toBe("29px");
    expect(window.getComputedStyle(originalHeaderStatus).width).toBe("50px");
    expect(window.getComputedStyle(originalCellStatus).width).toBe("50px");
    expect(window.getComputedStyle(originalHeaderPoints).width).toBe("38px");
    expect(window.getComputedStyle(originalCellPoints).width).toBe("38px");

    // D. If level is hidden, they should NOT have reduced widths (and default to native sizes)
    factionWar.setAttribute("data-ffscouter-hide-level", "true");
    expect(window.getComputedStyle(originalHeaderLvl).display).toBe("none");

    // Cleanup
    document.head.removeChild(styleEl);
    document.body.removeChild(factionWar);
  });
});
