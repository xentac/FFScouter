// A model-based property for the FFCache stats store. Each run applies a
// random sequence of update, get, and advance commands to the real cache and
// to a simple model, and checks after each get that the two agree.
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { FFCache } from "./ffcache";
import type { FFData, PlayerId, Timestamp } from "./types";

const HOUR = 60 * 60 * 1000;

// The model: the time, and the rows that the cache holds.
type Model = {
  clock: { now: Timestamp };
  rows: Map<PlayerId, { data: FFData; expiry: Timestamp }>;
};
type Real = { cache: FFCache };

class UpdateCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly values: FFData[]) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    await r.cache.update(this.values);
    // Every row of one update gets the same 1-hour expiry.
    for (const data of this.values) {
      m.rows.set(data.player_id, { data, expiry: m.clock.now + HOUR });
    }
  }
  toString = () => `update(${this.values.map((v) => v.player_id).join(",")})`;
}

class GetCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ids: PlayerId[]) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    const got = await r.cache.get(this.ids);
    for (const id of this.ids) {
      const row = m.rows.get(id);
      // Rule: an expired entry is never returned.
      const want =
        row === undefined || row.expiry <= m.clock.now
          ? null
          : { ...row.data, expiry: row.expiry };
      expect(got.get(id)).toEqual(want);
    }
  }
  toString = () => `get(${this.ids.join(",")})`;
}

class AdvanceCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ms: number) {}
  check = () => true;
  async run(m: Model): Promise<void> {
    m.clock.now += this.ms;
  }
  toString = () => `advance(${this.ms})`;
}

// Player IDs from a small range, so gets often hit rows that updates wrote.
const player_id_arb = fc.integer({ min: 1, max: 5 });

// A row as the API gives it: no data, or an estimate. The FF value tells
// two updates of the same player apart.
const ff_data_arb: fc.Arbitrary<FFData> = fc.oneof(
  player_id_arb.map((player_id): FFData => ({ no_data: true, player_id })),
  fc
    .record({
      player_id: player_id_arb,
      fair_fight: fc.double({ min: 1, max: 10, noNaN: true }),
    })
    .map(
      ({ player_id, fair_fight }): FFData => ({
        no_data: false,
        fair_fight,
        last_updated: 1_700_000_000,
        bs_estimate: 1_000_000,
        bs_estimate_human: "1m",
        bss_public: 40,
        source: "bss",
        premium_insights_available: false,
        available_estimates: { bss: null, premium: null, spies: null },
        spies: [],
        player_id,
      }),
    ),
);

// Time moves forward only. The exact steps of 1 hour and 1 ms around it
// land on the expiry edge when they follow an update directly. Random steps
// alone almost never land there.
const advance_arb = fc.oneof(
  fc.constantFrom(HOUR - 1, HOUR, HOUR + 1),
  fc.integer({ min: 1, max: 2 * HOUR }),
);

// One update writes the rows of one API batch, so each player at most once.
const commands = fc.commands(
  [
    fc
      .uniqueArray(ff_data_arb, {
        minLength: 1,
        maxLength: 3,
        selector: (d) => d.player_id,
      })
      .map((values) => new UpdateCmd(values)),
    fc
      .uniqueArray(player_id_arb, { minLength: 1, maxLength: 3 })
      .map((ids) => new GetCmd(ids)),
    advance_arb.map((ms) => new AdvanceCmd(ms)),
  ],
  { maxCommands: 20 },
);

// The idle close never runs, so the database stays open until delete_db.
const never = () => () => {};

let db_counter = 0;

// Rule: an expired entry is never returned, and an entry that has not
// expired is returned as it was written. Source: FFCache.get and the 1-hour
// cache_interval of FFCache.update.
test.prop([commands])(
  "FFCache never returns an expired entry, and returns a live one as written",
  async (cmds) => {
    const clock = { now: Date.UTC(2026, 0, 1) };
    const cache = new FFCache(`ffcache-model-${db_counter++}`, {
      now: () => clock.now,
      schedule: never,
    });
    try {
      await fc.asyncModelRun(
        () => ({ model: { clock, rows: new Map() }, real: { cache } }),
        cmds,
      );
    } finally {
      await cache.delete_db();
    }
  },
);
