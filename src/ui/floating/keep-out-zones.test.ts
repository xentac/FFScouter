// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test } from "vitest";
import chatButtonBar from "./__fixtures__/torn-markup/2026-11-09/chat-button-bar.html?raw";
import pageHeader from "./__fixtures__/torn-markup/2026-11-10/page-header.html?raw";
import { find_chat_bar, measure_zones } from "./keep-out-zones";

function bar_with_top(top: number) {
  const bar = find_chat_bar();
  if (!bar) throw new Error("chat bar not found");
  bar.getBoundingClientRect = () =>
    ({ top, bottom: top + 40, left: 0, right: 300 }) as DOMRect;
  return bar;
}

beforeEach(() => {
  document.body.innerHTML = chatButtonBar;
  window.innerWidth = 1024;
  window.innerHeight = 768;
});

afterEach(() => {
  document.body.innerHTML = "";
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

test("the chat bar is the parent of the People button", () => {
  expect(find_chat_bar()).toBe(
    document.getElementById("people_panel_button")?.parentElement,
  );
});

test("without the People button, the chat bar is found from Notes", () => {
  const expected = document.getElementById("notes_panel_button")?.parentElement;
  document.getElementById("people_panel_button")?.remove();
  expect(expected).toBeTruthy();
  expect(find_chat_bar()).toBe(expected);
});

test("without either button there is no chat bar and no zone", () => {
  document.getElementById("people_panel_button")?.remove();
  document.getElementById("notes_panel_button")?.remove();
  expect(find_chat_bar()).toBeNull();
  expect(measure_zones()).toEqual([]);
});

test("the chat zone is a full-width strip from the bar's top to the bottom", () => {
  bar_with_top(728);
  expect(measure_zones()).toEqual([
    { left: 0, right: 1024, top: 728, bottom: 768 },
  ]);
});

test("a caller's extra zones are added to the shared ones", () => {
  bar_with_top(728);
  const extra = { left: 0, right: 100, top: 0, bottom: 50 };
  expect(measure_zones([() => extra, () => null])).toEqual([
    { left: 0, right: 1024, top: 728, bottom: 768 },
    extra,
  ]);
});

// Torn's header with a viewport rect from `top` to `bottom`, on a page
// scrolled down by `scrollY`.
function header_at(top: number, bottom: number, scrollY = 0) {
  document.body.insertAdjacentHTML("afterbegin", pageHeader);
  const header = document.getElementById("header-root");
  if (!header) throw new Error("#header-root not found");
  header.getBoundingClientRect = () =>
    ({ top, bottom, left: 0, right: 1024, height: bottom - top }) as DOMRect;
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
  });
  return header;
}

test("Torn's page header is a full-width strip from the top of the viewport", () => {
  bar_with_top(728);
  header_at(0, 70);
  expect(measure_zones()).toEqual([
    { left: 0, right: 1024, top: 728, bottom: 768 },
    { left: 0, right: 1024, top: 0, bottom: 70 },
  ]);
});

test("the header's full height stays reserved on a scrolled page", () => {
  // A modal expanded here must not end up under the header when the player
  // scrolls back to the top.
  document.body.innerHTML = "";
  header_at(-300, -230, 300);
  expect(measure_zones()).toEqual([
    { left: 0, right: 1024, top: 0, bottom: 70 },
  ]);
});

test("a header that stays in place is measured where it is now", () => {
  document.body.innerHTML = "";
  for (const position of ["fixed", "sticky"]) {
    header_at(0, 70, 300).style.position = position;
    expect(measure_zones()).toEqual([
      { left: 0, right: 1024, top: 0, bottom: 70 },
    ]);
    document.body.innerHTML = "";
  }
});

test("a hidden header is no zone", () => {
  document.body.innerHTML = "";
  header_at(0, 0, 300);
  expect(measure_zones()).toEqual([]);
});
