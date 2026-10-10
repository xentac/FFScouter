// @vitest-environment jsdom

import { FactionsColDisplay } from "@utils/ffconfig";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import warRowIdle from "./__fixtures__/torn-markup/2026-06-22/war-row-idle.html?raw";
import warRowOffline from "./__fixtures__/torn-markup/2026-06-22/war-row-offline.html?raw";
import warRowOnline from "./__fixtures__/torn-markup/2026-06-22/war-row-online.html?raw";
import { watch_native_reorder } from "./native-reorder-watcher";

const FILTERS = {
  sortBy: "ff-desc" as "ff-desc" | "ff-asc" | "none",
  colDisplay: FactionsColDisplay.FAIR_FIGHT,
  activity: { online: true, idle: true, offline: true },
  status: {
    okay: true,
    hospital: true,
    jail: true,
    abroad: true,
    traveling: true,
    federal: true,
    fallen: true,
  },
  levelMin: null,
  levelMax: null,
  ffMin: null,
  ffMax: null,
};

let rafQueue: FrameRequestCallback[] = [];
let disposers: (() => void)[] = [];

beforeEach(() => {
  document.body.innerHTML = "";
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
});

afterEach(() => {
  for (const dispose of disposers) dispose();
  disposers = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function run_frame() {
  const queue = rafQueue;
  rafQueue = [];
  for (const cb of queue) cb(0);
}

// Microtasks only — never runs requestAnimationFrame callbacks, so anything
// observed after this happened before the browser could paint.
async function flush_microtasks() {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

function watch(list: HTMLElement, filters = FILTERS) {
  disposers.push(watch_native_reorder(list, () => filters));
}

// A Ranked War list built from the 2026-06-22 captures, already in FF-desc
// order: 329533 (8.06), 2683610 (6.54), 1978010 (4.59).
function make_fixture_war_list() {
  const list = document.createElement("div");
  list.className = "enemy-faction";
  list.innerHTML = `<ul class="members-list">${warRowOffline}${warRowIdle}${warRowOnline}</ul>`;
  document.body.appendChild(list);
  return list;
}

const ids = (list: HTMLElement) =>
  Array.from(list.querySelectorAll<HTMLElement>(".enemy, .table-row")).map(
    (r) => r.getAttribute("data-player_id") ?? r.id,
  );

test("a Native Reorder is undone before the next animation frame", async () => {
  const list = make_fixture_war_list();
  const ul = list.querySelector(".members-list") as HTMLElement;
  watch(list);

  // Torn moves the lowest-FF row to the top (e.g. it just scored).
  ul.insertBefore(ul.lastElementChild as Element, ul.firstElementChild);
  expect(ids(list)).toEqual(["1978010", "329533", "2683610"]);

  await flush_microtasks();

  expect(ids(list)).toEqual(["329533", "2683610", "1978010"]);
});

test("a Native Reorder is left alone when no FF sort is active", async () => {
  const list = make_fixture_war_list();
  const ul = list.querySelector(".members-list") as HTMLElement;
  watch(list, { ...FILTERS, sortBy: "none" });

  ul.insertBefore(ul.lastElementChild as Element, ul.firstElementChild);
  const records: MutationRecord[] = [];
  const recorder = new MutationObserver((m) => records.push(...m));
  recorder.observe(list, { childList: true, subtree: true, attributes: true });

  await flush_microtasks();
  recorder.disconnect();

  expect(records).toEqual([]);
  expect(ids(list)).toEqual(["1978010", "329533", "2683610"]);
});

test("changes inside a row don't trigger a re-sort", async () => {
  const list = make_fixture_war_list();
  const ul = list.querySelector(".members-list") as HTMLElement;
  // Out of order, but only a direct-child move should prompt a re-sort.
  ul.appendChild(ul.firstElementChild as Element);
  watch(list);

  const points = list.querySelector(".points") as HTMLElement;
  points.textContent = "999.99";
  points.appendChild(document.createElement("span"));
  await flush_microtasks();

  expect(ids(list)).toEqual(["2683610", "1978010", "329533"]);
});

test("a re-sort loop trips the circuit breaker and falls back to one sort per frame", async () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  const list = make_fixture_war_list();
  const ul = list.querySelector(".members-list") as HTMLElement;
  watch(list);

  // Stands in for a broken idempotence check: every time our sort leaves the
  // list in FF order, something moves a row out of order again.
  const sorted = ["329533", "2683610", "1978010"];
  let hostileMoves = 0;
  const hostile = new MutationObserver(() => {
    if (ids(list).join() === sorted.join()) {
      hostileMoves++;
      ul.appendChild(ul.firstElementChild as Element);
    }
  });
  hostile.observe(ul, { childList: true });

  ul.appendChild(ul.firstElementChild as Element);
  await flush_microtasks();

  // Bounded: the chain stopped instead of spinning through every microtask.
  expect(hostileMoves).toBeLessThanOrEqual(4);
  expect(rafQueue.length).toBeGreaterThan(0);
  expect(warnSpy).toHaveBeenCalledTimes(1);

  hostile.disconnect();
  run_frame();
  await flush_microtasks();
  expect(ids(list)).toEqual(sorted);
});

test("a reorder of a standard member list is undone too", async () => {
  const membersList = document.createElement("div");
  membersList.className = "members-list";
  membersList.innerHTML = `<div class="table-body">${[
    [1, 3],
    [2, 2],
    [3, 1],
  ]
    .map(
      ([id, ff]) =>
        `<div class="table-row" id="r${id}" data-ff-value="${ff}"><a href="/profiles.php?XID=${id}">P${id}</a></div>`,
    )
    .join("")}</div>`;
  document.body.appendChild(membersList);
  const body = membersList.querySelector(".table-body") as HTMLElement;
  watch(membersList);

  body.appendChild(body.firstElementChild as Element);
  await flush_microtasks();

  expect(ids(membersList)).toEqual(["r1", "r2", "r3"]);
});
