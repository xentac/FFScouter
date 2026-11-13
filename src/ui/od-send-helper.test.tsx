// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import default_storage from "@utils/storage";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { SEND_HELPER_POSITION_KEY, SendHelper } from "./od-send-helper";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const STEPS = [
  { label: "Open send", done: true, current: false },
  { label: "Fill recipient", done: true, current: false },
  { label: "Fill amount", done: false, current: true },
  { label: "Add message", done: false, current: false },
];

const helper = (props: { problem?: boolean } = {}) => {
  const onPress = vi.fn();
  const onCancel = vi.fn();
  render(
    <SendHelper
      label="Fill amount 3/7"
      problem={props.problem ?? false}
      steps={STEPS}
      onPress={onPress}
      onCancel={onCancel}
    />,
  );
  return { onPress, onCancel };
};

const box = () =>
  screen.getByRole("region", { name: "OD Insurance Send Helper" });
const grip = () => screen.getByRole("button", { name: "Move the Send Helper" });

describe("SendHelper", () => {
  test("a press on the step button calls onPress once", () => {
    const { onPress } = helper();
    fireEvent.click(screen.getByRole("button", { name: "Fill amount 3/7" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("the X cancels the Selected Plan", () => {
    const { onCancel, onPress } = helper();
    fireEvent.click(screen.getByRole("button", { name: "Cancel the send" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  test("the step list opens on a click, with done steps checked", () => {
    helper();
    const toggle = screen.getByRole("button", { name: "Show all steps" });
    expect(screen.queryByRole("list")).toBeNull();
    fireEvent.mouseEnter(toggle);
    expect(screen.queryByRole("list")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "✓ Open send",
      "✓ Fill recipient",
      "▸ Fill amount",
      "· Add message",
    ]);
    fireEvent.click(toggle);
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("sits at the bottom left above Torn's chat bar by default", () => {
    helper();
    expect(box().style.left).toBe("8px");
    expect(box().style.bottom).toBe("51px");
  });

  test("a drag on the grip moves the helper and saves the place", () => {
    const { onPress } = helper();
    fireEvent.pointerDown(grip(), {
      button: 0,
      pointerId: 1,
      clientX: 20,
      clientY: 700,
    });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: 120, clientY: 600 });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 120, clientY: 600 });
    expect(box().style.left).toBe("108px");
    expect(box().style.bottom).toBe("151px");
    expect(default_storage.get(SEND_HELPER_POSITION_KEY)).toEqual({
      left: 108,
      bottom: 151,
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test("a finger drag on the grip moves the helper too", () => {
    const { onPress } = helper();
    const touch = { pointerId: 7, pointerType: "touch" };
    fireEvent.pointerDown(grip(), {
      ...touch,
      button: 0,
      clientX: 20,
      clientY: 700,
    });
    fireEvent.pointerMove(window, { ...touch, clientX: 40, clientY: 690 });
    fireEvent.pointerUp(window, { ...touch, clientX: 40, clientY: 690 });
    expect(box().style.left).toBe("28px");
    expect(box().style.bottom).toBe("61px");
    expect(onPress).not.toHaveBeenCalled();
  });

  test("a saved place outside the window comes back inside it", () => {
    default_storage.set(SEND_HELPER_POSITION_KEY, { left: 99999, bottom: -40 });
    helper();
    expect(Number.parseFloat(box().style.left)).toBeLessThan(window.innerWidth);
    expect(box().style.bottom).toBe("0px");
  });

  test("marks a problem so the player sees it", () => {
    helper({ problem: true });
    expect(box().getAttribute("data-problem")).toBe("true");
  });
});
