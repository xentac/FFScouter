// @vitest-environment jsdom
import { SELLER_BOARD_RESPONSE } from "@utils/__fixtures__/bounty_board";
import { bounty_board_cache } from "@utils/bounty_board";
import { check_key_status } from "@utils/check_key";
import { DESKTOP_LAYOUT_MIN_WIDTH } from "@utils/dom";
import { ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import narrowMarkup from "./__fixtures__/torn-markup/2026-10-04/bounties-main-narrow.html?raw";
import bounties, {
  BOUNTY_LIST_TIMEOUT_MS,
  should_show_bounty_board,
  unmount_bounty_board,
} from "./index";

const navigationListeners: (() => void)[] = [];

vi.mock("@utils/dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/dom")>()),
  getLocalUserId: vi.fn().mockResolvedValue(null),
  on_navigation: vi.fn((callback: () => void) => {
    navigationListeners.push(callback);
    return () => {};
  }),
}));

vi.mock("@utils/bounty_board", () => ({
  bounty_board_cache: {
    get_board: vi.fn(),
    submit_claim: vi.fn(),
    clear_failure: vi.fn(),
  },
}));

vi.mock("@utils/check_key", () => ({
  check_key_status: { is_registered: vi.fn() },
}));

vi.mock("@utils/ffscouter", () => ({
  ffscouter: { get: vi.fn(), complete: vi.fn() },
}));

const set_location = (hash: string, page = "bounties") => {
  vi.stubGlobal("location", {
    href: `https://www.torn.com/${page}.php${hash}`,
    search: "",
    hash,
  });
};

const navigate = (hash: string) => {
  set_location(hash);
  for (const cb of navigationListeners) cb();
};

const modals = () =>
  document.querySelectorAll('section[aria-label="FF Scouter Bounties"]');

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// jsdom has no matchMedia; the stub answers from innerWidth and records the
// layout-change listeners so a test can cross Torn's 784px breakpoint.
const mediaListeners: (() => void)[] = [];
const cross_breakpoint = (width: number) => {
  vi.stubGlobal("innerWidth", width);
  for (const cb of mediaListeners) cb();
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  navigationListeners.length = 0;
  mediaListeners.length = 0;
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: window.innerWidth < DESKTOP_LAYOUT_MIN_WIDTH,
      addEventListener: (_type: string, cb: () => void) =>
        mediaListeners.push(cb),
    })),
  );
  ffconfig.key = "test-key";
  vi.mocked(check_key_status.is_registered).mockResolvedValue(true);
  vi.mocked(bounty_board_cache.get_board).mockResolvedValue(
    SELLER_BOARD_RESPONSE,
  );
  vi.mocked(ffscouter.get).mockImplementation(async (id) => ({
    no_data: true,
    player_id: id,
  }));
});

afterEach(() => {
  unmount_bounty_board();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  ffconfig.reset();
  ffconfig.key = "";
});

describe("should_show_bounty_board", () => {
  test.each([
    "",
    "#",
    "#!p=main",
    "#!p=main&start=20",
    // Torn's in-page links (pagination, the newspaper "bounties" link) write
    // the slash form.
    "#/",
    "#/!p=main&",
    "#/!p=main&start=20",
    "#/p=main",
  ])("matches the main bounty list hash %j", (hash) => {
    set_location(hash);
    expect(should_show_bounty_board()).toBe(true);
  });

  test.each([
    "#!p=add",
    "#!p=mine",
    "#/p=add",
    "#/!p=add",
  ])("does not match %j", (hash) => {
    set_location(hash);
    expect(should_show_bounty_board()).toBe(false);
  });

  test("does not match other pages", () => {
    set_location("#!p=main", "profiles");
    expect(should_show_bounty_board()).toBe(false);
  });

  test("is off when the master toggle is off", () => {
    set_location("#!p=main");
    ffconfig.bounty_board_enabled = false;
    expect(should_show_bounty_board()).toBe(false);
  });
});

test("shouldRun gates on the bounties page regardless of hash or toggle", async () => {
  set_location("#!p=add");
  ffconfig.bounty_board_enabled = false;
  expect(await bounties.shouldRun()).toBe(true);
  set_location("", "profiles");
  expect(await bounties.shouldRun()).toBe(false);
});

test("run mounts the modal on the main list and loads the board", async () => {
  set_location("#!p=main");
  await bounties.run();
  await vi.waitFor(() => expect(modals()).toHaveLength(1));
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain("Arcanine"),
  );
  expect(bounty_board_cache.get_board).toHaveBeenCalled();
});

test("navigating away unmounts and back remounts without duplicates", async () => {
  set_location("#!p=main");
  await bounties.run();
  await vi.waitFor(() => expect(modals()).toHaveLength(1));

  navigate("#!p=add");
  expect(modals()).toHaveLength(0);
  expect(document.getElementById("ffscouter-bounty-board")).toBeNull();

  navigate("#!p=main");
  await vi.waitFor(() => expect(modals()).toHaveLength(1));

  // A navigation that stays on the main list keeps the existing mount.
  navigate("#!p=main&start=20");
  await flush();
  expect(modals()).toHaveLength(1);
  expect(document.querySelectorAll("#ffscouter-bounty-board")).toHaveLength(1);
});

test("master toggle off: no modal and no bounty traffic", async () => {
  set_location("#!p=main");
  ffconfig.bounty_board_enabled = false;
  await bounties.run();
  await flush();
  expect(modals()).toHaveLength(0);
  expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
});

test("ff-config-updated live mounts and unmounts with the master toggle", async () => {
  set_location("#!p=main");
  ffconfig.bounty_board_enabled = false;
  await bounties.run();
  expect(modals()).toHaveLength(0);

  ffconfig.bounty_board_enabled = true;
  window.dispatchEvent(new CustomEvent("ff-config-updated"));
  await vi.waitFor(() => expect(modals()).toHaveLength(1));

  ffconfig.bounty_board_enabled = false;
  window.dispatchEvent(new CustomEvent("ff-config-updated"));
  expect(modals()).toHaveLength(0);
});

describe("narrow layout: in-flow section", () => {
  const content_wrapper = () => {
    const el = document.querySelector(".content-wrapper");
    if (!el) throw new Error("fixture missing .content-wrapper");
    return el;
  };
  const template = () => {
    const el = document.querySelector(".page-template-cont");
    if (!el) throw new Error("fixture missing .page-template-cont");
    return el;
  };
  // The markup Torn renders into .content-wrapper / .page-template-cont.
  const fixture_inner = (selector: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = narrowMarkup;
    return tmp.querySelector(selector)?.innerHTML ?? "";
  };
  const container = () => document.getElementById("ffscouter-bounty-board");
  const section = () => document.querySelector(".ff-bounty-modal--in-flow");

  beforeEach(() => {
    vi.stubGlobal("innerWidth", 386);
  });

  test("mounts above Torn's help message and bounty list, never floating", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() => expect(section()).not.toBeNull());
    expect(modals()).toHaveLength(1);
    expect(template().firstElementChild).toBe(container());
    expect(container()?.nextElementSibling?.className).toBe(
      "help-message-wrap",
    );
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Arcanine"),
    );
  });

  test("waits for Torn's bounty rows before mounting", async () => {
    document.body.innerHTML =
      "<div class='content-wrapper'><div class='page-template-cont'><div class='bounties-wrap'></div></div></div>";
    set_location("#!p=main");
    await bounties.run();
    await flush();
    expect(modals()).toHaveLength(0);
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();

    content_wrapper().innerHTML = fixture_inner(".content-wrapper");
    await vi.waitFor(() => expect(section()).not.toBeNull());
    expect(template().firstElementChild).toBe(container());
  });

  test("re-attaches the same board when Torn rewrites .content-wrapper", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Arcanine"),
    );
    const original = container();

    content_wrapper().innerHTML = fixture_inner(".content-wrapper");
    await vi.waitFor(() => expect(template().firstElementChild).toBe(original));
    expect(modals()).toHaveLength(1);
    expect(document.body.textContent).toContain("Arcanine");
    // Same React root: no remount, so no second board consult.
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });

  test("re-attaches once Torn renders the rows into a rewritten page", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() => expect(section()).not.toBeNull());
    const original = container();

    content_wrapper().innerHTML =
      "<div class='newspaper-wrap'><div class='page-template-cont'></div></div>";
    await flush();
    expect(original?.isConnected).toBe(false);

    template().innerHTML = fixture_inner(".page-template-cont");
    await vi.waitFor(() => expect(template().firstElementChild).toBe(original));
    expect(modals()).toHaveLength(1);
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });

  test("pagination: re-attaches when Torn swaps the template's contents", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() => expect(section()).not.toBeNull());
    const original = container();

    template().innerHTML = fixture_inner(".page-template-cont");
    navigate("#!p=main&start=20");
    await vi.waitFor(() => expect(template().firstElementChild).toBe(original));
    expect(modals()).toHaveLength(1);
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });

  test("leaving the main list unmounts; returning remounts once", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() => expect(modals()).toHaveLength(1));

    template().innerHTML = "<div class='add-bounty'></div>";
    navigate("#!p=add");
    expect(modals()).toHaveLength(0);
    expect(container()).toBeNull();

    navigate("#!p=main");
    template().innerHTML = fixture_inner(".page-template-cont");
    await vi.waitFor(() => expect(section()).not.toBeNull());
    expect(template().firstElementChild).toBe(container());
    expect(document.querySelectorAll("#ffscouter-bounty-board")).toHaveLength(
      1,
    );
  });

  test("leaving before the rows render cancels the pending mount", async () => {
    set_location("#!p=main");
    await bounties.run();
    navigate("#!p=add");
    document.body.innerHTML = narrowMarkup;
    await flush();
    expect(modals()).toHaveLength(0);
    expect(bounty_board_cache.get_board).not.toHaveBeenCalled();
  });

  test("master toggle off and on at narrow width", async () => {
    document.body.innerHTML = narrowMarkup;
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() => expect(section()).not.toBeNull());

    ffconfig.bounty_board_enabled = false;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    expect(modals()).toHaveLength(0);
    expect(container()).toBeNull();

    ffconfig.bounty_board_enabled = true;
    window.dispatchEvent(new CustomEvent("ff-config-updated"));
    await vi.waitFor(() => expect(section()).not.toBeNull());
    expect(template().firstElementChild).toBe(container());
  });

  test("falls back to the floating modal when the rows never render", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      document.body.innerHTML =
        "<div class='content-wrapper'><div class='page-template-cont'></div></div>";
      set_location("#!p=main");
      await bounties.run();
      expect(modals()).toHaveLength(0);

      await vi.advanceTimersByTimeAsync(BOUNTY_LIST_TIMEOUT_MS);
      await vi.waitFor(() => expect(modals()).toHaveLength(1));
      expect(section()).toBeNull();
      expect(container()?.parentElement).toBe(document.body);

      // Torn renders the list after all: the board moves in-flow.
      template().innerHTML = fixture_inner(".page-template-cont");
      await vi.waitFor(() => expect(section()).not.toBeNull());
      expect(template().firstElementChild).toBe(container());
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("layout changes swap the container live", () => {
  test("wide to narrow moves the same board in-flow, and back", async () => {
    document.body.innerHTML = narrowMarkup;
    vi.stubGlobal("innerWidth", 1024);
    set_location("#!p=main");
    await bounties.run();
    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Arcanine"),
    );
    const board = document.getElementById("ffscouter-bounty-board");
    expect(board?.parentElement).toBe(document.body);
    expect(document.querySelector(".ff-bounty-modal--in-flow")).toBeNull();

    cross_breakpoint(386);
    await vi.waitFor(() =>
      expect(
        document.querySelector(".ff-bounty-modal--in-flow"),
      ).not.toBeNull(),
    );
    expect(
      document.querySelector(".page-template-cont")?.firstElementChild,
    ).toBe(board);

    cross_breakpoint(1024);
    await vi.waitFor(() =>
      expect(document.querySelector(".ff-bounty-modal--in-flow")).toBeNull(),
    );
    expect(board?.parentElement).toBe(document.body);
    expect(modals()).toHaveLength(1);
    // One root throughout: the board was never refetched.
    expect(bounty_board_cache.get_board).toHaveBeenCalledTimes(1);
  });
});
