// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import skeleton from "./__fixtures__/torn-markup/2026-11-12/item-category-wrap-skeleton.html?raw";
import drugsPlain from "./__fixtures__/torn-markup/2026-11-12/item-drugs-plain.html?raw";
import drugsTornTools from "./__fixtures__/torn-markup/2026-11-12/item-drugs-torntools.html?raw";
import searchEcstasy from "./__fixtures__/torn-markup/2026-11-12/item-search-ecstasy-plain.html?raw";
import searchXanaxTornTools from "./__fixtures__/torn-markup/2026-11-12/item-search-xanax-torntools.html?raw";
import { add_row_slots, OD_ROW_MARK, remove_row_slots } from "./rows";

afterEach(() => {
  document.body.innerHTML = "";
});

// Ecstasy and Xanax, the items the fixture plans cover.
const COVERED = [197, 206];

const load = (html: string) => {
  document.body.innerHTML = html;
};

describe("add_row_slots", () => {
  test.each([
    ["the Drugs panel", drugsPlain, ["197", "206"]],
    ["the Drugs panel with TornTools", drugsTornTools, ["197", "206"]],
    ["an Ecstasy search", searchEcstasy, ["197"]],
    ["a Xanax search with TornTools", searchXanaxTornTools, ["206"]],
    ["the empty tabs", skeleton, []],
  ])("finds the covered rows in %s", (_label, html, items) => {
    load(html);
    const slots = add_row_slots(document, COVERED);
    expect(
      slots.map((s) => s.closest("li")?.getAttribute("data-item")),
    ).toEqual(items);
  });

  test("puts the slot inside .name-wrap, after the name", () => {
    load(drugsPlain);
    for (const slot of add_row_slots(document, COVERED)) {
      expect(slot.parentElement?.classList.contains("name-wrap")).toBe(true);
      expect(slot.nextElementSibling).toBeNull();
    }
  });

  test("puts the slot before TornTools' price", () => {
    load(drugsTornTools);
    for (const slot of add_row_slots(document, COVERED)) {
      expect(slot.parentElement?.classList.contains("name-wrap")).toBe(true);
      expect(slot.nextElementSibling?.classList.contains("tt-item-price")).toBe(
        true,
      );
    }
    expect(
      document.querySelectorAll(".name-wrap > .tt-item-price"),
    ).toHaveLength(3);
  });

  test("marks each row and adds one slot per row", () => {
    load(drugsPlain);
    expect(add_row_slots(document, COVERED)).toHaveLength(2);
    expect(document.querySelectorAll(`li[${OD_ROW_MARK}]`)).toHaveLength(2);
    expect(add_row_slots(document, COVERED)).toHaveLength(0);
    expect(document.querySelectorAll("[data-ff-od-slot]")).toHaveLength(2);
  });

  test("ignores the Trash action, which has the same data-item", () => {
    load(drugsPlain);
    add_row_slots(document, COVERED);
    expect(document.querySelector(`li.dump[${OD_ROW_MARK}]`)).toBeNull();
  });

  test("finds only the rows of the given items", () => {
    load(drugsPlain);
    const slots = add_row_slots(document, [197]);
    expect(
      slots.map((s) => s.closest("li")?.getAttribute("data-item")),
    ).toEqual(["197"]);
  });

  test("adds nothing when no item is covered", () => {
    load(drugsPlain);
    expect(add_row_slots(document, [])).toEqual([]);
    expect(document.querySelector(`[${OD_ROW_MARK}]`)).toBeNull();
  });

  test("skips Cannabis", () => {
    load(drugsPlain);
    add_row_slots(document, COVERED);
    expect(
      document.querySelector('li[data-item="196"] [data-ff-od-slot]'),
    ).toBeNull();
  });

  test("finds rows Torn adds to the search panel later", () => {
    load(skeleton);
    expect(add_row_slots(document, COVERED)).toHaveLength(0);
    const search = document.getElementById("items-search-tab") as HTMLElement;
    const loaded = document.createElement("div");
    loaded.innerHTML = searchXanaxTornTools;
    search.replaceWith(...loaded.childNodes);
    expect(add_row_slots(document, COVERED)).toHaveLength(1);
  });
});

test("remove_row_slots removes the slots and the row marks", () => {
  load(drugsPlain);
  add_row_slots(document, COVERED);
  remove_row_slots(document);
  expect(document.querySelectorAll("[data-ff-od-slot]")).toHaveLength(0);
  expect(document.querySelectorAll(`[${OD_ROW_MARK}]`)).toHaveLength(0);
});
