import { getFilterBoxHandle } from "@ui/faction-filter-box";
import { check_key_status } from "@utils/check_key";
import { get_player_id_in_element, open_attack_link } from "@utils/dom";
import {
  extract_bs_estimate,
  extract_bs_estimate_human,
  extract_ff,
} from "@utils/estimate";
import { FactionsColDisplay, ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import logger from "@utils/logger";
import {
  format_ff_score,
  format_relative_time,
  get_contrast_color,
  get_ff_colour,
} from "@utils/strings";
import type { PlayerId } from "@utils/types";
import {
  apply_filters_and_sort,
  update_header_sort_indicator,
} from "./filter-sort-engine";

const log = logger.child("feature:faction");

// ============================================================================
// COLUMN DATA POPULATION
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

  const factionWar = membersList.closest(".faction-war") as HTMLElement | null;
  if (factionWar) {
    factionWar.setAttribute("data-ffscouter-col-display", colDisplay);
  }

  let headerLi = membersList.querySelector(
    ".ffscouter-header",
  ) as HTMLElement | null;

  if (isNone) {
    if (headerLi) {
      headerLi.remove();
    }
  } else {
    if (
      headerLi &&
      ((isWar && headerLi.tagName !== "DIV") ||
        (!isWar && headerLi.tagName !== "LI"))
    ) {
      headerLi.remove();
      headerLi = null;
    }

    if (!headerLi) {
      if (isWar) {
        const headerLvlEl = membersList.querySelector(
          ".white-grad > .level",
        ) as HTMLElement | null;
        if (headerLvlEl) {
          headerLi = document.createElement("div");
          headerLi.classList.add("left", "level", "ffscouter-header");
          headerLvlEl.after(headerLi);
        }
      } else {
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
    }

    if (headerLi && headerLi.textContent !== expectedText) {
      headerLi.textContent = expectedText;
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

    if (isNone) {
      if (cell) {
        cell.remove();
      }
    } else {
      if (!cell) {
        cell = document.createElement("div");
        if (isWar) {
          cell.classList.add("left", "level", "ffscouter-cell");
          const levelEl = rp.row.querySelector(".level, [class*='level__']");
          if (levelEl) {
            levelEl.after(cell);
          } else {
            rp.memberDiv.after(cell);
          }
        } else {
          cell.classList.add("table-cell", "lvl", "ffscouter-cell");
          const rowLvl = rp.row.querySelector(".lvl");
          if (rowLvl) {
            rowLvl.after(cell);
          } else {
            rp.memberDiv.after(cell);
          }
        }
      }

      cell.style.cursor = "pointer";
      cell.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const forceNewTab = e.ctrlKey || e.metaKey || e.button === 1;
        open_attack_link(rp.player_id, {
          openInNewTab: forceNewTab ? true : undefined,
        });
      };
    }

    const data = dataMap.get(rp.player_id);
    if (data && !data.no_data) {
      // Store values on data-attributes for fast, local filtering and sorting operations
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["ffValue"] = String(extract_ff(data));
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["estValue"] = String(extract_bs_estimate(data));

      if (cell) {
        const text = isEst
          ? extract_bs_estimate_human(data)
          : format_ff_score(data);
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

  // Trigger filtering and sorting if filter box is connected
  const boxEl = (
    membersList.closest(".faction-war") || membersList.parentNode
  )?.querySelector("[data-ff-filter-box]");
  const handle = getFilterBoxHandle(boxEl);
  if (handle?.activity) {
    apply_filters_and_sort(membersList, {
      ...handle.getFilterSnapshot(),
      colDisplay,
    });
  }

  update_header_sort_indicator(membersList, handle?.sortBy ?? "none");

  // Concurrently scan flights for traveling players
  poll_traveling_flights(membersList);
}
