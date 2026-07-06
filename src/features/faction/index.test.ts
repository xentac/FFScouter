// @vitest-environment jsdom

import type { FactionFilterBoxHandle } from "@ui/faction-filter-box";
import { on_navigation } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  default as factionFeature,
  getFilterBoxHandle,
  initialize_features,
  setup_war_features,
  should_run_faction,
} from "./index";

const navigationListeners: (() => void)[] = [];

async function waitForFilterBox(filterBox: FactionFilterBoxHandle) {
  while (!filterBox.ready) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function waitForAttribute(
  el: HTMLElement,
  attr: string,
  expected: boolean,
) {
  const start = Date.now();
  while (el.hasAttribute(attr) !== expected) {
    if (Date.now() - start > 1000) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

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
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Filter box should be injected at the top of the war box container
  const filterBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  );
  expect(filterBoxEl).not.toBeNull();

  // Clean up
  factionWar.remove();
});

test("setup_war_features detects TWSE last-action data and exposes it on the filter box", async () => {
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
    <li class="enemy" id="enemy-1" data-twse-last-action-timestamp="1700000000">
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

  const filterBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();
  expect(filterBox.hasLastActionData).toBe(true);

  factionWar.remove();
});

test("setup_war_features picks up TWSE annotating a row after setup has already run", async () => {
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

  factionWar.appendChild(enemyList);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);

  const filterBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();
  // TWSE hasn't run yet at the moment our watcher was set up
  expect(filterBox.hasLastActionData).toBe(false);

  // TWSE (an independent script) annotates the row some time later
  const enemyRow = enemyList.querySelector("#enemy-1") as HTMLElement;
  enemyRow.setAttribute("data-twse-last-action-timestamp", "1700000000");

  // Wait for the attribute MutationObserver + rAF debounce to run (jsdom rAF
  // fires at ~16ms), without needing the 30s poll fallback
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(filterBox.hasLastActionData).toBe(true);

  factionWar.remove();
});

test("setup_war_features leaves the filter box's hasLastActionData false when TWSE isn't present", async () => {
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

  factionWar.appendChild(enemyList);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);

  const filterBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();
  expect(filterBox.hasLastActionData).toBe(false);

  factionWar.remove();
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

  // Find the injected filterBox
  const filterBoxEl = container.parentNode?.querySelector(
    "[data-ff-filter-box]",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();

  // Set filter state: keep Okay, filter out Traveling
  filterBox.setFilterState({
    status: {
      okay: true,
      hospital: false,
      jail: false,
      abroad: false,
      traveling: false,
      federal: false,
      fallen: false,
    },
  });
  filterBox.dispatchChange();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const row = container.querySelector("#row-1") as HTMLElement;
  // Row has status 'traveling', so it should be hidden
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(true);

  // Dynamically change status class to okay
  const statusCell = row.querySelector(".status") as HTMLElement;
  statusCell.className = "status okay";

  // Wait for MutationObserver and rAF debounce to run
  await waitForAttribute(row, "data-ffscouter-hidden", false);

  // Row should now be visible!
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(false);

  container.remove();
});

test("initialize_features MutationObserver reacts to activity aria-label changes and filters correctly", async () => {
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
        <div class="member">
          <div aria-label="Player 111 is offline" class="userStatusWrap___abc"></div>
          <a href="/profiles.php?XID=111">Player 111</a>
        </div>
        <div class="lvl">50</div>
        <div class="status okay">Okay</div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // Initialize features (which sets up MutationObserver)
  initialize_features(container);

  // Find the injected filterBox
  const filterBoxEl = container.parentNode?.querySelector(
    "[data-ff-filter-box]",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();

  // Set filter state: only show Online
  filterBox.setFilterState({
    activity: { online: true, idle: false, offline: false },
  });
  filterBox.dispatchChange();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const row = container.querySelector("#row-1") as HTMLElement;
  // Row is offline, so it should be hidden
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(true);

  // Dynamically change activity to online via the aria-label Torn updates in place
  const statusWrap = row.querySelector(
    '[class*="userStatusWrap"]',
  ) as HTMLElement;
  statusWrap.setAttribute("aria-label", "Player 111 is online");

  // Wait for MutationObserver and rAF debounce to run
  await waitForAttribute(row, "data-ffscouter-hidden", false);

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

  // Find the injected filterBox
  const filterBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  );
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();

  // Set filter state: keep Traveling, filter out Okay
  filterBox.setFilterState({
    status: {
      okay: false,
      hospital: false,
      jail: false,
      abroad: false,
      traveling: true,
      federal: false,
      fallen: false,
    },
  });
  filterBox.dispatchChange();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const row = enemyList.querySelector("#enemy-1") as HTMLElement;
  // Row has status 'traveling', so it should be visible
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Dynamically change status class to okay
  const statusCell = row.querySelector(".status") as HTMLElement;
  statusCell.className = "status okay";

  // Wait for MutationObserver and rAF debounce to run
  await waitForAttribute(row, "data-ffscouter-hidden", true);

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

  const filterBoxEl = factionWar.querySelector("[data-ff-filter-box]");
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
  expect(filterBoxEl).not.toBeNull();

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

  const filterBoxEl = factionWar.querySelector("[data-ff-filter-box]");
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);
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

  const filterBoxEl = factionWar.querySelector("[data-ff-filter-box]");
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);

  const ffHeader = list.querySelector(".ffscouter-header") as HTMLElement;
  expect(ffHeader).not.toBeNull();
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBeNull();

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

test("faction filter disabled in settings: box mounts hidden, saved filters don't apply, sort still works", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  ffconfig.faction_filter_enabled = false;
  // Saved state that would hide the traveling row if filtering applied
  ffconfig.faction_filter_state = {
    filterEnabled: true,
    status: {
      okay: true,
      traveling: false,
      hospital: false,
      jail: false,
      abroad: false,
      federal: false,
      fallen: false,
    },
  };

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

  initialize_features(container);

  const filterBoxEl = container.parentNode?.querySelector(
    "[data-ff-filter-box]",
  ) as HTMLElement;
  expect(filterBoxEl).not.toBeNull();
  const filterBox = getFilterBoxHandle(filterBoxEl)!;
  await waitForFilterBox(filterBox);

  // Box is mounted (so its handle stays alive for sorting) but hidden
  expect(filterBoxEl.style.display).toBe("none");

  // Snapshots report filtering off, so the traveling row stays visible
  expect(filterBox.getFilterSnapshot().filterEnabled).toBe(false);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const row = container.querySelector("#row-1") as HTMLElement;
  expect(row.hasAttribute("data-ffscouter-hidden")).toBe(false);

  // Stored filter state is untouched by the override
  expect(ffconfig.faction_filter_state?.filterEnabled).toBe(true);
  expect(ffconfig.faction_filter_state?.status?.traveling).toBe(false);

  // FF/Est sort still works through the live handle (the header-click path)
  filterBox.setSortBy("ff-desc");
  expect(filterBox.sortBy).toBe("ff-desc");
  const ffHeader = container.querySelector(".ffscouter-header") as HTMLElement;
  expect(ffHeader).not.toBeNull();
  expect(ffHeader.getAttribute("data-ffscouter-sort")).toBe("desc");

  container.remove();
});

test("war filter disabled in settings hides only the war box, not the faction box", async () => {
  vi.mocked(ffscouter.get).mockResolvedValue({
    player_id: 111 as PlayerId,
    no_data: true,
  } as any);

  ffconfig.war_filter_enabled = false;

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
  factionWar.appendChild(enemyList);
  document.body.appendChild(factionWar);

  setup_war_features(factionWar);
  await new Promise((resolve) => setTimeout(resolve, 0));

  const warBoxEl = factionWar.querySelector(
    "[data-ff-filter-box][data-mode='war']",
  ) as HTMLElement;
  expect(warBoxEl).not.toBeNull();
  expect(warBoxEl.style.display).toBe("none");
  const warBox = getFilterBoxHandle(warBoxEl)!;
  await waitForFilterBox(warBox);
  expect(warBox.getFilterSnapshot().filterEnabled).toBe(false);

  // Own wrapper so inject_filter_box's duplicate-guard doesn't see the war box
  const wrapper = document.createElement("div");
  const membersList = document.createElement("div");
  membersList.className = "members-list";
  membersList.innerHTML = `
    <ul class="table-header">
      <li class="member">Member</li>
      <li class="lvl">Lvl</li>
    </ul>
    <div class="table-body">
      <div class="table-row" id="row-1">
        <div class="member"><a href="/profiles.php?XID=222">Player 222</a></div>
        <div class="lvl">60</div>
        <div class="status okay">Okay</div>
      </div>
    </div>
  `;
  wrapper.appendChild(membersList);
  document.body.appendChild(wrapper);

  initialize_features(membersList);

  const factionBoxEl = wrapper.querySelector(
    "[data-ff-filter-box][data-mode='faction']",
  ) as HTMLElement;
  expect(factionBoxEl).not.toBeNull();
  expect(factionBoxEl.style.display).toBe("contents");
  // Wait for the mount to settle so no React work is queued at teardown
  await waitForFilterBox(getFilterBoxHandle(factionBoxEl)!);

  factionWar.remove();
  wrapper.remove();
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
});
