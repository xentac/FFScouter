// @vitest-environment jsdom
// A model-based property for the OD Insurance plans cache. Each run applies
// a random sequence of consults and clock steps to the real cache and to a
// model, and checks that every served list is one the model allows.
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import { PLANS_RESPONSE } from "./__fixtures__/od_insurance";
import type { OdInsurancePlansResponse, query_od_insurance_plans } from "./api";
import {
  OD_PLANS_FRESH_MS,
  OD_PLANS_STALE_LIMIT_HOURS,
  OdInsurancePlansCache,
  type PlansState,
} from "./od_insurance";
import { Storage } from "./storage";
import type { Timestamp } from "./types";

const HOUR = 60 * 60 * 1000;
const STALE_LIMIT_MS = OD_PLANS_STALE_LIMIT_HOURS * HOUR;

// What the server does with one request.
type Outcome = "success" | "blank" | "error";

type Model = {
  clock: { now: Timestamp };
  // The outcome of the next request, set by each consult command.
  next: { outcome: Outcome };
  // The list that the last success stored, and when.
  stored: { response: OdInsurancePlansResponse; fetched_at: Timestamp } | null;
  // A count of successes, so each success returns a list that differs from
  // the ones before it. A served old list is then visible.
  version: number;
};
type Real = { cache: OdInsurancePlansCache };

// The list of the n-th success: the fixture with a marked manager name.
function plans_v(version: number): OdInsurancePlansResponse {
  return { ...PLANS_RESPONSE, manager_name: `manager-v${version}` };
}

// The query that the real cache calls. It acts out the outcome that the
// model chose.
function make_query(
  next: { outcome: Outcome },
  versions: { version: number },
): typeof query_od_insurance_plans {
  return async () => {
    if (next.outcome === "blank") return { blank: true };
    if (next.outcome === "error") throw new Error("offline");
    versions.version++;
    return { result: plans_v(versions.version), blank: false };
  };
}

class ConsultCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly outcome: Outcome) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    m.next.outcome = this.outcome;
    const now = m.clock.now;
    const got = await r.cache.get();

    let want: PlansState;
    const age = m.stored === null ? null : now - m.stored.fetched_at;
    if (m.stored !== null && age !== null && age < OD_PLANS_FRESH_MS) {
      want = { status: "fresh", response: m.stored.response };
    } else if (this.outcome === "success") {
      m.version++;
      m.stored = { response: plans_v(m.version), fetched_at: now };
      want = { status: "fresh", response: m.stored.response };
    } else if (m.stored !== null && age !== null && age <= STALE_LIMIT_MS) {
      want = { status: "stale", ...m.stored };
    } else {
      want = { status: "failed" };
    }
    // Rule: a list older than 24 hours is never served.
    if (got.status === "stale") {
      expect(now - got.fetched_at).toBeLessThanOrEqual(STALE_LIMIT_MS);
    }
    expect(got).toEqual(want);
  }
  toString = () => `consult(${this.outcome})`;
}

class AdvanceCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly ms: number) {}
  check = () => true;
  async run(m: Model): Promise<void> {
    m.clock.now += this.ms;
  }
  toString = () => `advance(${this.ms})`;
}

// The outcomes a real request can have: a list, a PDA blank response, or a
// network or HTTP error.
const outcome_arb = fc.constantFrom<Outcome>("success", "blank", "error");

// Time moves forward only. The exact edges land 1 ms before, on, and after
// the 10-minute freshness and the 24-hour stale limit. Random steps alone
// almost never land there.
const advance_arb = fc.oneof(
  fc
    .record({
      edge: fc.constantFrom(OD_PLANS_FRESH_MS, STALE_LIMIT_MS),
      off: fc.constantFrom(-1, 0, 1),
    })
    .map(({ edge, off }) => edge + off),
  fc.integer({ min: 1, max: 30 * 60 * 1000 }),
  fc.integer({ min: 1, max: 2 * STALE_LIMIT_MS }),
);

// A page session: consults with the clock moving between them.
const commands = fc.commands(
  [
    outcome_arb.map((outcome) => new ConsultCmd(outcome)),
    advance_arb.map((ms) => new AdvanceCmd(ms)),
  ],
  { maxCommands: 20 },
);

// Rule: a list older than 24 hours is never served. Source:
// OD_PLANS_STALE_LIMIT_HOURS. The model also checks the rest of the
// contract: a list younger than 10 minutes is served without a request, and
// a failed refresh falls back to a stored list of 24 hours or less.
test.prop([commands])(
  "OdInsurancePlansCache never serves a list older than 24 hours",
  async (cmds) => {
    localStorage.clear();
    const clock = { now: Date.UTC(2026, 10, 12) };
    const next = { outcome: "success" as Outcome };
    const versions = { version: 0 };
    const cache = new OdInsurancePlansCache({
      storage: new Storage("od-insurance-property."),
      query: make_query(next, versions),
      now: () => clock.now,
    });
    await fc.asyncModelRun(
      () => ({
        model: { clock, next, stored: null, version: 0 },
        real: { cache },
      }),
      cmds,
    );
  },
);
