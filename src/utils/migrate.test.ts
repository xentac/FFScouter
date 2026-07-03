// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { FFConfig } from "./ffconfig";
import { clear_v2_data, run_migration } from "./migrate";

const V3 = "ffsv3-config";

function v2_set(key: string, value: string) {
  localStorage.setItem(`ffscouterv2-${key}`, value);
}

function v3_read<T>(key: string): T | null {
  const raw = localStorage.getItem(V3 + key);
  if (!raw) return null;
  return JSON.parse(raw).value as T;
}

beforeEach(() => {
  localStorage.clear();
});

describe("run_migration", () => {
  test("migrates API key from limited_key", () => {
    localStorage.setItem("limited_key", "myapikey123");
    run_migration();
    expect(v3_read("key")).toBe("myapikey123");
  });

  test("does not overwrite existing v3 API key", () => {
    localStorage.setItem("limited_key", "old-key");
    localStorage.setItem(
      `${V3}key`,
      JSON.stringify({ value: "new-key", expiration: null }),
    );
    run_migration();
    expect(v3_read("key")).toBe("new-key");
  });

  test("migrates boolean settings", () => {
    v2_set("debug-logs", "true");
    v2_set("ff-history-enabled", "false");
    v2_set("chain-button-enabled", "true");
    run_migration();
    expect(v3_read("debug_logs")).toBe(true);
    expect(v3_read("ff_history_enabled")).toBe(false);
    expect(v3_read("chain_button_enabled")).toBe(true);
  });

  test("migrates string enum settings", () => {
    v2_set("factions-col-display", "fair_fight");
    v2_set("chain-link-type", "profile");
    v2_set("chain-tab-type", "sametab");
    run_migration();
    expect(v3_read("factions_col_display")).toBe("fair_fight");
    expect(v3_read("chain_link_type")).toBe("profile");
    expect(v3_read("chain_tab_type")).toBe("sametab");
  });

  test("rejects invalid enum values", () => {
    v2_set("factions-col-display", "invalid_value");
    v2_set("chain-link-type", "bad");
    run_migration();
    expect(v3_read("factions_col_display")).toBeNull();
    expect(v3_read("chain_link_type")).toBeNull();
  });

  test("migrates chain-ff-target as float", () => {
    v2_set("chain-ff-target", "3.5");
    run_migration();
    expect(v3_read("chain_ff_target")).toBe(3.5);
  });

  test("migrates FF ranges from JSON blob", () => {
    localStorage.setItem(
      "ffscouterv2-ranges",
      JSON.stringify({ low: 1.5, high: 3.5, max: 7 }),
    );
    run_migration();
    expect(v3_read("low_ff_range")).toBe(1.5);
    expect(v3_read("high_ff_range")).toBe(3.5);
    expect(v3_read("max_ff_range")).toBe(7);
  });

  test("does not overwrite individually set v3 range keys", () => {
    localStorage.setItem(
      "ffscouterv2-ranges",
      JSON.stringify({ low: 1, high: 3, max: 6 }),
    );
    localStorage.setItem(
      `${V3}low_ff_range`,
      JSON.stringify({ value: 99, expiration: null }),
    );
    run_migration();
    expect(v3_read("low_ff_range")).toBe(99);
    // other range keys still unset because the guard fires when any one is present
    expect(v3_read("high_ff_range")).toBeNull();
  });

  test("migrates est sort order when display is battle_stats", () => {
    v2_set("factions-col-display", "battle_stats");
    v2_set("factions-est-sort-order", "asc");
    run_migration();
    const state = v3_read<{ sortBy: string }>("faction_filter_state");
    expect(state?.sortBy).toBe("ff-asc");
  });

  test("migrates ff sort order when display is fair_fight", () => {
    v2_set("factions-col-display", "fair_fight");
    v2_set("factions-ff-sort-order", "desc");
    run_migration();
    const state = v3_read<{ sortBy: string }>("faction_filter_state");
    expect(state?.sortBy).toBe("ff-desc");
  });

  test("does not set faction_filter_state when sort order is missing", () => {
    v2_set("factions-col-display", "battle_stats");
    run_migration();
    expect(v3_read("faction_filter_state")).toBeNull();
  });

  test("does not overwrite existing faction_filter_state", () => {
    v2_set("factions-col-display", "battle_stats");
    v2_set("factions-est-sort-order", "asc");
    localStorage.setItem(
      `${V3}faction_filter_state`,
      JSON.stringify({ value: { sortBy: "ff-desc" }, expiration: null }),
    );
    run_migration();
    const state = v3_read<{ sortBy: string }>("faction_filter_state");
    expect(state?.sortBy).toBe("ff-desc");
  });

  test("is idempotent when run twice", () => {
    localStorage.setItem("limited_key", "myapikey");
    v2_set("debug-logs", "true");
    run_migration();
    run_migration();
    expect(v3_read("key")).toBe("myapikey");
    expect(v3_read("debug_logs")).toBe(true);
  });

  test("migrated values are readable by FFConfig", () => {
    localStorage.setItem("limited_key", "test-key");
    v2_set("debug-logs", "false");
    v2_set("chain-ff-target", "2.0");
    run_migration();
    const config = new FFConfig("ffsv3-config");
    expect(config.key).toBe("test-key");
    expect(config.debug_logs).toBe(false);
    expect(config.chain_ff_target).toBe(2.0);
  });
});

describe("clear_v2_data", () => {
  test("removes limited_key", () => {
    localStorage.setItem("limited_key", "key");
    clear_v2_data();
    expect(localStorage.getItem("limited_key")).toBeNull();
  });

  test("removes all ffscouterv2- prefixed keys", () => {
    v2_set("debug-logs", "true");
    v2_set("chain-button-enabled", "true");
    localStorage.setItem("other-key", "keep");
    clear_v2_data();
    expect(localStorage.getItem("ffscouterv2-debug-logs")).toBeNull();
    expect(localStorage.getItem("ffscouterv2-chain-button-enabled")).toBeNull();
    expect(localStorage.getItem("other-key")).toBe("keep");
  });

  test("does not touch v3 keys", () => {
    localStorage.setItem(
      `${V3}key`,
      JSON.stringify({ value: "v3-key", expiration: null }),
    );
    clear_v2_data();
    expect(v3_read("key")).toBe("v3-key");
  });
});
