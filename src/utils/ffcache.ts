import {
  //unwrap,
  //wrap,
  type DBSchema,
  deleteDB,
  type IDBPDatabase,
  type IDBPTransaction,
  openDB,
  type StoreNames,
} from "idb";
import logger from "./logger";
import type {
  AnalyticsEntry,
  CachedFFData,
  CachedFlightData,
  FFData,
  PlayerFlightsResponse,
  PlayerId,
} from "./types";

export const STORES = {
  CACHE: "cache",
  FLIGHTS: "flights",
  ANALYTICS: "analytics",
} as const;

interface CacheDB extends DBSchema {
  [STORES.CACHE]: {
    key: PlayerId;
    value: CachedFFData;
    indexes: { expiry: number };
  };
  [STORES.FLIGHTS]: {
    key: PlayerId;
    value: CachedFlightData;
    indexes: { expiry: number };
  };
  [STORES.ANALYTICS]: {
    key: number;
    value: AnalyticsEntry;
    indexes: { timestamp: number };
  };
}

type MigrationFn = (
  db: IDBPDatabase<CacheDB>,
  transaction: IDBPTransaction<CacheDB, StoreNames<CacheDB>[], "versionchange">,
) => void;

export class FFCache {
  private db_name: string;
  private db: IDBPDatabase<CacheDB> | null = null;
  private db_version = 3;

  private cache_interval: number = 60 * 60 * 1000; // one hour cache
  private last_clean = 0;
  private active_operations = 0;
  private close_timer: ReturnType<typeof setTimeout> | null = null;

  private migrations: Map<number, MigrationFn> = new Map([
    [
      1,
      (db, _) => {
        const store = db.createObjectStore(STORES.CACHE, {
          keyPath: "player_id",
        });
        store.createIndex("expiry", "expiry", {
          unique: false,
        });
      },
    ],
    [
      2,
      (db, _) => {
        const store = db.createObjectStore(STORES.FLIGHTS, {
          keyPath: "player_id",
        });
        store.createIndex("expiry", "expiry", {
          unique: false,
        });
      },
    ],
    [
      3,
      (db, _) => {
        const store = db.createObjectStore(STORES.ANALYTICS, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", {
          unique: false,
        });
      },
    ],
  ]);

  constructor(db_name: string) {
    this.db_name = db_name;
  }

  open = async () => {
    if (this.db) {
      return this.db;
    }
    const cache = this;
    this.db = await openDB<CacheDB>(this.db_name, this.db_version, {
      upgrade(db, oldVersion, newVersion, transaction, _event) {
        // …
        logger.info("Need to upgrade from", oldVersion, "to", newVersion);

        for (let i = (oldVersion ?? 0) + 1; i <= cache.db_version; i++) {
          logger.debug(`Migration: ${i}`);
          const m = cache.migrations.get(i);
          if (m) {
            m(db, transaction);
          } else {
            logger.debug(`Migration not found: ${i}`);
          }
          logger.debug(`Migration complete: ${i}`);
        }
      },
      blocking(currentVersion, blockedVersion, _event) {
        logger.debug(
          `Can't open ${blockedVersion} because ${currentVersion} is open. Closing and reopening.`,
        );
        cache.db?.close();
      },
      /*blocked(currentVersion, blockedVersion, event) {
        // …
      },
      terminated() {
        // …
      },*/
    });

    return this.db;
  };

  close = () => {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  };

  start_op = async (): Promise<IDBPDatabase<CacheDB>> => {
    this.active_operations++;
    if (this.close_timer) {
      clearTimeout(this.close_timer);
      this.close_timer = null;
    }
    return await this.open();
  };

  end_op = () => {
    this.active_operations = Math.max(0, this.active_operations - 1);
    if (this.active_operations === 0) {
      if (this.close_timer) {
        clearTimeout(this.close_timer);
      }
      this.close_timer = setTimeout(() => {
        this.close();
        this.close_timer = null;
      }, 1000);
    }
  };

  delete_db = async () => {
    if (this.close_timer) {
      clearTimeout(this.close_timer);
      this.close_timer = null;
    }
    this.close();

    await deleteDB(this.db_name, {
      blocked: () => {
        logger.debug("deleteDB blocked callback called!");
      },
    });

    logger.info(`Successfully deleted ${this.db_name} IndexedDB.`);
  };

  get = async (
    player_ids: PlayerId[],
  ): Promise<Map<PlayerId, CachedFFData | null>> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.CACHE, "readonly");

      // Issue all get requests in parallel
      const requests = player_ids.map((id) => tx.store.get(id));
      const entries = await Promise.all(requests);

      await tx.done;

      // Zip player_ids and entries without indexing
      const result = new Map<PlayerId, CachedFFData | null>();
      player_ids.forEach((id, idx) => {
        const value = entries[idx];
        result.set(id, !value || value.expiry <= Date.now() ? null : value);
      });

      return result;
    } finally {
      this.end_op();
    }
  };

  update = async (values: FFData[]): Promise<void> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.CACHE, "readwrite");

      const values_expiry = values.map((value) => {
        return {
          ...value,
          expiry: Date.now() + this.cache_interval,
        };
      });

      const requests = values_expiry.map((value) => {
        return tx.store.put(value);
      });

      await Promise.all(requests);

      await tx.done;
    } finally {
      this.end_op();
    }
  };

  clean_expired = (force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - this.last_clean < 60 * 60 * 1000) {
      return Promise.resolve();
    }
    this.last_clean = now;

    const runClean = async () => {
      const db = await this.start_op();
      try {
        // Clean CACHE
        {
          const tx = db.transaction(STORES.CACHE, "readwrite");
          const index = tx.store.index("expiry");
          const range = IDBKeyRange.upperBound(Date.now());
          const r = await index.getAllKeys(range);
          logger.info(`Found ${r.length} expired values to delete from cache.`);
          await Promise.all(r.map((id) => tx.store.delete(id)));
          await tx.done;
        }

        // Clean FLIGHTS
        {
          const tx = db.transaction(STORES.FLIGHTS, "readwrite");
          const index = tx.store.index("expiry");
          const range = IDBKeyRange.upperBound(Date.now());
          const r = await index.getAllKeys(range);
          logger.info(
            `Found ${r.length} expired values to delete from flights.`,
          );
          await Promise.all(r.map((id) => tx.store.delete(id)));
          await tx.done;
        }

        // Clean ANALYTICS
        {
          const tx = db.transaction(STORES.ANALYTICS, "readwrite");
          const index = tx.store.index("timestamp");
          const thirty_days_ago = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const range = IDBKeyRange.upperBound(thirty_days_ago);
          const r = await index.getAllKeys(range);
          logger.info(
            `Found ${r.length} expired values to delete from analytics.`,
          );
          await Promise.all(r.map((id) => tx.store.delete(id)));
          await tx.done;
        }
      } finally {
        this.end_op();
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      return new Promise<void>((resolve, reject) => {
        window.requestIdleCallback(() => {
          runClean().then(resolve, reject);
        });
      });
    }

    return runClean();
  };

  get_flight = async (
    player_id: PlayerId,
  ): Promise<CachedFlightData | null> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.FLIGHTS, "readonly");
      const entry = await tx.store.get(player_id);
      await tx.done;

      if (!entry || entry.expiry <= Date.now()) {
        return null;
      }
      return entry;
    } finally {
      this.end_op();
    }
  };

  update_flight = async (
    value: PlayerFlightsResponse,
    cache_interval = 60 * 1000,
  ): Promise<void> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.FLIGHTS, "readwrite");

      const value_expiry = {
        ...value,
        expiry: Date.now() + cache_interval,
      };

      await tx.store.put(value_expiry);
      await tx.done;
    } finally {
      this.end_op();
    }
  };

  delete_flight = async (player_id: PlayerId): Promise<void> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.FLIGHTS, "readwrite");
      await tx.store.delete(player_id);
      await tx.done;
    } finally {
      this.end_op();
    }
  };

  add_analytics = async (
    entry: Omit<AnalyticsEntry, "id" | "timestamp">,
  ): Promise<void> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.ANALYTICS, "readwrite");
      const value: AnalyticsEntry = {
        ...entry,
        timestamp: Date.now(),
      };
      await tx.store.add(value);
      await tx.done;
    } finally {
      this.end_op();
    }
  };

  get_analytics = async (): Promise<AnalyticsEntry[]> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.ANALYTICS, "readonly");
      const res = await tx.store.getAll();
      await tx.done;
      return res;
    } finally {
      this.end_op();
    }
  };

  clear_analytics = async (): Promise<void> => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.ANALYTICS, "readwrite");
      await tx.store.clear();
      await tx.done;
    } finally {
      this.end_op();
    }
  };

  dump = async () => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.CACHE, "readonly");

      const res = await tx.store.getAll();
      await tx.done;
      return res;
    } finally {
      this.end_op();
    }
  };

  dump_flights = async () => {
    const db = await this.start_op();
    try {
      const tx = db.transaction(STORES.FLIGHTS, "readonly");
      const res = await tx.store.getAll();
      await tx.done;
      return res;
    } finally {
      this.end_op();
    }
  };
}
