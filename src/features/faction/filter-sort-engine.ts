import { detect_sort_icon_classes, get_activity_status } from "@utils/dom";
import { FactionsColDisplay } from "@utils/ffconfig";
import { get_current_time_seconds } from "@utils/time";

// Per-list re-entrancy guard to prevent layout loop on DOM mutation sorting
const isApplying = new WeakMap<HTMLElement, boolean>();

export function is_applying(list: HTMLElement): boolean {
  return isApplying.get(list) ?? false;
}

// ============================================================================
// FILTER & SORT ENGINE
// Core logic for evaluating filters (activity, status, level, FF, stats) and sorting
// rows (both standard member rows and Ranked War lists). Also manages the active-filter attribute.
// ============================================================================
export function apply_filters_and_sort(
  membersList: HTMLElement,
  filters: {
    sortBy: "ff-asc" | "ff-desc" | "none";
    filterEnabled?: boolean;
    colDisplay: FactionsColDisplay;
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
    lastActionMinSec?: number | null;
    lastActionMaxSec?: number | null;
  },
) {
  if (isApplying.get(membersList)) return;
  isApplying.set(membersList, true);

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
      if (filters.filterEnabled === false) {
        show_row(row);
        continue;
      }

      // Activity
      const activity = get_activity_status(row);
      const allActivityUnchecked =
        !filters.activity.online &&
        !filters.activity.idle &&
        !filters.activity.offline;
      const matchesActivity =
        allActivityUnchecked ||
        activity === "unknown" ||
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

      // Last Action Range (war-only; TWSE-sourced, see CONTEXT.md's "Last
      // Action Range Filter"). A missing attribute or the 0 sentinel TWSE
      // uses for "unknown" always passes, same graceful fallback as FF/Stats.
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      const lastActionRaw = row.dataset["twseLastActionTimestamp"];
      const lastActionTs = lastActionRaw
        ? Number.parseInt(lastActionRaw, 10)
        : null;
      const hasLastActionData =
        lastActionTs !== null &&
        !Number.isNaN(lastActionTs) &&
        lastActionTs !== 0;
      const lastActionAge = hasLastActionData
        ? get_current_time_seconds() - (lastActionTs as number)
        : null;
      const matchesLastAction =
        lastActionAge === null ||
        ((filters.lastActionMinSec === undefined ||
          filters.lastActionMinSec === null ||
          lastActionAge >= filters.lastActionMinSec) &&
          (filters.lastActionMaxSec === undefined ||
            filters.lastActionMaxSec === null ||
            lastActionAge <= filters.lastActionMaxSec));

      if (!matchesLastAction) {
        hide_row(row);
        continue;
      }

      if (
        matchesActivity &&
        matchesStatus &&
        matchesLevel &&
        matchesFF &&
        matchesStats &&
        matchesLastAction
      ) {
        show_row(row);
      } else {
        hide_row(row);
      }
    }

    // 3. If sorting filter is active, sort rows and append them in the updated order
    if (filters.sortBy !== "none") {
      const isEst = filters.colDisplay === FactionsColDisplay.BATTLE_STATS;
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
          !next_sibling?.classList.contains("your")
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
    isApplying.set(membersList, false);
  }
}

export function update_header_sort_indicator(
  list: HTMLElement,
  sortBy: "ff-asc" | "ff-desc" | "none",
) {
  const header = list.querySelector(".ffscouter-header") as HTMLElement | null;
  if (!header) return;

  if (sortBy === "none") {
    header.removeAttribute("data-ffscouter-sort");
    header.querySelector(".ffscouter-sort-icon")?.remove();
    return;
  }

  // data attribute drives the :has() CSS rule that hides native sort icons
  header.setAttribute(
    "data-ffscouter-sort",
    sortBy === "ff-asc" ? "asc" : "desc",
  );

  const classes = detect_sort_icon_classes(list);
  if (!classes) return;

  if (classes.tab) header.classList.add(classes.tab);

  let icon = header.querySelector(".ffscouter-sort-icon") as HTMLElement | null;
  if (!icon) {
    icon = document.createElement("div");
    icon.classList.add("ffscouter-sort-icon", classes.sortIcon);
    if (classes.activeIcon) icon.classList.add(classes.activeIcon);
    header.appendChild(icon);
  }

  icon.classList.remove(classes.asc, classes.desc);
  icon.classList.add(sortBy === "ff-asc" ? classes.asc : classes.desc);
}

function is_tt_extra_row(el: Element) {
  return (
    el.classList.contains("tt-last-action") ||
    el.classList.contains("tt-stats-estimate")
  );
}

function toggle_tt_siblings(row: HTMLElement, hidden: boolean) {
  let next = row.nextElementSibling;
  while (
    next &&
    !next.classList.contains("table-row") &&
    !next.classList.contains("enemy") &&
    !next.classList.contains("your")
  ) {
    if (is_tt_extra_row(next)) {
      if (hidden) {
        next.setAttribute("data-ffscouter-hidden", "");
      } else {
        next.removeAttribute("data-ffscouter-hidden");
      }
    }
    next = next.nextElementSibling;
  }
}

function hide_row(row: HTMLElement) {
  row.setAttribute("data-ffscouter-hidden", "");
  toggle_tt_siblings(row, true);
}

function show_row(row: HTMLElement) {
  row.removeAttribute("data-ffscouter-hidden");
  toggle_tt_siblings(row, false);
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
