import { apply_ff_gauge, torn_page, wait_for_element } from "@utils/dom";
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
import { type Feature, StartTime } from "../feature";
import "@ui/faction-filter-box";
import type { FactionFilterState } from "@ui/faction-filter-box";

const FEATURE_NAME = "faction";

// Re-entrancy guard to prevent layout loop on DOM mutation sorting
let isApplying = false;

export function apply_filters_and_sort(
  membersList: HTMLElement,
  filters: FactionFilterState,
) {
  if (isApplying) return;
  isApplying = true;

  try {
    const tbody = membersList.querySelector(".table-body");
    if (!tbody) return;

    const rows = Array.from(
      tbody.querySelectorAll(":scope > .table-row"),
    ) as HTMLElement[];

    for (const row of rows) {
      // Activity
      const activityImg = row.querySelector(".icons img");
      const activity = (
        activityImg?.getAttribute("alt") || "offline"
      ).toLowerCase();
      const matchesActivity =
        (activity === "online" && filters.activity.online) ||
        (activity === "idle" && filters.activity.idle) ||
        (activity === "offline" && filters.activity.offline);

      // Status
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
      const matchesStatus =
        (status === "okay" && filters.status.okay) ||
        (status === "traveling" && filters.status.traveling) ||
        (status === "hospital" && filters.status.hospital) ||
        (status === "jail" && filters.status.jail) ||
        (status === "abroad" && filters.status.abroad);

      // Level
      const levelCell = row.querySelector(".lvl:not(.ffscouter-cell)");
      const level = levelCell
        ? Number.parseInt(levelCell.textContent || "0", 10)
        : 0;
      const matchesLevel =
        (filters.levelMin === null || level >= filters.levelMin) &&
        (filters.levelMax === null || level <= filters.levelMax);

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

      if (matchesActivity && matchesStatus && matchesLevel && matchesFF) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    }

    if (filters.sortBy !== "none") {
      rows.sort((a, b) => {
        const getVal = (row: HTMLElement) => {
          // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
          return row.dataset["ffValue"]
            ? // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
              Number.parseFloat(row.dataset["ffValue"])
            : -1;
        };

        const valA = getVal(a);
        const valB = getVal(b);

        if (filters.sortBy.endsWith("asc")) {
          return valA - valB;
        }
        return valB - valA;
      });

      for (const row of rows) {
        tbody.appendChild(row);
      }
    }
  } finally {
    isApplying = false;
  }
}

export async function apply_ff_columns(membersList: HTMLElement) {
  const headerLvl = membersList.querySelector(".table-header > .lvl");
  if (!headerLvl) return;

  const colDisplay = ffconfig.factions_col_display;
  const isEst = colDisplay === FactionsColDisplay.BATTLE_STATS;
  const expectedText = isEst ? "Est" : "FF";

  let headerLi = membersList.querySelector(
    ".ffscouter-header",
  ) as HTMLElement | null;
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

  const rows = Array.from(
    membersList.querySelectorAll(".table-body > .table-row"),
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

  const playerIds = rowPlayers.map((p) => p.player_id);
  const dataPromises = playerIds.map((id) => ffscouter.get(id));
  ffscouter.complete();
  const dataList = await Promise.all(dataPromises);
  const dataMap = new Map(dataList.map((d) => [d.player_id, d]));

  for (const rp of rowPlayers) {
    let cell = rp.row.querySelector(".ffscouter-cell") as HTMLElement | null;
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

    const data = dataMap.get(rp.player_id);
    if (data && !data.no_data) {
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["ffValue"] = String(data.fair_fight);
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["estValue"] = String(data.bs_estimate);

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
    } else {
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["ffValue"] = "";
      // biome-ignore lint/complexity/useLiteralKeys: tsc requires index signature lookup
      rp.row.dataset["estValue"] = "";
      cell.textContent = "-";
      cell.style.backgroundColor = "";
      cell.style.color = "";
      cell.style.fontWeight = "";
      cell.title = "";
    }
  }

  // Trigger filtering and sorting if filter box is connected
  const filterBox = membersList.parentNode?.querySelector(
    "ff-faction-filter-box",
  ) as any;
  if (filterBox?.activity) {
    apply_filters_and_sort(membersList, {
      sortBy: filterBox.sortBy ?? "none",
      activity: filterBox.activity,
      status: filterBox.status,
      levelMin: filterBox.levelMin ?? null,
      levelMax: filterBox.levelMax ?? null,
      ffMin: filterBox.ffMin ?? null,
      ffMax: filterBox.ffMax ?? null,
    });
  }
}

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

function initialize_features(membersList: HTMLElement) {
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
      const filterBox = membersList.parentNode?.querySelector(
        "ff-faction-filter-box",
      ) as any;
      if (filterBox?.activity) {
        apply_filters_and_sort(membersList, {
          sortBy: filterBox.sortBy ?? "none",
          activity: filterBox.activity,
          status: filterBox.status,
          levelMin: filterBox.levelMin ?? 1,
          levelMax: filterBox.levelMax ?? 100,
          ffMin: filterBox.ffMin ?? 1,
          ffMax: filterBox.ffMax ?? null,
        });
      }
    }
  });

  attributeObserver.observe(target, {
    attributes: true,
    attributeFilter: ["class", "alt"],
    subtree: true,
  });

  const cleanupInterval = setInterval(() => {
    if (!membersList.isConnected) {
      clearInterval(cleanupInterval);
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
  let found_honor = false;
  for (const bar of root.querySelectorAll(".honor-text-wrap")) {
    apply_ff_gauge(bar, FEATURE_NAME);
    found_honor = true;
  }
  if (found_honor) {
    return;
  }
  for (const bar of root.querySelectorAll(".member")) {
    apply_ff_gauge(bar, FEATURE_NAME);
  }
  for (const l of root.querySelectorAll(".members-list, .chain-attacks-list")) {
    if (l instanceof HTMLElement) {
      apply_ff_members_list(l);
    }
  }
};

const process_page = () => {
  wait_for_element(".members-list", 10_000).then((node) => {
    if (node instanceof HTMLElement) {
      logger.debug("Found members-list!");
      monitor_member_list(node);
    }
  });

  wait_for_element(".chain-attacks-list", 10_000).then((node) => {
    if (node instanceof HTMLElement) {
      logger.debug("Found chain-attacks-list!");
      monitor_member_list(node, true);
    }
  });

  // TODO: Support #faction-info and #faction-main swapping on personal faction page

  wait_for_element("#faction_war_list_id", 10_000).then(async (node) => {
    if (!node) {
      return;
    }
    logger.debug("Found faction_war_list_id");
    const descriptions_observer = new MutationObserver(async (mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("descriptions")
          ) {
            logger.debug(
              "Observed mutation that included adding descriptions",
              node,
            );
            const faction_war = await wait_for_element(".faction-war", 10_000);
            if (faction_war instanceof HTMLElement) {
              monitor_member_list(faction_war, true);
            }
          }
        }
      }
    });
    descriptions_observer.observe(node, { childList: true });
    logger.debug("Set up descriptions observer on", node);

    const existing_descriptions = node.querySelector(".descriptions");
    if (existing_descriptions) {
      const faction_war = await wait_for_element(
        " .faction-war",
        10_000,
        existing_descriptions,
      );
      if (faction_war instanceof HTMLElement) {
        apply_ff_members_list(faction_war);
      }
    }
  });
};

export default {
  name: "Faction page FF display",
  description: "Shows FF arrows on both your faction and other faction pages.",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    // Run on the faction pages
    return (
      torn_page("factions", { step: "profile" }) ||
      torn_page("factions", { step: "your" })
    );
  },

  async run() {
    window.navigation.addEventListener("navigate", () => {
      process_page();
    });

    process_page();
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
