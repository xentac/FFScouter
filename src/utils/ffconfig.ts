import { Storage as StorageUtil } from "./storage";
import type { TornApiKey } from "./types";

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
  debug_logs: false,
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
  DEBUG_LOGS = "debug_logs",
}

export class FFConfig {
  private name: string;
  private storage: StorageUtil;

  constructor(name: string) {
    this.name = name;
    this.storage = new StorageUtil(this.name);
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

  get debug_logs(): boolean {
    return this.storage.get(CONFIG.DEBUG_LOGS) ?? CONFIG_DEFAULTS.debug_logs;
  }

  set debug_logs(val: boolean) {
    this.storage.set(CONFIG.DEBUG_LOGS, val);
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
    this.storage.remove(CONFIG.DEBUG_LOGS);
  }
}

export const ffconfig = new FFConfig("ffsv3");
