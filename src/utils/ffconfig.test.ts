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
  expect(config.war_col_display).toEqual(CONFIG_DEFAULTS.war_col_display);
  expect(config.debug_logs).toEqual(CONFIG_DEFAULTS.debug_logs);
  expect(config.analytics_enabled).toEqual(CONFIG_DEFAULTS.analytics_enabled);
  expect(config.network_interception_enabled).toEqual(
    CONFIG_DEFAULTS.network_interception_enabled,
  );
  expect(config.chain_min_level).toEqual(CONFIG_DEFAULTS.chain_min_level);
  expect(config.chain_max_level).toEqual(CONFIG_DEFAULTS.chain_max_level);
  expect(config.chain_inactive).toEqual(CONFIG_DEFAULTS.chain_inactive);
  expect(config.chain_min_ff).toEqual(CONFIG_DEFAULTS.chain_min_ff);
  expect(config.chain_max_ff).toEqual(CONFIG_DEFAULTS.chain_max_ff);
  expect(config.chain_factionless).toEqual(CONFIG_DEFAULTS.chain_factionless);
  expect(config.chain_targets).toBeNull();
  expect(config.chain_target_index).toEqual(0);
  expect(config.gauge_marker_scale).toEqual(CONFIG_DEFAULTS.gauge_marker_scale);
  expect(config.gauge_marker_border_width).toEqual(
    CONFIG_DEFAULTS.gauge_marker_border_width,
  );
  expect(config.settings_panel_own_profile_only).toEqual(
    CONFIG_DEFAULTS.settings_panel_own_profile_only,
  );
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
  config.war_col_display = FactionsColDisplay.FAIR_FIGHT;
  config.debug_logs = true;
  config.analytics_enabled = true;
  config.network_interception_enabled = false;
  config.chain_min_level = 10;
  config.chain_max_level = 90;
  config.chain_inactive = false;
  config.chain_min_ff = 1.2;
  config.chain_max_ff = 2.8;
  config.chain_factionless = true;
  config.gauge_marker_scale = 150;
  config.gauge_marker_border_width = 3;

  expect(config.key).toEqual("myapi-key");
  expect(config.low_ff_range).toEqual(1.5);
  expect(config.high_ff_range).toEqual(3.5);
  expect(config.max_ff_range).toEqual(6.0);
  expect(config.chain_button_enabled).toBe(false);
  expect(config.chain_link_type).toEqual(ChainLinkType.PROFILE);
  expect(config.chain_tab_type).toEqual(ChainTabType.SAMETAB);
  expect(config.chain_ff_target).toEqual(2.8); // because chain_max_ff setter syncs chain_ff_target
  expect(config.chain_max_ff).toEqual(2.8);
  expect(config.ff_history_enabled).toBe(false);
  expect(config.factions_col_display).toEqual(FactionsColDisplay.FAIR_FIGHT);
  expect(config.war_col_display).toEqual(FactionsColDisplay.FAIR_FIGHT);
  expect(config.debug_logs).toBe(true);
  expect(config.analytics_enabled).toBe(true);
  expect(config.network_interception_enabled).toBe(false);
  expect(config.chain_min_level).toEqual(10);
  expect(config.chain_max_level).toEqual(90);
  expect(config.chain_inactive).toBe(false);
  expect(config.chain_min_ff).toEqual(1.2);
  expect(config.chain_factionless).toBe(true);
  expect(config.gauge_marker_scale).toEqual(150);
  expect(config.gauge_marker_border_width).toEqual(3);

  const mockTargets = {
    targets: [{ player_id: 1, name: "p1" } as any],
    expiry: 12345,
    filters: {
      minlevel: 10,
      maxlevel: 90,
      minff: 1.2,
      maxff: 2.8,
      inactive: false,
      factionless: true,
    },
  };
  config.chain_targets = mockTargets;
  config.chain_target_index = 5;

  expect(config.chain_targets).toEqual(mockTargets);
  expect(config.chain_target_index).toEqual(5);
});

test("FFConfig.reset resets values to their default states except the api key", () => {
  config.key = "my-sticky-api-key";
  config.low_ff_range = 5.0;
  config.debug_logs = true;
  config.analytics_enabled = true;
  config.network_interception_enabled = false;
  config.chain_min_level = 15;
  config.chain_max_level = 85;
  config.chain_inactive = false;
  config.chain_min_ff = 1.4;
  config.chain_max_ff = 3.0;
  config.chain_factionless = true;
  config.chain_targets = {
    targets: [],
    expiry: 9999,
    filters: {} as any,
  };
  config.chain_target_index = 2;
  config.gauge_marker_scale = 150;
  config.gauge_marker_border_width = 3;
  config.settings_panel_own_profile_only = true;

  config.reset();

  // API Key should NOT be reset (as key is not part of reset list in ffconfig.ts)
  expect(config.key).toEqual("my-sticky-api-key");

  // Other values should be reset to defaults
  expect(config.low_ff_range).toEqual(CONFIG_DEFAULTS.low_ff_range);
  expect(config.factions_col_display).toEqual(
    CONFIG_DEFAULTS.factions_col_display,
  );
  expect(config.war_col_display).toEqual(CONFIG_DEFAULTS.war_col_display);
  expect(config.debug_logs).toEqual(CONFIG_DEFAULTS.debug_logs);
  expect(config.analytics_enabled).toEqual(CONFIG_DEFAULTS.analytics_enabled);
  expect(config.network_interception_enabled).toEqual(
    CONFIG_DEFAULTS.network_interception_enabled,
  );
  expect(config.chain_min_level).toEqual(CONFIG_DEFAULTS.chain_min_level);
  expect(config.chain_max_level).toEqual(CONFIG_DEFAULTS.chain_max_level);
  expect(config.chain_inactive).toEqual(CONFIG_DEFAULTS.chain_inactive);
  expect(config.chain_min_ff).toEqual(CONFIG_DEFAULTS.chain_min_ff);
  expect(config.chain_max_ff).toEqual(CONFIG_DEFAULTS.chain_max_ff);
  expect(config.chain_factionless).toEqual(CONFIG_DEFAULTS.chain_factionless);
  expect(config.chain_targets).toBeNull();
  expect(config.chain_target_index).toEqual(0);
  expect(config.gauge_marker_scale).toEqual(CONFIG_DEFAULTS.gauge_marker_scale);
  expect(config.gauge_marker_border_width).toEqual(
    CONFIG_DEFAULTS.gauge_marker_border_width,
  );
  expect(config.settings_panel_own_profile_only).toEqual(
    CONFIG_DEFAULTS.settings_panel_own_profile_only,
  );
});
