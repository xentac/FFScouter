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
  CachedFFData,
  CachedFlightData,
  FFData,
  PlayerFlightsResponse,
  PlayerId,
} from "./types";

export const STORES = {
  CACHE: "cache",
  FLIGHTS: "flights",
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
}

type MigrationFn = (
  db: IDBPDatabase<CacheDB>,
  transaction: IDBPTransaction<CacheDB, StoreNames<CacheDB>[], "versionchange">,
) => void;

export class FFCache {
  private db_name: string;
  private db: IDBPDatabase<CacheDB> | null = null;
  private db_version = 2;

  private cache_interval: number = 60 * 60 * 1000; // one hour cache

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

  delete_db = async () => {
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
    const db = await this.open();
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

    this.close();

    return result;
  };

  update = async (values: FFData[]): Promise<void> => {
    const db = await this.open();

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
    this.close();
  };

  clean_expired = async () => {
    const db = await this.open();

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
      logger.info(`Found ${r.length} expired values to delete from flights.`);
      await Promise.all(r.map((id) => tx.store.delete(id)));
      await tx.done;
    }

    this.close();
  };

  get_flight = async (
    player_id: PlayerId,
  ): Promise<CachedFlightData | null> => {
    const db = await this.open();
    const tx = db.transaction(STORES.FLIGHTS, "readonly");
    const entry = await tx.store.get(player_id);
    await tx.done;
    this.close();

    if (!entry || entry.expiry <= Date.now()) {
      return null;
    }
    return entry;
  };

  update_flight = async (
    value: PlayerFlightsResponse,
    cache_interval = 60 * 1000,
  ): Promise<void> => {
    const db = await this.open();
    const tx = db.transaction(STORES.FLIGHTS, "readwrite");

    const value_expiry = {
      ...value,
      expiry: Date.now() + cache_interval,
    };

    await tx.store.put(value_expiry);
    await tx.done;
    this.close();
  };

  dump = async () => {
    const db = await this.open();

    const tx = db.transaction(STORES.CACHE, "readonly");

    const res = await tx.store.getAll();
    await tx.done;
    this.close();
    return res;
  };

  dump_flights = async () => {
    const db = await this.open();
    const tx = db.transaction(STORES.FLIGHTS, "readonly");
    const res = await tx.store.getAll();
    await tx.done;
    this.close();
    return res;
  };
}
