// @vitest-environment jsdom
import { beforeEach, expect, test } from "vitest";
import {
  ChainLinkType,
  ChainTabType,
  CONFIG_DEFAULTS,
  FactionsColDisplay,
  FFConfig,
} from "./ffconfig";

let config: FFConfig;

beforeEach(() => {
  localStorage.clear();
  config = new FFConfig("test-config");
});

test("FFConfig gets default values when storage is empty", () => {
  expect(config.key).toEqual("");
  expect(config.low_ff_range).toEqual(CONFIG_DEFAULTS.low_ff_range);
  expect(config.high_ff_range).toEqual(CONFIG_DEFAULTS.high_ff_range);
  expect(config.max_ff_range).toEqual(CONFIG_DEFAULTS.max_ff_range);
  expect(config.chain_button_enabled).toEqual(
    CONFIG_DEFAULTS.chain_button_enabled,
  );
  expect(config.chain_link_type).toEqual(CONFIG_DEFAULTS.chain_link_type);
  expect(config.chain_tab_type).toEqual(CONFIG_DEFAULTS.chain_tab_type);
  expect(config.chain_ff_target).toEqual(CONFIG_DEFAULTS.chain_ff_target);
  expect(config.ff_history_enabled).toEqual(CONFIG_DEFAULTS.ff_history_enabled);
  expect(config.factions_col_display).toEqual(
    CONFIG_DEFAULTS.factions_col_display,
  );
  expect(config.debug_logs).toEqual(CONFIG_DEFAULTS.debug_logs);
});

test("FFConfig sets and gets custom configuration values", () => {
  config.key = "myapi-key";
  config.low_ff_range = 1.5;
  config.high_ff_range = 3.5;
  config.max_ff_range = 6.0;
  config.chain_button_enabled = false;
  config.chain_link_type = ChainLinkType.PROFILE;
  config.chain_tab_type = ChainTabType.SAMETAB;
  config.chain_ff_target = 3.2;
  config.ff_history_enabled = false;
  config.factions_col_display = FactionsColDisplay.FAIR_FIGHT;
  config.debug_logs = true;

  expect(config.key).toEqual("myapi-key");
  expect(config.low_ff_range).toEqual(1.5);
  expect(config.high_ff_range).toEqual(3.5);
  expect(config.max_ff_range).toEqual(6.0);
  expect(config.chain_button_enabled).toBe(false);
  expect(config.chain_link_type).toEqual(ChainLinkType.PROFILE);
  expect(config.chain_tab_type).toEqual(ChainTabType.SAMETAB);
  expect(config.chain_ff_target).toEqual(3.2);
  expect(config.ff_history_enabled).toBe(false);
  expect(config.factions_col_display).toEqual(FactionsColDisplay.FAIR_FIGHT);
  expect(config.debug_logs).toBe(true);
});

test("FFConfig.reset resets values to their default states except the api key", () => {
  config.key = "my-sticky-api-key";
  config.low_ff_range = 5.0;
  config.debug_logs = true;

  config.reset();

  // API Key should NOT be reset (as key is not part of reset list in ffconfig.ts)
  expect(config.key).toEqual("my-sticky-api-key");

  // Other values should be reset to defaults
  expect(config.low_ff_range).toEqual(CONFIG_DEFAULTS.low_ff_range);
  expect(config.debug_logs).toEqual(CONFIG_DEFAULTS.debug_logs);
});
