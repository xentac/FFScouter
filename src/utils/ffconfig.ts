import type { FFTarget } from "./api";
import logger, { LogLevel } from "./logger";
import { Storage as StorageUtil } from "./storage";
import type { TornApiKey } from "./types";

export interface CachedTargets {
  targets: FFTarget[];
  expiry: number;
  filters: {
    minlevel: number | null;
    maxlevel: number | null;
    minff: number | null;
    maxff: number;
    inactive: boolean;
    factionless: boolean;
  };
  last_updated?: number;
}

export enum ChainLinkType {
  ATTACK = "attack",
  PROFILE = "profile",
}

export enum ChainTabType {
  NEWTAB = "newtab",
  SAMETAB = "sametab",
}

export enum FactionsColDisplay {
  FAIR_FIGHT = "fair_fight",
  BATTLE_STATS = "battle_stats",
  NONE = "none",
}

export const CONFIG_DEFAULTS = {
  low_ff_range: 2,
  high_ff_range: 4,
  max_ff_range: 8,
  chain_button_enabled: true,
  chain_link_type: ChainLinkType.ATTACK,
  chain_tab_type: ChainTabType.NEWTAB,
  chain_ff_target: 2.5,
  ff_history_enabled: true,
  factions_col_display: FactionsColDisplay.BATTLE_STATS,
  war_col_display: FactionsColDisplay.BATTLE_STATS,
  debug_logs: false,
  analytics_enabled: false,
  chain_min_level: null as number | null,
  chain_max_level: null as number | null,
  chain_inactive: true,
  chain_min_ff: null as number | null,
  chain_max_ff: 2.5,
  chain_factionless: false,
} as const;

enum CONFIG {
  KEY = "key",
  LOW_FF_RANGE = "low_ff_range",
  HIGH_FF_RANGE = "high_ff_range",
  MAX_FF_RANGE = "max_ff_range",
  CHAIN_BUTTON_ENABLED = "chain_button_enabled",
  CHAIN_LINK_TYPE = "chain_link_type",
  CHAIN_TAB_TYPE = "chain_tab_type",
  CHAIN_FF_TARGET = "chain_ff_target",
  FF_HISTORY_ENABLED = "ff_history_enabled",
  FACTIONS_COL_DISPLAY = "factions_col_display",
  WAR_COL_DISPLAY = "war_col_display",
  DEBUG_LOGS = "debug_logs",
  ANALYTICS_ENABLED = "analytics_enabled",
  FACTION_FILTER_STATE = "faction_filter_state",
  FACTION_FILTER_COLLAPSED = "faction_filter_collapsed",
  WAR_FILTER_STATE = "war_filter_state",
  WAR_FILTER_COLLAPSED = "war_filter_collapsed",
  CHAIN_MIN_LEVEL = "chain_min_level",
  CHAIN_MAX_LEVEL = "chain_max_level",
  CHAIN_INACTIVE = "chain_inactive",
  CHAIN_MIN_FF = "chain_min_ff",
  CHAIN_MAX_FF = "chain_max_ff",
  CHAIN_FACTIONLESS = "chain_factionless",
  CHAIN_TARGETS = "chain_targets",
  CHAIN_TARGET_INDEX = "chain_target_index",
}

export class FFConfig {
  private name: string;
  private storage: StorageUtil;

  constructor(name: string) {
    this.name = name;
    this.storage = new StorageUtil(this.name);
    // Apply saved debug logs preference to logger at startup
    logger.setLevel(this.debug_logs ? LogLevel.DEBUG : LogLevel.INFO);
  }

  get key(): TornApiKey {
    return this.storage.get(CONFIG.KEY) ?? "";
  }

  set key(key: TornApiKey) {
    this.storage.set(CONFIG.KEY, key);
  }

  get low_ff_range(): number {
    return (
      this.storage.get(CONFIG.LOW_FF_RANGE) ?? CONFIG_DEFAULTS.low_ff_range
    );
  }

  set low_ff_range(val: number) {
    this.storage.set(CONFIG.LOW_FF_RANGE, val);
  }

  get high_ff_range(): number {
    return (
      this.storage.get(CONFIG.HIGH_FF_RANGE) ?? CONFIG_DEFAULTS.high_ff_range
    );
  }

  set high_ff_range(val: number) {
    this.storage.set(CONFIG.HIGH_FF_RANGE, val);
  }

  get max_ff_range(): number {
    return (
      this.storage.get(CONFIG.MAX_FF_RANGE) ?? CONFIG_DEFAULTS.max_ff_range
    );
  }

  set max_ff_range(val: number) {
    this.storage.set(CONFIG.MAX_FF_RANGE, val);
  }

  get chain_button_enabled(): boolean {
    return (
      this.storage.get(CONFIG.CHAIN_BUTTON_ENABLED) ??
      CONFIG_DEFAULTS.chain_button_enabled
    );
  }

  set chain_button_enabled(val: boolean) {
    this.storage.set(CONFIG.CHAIN_BUTTON_ENABLED, val);
  }

  get chain_link_type(): ChainLinkType {
    return (
      this.storage.get(CONFIG.CHAIN_LINK_TYPE) ??
      CONFIG_DEFAULTS.chain_link_type
    );
  }

  set chain_link_type(val: ChainLinkType) {
    this.storage.set(CONFIG.CHAIN_LINK_TYPE, val);
  }

  get chain_tab_type(): ChainTabType {
    return (
      this.storage.get(CONFIG.CHAIN_TAB_TYPE) ?? CONFIG_DEFAULTS.chain_tab_type
    );
  }

  set chain_tab_type(val: ChainTabType) {
    this.storage.set(CONFIG.CHAIN_TAB_TYPE, val);
  }

  get chain_ff_target(): number {
    return (
      this.storage.get(CONFIG.CHAIN_FF_TARGET) ??
      CONFIG_DEFAULTS.chain_ff_target
    );
  }

  set chain_ff_target(val: number) {
    this.storage.set(CONFIG.CHAIN_FF_TARGET, val);
  }

  get chain_min_level(): number | null {
    return (
      this.storage.get(CONFIG.CHAIN_MIN_LEVEL) ??
      CONFIG_DEFAULTS.chain_min_level
    );
  }

  set chain_min_level(val: number | null) {
    if (val === null) {
      this.storage.remove(CONFIG.CHAIN_MIN_LEVEL);
    } else {
      this.storage.set(CONFIG.CHAIN_MIN_LEVEL, val);
    }
  }

  get chain_max_level(): number | null {
    return (
      this.storage.get(CONFIG.CHAIN_MAX_LEVEL) ??
      CONFIG_DEFAULTS.chain_max_level
    );
  }

  set chain_max_level(val: number | null) {
    if (val === null) {
      this.storage.remove(CONFIG.CHAIN_MAX_LEVEL);
    } else {
      this.storage.set(CONFIG.CHAIN_MAX_LEVEL, val);
    }
  }

  get chain_inactive(): boolean {
    return (
      this.storage.get(CONFIG.CHAIN_INACTIVE) ?? CONFIG_DEFAULTS.chain_inactive
    );
  }

  set chain_inactive(val: boolean) {
    this.storage.set(CONFIG.CHAIN_INACTIVE, val);
  }

  get chain_min_ff(): number | null {
    return (
      this.storage.get(CONFIG.CHAIN_MIN_FF) ?? CONFIG_DEFAULTS.chain_min_ff
    );
  }

  set chain_min_ff(val: number | null) {
    if (val === null) {
      this.storage.remove(CONFIG.CHAIN_MIN_FF);
    } else {
      this.storage.set(CONFIG.CHAIN_MIN_FF, val);
    }
  }

  get chain_max_ff(): number {
    return (
      this.storage.get(CONFIG.CHAIN_MAX_FF) ??
      this.storage.get(CONFIG.CHAIN_FF_TARGET) ??
      CONFIG_DEFAULTS.chain_max_ff
    );
  }

  set chain_max_ff(val: number) {
    this.storage.set(CONFIG.CHAIN_MAX_FF, val);
    this.storage.set(CONFIG.CHAIN_FF_TARGET, val);
  }

  get chain_factionless(): boolean {
    return (
      this.storage.get(CONFIG.CHAIN_FACTIONLESS) ??
      CONFIG_DEFAULTS.chain_factionless
    );
  }

  set chain_factionless(val: boolean) {
    this.storage.set(CONFIG.CHAIN_FACTIONLESS, val);
  }

  get ff_history_enabled(): boolean {
    return (
      this.storage.get(CONFIG.FF_HISTORY_ENABLED) ??
      CONFIG_DEFAULTS.ff_history_enabled
    );
  }

  set ff_history_enabled(val: boolean) {
    this.storage.set(CONFIG.FF_HISTORY_ENABLED, val);
  }

  get factions_col_display(): FactionsColDisplay {
    return (
      this.storage.get(CONFIG.FACTIONS_COL_DISPLAY) ??
      CONFIG_DEFAULTS.factions_col_display
    );
  }

  set factions_col_display(val: FactionsColDisplay) {
    this.storage.set(CONFIG.FACTIONS_COL_DISPLAY, val);
  }

  get war_col_display(): FactionsColDisplay {
    return (
      this.storage.get(CONFIG.WAR_COL_DISPLAY) ??
      CONFIG_DEFAULTS.war_col_display
    );
  }

  set war_col_display(val: FactionsColDisplay) {
    this.storage.set(CONFIG.WAR_COL_DISPLAY, val);
  }

  get debug_logs(): boolean {
    return this.storage.get(CONFIG.DEBUG_LOGS) ?? CONFIG_DEFAULTS.debug_logs;
  }

  set debug_logs(val: boolean) {
    this.storage.set(CONFIG.DEBUG_LOGS, val);
    logger.setLevel(val ? LogLevel.DEBUG : LogLevel.INFO);
  }

  get analytics_enabled(): boolean {
    return (
      this.storage.get(CONFIG.ANALYTICS_ENABLED) ??
      CONFIG_DEFAULTS.analytics_enabled
    );
  }

  set analytics_enabled(val: boolean) {
    this.storage.set(CONFIG.ANALYTICS_ENABLED, val);
  }

  get faction_filter_state(): any | null {
    return this.storage.get(CONFIG.FACTION_FILTER_STATE) ?? null;
  }

  set faction_filter_state(val: any | null) {
    this.storage.set(CONFIG.FACTION_FILTER_STATE, val);
  }

  get faction_filter_collapsed(): boolean {
    return this.storage.get(CONFIG.FACTION_FILTER_COLLAPSED) ?? false;
  }

  set faction_filter_collapsed(val: boolean) {
    this.storage.set(CONFIG.FACTION_FILTER_COLLAPSED, val);
  }

  get war_filter_state(): any | null {
    return this.storage.get(CONFIG.WAR_FILTER_STATE) ?? null;
  }

  set war_filter_state(val: any | null) {
    this.storage.set(CONFIG.WAR_FILTER_STATE, val);
  }

  get war_filter_collapsed(): boolean {
    return this.storage.get(CONFIG.WAR_FILTER_COLLAPSED) ?? false;
  }

  set war_filter_collapsed(val: boolean) {
    this.storage.set(CONFIG.WAR_FILTER_COLLAPSED, val);
  }

  get chain_targets(): CachedTargets | null {
    return this.storage.get(CONFIG.CHAIN_TARGETS);
  }

  set chain_targets(val: CachedTargets | null) {
    if (val === null) {
      this.storage.remove(CONFIG.CHAIN_TARGETS);
    } else {
      this.storage.set(CONFIG.CHAIN_TARGETS, val);
    }
  }

  get chain_target_index(): number {
    return this.storage.get(CONFIG.CHAIN_TARGET_INDEX) ?? 0;
  }

  set chain_target_index(val: number) {
    this.storage.set(CONFIG.CHAIN_TARGET_INDEX, val);
  }

  public reset(): void {
    this.storage.remove(CONFIG.LOW_FF_RANGE);
    this.storage.remove(CONFIG.HIGH_FF_RANGE);
    this.storage.remove(CONFIG.MAX_FF_RANGE);
    this.storage.remove(CONFIG.CHAIN_BUTTON_ENABLED);
    this.storage.remove(CONFIG.CHAIN_LINK_TYPE);
    this.storage.remove(CONFIG.CHAIN_TAB_TYPE);
    this.storage.remove(CONFIG.CHAIN_FF_TARGET);
    this.storage.remove(CONFIG.FF_HISTORY_ENABLED);
    this.storage.remove(CONFIG.FACTIONS_COL_DISPLAY);
    this.storage.remove(CONFIG.WAR_COL_DISPLAY);
    this.storage.remove(CONFIG.DEBUG_LOGS);
    this.storage.remove(CONFIG.ANALYTICS_ENABLED);
    this.storage.remove(CONFIG.FACTION_FILTER_STATE);
    this.storage.remove(CONFIG.FACTION_FILTER_COLLAPSED);
    this.storage.remove(CONFIG.WAR_FILTER_STATE);
    this.storage.remove(CONFIG.WAR_FILTER_COLLAPSED);
    this.storage.remove(CONFIG.CHAIN_MIN_LEVEL);
    this.storage.remove(CONFIG.CHAIN_MAX_LEVEL);
    this.storage.remove(CONFIG.CHAIN_INACTIVE);
    this.storage.remove(CONFIG.CHAIN_MIN_FF);
    this.storage.remove(CONFIG.CHAIN_MAX_FF);
    this.storage.remove(CONFIG.CHAIN_FACTIONLESS);
    this.storage.remove(CONFIG.CHAIN_TARGETS);
    this.storage.remove(CONFIG.CHAIN_TARGET_INDEX);
  }
}

export const ffconfig = new FFConfig("ffsv3-config");
