import { Storage as StorageUtil } from "./storage";
import type { TornApiKey } from "./types";

enum CONFIG {
  KEY = "key",
  LOW_FF_RANGE = "low_ff_range",
  HIGH_FF_RANGE = "high_ff_range",
  MAX_FF_RANGE = "max_ff_range",
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
    return this.storage.get(CONFIG.LOW_FF_RANGE) ?? 2;
  }

  get high_ff_range(): number {
    return this.storage.get(CONFIG.HIGH_FF_RANGE) ?? 4;
  }

  get max_ff_range(): number {
    return this.storage.get(CONFIG.MAX_FF_RANGE) ?? 8;
  }
}

export const ffconfig = new FFConfig("ffsv3");
