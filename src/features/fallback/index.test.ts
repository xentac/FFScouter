// @vitest-environment jsdom

import { on_navigation, torn_page } from "@utils/dom";
import { ffscouter } from "@utils/ffscouter";
import type { FFDataComplete, PlayerId } from "@utils/types";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import enemiesRowDesktop from "./__fixtures__/torn-markup/2026-09-28/enemies-row-desktop.html?raw";
import friendsRowDesktop from "./__fixtures__/torn-markup/2026-09-28/friends-row-desktop.html?raw";
import friendsRowMobile from "./__fixtures__/torn-markup/2026-09-28/friends-row-mobile.html?raw";
import targetsRowFactionless from "./__fixtures__/torn-markup/2026-09-28/targets-row-factionless-desktop.html?raw";
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

vi.mock("@utils/ffscouter", () => {
  return {
    ffscouter: {
      get: vi.fn(),
      complete: vi.fn(),
      add_analytics_entry: vi.fn(),
    },
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

// Anonymized single-row captures (2026-09-28, honor bars off) of the
// page.php?sid=list&type=friends/enemies/targets tables — Torn React markup
// with CSS-module hashed class names, so the gauge host is matched by the
// [class*="userInfoBox__"] prefix selector, not an exact class token.
describe("Fallback gauges on friends/enemies/targets list pages", () => {
  // Minimal FFDataComplete for the gauge-attach path — everything except
  // player_id/fair_fight is inert filler.
  function ff_data(player_id: PlayerId): FFDataComplete {
    return {
      player_id,
      no_data: false,
      fair_fight: 2.5,
      last_updated: 0,
      bs_estimate: 0,
      bs_estimate_human: "",
      bss_public: 0,
      source: "bss",
      premium_insights_available: false,
      available_estimates: {
        bss: {
          bss_public: 0,
          bs_estimate: 0,
          bs_estimate_human: "",
          last_updated: 0,
          fair_fight: 2.5,
        },
        premium: null,
        spies: null,
      },
      spies: [],
    };
  }

  async function run_on_list_page(fixture: string) {
    const wrapper = document.querySelector(".content-wrapper") as HTMLElement;
    wrapper.innerHTML = fixture;

    vi.mocked(torn_page).mockImplementation(
      (page, params) => page === "page" && params?.sid === "list",
    );
    vi.mocked(ffscouter.get).mockImplementation(async (player_id) =>
      ff_data(player_id),
    );

    await fallback.run();
    // Flush update_observer_state's awaited target lookup, then the
    // ffscouter.get promise inside add_ff_arrow.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    document.body.innerHTML = '<div class="content-wrapper"></div>';
    vi.clearAllMocks();
    navigationListeners.length = 0;
  });

  test("friends row (desktop): gauge attaches to the userInfoBox in fallback mode, keyed to the profile link", async () => {
    await run_on_list_page(friendsRowDesktop);

    const box = document.querySelector(
      '[class*="userInfoBox__"]',
    ) as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.classList.contains("ffscouter-gauge")).toBe(true);
    expect(box.getAttribute("data-ffscouter-attach-mode")).toBe("fallback");
    expect(box.querySelector(".ffscouter-marker-wrapper")).not.toBeNull();
    expect(ffscouter.get).toHaveBeenCalledWith(1000001);
  });

  test("friends row (mobile mode): the userInfoBoxSmall/honorWrapSmall variant also gets a gauge", async () => {
    await run_on_list_page(friendsRowMobile);

    const box = document.querySelector(
      '[class*="userInfoBox__"]',
    ) as HTMLElement;
    expect(box).not.toBeNull();
    // Confirm this really is the mobile-mode markup
    expect(box.className).toContain("userInfoBoxSmall");
    expect(box.classList.contains("ffscouter-gauge")).toBe(true);
    expect(box.getAttribute("data-ffscouter-attach-mode")).toBe("fallback");
    expect(ffscouter.get).toHaveBeenCalledWith(1000001);
  });

  test("enemies row: gauge keys on the row's profile link, not the attack link's user2ID", async () => {
    await run_on_list_page(enemiesRowDesktop);

    const box = document.querySelector(
      '[class*="userInfoBox__"]',
    ) as HTMLElement;
    expect(box).not.toBeNull();
    expect(box.classList.contains("ffscouter-gauge")).toBe(true);
    expect(ffscouter.get).toHaveBeenCalledTimes(1);
    expect(ffscouter.get).toHaveBeenCalledWith(1000002);
    // The attack link lives in the row's buttons group, outside the gauge
    // host, so ID extraction can never see user2ID.
    expect(box.querySelector('a[href*="user2ID"]')).toBeNull();
    expect(
      document.querySelector('a[href*="user2ID"]')?.closest(".ffscouter-gauge"),
    ).toBeNull();
  });

  test("targets row with no faction (empty faction wrap) still gets a gauge", async () => {
    await run_on_list_page(targetsRowFactionless);

    const box = document.querySelector(
      '[class*="userInfoBox__"]',
    ) as HTMLElement;
    expect(box).not.toBeNull();
    // Confirm this is the factionless variant
    expect(
      box.querySelector('[class*="factionWrap__"]')?.childElementCount,
    ).toBe(0);
    expect(box.classList.contains("ffscouter-gauge")).toBe(true);
    expect(ffscouter.get).toHaveBeenCalledWith(1000003);
  });

  test("honor-bars-on markup on a list page still takes the honor-bar attach path", async () => {
    const honorMarkup =
      '<a href="/profiles.php?XID=424242"><span class="honor-text-wrap">PlayerFour</span></a>';
    await run_on_list_page(honorMarkup + friendsRowDesktop);

    const honor = document.querySelector(".honor-text-wrap") as HTMLElement;
    expect(honor.classList.contains("ffscouter-gauge")).toBe(true);
    expect(honor.getAttribute("data-ffscouter-attach-mode")).toBe("honor-bar");
    expect(ffscouter.get).toHaveBeenCalledWith(424242);

    // When honor bars are present, the page-specific fallback selector is
    // not applied on top of them.
    const box = document.querySelector(
      '[class*="userInfoBox__"]',
    ) as HTMLElement;
    expect(box.classList.contains("ffscouter-gauge")).toBe(false);
  });
});
