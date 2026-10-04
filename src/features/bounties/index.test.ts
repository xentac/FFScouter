// @vitest-environment jsdom
import { SELLER_BOARD_RESPONSE } from "@utils/__fixtures__/bounty_board";
import { bounty_board_cache } from "@utils/bounty_board";
import { check_key_status } from "@utils/check_key";
import { ffconfig } from "@utils/ffconfig";
import { ffscouter } from "@utils/ffscouter";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import bounties, {
  should_show_bounty_modal,
  unmount_bounty_modal,
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

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  navigationListeners.length = 0;
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
  unmount_bounty_modal();
  vi.unstubAllGlobals();
  ffconfig.reset();
  ffconfig.key = "";
});

describe("should_show_bounty_modal", () => {
  test.each([
    "",
    "#",
    "#!p=main",
    "#!p=main&start=20",
  ])("matches the main bounty list hash %j", (hash) => {
    set_location(hash);
    expect(should_show_bounty_modal()).toBe(true);
  });

  test.each(["#!p=add", "#!p=mine"])("does not match %j", (hash) => {
    set_location(hash);
    expect(should_show_bounty_modal()).toBe(false);
  });

  test("does not match other pages", () => {
    set_location("#!p=main", "profiles");
    expect(should_show_bounty_modal()).toBe(false);
  });

  test("is off when the master toggle is off", () => {
    set_location("#!p=main");
    ffconfig.bounty_board_enabled = false;
    expect(should_show_bounty_modal()).toBe(false);
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
