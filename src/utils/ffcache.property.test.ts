// A model-based property for the FFCache stats store. Each run applies a
// random sequence of update, get, and advance commands to the real cache and
// to a simple model, and checks after each get that the two agree.
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import {
  AdvanceCmd,
  advance_to_deadline_arb,
  type Clock,
  make_clock,
} from "../tests/clock";
import { FFCache } from "./ffcache";
import type { FFData, PlayerId, Timestamp } from "./types";
import { ff_data_arb } from "./types.arbitraries";

const HOUR = 60 * 60 * 1000;

// The model: the time, and the rows that the cache holds.
type Model = {
  clock: Clock;
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
      m.rows.set(data.player_id, { data, expiry: m.clock.now() + HOUR });
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
        row === undefined || row.expiry <= m.clock.now()
          ? null
          : { ...row.data, expiry: row.expiry };
      expect(got.get(id)).toEqual(want);
    }
  }
  toString = () => `get(${this.ids.join(",")})`;
}

// Player IDs from a small range, so gets often hit rows that updates wrote.
const player_id_arb = fc.integer({ min: 1, max: 5 });

// Time moves forward only. A random step rarely lands on an expiry, so a
// second command moves the clock to 1 ms before, on, or after the expiry of
// a row that the model holds.
const advance_arb = fc.integer({ min: 1, max: 2 * HOUR });
const row_expiries = (m: Readonly<Model>) =>
  [...m.rows.values()].map((row) => row.expiry);

// One update writes the rows of one API batch, so each player at most once.
const commands = fc.commands(
  [
    fc
      .uniqueArray(ff_data_arb({ player_id: player_id_arb }), {
        minLength: 1,
        maxLength: 3,
        selector: (d) => d.player_id,
      })
      .map((values) => new UpdateCmd(values)),
    fc
      .uniqueArray(player_id_arb, { minLength: 1, maxLength: 3 })
      .map((ids) => new GetCmd(ids)),
    advance_arb.map((ms) => new AdvanceCmd<Model, Real>(ms)),
    advance_to_deadline_arb<Model, Real>(row_expiries),
  ],
  { maxCommands: 20 },
);

// The idle close never runs, so the database stays open until delete_db.
const no_idle_close = () => () => {};

let db_counter = 0;

// Rule: an expired entry is never returned, and an entry that has not
// expired is returned as it was written. Source: FFCache.get and the 1-hour
// cache_interval of FFCache.update.
test.prop([commands])(
  "FFCache never returns an expired entry, and returns a live one as written",
  async (cmds) => {
    const clock = make_clock(Date.UTC(2026, 0, 1));
    const cache = new FFCache(`ffcache-model-${db_counter++}`, {
      now: clock.now,
      schedule: no_idle_close,
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
