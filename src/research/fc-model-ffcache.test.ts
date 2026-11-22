import { fc, test } from "@fast-check/vitest";
import { afterAll, beforeAll, expect, vi } from "vitest";
import { FFCache } from "../utils/ffcache";
import type { FFData, PlayerId } from "../utils/types";

// Research prototype: model-based test of FFCache against fake IndexedDB.
// Time is controlled per command with vi.setSystemTime (only Date is faked).

const HOUR = 60 * 60 * 1000;

type Model = {
  now: number;
  rows: Map<PlayerId, { data: FFData; expiry: number }>;
};

type Real = { cache: FFCache };

const playerId = fc.integer({ min: 1, max: 5 });

const ffData = (id: PlayerId): FFData => ({ no_data: true, player_id: id });

class UpdateCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ids: PlayerId[]) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    await r.cache.update(this.ids.map(ffData));
    for (const id of this.ids) {
      m.rows.set(id, { data: ffData(id), expiry: m.now + HOUR });
    }
  }
  toString = () => `update(${this.ids.join(",")})`;
}

class GetCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ids: PlayerId[]) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    const got = await r.cache.get(this.ids);
    for (const id of this.ids) {
      const row = m.rows.get(id);
      const want =
        row === undefined || row.expiry <= m.now
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
    m.now += this.ms;
    vi.setSystemTime(m.now);
  }
  toString = () => `advance(${this.ms})`;
}

const ids = fc.uniqueArray(playerId, { minLength: 1, maxLength: 3 });
const commands = fc.commands(
  [
    ids.map((x) => new UpdateCmd(x)),
    ids.map((x) => new GetCmd(x)),
    fc
      .oneof(fc.integer({ min: 0, max: 2 * HOUR }), fc.constant(HOUR))
      .map((ms) => new AdvanceCmd(ms)),
  ],
  { size: "+1" },
);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterAll(() => {
  vi.useRealTimers();
});

let dbCounter = 0;

test.prop([commands])(
  "FFCache get/update/expiry matches model",
  async (cmds) => {
    const start = Date.UTC(2026, 0, 1);
    vi.setSystemTime(start);
    const cache = new FFCache(`fc-model-${dbCounter++}`);
    try {
      await fc.asyncModelRun(
        () => ({ model: { now: start, rows: new Map() }, real: { cache } }),
        cmds,
      );
    } finally {
      await cache.delete_db();
    }
  },
);
