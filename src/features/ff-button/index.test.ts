// @vitest-environment jsdom

import { query_targets } from "@utils/api";
import { ffconfig } from "@utils/ffconfig";
import { beforeEach, expect, test, vi } from "vitest";
import {
  create_chain_button,
  filters_changed,
  get_active_filters,
  get_next_target_index,
  get_random_chain_target,
  remove_chain_button,
  update_ff_targets,
} from "./index";

vi.mock("@utils/api", () => {
  return {
    query_targets: vi.fn(),
  };
});

beforeEach(() => {
  document.body.innerHTML = "";
  localStorage.clear();
  vi.restoreAllMocks();
});

test("get_active_filters maps config properties correctly", () => {
  ffconfig.chain_min_level = 10;
  ffconfig.chain_max_level = 50;
  ffconfig.chain_min_ff = 1.5;
  ffconfig.chain_max_ff = 2.5;
  ffconfig.chain_inactive = false;
  ffconfig.chain_factionless = true;

  expect(get_active_filters()).toEqual({
    minlevel: 10,
    maxlevel: 50,
    minff: 1.5,
    maxff: 2.5,
    inactive: false,
    factionless: true,
  });
});

test("filters_changed identifies any changes", () => {
  const f1 = {
    minlevel: 10,
    maxlevel: 50,
    minff: 1.5,
    maxff: 2.5,
    inactive: true,
    factionless: false,
  };
  const f2 = { ...f1, minlevel: 11 };
  const f3 = { ...f1, inactive: false };

  expect(filters_changed(f1, f1)).toBe(false);
  expect(filters_changed(f1, f2)).toBe(true);
  expect(filters_changed(f1, f3)).toBe(true);
});

test("get_next_target_index cycles properly", () => {
  ffconfig.chain_target_index = 0;
  expect(get_next_target_index(3)).toBe(0);
  expect(get_next_target_index(3)).toBe(1);
  expect(get_next_target_index(3)).toBe(2);
  expect(get_next_target_index(3)).toBe(0);
});

test("get_random_chain_target retrieves targets sequentially", () => {
  const mockTargets = [
    { player_id: 111, name: "T1" },
    { player_id: 222, name: "T2" },
  ] as any[];

  ffconfig.chain_targets = {
    targets: mockTargets,
    expiry: Date.now() + 100000,
    filters: get_active_filters(),
  };

  ffconfig.chain_target_index = 0;
  expect(get_random_chain_target()?.player_id).toBe(111);
  expect(get_random_chain_target()?.player_id).toBe(222);
  expect(get_random_chain_target()?.player_id).toBe(111);
});

test("update_ff_targets queries API and resets index on success", async () => {
  ffconfig.key = "test-api-key";
  const mockResponse = {
    targets: [{ player_id: 999, name: "New Target" }],
  };
  vi.mocked(query_targets).mockResolvedValue(mockResponse as any);

  ffconfig.chain_target_index = 3;

  await update_ff_targets(true);

  expect(query_targets).toHaveBeenCalled();
  const cached = ffconfig.chain_targets;
  expect(cached?.targets?.[0]?.player_id).toBe(999);
  expect(ffconfig.chain_target_index).toBe(0);
});

test("create_chain_button inserts element and handles clicks", async () => {
  ffconfig.key = "api-key";
  ffconfig.chain_button_enabled = true;
  ffconfig.chain_link_type = "profile" as any;
  ffconfig.chain_tab_type = "sametab" as any;

  const mockTargets = [
    { player_id: 777, name: "T7" },
    { player_id: 888, name: "T8" },
  ];
  ffconfig.chain_targets = {
    targets: mockTargets as any[],
    expiry: Date.now() + 100000,
    filters: get_active_filters(),
  };
  ffconfig.chain_target_index = 0;

  create_chain_button();

  const anchor = document.getElementById(
    "ff-scouter-chain-btn",
  ) as HTMLAnchorElement | null;
  expect(anchor).not.toBeNull();
  expect(anchor?.tagName.toLowerCase()).toBe("a");
  expect(anchor?.getAttribute("href")).toBe(
    "https://www.torn.com/profiles.php?XID=777",
  );
  expect(anchor?.getAttribute("target")).toBe("_self");

  anchor?.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));

  expect(ffconfig.chain_target_index).toBe(1);
  expect(anchor?.getAttribute("href")).toBe(
    "https://www.torn.com/profiles.php?XID=888",
  );

  remove_chain_button();
  expect(document.getElementById("ff-scouter-chain-btn")).toBeNull();
});
