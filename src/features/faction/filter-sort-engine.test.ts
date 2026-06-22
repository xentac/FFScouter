// @vitest-environment jsdom

import { FactionsColDisplay } from "@utils/ffconfig";
import { beforeEach, expect, test } from "vitest";
import { apply_filters_and_sort } from "./filter-sort-engine";

beforeEach(() => {
  document.body.innerHTML = "";
});

test("apply_filters_and_sort filters and sorts member rows correctly", () => {
  const container = document.createElement("div");
  container.innerHTML = `
    <div class="members-list">
      <div class="table-body">
        <div class="table-row" id="row-1" data-ff-value="2.5" data-est-value="1000000">
          <div class="member">
            <span class="icons"><div aria-label="Player 111 is online" class="userStatusWrap___abc"></div></span>
            <a href="/profiles.php?XID=111">Player 111</a>
          </div>
          <div class="lvl">50</div>
          <div class="status okay">Okay</div>
        </div>
        <div class="table-row" id="row-2" data-ff-value="4.5" data-est-value="5000000">
          <div class="member">
            <span class="icons"><div aria-label="Player 222 is offline" class="userStatusWrap___abc"></div></span>
            <a href="/profiles.php?XID=222">Player 222</a>
          </div>
          <div class="lvl">60</div>
          <div class="status hospital">Hospital</div>
        </div>
        <div class="table-row" id="row-3" data-ff-value="1.5" data-est-value="500000">
          <div class="member">
            <span class="icons"><div aria-label="Player 333 is idle" class="userStatusWrap___abc"></div></span>
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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);

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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);

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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);

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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);

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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(true);

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

  expect(
    (tbody.querySelector("#row-1") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-2") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);
  expect(
    (tbody.querySelector("#row-3") as HTMLElement).hasAttribute(
      "data-ffscouter-hidden",
    ),
  ).toBe(false);

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
        <div class="icons"><div aria-label="Player 111 is offline" class="userStatusWrap___abc"></div></div>
      </div>
      <div class="table-row" id="row-2" data-ff-value="3.5" data-est-value="5000">
        <div class="member"><a href="/profiles.php?XID=222">Player 222</a></div>
        <div class="lvl">60</div>
        <div class="status okay">Okay</div>
        <div class="icons"><div aria-label="Player 222 is online" class="userStatusWrap___abc"></div></div>
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
