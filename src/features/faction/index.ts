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

const FEATURE_NAME = "faction";

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
  );
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
      cell.textContent = "-";
      cell.style.backgroundColor = "";
      cell.style.color = "";
      cell.style.fontWeight = "";
      cell.title = "";
    }
  }
}

const monitor_member_list = (
  root: HTMLElement = document.body,
  _dynamic = false,
) => {
  if (
    root.classList.contains("members-list") ||
    root.querySelector(".members-list")
  ) {
    const membersList = root.classList.contains("members-list")
      ? root
      : (root.querySelector(".members-list") as HTMLElement);
    apply_ff_columns(membersList);
  } else {
    apply_ff_members_list(root);
  }

  const m = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (
          node instanceof HTMLElement &&
          (node.querySelector(".honor-text-wrap") ||
            node.querySelector(".member") ||
            node.classList.contains("table-row"))
        ) {
          shouldUpdate = true;
          break;
        }
      }
      if (shouldUpdate) break;
    }
    if (shouldUpdate) {
      if (
        root.classList.contains("members-list") ||
        root.querySelector(".members-list")
      ) {
        const membersList = root.classList.contains("members-list")
          ? root
          : (root.querySelector(".members-list") as HTMLElement);
        apply_ff_columns(membersList);
      } else {
        apply_ff_members_list(root);
      }
    }
  });

  m.observe(root, { childList: true, subtree: true });

  const cleanupInterval = setInterval(() => {
    if (!root.isConnected) {
      clearInterval(cleanupInterval);
      m.disconnect();
    }
  }, 10_000);
};

const apply_ff_members_list = (root: HTMLElement = document.body) => {
  if (
    root.classList.contains("members-list") ||
    root.querySelector(".members-list")
  ) {
    const membersList = root.classList.contains("members-list")
      ? root
      : (root.querySelector(".members-list") as HTMLElement);
    apply_ff_columns(membersList);
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
        ".faction-war",
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
