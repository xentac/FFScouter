import { check_key_status } from "@utils/check_key";
import {
  apply_ff_gauge_selector,
  get_player_id_in_element,
  on_navigation,
  torn_page,
  wait_for_element,
} from "@utils/dom";
import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import {
  format_ff_score,
  format_relative_time,
  get_contrast_color,
  get_ff_colour,
  parse_suffix_number,
} from "@utils/strings";
import type { PlayerId } from "@utils/types";
import { type Feature, StartTime } from "../feature";
import "@ui/faction-filter-box";

const log = logger.child("feature:faction");

const FEATURE_NAME = "faction";

// Re-entrancy guard to prevent layout loop on DOM mutation sorting
let isApplying = false;

// ============================================================================
// SECTION 1: FILTER & SORT ENGINE
// Core logic for evaluating filters (activity, status, level, FF, stats) and sorting
// rows (both standard member rows and Ranked War lists). Also manages the active-filter attribute.
// ============================================================================
export function apply_filters_and_sort(
  membersList: HTMLElement,
  filters: {
    sortBy: "ff-asc" | "ff-desc" | "none";
    activity: { online: boolean; idle: boolean; offline: boolean };
    status: {
      okay: boolean;
      traveling: boolean;
      hospital: boolean;
      jail: boolean;
      abroad: boolean;
    };
    levelMin: number | null;
    levelMax: number | null;
    ffMin: number | null;
    ffMax: number | null;
    statsMin?: number | null;
    statsMax?: number | null;
  },
) {
  if (isApplying) return;
  isApplying = true;

  try {
    // 1. Resolve the container element for list items (supports standard lists and Ranked War lists)
    const tbody =
      membersList.querySelector(".table-body") ||
      membersList.querySelector(".members-list") ||
      membersList;

    // 2. Select all row elements inside the resolved container
    const rows = Array.from(
      tbody.querySelectorAll(":scope > .table-row, .enemy, .your"),
    ) as HTMLElement[];

    for (const row of rows) {
      // Activity
      const activityImg = row.querySelector(".icons img");
      const activity = (
        activityImg?.getAttribute("alt") || "offline"
      ).toLowerCase();
      const allActivityUnchecked =
        !filters.activity.online &&
        !filters.activity.idle &&
        !filters.activity.offline;
      const matchesActivity =
        allActivityUnchecked ||
        (activity === "online" && filters.activity.online) ||
        (activity === "idle" && filters.activity.idle) ||
        (activity === "offline" && filters.activity.offline);

      if (!matchesActivity) {
        hide_row(row);
        continue;
      }

      // Status: Inspect the class list or inner structure to determine character state
      let status = "okay";
      const statusCell = row.querySelector(".status");
      if (statusCell) {
        if (
          statusCell.classList.contains("traveling") ||
          statusCell.querySelector(".traveling")
        ) {
          status = "traveling";
        } else if (
          statusCell.classList.contains("hospital") ||
          statusCell.querySelector(".hospital")
        ) {
          status = "hospital";
        } else if (
          statusCell.classList.contains("jail") ||
          statusCell.querySelector(".jail")
        ) {
          status = "jail";
        } else if (
          statusCell.classList.contains("abroad") ||
          statusCell.querySelector(".abroad")
        ) {
          status = "abroad";
        } else {
          status = "okay";
        }
      }
      const allStatusUnchecked =
        !filters.status.okay &&
        !filters.status.traveling &&
        !filters.status.hospital &&
        !filters.status.jail &&
        !filters.status.abroad;
      const matchesStatus =
        allStatusUnchecked ||
        (status === "okay" && filters.status.okay) ||
        (status === "traveling" && filters.status.traveling) ||
        (status === "hospital" && filters.status.hospital) ||
        (status === "jail" && filters.status.jail) ||
        (status === "abroad" && filters.status.abroad);

      if (!matchesStatus) {
        hide_row(row);
        continue;
      }

      // Level
      const levelCell = row.querySelector(".lvl:not(.ffscouter-cell), .level");
      const level = levelCell
        ? Number.parseInt(levelCell.textContent || "0", 10)
        : 0;
      const matchesLevel =
        (filters.levelMin === null || level >= filters.levelMin) &&
        (filters.levelMax === null || level <= filters.levelMax);

      if (!matchesLevel) {
        hide_row(row);
        continue;
      }

      // FF Range
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      const ffVal = row.dataset["ffValue"]
        ? // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
          Number.parseFloat(row.dataset["ffValue"])
        : null;
      const matchesFF =
        ffVal === null ||
        ((filters.ffMin === null || ffVal >= filters.ffMin) &&
          (filters.ffMax === null || ffVal <= filters.ffMax));

      if (!matchesFF) {
        hide_row(row);
        continue;
      }

      // Stats Range
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      const estVal = row.dataset["estValue"]
        ? // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
          Number.parseInt(row.dataset["estValue"], 10)
        : null;
      const matchesStats =
        estVal === null ||
        ((filters.statsMin === undefined ||
          filters.statsMin === null ||
          estVal >= filters.statsMin) &&
          (filters.statsMax === undefined ||
            filters.statsMax === null ||
            estVal <= filters.statsMax));

      if (!matchesStats) {
        hide_row(row);
        continue;
      }

      if (
        matchesActivity &&
        matchesStatus &&
        matchesLevel &&
        matchesFF &&
        matchesStats
      ) {
        show_row(row);
      } else {
        hide_row(row);
      }
    }

    // 3. If sorting filter is active, sort rows and append them in the updated order
    if (filters.sortBy !== "none") {
      const isEst =
        ffconfig.factions_col_display === FactionsColDisplay.BATTLE_STATS;
      const valKey = isEst ? "estValue" : "ffValue";
      rows.sort((a, b) => {
        const getVal = (row: HTMLElement) => {
          const dataVal = row.dataset[valKey];
          return dataVal ? Number.parseFloat(dataVal) : -1;
        };

        const valA = getVal(a);
        const valB = getVal(b);

        if (filters.sortBy.endsWith("asc")) {
          return valA - valB;
        }
        return valB - valA;
      });

      for (const row of rows) {
        const extra_tt_rows = [];
        let next_sibling = row.nextElementSibling;
        while (
          next_sibling &&
          !next_sibling?.classList.contains("table-row") &&
          !next_sibling?.classList.contains("enemy") &&
          !next_sibling?.classList.contains("enemy")
        ) {
          if (
            next_sibling.classList.contains("tt-last-action") ||
            next_sibling.classList.contains("tt-stats-estimate")
          ) {
            extra_tt_rows.push(next_sibling);
          }
          next_sibling = next_sibling.nextElementSibling;
        }
        tbody.appendChild(row);
        for (const r of extra_tt_rows) {
          tbody.appendChild(r);
        }
      }
    }
    if (is_filter_active(filters)) {
      tbody.setAttribute("data-ffscouter-active-filter", "true");
    } else {
      tbody.removeAttribute("data-ffscouter-active-filter");
    }
  } finally {
    isApplying = false;
  }
}

function hide_row(row: HTMLElement) {
  row.style.setProperty("display", "none", "important");
}

function show_row(row: HTMLElement) {
  row.style.display = "";
}

function is_filter_active(filters: {
  sortBy: string;
  activity: { online: boolean; idle: boolean; offline: boolean };
  status: {
    okay: boolean;
    traveling: boolean;
    hospital: boolean;
    jail: boolean;
    abroad: boolean;
  };
  levelMin: number | null;
  levelMax: number | null;
  ffMin: number | null;
  ffMax: number | null;
  statsMin?: number | null;
  statsMax?: number | null;
}): boolean {
  if (filters.sortBy !== "none") return true;
  return false;
}

// ============================================================================
// SECTION 2: COLUMN DATA POPULATION
// Fetches Fair Fight (FF) and Battle Stat (BS) estimate data from the FFScouter API,
// populates the data attributes used by the filter engine, and handles UI column injection/cleanup.
// ============================================================================
export async function poll_traveling_flights(membersList: HTMLElement) {
  const rows = Array.from(
    membersList.querySelectorAll(".enemy, .your"),
  ) as HTMLElement[];

  const travelingPlayers = rows
    .map((row) => {
      const player_id = get_player_id_in_element(row);
      if (!player_id) return null;

      const statusCell = row.querySelector(".status");
      const statusText = statusCell?.textContent?.trim() || "";
      const isTraveling = statusText === "Traveling";

      return { row, player_id, isTraveling };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Clean up attributes for non-traveling players
  for (const p of travelingPlayers) {
    if (!p.isTraveling) {
      p.row.removeAttribute("data-earliest-arrival");
      p.row.removeAttribute("data-latest-arrival");
      ffscouter.clear_flight_cache(p.player_id);
    }
  }

  // Find players currently traveling
  const traveling = travelingPlayers.filter((p) => p.isTraveling);
  if (traveling.length === 0) return;

  // Premium check
  const isPremium = await check_key_status.is_premium();
  if (!isPremium) {
    // If not premium, ensure any stale attributes are removed
    for (const p of traveling) {
      p.row.removeAttribute("data-earliest-arrival");
      p.row.removeAttribute("data-latest-arrival");
    }
    return;
  }

  // Retrieve flight details concurrently
  await Promise.all(
    traveling.map(async (p) => {
      try {
        const flights = await ffscouter.get_flights(p.player_id);
        const current = flights?.current;
        if (current) {
          const earliest = current.earliest_arrival_time;
          const latest = current.latest_arrival_time;
          p.row.setAttribute("data-earliest-arrival", String(earliest));
          p.row.setAttribute("data-latest-arrival", String(latest));
        } else {
          p.row.removeAttribute("data-earliest-arrival");
          p.row.removeAttribute("data-latest-arrival");
        }
      } catch (err) {
        log.error(`Failed to fetch flights for player ${p.player_id}`, err);
      }
    }),
  );
}

export async function apply_ff_columns(membersList: HTMLElement) {
  // 1. Locate the header column cell to position our custom FF/Est column header
  const headerLvl =
    membersList.querySelector(".table-header > .lvl") ||
    membersList.querySelector(".white-grad");
  if (!headerLvl) return;

  // 2. Determine display settings
  const isWar = membersList.closest(".faction-war") !== null;
  const colDisplay = isWar
    ? ffconfig.war_col_display
    : ffconfig.factions_col_display;
  const isEst = colDisplay === FactionsColDisplay.BATTLE_STATS;
  const isNone = colDisplay === FactionsColDisplay.NONE;
  const expectedText = isEst ? "Est" : "FF";

  if (isWar) {
    const factionWar = membersList.closest(
      ".faction-war",
    ) as HTMLElement | null;
    if (factionWar) {
      factionWar.setAttribute("data-ffscouter-col-display", colDisplay);
    }
  }
  membersList.setAttribute("data-ffscouter-col-display", colDisplay);

  let headerLi = membersList.querySelector(
    ".ffscouter-header",
  ) as HTMLElement | null;

  if (isWar) {
    if (headerLi) {
      headerLi.remove();
    }
    const headerLvlEl = membersList.querySelector(
      ".white-grad > .level",
    ) as HTMLElement | null;
    if (headerLvlEl) {
      headerLvlEl.setAttribute("data-ff-value", expectedText);
      if (!isNone) {
        headerLvlEl.style.setProperty("--ff-display", "inline-flex");
      } else {
        headerLvlEl.style.removeProperty("--ff-display");
      }
    }
  } else {
    if (isNone) {
      if (headerLi) {
        headerLi.remove();
      }
    } else {
      if (!headerLi) {
        headerLi = document.createElement("li");
        headerLi.tabIndex = 0;
        headerLi.classList.add(
          "table-cell",
          "lvl",
          "torn-divider",
          "divider-vertical",
          "ffscouter-header",
        );
        headerLvl.after(headerLi);
      }

      if (headerLi.textContent !== expectedText) {
        headerLi.textContent = expectedText;
      }
    }
  }

  // 3. Find list rows and parse player IDs from profile URLs
  const rows = Array.from(
    membersList.querySelectorAll(".table-body > .table-row, .enemy, .your"),
  ) as HTMLElement[];
  const rowPlayers = rows
    .map((row) => {
      const memberDiv = row.querySelector(".member");
      if (!memberDiv) return null;
      const profileLink = memberDiv.querySelector('a[href^="/profiles"]');
      if (!profileLink || !(profileLink instanceof HTMLAnchorElement))
        return null;
      const url = profileLink.href;
      const match = url.match(/.*XID=(?<player_id>\d+)/);
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      if (!match?.groups?.["player_id"]) return null;
      return {
        row,
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        player_id: Number.parseInt(match.groups["player_id"], 10) as PlayerId,
        memberDiv,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (rowPlayers.length === 0) return;

  // 4. Batch fetch data from FFScouter API for all visible player IDs
  const playerIds = rowPlayers.map((p) => p.player_id);
  const dataPromises = playerIds.map((id) => ffscouter.get(id));
  ffscouter.complete();
  const dataList = await Promise.all(dataPromises);
  const dataMap = new Map(dataList.map((d) => [d.player_id, d]));

  // 5. Update rows and style the injected cells with the retrieved API data
  for (const rp of rowPlayers) {
    let cell = rp.row.querySelector(".ffscouter-cell") as HTMLElement | null;
    const levelEl = rp.row.querySelector(".level") as HTMLElement | null;

    if (isWar) {
      if (cell) {
        cell.remove();
      }

      const data = dataMap.get(rp.player_id);
      if (data && !data.no_data) {
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["ffValue"] = String(data.fair_fight);
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["estValue"] = String(data.bs_estimate);

        if (levelEl) {
          const text = isEst ? data.bs_estimate_human : format_ff_score(data);
          const bg_color = get_ff_colour(data);
          const text_color = get_contrast_color(bg_color);

          levelEl.setAttribute("data-ff-value", text);
          levelEl.style.setProperty("--ff-bg-color", bg_color);
          levelEl.style.setProperty("--ff-text-color", text_color);

          if (!isNone) {
            levelEl.style.setProperty("--ff-display", "inline-flex");
          } else {
            levelEl.style.removeProperty("--ff-display");
          }

          if (isEst && data.distribution) {
            const ageStr = format_relative_time(data.distribution.last_updated);
            const agePart = ageStr ? ` ${ageStr}` : "";
            levelEl.title = `Top Stats: ${data.distribution.distribution_human}${agePart}`;
          } else {
            levelEl.title = "";
          }
        }
      } else {
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["ffValue"] = "";
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["estValue"] = "";

        if (levelEl) {
          levelEl.removeAttribute("data-ff-value");
          levelEl.style.removeProperty("--ff-bg-color");
          levelEl.style.removeProperty("--ff-text-color");
          levelEl.style.removeProperty("--ff-display");
          levelEl.title = "";
        }
      }
    } else {
      if (isNone) {
        if (cell) {
          cell.remove();
        }
      } else {
        if (!cell) {
          cell = document.createElement("div");
          cell.classList.add("table-cell", "lvl", "ffscouter-cell");
          const rowLvl = rp.row.querySelector(".lvl");
          if (rowLvl) {
            rowLvl.after(cell);
          } else {
            rp.memberDiv.after(cell);
          }
        }
      }

      const data = dataMap.get(rp.player_id);
      if (data && !data.no_data) {
        // Store values on data-attributes for fast, local filtering and sorting operations
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["ffValue"] = String(data.fair_fight);
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["estValue"] = String(data.bs_estimate);

        if (cell) {
          const text = isEst ? data.bs_estimate_human : format_ff_score(data);
          const bg_color = get_ff_colour(data);
          const text_color = get_contrast_color(bg_color);

          cell.style.backgroundColor = bg_color;
          cell.style.color = text_color;
          cell.style.fontWeight = "bold";
          cell.textContent = text;

          if (isEst && data.distribution) {
            const ageStr = format_relative_time(data.distribution.last_updated);
            const agePart = ageStr ? ` ${ageStr}` : "";
            cell.title = `Top Stats: ${data.distribution.distribution_human}${agePart}`;
          } else {
            cell.title = "";
          }
        }
      } else {
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["ffValue"] = "";
        // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
        rp.row.dataset["estValue"] = "";
        if (cell) {
          cell.textContent = "-";
          cell.style.backgroundColor = "";
          cell.style.color = "";
          cell.style.fontWeight = "";
          cell.title = "";
        }
      }
    }
  }

  // Trigger filtering and sorting if filter box is connected
  const filterBox = (
    membersList.closest(".faction-war") || membersList.parentNode
  )?.querySelector("ff-faction-filter-box") as any;
  if (filterBox?.activity) {
    apply_filters_and_sort(membersList, {
      sortBy: filterBox.sortBy ?? "none",
      activity: filterBox.activity,
      status: filterBox.status,
      levelMin: filterBox.levelMin ?? null,
      levelMax: filterBox.levelMax ?? null,
      ffMin: filterBox.ffMin ?? null,
      ffMax: filterBox.ffMax ?? null,
      statsMin: filterBox.statsMin
        ? parse_suffix_number(filterBox.statsMin)
        : null,
      statsMax: filterBox.statsMax
        ? parse_suffix_number(filterBox.statsMax)
        : null,
    });
  }

  // Concurrently scan flights for traveling players
  poll_traveling_flights(membersList);
}

// ============================================================================
// SECTION 3: STANDARD MEMBERS & CHAIN ATTACK PAGES FLOW
// Setup, observation, and initialization functions for standard faction member list
// pages. Monitors additions and status updates to dynamically keep columns and filters updated.
// ============================================================================
function inject_filter_box(membersList: HTMLElement) {
  const parent = membersList.parentNode;
  if (!parent) return;

  let filterBox = parent.querySelector(
    "ff-faction-filter-box",
  ) as HTMLElement | null;
  if (!filterBox) {
    filterBox = document.createElement("ff-faction-filter-box");
    filterBox.addEventListener("filter-change", (e: any) => {
      apply_filters_and_sort(membersList, e.detail);
    });
    parent.insertBefore(filterBox, membersList);
  }
}

export function initialize_features(membersList: HTMLElement) {
  inject_filter_box(membersList);
  apply_ff_columns(membersList);

  const target = membersList.querySelector(".table-body") || membersList;
  const attributeObserver = new MutationObserver((mutations) => {
    if (isApplying) return;

    let shouldReapply = false;
    for (const m of mutations) {
      if (m.type === "attributes") {
        if (
          m.attributeName === "alt" &&
          m.target instanceof HTMLImageElement &&
          m.target.closest(".icons")
        ) {
          shouldReapply = true;
          break;
        }
        if (
          m.attributeName === "class" &&
          m.target instanceof HTMLElement &&
          m.target.closest(".status")
        ) {
          shouldReapply = true;
          break;
        }
      }
    }

    if (shouldReapply) {
      const filterBox = (
        membersList.closest(".faction-war") || membersList.parentNode
      )?.querySelector("ff-faction-filter-box") as any;
      if (filterBox?.activity) {
        apply_filters_and_sort(membersList, {
          sortBy: filterBox.sortBy ?? "none",
          activity: filterBox.activity,
          status: filterBox.status,
          levelMin: filterBox.levelMin ?? null,
          levelMax: filterBox.levelMax ?? null,
          ffMin: filterBox.ffMin ?? null,
          ffMax: filterBox.ffMax ?? null,
          statsMin: filterBox.statsMin
            ? parse_suffix_number(filterBox.statsMin)
            : null,
          statsMax: filterBox.statsMax
            ? parse_suffix_number(filterBox.statsMax)
            : null,
        });
      }
    }
  });

  attributeObserver.observe(target, {
    attributes: true,
    attributeFilter: ["class", "alt"],
    subtree: true,
  });

  const flightInterval = setInterval(() => {
    poll_traveling_flights(membersList);
  }, 30000);

  const cleanupInterval = setInterval(() => {
    if (!membersList.isConnected) {
      clearInterval(cleanupInterval);
      clearInterval(flightInterval);
      attributeObserver.disconnect();
    }
  }, 10_000);
}

function setup_faction_features(membersList: HTMLElement) {
  const tbody = membersList.querySelector(".table-body");
  const hasRows = tbody?.querySelector(".table-row");

  if (hasRows) {
    initialize_features(membersList);
  } else {
    const loadObserver = new MutationObserver((_mutations, obs) => {
      const currentTbody = membersList.querySelector(".table-body");
      if (currentTbody?.querySelector(".table-row")) {
        obs.disconnect();
        initialize_features(membersList);
      }
    });
    loadObserver.observe(membersList, { childList: true, subtree: true });

    const cleanupInterval = setInterval(() => {
      if (!membersList.isConnected) {
        clearInterval(cleanupInterval);
        loadObserver.disconnect();
      }
    }, 10_000);
  }
}

const monitor_member_list = (
  root: HTMLElement = document.body,
  _dynamic = false,
) => {
  const membersList = root.classList.contains("members-list")
    ? root
    : (root.querySelector(".members-list") as HTMLElement);

  if (membersList) {
    setup_faction_features(membersList);
  } else {
    // Check elements on page load dynamically
    apply_ff_members_list(root);

    const loadObserver = new MutationObserver((mutations, obs) => {
      const foundList = root.classList.contains("members-list")
        ? root
        : (root.querySelector(".members-list") as HTMLElement);
      if (foundList) {
        obs.disconnect();
        setup_faction_features(foundList);
      } else {
        let shouldUpdate = false;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (
              node instanceof HTMLElement &&
              (node.querySelector(".honor-text-wrap") ||
                node.querySelector(".member"))
            ) {
              shouldUpdate = true;
              break;
            }
          }
          if (shouldUpdate) break;
        }
        if (shouldUpdate) {
          apply_ff_members_list(root);
        }
      }
    });

    loadObserver.observe(root, { childList: true, subtree: true });

    const cleanupInterval = setInterval(() => {
      if (!root.isConnected) {
        clearInterval(cleanupInterval);
        loadObserver.disconnect();
      }
    }, 10_000);
  }
};

const apply_ff_members_list = (root: HTMLElement = document.body) => {
  const membersList = root.classList.contains("members-list")
    ? root
    : (root.querySelector(".members-list") as HTMLElement);

  if (membersList) {
    setup_faction_features(membersList);
    return;
  }
  apply_ff_gauge_selector(
    root.querySelectorAll(".honor-text-wrap"),
    FEATURE_NAME,
  );
  apply_ff_gauge_selector(root.querySelectorAll(".member"), FEATURE_NAME);
  for (const l of root.querySelectorAll(".members-list, .chain-attacks-list")) {
    if (l instanceof HTMLElement) {
      apply_ff_members_list(l);
    }
  }
};

// ============================================================================
// SECTION 4: RANKED WAR PAGES FLOW (SIDE-BY-SIDE LISTS)
// Dynamic loader and event observers for side-by-side Ranked War faction tables.
// Sets up a single, borderless configuration panel and binds it to both tables, waiting
// for asynchronous rows (li.enemy, li.your) to load.
// ============================================================================
export function setup_war_features(factionWar: HTMLElement) {
  const lists = Array.from(
    factionWar.querySelectorAll(".enemy-faction, .your-faction"),
  ) as HTMLElement[];

  if (lists.length > 0) {
    initialize_war_features(factionWar, lists);
  } else {
    const loadObserver = new MutationObserver((_mutations, obs) => {
      const currentLists = Array.from(
        factionWar.querySelectorAll(".enemy-faction, .your-faction"),
      ) as HTMLElement[];
      if (currentLists.length > 0) {
        obs.disconnect();
        initialize_war_features(factionWar, currentLists);
      }
    });
    loadObserver.observe(factionWar, { childList: true, subtree: true });

    const cleanupInterval = setInterval(() => {
      if (!factionWar.isConnected) {
        clearInterval(cleanupInterval);
        loadObserver.disconnect();
      }
    }, 10_000);
  }
}

function initialize_war_features(
  factionWar: HTMLElement,
  lists: HTMLElement[],
) {
  // Inject single filter box at the top of the war box (factionWar)
  let filterBox = factionWar.querySelector(
    "ff-faction-filter-box[mode='war']",
  ) as any;
  if (!filterBox) {
    filterBox = document.createElement("ff-faction-filter-box");
    filterBox.setAttribute("mode", "war");
    factionWar.insertBefore(filterBox, factionWar.firstChild);
  }

  // Update or attach the filter-change event listener with fresh closure context
  if (filterBox._onFilterChange) {
    filterBox.removeEventListener("filter-change", filterBox._onFilterChange);
  }
  filterBox._onFilterChange = (e: any) => {
    const currentLists = Array.from(
      factionWar.querySelectorAll(".enemy-faction, .your-faction"),
    ) as HTMLElement[];
    for (const list of currentLists) {
      apply_filters_and_sort(list, e.detail);
    }
  };
  filterBox.addEventListener("filter-change", filterBox._onFilterChange);

  for (const list of lists) {
    setup_war_list(list);
  }
}

function setup_war_list(list: HTMLElement) {
  const tbody = list;
  const hasRows = tbody.querySelector(".enemy, .your");

  if (hasRows) {
    initialize_war_list(list);
  } else {
    const loadObserver = new MutationObserver((_mutations, obs) => {
      const currentTbody = list;
      if (currentTbody.querySelector(".enemy, .your")) {
        obs.disconnect();
        initialize_war_list(list);
      }
    });
    loadObserver.observe(list, { childList: true, subtree: true });

    const cleanupInterval = setInterval(() => {
      if (!list.isConnected) {
        clearInterval(cleanupInterval);
        loadObserver.disconnect();
      }
    }, 10_000);
  }
}

function initialize_war_list(list: HTMLElement) {
  apply_ff_columns(list);

  const target = list;
  const attributeObserver = new MutationObserver((mutations) => {
    if (isApplying) return;

    let shouldReapply = false;
    for (const m of mutations) {
      if (m.type === "attributes") {
        if (
          m.attributeName === "alt" &&
          m.target instanceof HTMLImageElement &&
          m.target.closest(".icons")
        ) {
          shouldReapply = true;
          break;
        }
        if (
          m.attributeName === "class" &&
          m.target instanceof HTMLElement &&
          m.target.closest(".status")
        ) {
          shouldReapply = true;
          break;
        }
      }
    }

    if (shouldReapply) {
      const filterBox = list
        .closest(".faction-war")
        ?.querySelector("ff-faction-filter-box") as any;
      if (filterBox?.activity) {
        apply_filters_and_sort(list, {
          sortBy: filterBox.sortBy ?? "none",
          activity: filterBox.activity,
          status: filterBox.status,
          levelMin: filterBox.levelMin ?? null,
          levelMax: filterBox.levelMax ?? null,
          ffMin: filterBox.ffMin ?? null,
          ffMax: filterBox.ffMax ?? null,
          statsMin: filterBox.statsMin
            ? parse_suffix_number(filterBox.statsMin)
            : null,
          statsMax: filterBox.statsMax
            ? parse_suffix_number(filterBox.statsMax)
            : null,
        });
      }
    }
  });

  attributeObserver.observe(target, {
    attributes: true,
    attributeFilter: ["class", "alt"],
    subtree: true,
  });

  const flightInterval = setInterval(() => {
    poll_traveling_flights(list);
  }, 30000);

  const cleanupInterval = setInterval(() => {
    if (!list.isConnected) {
      clearInterval(cleanupInterval);
      clearInterval(flightInterval);
      attributeObserver.disconnect();
    }
  }, 10_000);
}

// ============================================================================
// SECTION 5: ENTRY POINTS & PAGE EVENT ROUTER
// The main page navigation observer, selector router, and extension hooks for Torn Factions step page loads.
// ============================================================================
const process_page = () => {
  wait_for_element(".members-list", 10_000).then((node) => {
    if (node instanceof HTMLElement) {
      log.debug("Found members-list!");
      monitor_member_list(node);
    }
  });

  wait_for_element(".chain-attacks-list", 10_000).then((node) => {
    if (node instanceof HTMLElement) {
      log.debug("Found chain-attacks-list!");
      monitor_member_list(node, true);
    }
  });

  // TODO: Support #faction-info and #faction-main swapping on personal faction page

  wait_for_element("#faction_war_list_id", 10_000).then(async (node) => {
    if (!node) {
      return;
    }
    log.debug("Found faction_war_list_id");
    const descriptions_observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("descriptions")
          ) {
            log.debug(
              "Observed mutation that included adding descriptions",
              node,
            );
            const faction_war = await wait_for_element(".faction-war", 10_000);
            if (faction_war instanceof HTMLElement) {
              setup_war_features(faction_war);
            }
          }
        }
      }
    });
    descriptions_observer.observe(node, { childList: true });
    log.debug("Set up descriptions observer on", node);

    const existing_descriptions = node.querySelector(".descriptions");
    if (existing_descriptions) {
      const faction_war = await wait_for_element(
        " .faction-war",
        10_000,
        existing_descriptions,
      );
      if (faction_war instanceof HTMLElement) {
        setup_war_features(faction_war);
      }
    }
  });
};

export function should_run_faction(): boolean {
  if (torn_page("factions", { step: "profile" })) {
    return true;
  }
  if (torn_page("factions", { step: "your" })) {
    if (
      window.location.hash === "" ||
      window.location.hash === "#" ||
      window.location.hash === "#/" ||
      window.location.hash.startsWith("#/war/") ||
      window.location.hash === "#/tab=info"
    ) {
      return true;
    }
  }
  return false;
}

export default {
  name: "Faction page FF display",
  description: "Shows FF arrows on both your faction and other faction pages.",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the faction pages
    return torn_page("factions");
  },

  async run() {
    on_navigation(() => {
      if (should_run_faction()) {
        process_page();
      }
    });

    window.addEventListener("ff-config-updated", () => {
      if (should_run_faction()) {
        const lists = document.querySelectorAll(
          ".members-list, .chain-attacks-list, .enemy-faction, .your-faction",
        );
        for (const list of lists) {
          if (list instanceof HTMLElement) {
            apply_ff_columns(list);
          }
        }
      }
    });

    if (should_run_faction()) {
      process_page();
    }
  },

  httpIntercept: {
    before(_url, _init) {
      // something
      return undefined;
    },

    after(_bodyText, _response, _ctx) {
      // even more things
      return undefined;
    },
  },
} satisfies Feature;
