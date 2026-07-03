// @vitest-environment jsdom

import * as fs from "node:fs";
import * as path from "node:path";
import { check_key_status } from "@utils/check_key";
import {
  FactionsColDisplay,
  ffconfig,
  WarQuickAttackAction,
} from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { FFDataComplete, PlayerId } from "@utils/types";
import { beforeEach, expect, test, vi } from "vitest";
import { apply_ff_columns, poll_traveling_flights } from "./column-population";

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
});

// Minimal FFDataComplete fixture for tests that only assert on FF/estimate
// rendering, not on any other field.
function mock_ff_data(
  fair_fight: number,
  bs_estimate: number,
  bs_estimate_human: string,
): FFDataComplete {
  return {
    player_id: 111 as PlayerId,
    no_data: false,
    fair_fight,
    last_updated: Date.now() / 1000,
    bs_estimate,
    bs_estimate_human,
    bss_public: 1,
    source: "bss",
    premium_insights_available: false,
    available_estimates: {
      bss: {
        bss_public: 1,
        bs_estimate,
        bs_estimate_human,
        last_updated: Date.now() / 1000,
        fair_fight,
      },
      premium: null,
      spies: null,
    },
    spies: [],
  };
}

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
        source: "bss",
        premium_insights_available: false,
        available_estimates: {
          bss: {
            bss_public: 1,
            bs_estimate: 1000000,
            bs_estimate_human: "1M",
            last_updated: Date.now() / 1000,
            fair_fight: 2.5,
          },
          premium: null,
          spies: null,
        },
        spies: [],
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
        source: "bss",
        premium_insights_available: true,
        available_estimates: {
          bss: {
            bss_public: 1,
            bs_estimate: 2000000,
            bs_estimate_human: "2M",
            last_updated: Date.now() / 1000,
            fair_fight: 4.5,
          },
          premium: null,
          spies: null,
        },
        spies: [],
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

test("faction features react to ff-config-updated events", async () => {
  ffconfig.factions_col_display = FactionsColDisplay.FAIR_FIGHT;

  vi.mocked(ffscouter.get).mockResolvedValue(mock_ff_data(3.2, 4000000, "4M"));

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

  vi.mocked(ffscouter.get).mockResolvedValue(mock_ff_data(3.5, 5000000, "5M"));

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

  vi.mocked(ffscouter.get).mockResolvedValue(mock_ff_data(3.5, 5000000, "5M"));

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

test("columns are correctly hidden via display none when data-attributes are set on .faction-war", async () => {
  // 1. Read and inject the stylesheet styles.css into JSDOM head
  const cssPath = path.resolve(__dirname, "../../ui/styles.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const styleEl = document.createElement("style");
  styleEl.textContent = cssContent;
  document.head.appendChild(styleEl);

  // 2. Configured to display FAIR_FIGHT war columns by default
  ffconfig.war_col_display = FactionsColDisplay.FAIR_FIGHT;

  vi.mocked(ffscouter.get).mockResolvedValue(mock_ff_data(3.5, 5000000, "5M"));

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

  const injectedHeader = list.querySelector(".ffscouter-header") as HTMLElement;
  const injectedCell = list.querySelector(".ffscouter-cell") as HTMLElement;

  // Verify display is not "none" initially
  expect(window.getComputedStyle(originalHeaderLvl).display).not.toBe("none");
  expect(window.getComputedStyle(originalCellLvl).display).not.toBe("none");
  expect(window.getComputedStyle(originalHeaderStatus).display).not.toBe(
    "none",
  );
  expect(window.getComputedStyle(originalCellStatus).display).not.toBe("none");
  expect(window.getComputedStyle(originalHeaderPoints).display).not.toBe(
    "none",
  );
  expect(window.getComputedStyle(originalCellPoints).display).not.toBe("none");
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
