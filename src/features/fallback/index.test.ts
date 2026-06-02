// @vitest-environment jsdom

import { on_navigation, torn_page } from "@utils/dom";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import fallback from "./index";

// Keep track of navigation listeners to simulate SPA page transitions
const navigationListeners: (() => void)[] = [];

vi.mock("@utils/dom", async (importOriginal) => {
  const original = await importOriginal<typeof import("@utils/dom")>();
  return {
    ...original,
    torn_page: vi.fn(),
    on_navigation: vi.fn((callback) => {
      navigationListeners.push(callback);
      return () => {
        const index = navigationListeners.indexOf(callback);
        if (index > -1) navigationListeners.splice(index, 1);
      };
    }),
  };
});

describe("Fallback Dynamic MutationObserver Feature", () => {
  let observeSpy: any;
  let disconnectSpy: any;

  beforeAll(() => {
    observeSpy = vi.spyOn(MutationObserver.prototype, "observe");
    disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect");
  });

  beforeEach(() => {
    document.body.innerHTML = '<div class="content-wrapper"></div>';
    vi.clearAllMocks();
    navigationListeners.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test("shouldRun always returns true globally to enable navigation detection", async () => {
    const result = await fallback.shouldRun();
    expect(result).toBe(true);
  });

  test("initializes and connects the MutationObserver on an included page", async () => {
    // Simulate being on an included page (e.g. hospitalview)
    vi.mocked(torn_page).mockImplementation((page) => page === "hospitalview");

    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(on_navigation).toHaveBeenCalled();
    expect(observeSpy).toHaveBeenCalledTimes(1);
    const contentWrapper = document.querySelector(".content-wrapper");
    expect(observeSpy).toHaveBeenCalledWith(
      contentWrapper,
      expect.objectContaining({
        childList: true,
        subtree: true,
      }),
    );
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  test("initializes but does NOT connect the MutationObserver on an excluded page", async () => {
    // Simulate being on an excluded page (e.g. gym)
    vi.mocked(torn_page).mockImplementation((page) => page === "gym");

    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(on_navigation).toHaveBeenCalled();
    expect(observeSpy).not.toHaveBeenCalled();
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  test("disconnects the MutationObserver when navigating from an included page to an excluded page", async () => {
    // 1. Start on included page
    vi.mocked(torn_page).mockImplementation((page) => page === "hospitalview");
    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).not.toHaveBeenCalled();

    // 2. Simulate navigation to excluded page (gym)
    vi.mocked(torn_page).mockImplementation((page) => page === "gym");

    // Trigger navigation listeners
    for (const listener of navigationListeners) {
      listener();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  test("reconnects the MutationObserver when navigating from an excluded page back to an included page", async () => {
    // 1. Start on excluded page (gym)
    vi.mocked(torn_page).mockImplementation((page) => page === "gym");
    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).not.toHaveBeenCalled();

    // 2. Simulate navigation to included page (hospitalview)
    vi.mocked(torn_page).mockImplementation((page) => page === "hospitalview");

    // Trigger navigation listeners
    for (const listener of navigationListeners) {
      listener();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  test("does not disconnect if already disconnected on navigation", async () => {
    // Start on excluded page
    vi.mocked(torn_page).mockImplementation((page) => page === "gym");
    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).not.toHaveBeenCalled();
    expect(disconnectSpy).not.toHaveBeenCalled();

    // Navigate to another excluded page (itemMarket)
    vi.mocked(torn_page).mockImplementation((page, params: any) => {
      return (
        page === "itemMarket" ||
        (page === "page" && params?.sid === "itemMarket")
      );
    });

    // Trigger navigation listeners
    for (const listener of navigationListeners) {
      listener();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).not.toHaveBeenCalled();
    expect(disconnectSpy).not.toHaveBeenCalled();
  });

  test("does not reconnect if already connected on navigation", async () => {
    // Start on included page
    vi.mocked(torn_page).mockImplementation((page) => page === "hospitalview");
    await fallback.run();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(observeSpy).toHaveBeenCalledTimes(1);

    // Navigate to another included page (messages)
    vi.mocked(torn_page).mockImplementation((page) => page === "messages");

    // Trigger navigation listeners
    for (const listener of navigationListeners) {
      listener();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should still only have called observe once
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).not.toHaveBeenCalled();
  });
});
