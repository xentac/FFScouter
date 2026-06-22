// @vitest-environment jsdom

import { on_navigation } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import type { PlayerId } from "@utils/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  default as factionFeature,
  initialize_features,
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
  const filterBox = factionWar.querySelector(
    "ff-faction-filter-box[mode='war']",
  );
  expect(filterBox).not.toBeNull();

  // Clean up
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
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Find the injected filterBox
  const filterBox = container.parentNode?.querySelector(
    "ff-faction-filter-box",
  ) as any;
  expect(filterBox).not.toBeNull();

  // Set filter state: only show Online
  filterBox.activity = { online: true, idle: false, offline: false };
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
});
