// @vitest-environment jsdom

import { ffconfig } from "@utils/ffconfig";
import { afterEach, expect, test } from "vitest";
import { getReact, getReactDOM } from "./react-loader";

const REAL_UNSAFE_WINDOW = (
  globalThis as unknown as {
    unsafeWindow: { React: unknown; ReactDOM: unknown };
  }
).unsafeWindow;

function setUnsafeWindowReact(value: { React?: unknown; ReactDOM?: unknown }) {
  (globalThis as unknown as { unsafeWindow: unknown }).unsafeWindow = value;
}

afterEach(() => {
  setUnsafeWindowReact(REAL_UNSAFE_WINDOW);
  ffconfig.debug_force_react_fallback = false;
  delete (globalThis as { React?: unknown }).React;
  delete (globalThis as { ReactDOM?: unknown }).ReactDOM;
});

test("prefers unsafeWindow's React/ReactDOM when both are present", () => {
  const requiredReact = { requiredReact: true };
  const requiredReactDOM = { requiredReactDOM: true };
  (globalThis as { React?: unknown }).React = requiredReact;
  (globalThis as { ReactDOM?: unknown }).ReactDOM = requiredReactDOM;

  expect(getReact()).toBe(REAL_UNSAFE_WINDOW.React);
  expect(getReactDOM()).toBe(REAL_UNSAFE_WINDOW.ReactDOM);
});

test("falls back to the same-realm required globals when unsafeWindow doesn't expose React/ReactDOM", () => {
  setUnsafeWindowReact({});
  const requiredReact = { requiredReact: true };
  const requiredReactDOM = { requiredReactDOM: true };
  (globalThis as { React?: unknown }).React = requiredReact;
  (globalThis as { ReactDOM?: unknown }).ReactDOM = requiredReactDOM;

  expect(getReact()).toBe(requiredReact);
  expect(getReactDOM()).toBe(requiredReactDOM);
});

test("falls back when unsafeWindow only exposes one of React/ReactDOM", () => {
  setUnsafeWindowReact({ React: REAL_UNSAFE_WINDOW.React });
  const requiredReact = { requiredReact: true };
  const requiredReactDOM = { requiredReactDOM: true };
  (globalThis as { React?: unknown }).React = requiredReact;
  (globalThis as { ReactDOM?: unknown }).ReactDOM = requiredReactDOM;

  expect(getReact()).toBe(requiredReact);
  expect(getReactDOM()).toBe(requiredReactDOM);
});

test("debug_force_react_fallback forces the required globals even when unsafeWindow works, for exercising it on Chrome/Firefox", () => {
  ffconfig.debug_force_react_fallback = true;
  const requiredReact = { requiredReact: true };
  const requiredReactDOM = { requiredReactDOM: true };
  (globalThis as { React?: unknown }).React = requiredReact;
  (globalThis as { ReactDOM?: unknown }).ReactDOM = requiredReactDOM;

  expect(getReact()).toBe(requiredReact);
  expect(getReactDOM()).toBe(requiredReactDOM);
});
