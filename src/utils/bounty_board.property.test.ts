// @vitest-environment jsdom
// A model-based property for the Bounty Board Cache. Each run applies a
// random sequence of board consults and clock steps to the real cache and to
// a model. The injected query records each request, and the model says when
// a request is allowed.
import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";
import {
  AdvanceCmd,
  advance_to_deadline_arb,
  type Clock,
  make_clock,
} from "../tests/clock";
import { SELLER_BOARD_RESPONSE } from "./__fixtures__/bounty_board";
import { FFApiError, type query_bounty_seller_board } from "./api";
import {
  BOUNTY_BOARD_FRESHNESS_FLOOR_MS,
  BountyBoardCache,
} from "./bounty_board";
import { FFCache } from "./ffcache";
import { FFConfig } from "./ffconfig";
import type { Timestamp } from "./types";

const SEC = 1000;
const MINUTE = 60 * SEC;
const TEST_PREFIX = "ffscouter-bounty-property.";

// The retry rules from the comments in bounty_board.ts: transient faults
// back off from 30 s, doubling to a cap of 8 min. A coded 4xx waits the
// flat floor. A rate limit waits the floor or retry_after, whichever is
// longer. A failure record lingers 1 hour past its retry time, so the next
// transient failure can escalate from its count.
const TRANSIENT_BASE_MS = 30 * SEC;
const TRANSIENT_CAP_MS = 8 * MINUTE;
const FAILURE_LINGER_MS = 60 * MINUTE;

// What the server does with one request.
type Outcome =
  | { kind: "success" }
  | { kind: "blank" }
  | { kind: "transient"; status: number }
  | { kind: "coded_5xx" }
  | { kind: "coded_4xx" }
  | { kind: "rate_limited"; retry_after_seconds: number | null };

type Failure = {
  transient: boolean;
  fail_count: number;
  next_retry_at: Timestamp;
};

type Model = {
  clock: Clock;
  // The outcome of the next request, set by each consult command.
  next: { outcome: Outcome };
  fetched_at: Timestamp | null;
  failure: Failure | null;
  requests: number;
};
type Real = {
  // A new cache instance, as a new page load makes it.
  new_page_cache: () => BountyBoardCache;
  requests: () => number;
};

// The query that the real cache calls. It records each request and acts out
// the outcome that the model chose.
function make_query(
  next: { outcome: Outcome },
  log: { requests: number },
): typeof query_bounty_seller_board {
  return async () => {
    log.requests++;
    const outcome = next.outcome;
    switch (outcome.kind) {
      case "success":
        return { result: SELLER_BOARD_RESPONSE, blank: false };
      case "blank":
        return { blank: true };
      case "transient":
        throw new FFApiError(`HTTP status code: ${outcome.status}`, {
          ff_http_status: outcome.status,
        });
      case "coded_5xx":
        throw new FFApiError("Code: 88", {
          ff_api_error: { code: 88, error: "Try again shortly" },
          ff_http_status: 503,
        });
      case "coded_4xx":
        throw new FFApiError("Code: 86", {
          ff_api_error: { code: 86, error: "Consent required" },
          ff_http_status: 403,
        });
      default:
        // The rate limit: the one kind left.
        throw new FFApiError("Code: 21", {
          ff_api_error: {
            code: 21,
            error: "Rate limit exceeded",
            retry_after_seconds: outcome.retry_after_seconds,
          },
          ff_http_status: 429,
        });
    }
  };
}

// The retry delay and backoff count after a failed request, by the rules
// above.
function failure_after(m: Model, outcome: Outcome): Failure {
  const now = m.clock.now();
  if (outcome.kind === "rate_limited") {
    const delay = Math.max(
      BOUNTY_BOARD_FRESHNESS_FLOOR_MS,
      (outcome.retry_after_seconds ?? 0) * SEC,
    );
    return { transient: false, fail_count: 0, next_retry_at: now + delay };
  }
  if (outcome.kind === "coded_4xx") {
    return {
      transient: false,
      fail_count: 0,
      next_retry_at: now + BOUNTY_BOARD_FRESHNESS_FLOOR_MS,
    };
  }
  const prev = m.failure;
  const prev_count =
    prev?.transient && now < prev.next_retry_at + FAILURE_LINGER_MS
      ? prev.fail_count
      : 0;
  const fail_count = prev_count + 1;
  const delay = Math.min(
    TRANSIENT_BASE_MS * 2 ** (fail_count - 1),
    TRANSIENT_CAP_MS,
  );
  return { transient: true, fail_count, next_retry_at: now + delay };
}

// One consult from a new page load. A new instance has no in-flight lookup,
// so each consult reads the stored board and failure.
class ConsultCmd implements fc.AsyncCommand<Model, Real> {
  constructor(readonly outcome: Outcome) {}
  check = () => true;
  async run(m: Model, r: Real): Promise<void> {
    m.next.outcome = this.outcome;
    const now = m.clock.now();
    const fresh =
      m.fetched_at !== null &&
      now - m.fetched_at < BOUNTY_BOARD_FRESHNESS_FLOOR_MS;
    const waiting = m.failure !== null && now < m.failure.next_retry_at;
    // Rule: no request inside the freshness floor after a success, and no
    // request before next_retry_at after a failure. Otherwise a consult
    // makes exactly one request.
    const want_request = !fresh && !waiting;

    const result = await r
      .new_page_cache()
      .get_board()
      .then(
        (board) => ({ board }),
        (error: unknown) => ({ error }),
      );

    if (want_request) m.requests++;
    expect(r.requests()).toBe(m.requests);

    const succeeded =
      fresh || (want_request && this.outcome.kind === "success");
    if (succeeded) {
      expect(result).toEqual({ board: SELLER_BOARD_RESPONSE });
    } else {
      expect(result).toHaveProperty("error");
    }
    if (want_request) {
      if (this.outcome.kind === "success") {
        m.fetched_at = now;
        m.failure = null;
      } else {
        m.failure = failure_after(m, this.outcome);
      }
    }
  }
  toString = () => `consult(${Object.values(this.outcome).join(":")})`;
}

// The outcomes a real request can have, with success the most common.
const outcome_arb: fc.Arbitrary<Outcome> = fc.oneof(
  { weight: 3, arbitrary: fc.constant<Outcome>({ kind: "success" }) },
  fc.constant<Outcome>({ kind: "blank" }),
  fc
    .constantFrom(500, 502, 503)
    .map((status): Outcome => ({ kind: "transient", status })),
  fc.constant<Outcome>({ kind: "coded_5xx" }),
  fc.constant<Outcome>({ kind: "coded_4xx" }),
  fc.constantFrom(null, 0, 30, 120, 600).map(
    (retry_after_seconds): Outcome => ({
      kind: "rate_limited",
      retry_after_seconds,
    }),
  ),
);

// Time moves forward only. A random step rarely lands on a deadline, so a
// second command moves the clock to 1 ms before, on, or after one: the end
// of the freshness floor, the retry time, or the end of the failure linger.
const advance_arb = fc.oneof(
  fc.integer({ min: 1, max: 15 * MINUTE }),
  fc.integer({ min: 1, max: 2 * FAILURE_LINGER_MS }),
);
const deadlines = (m: Readonly<Model>): Timestamp[] => [
  ...(m.fetched_at === null
    ? []
    : [m.fetched_at + BOUNTY_BOARD_FRESHNESS_FLOOR_MS]),
  ...(m.failure === null
    ? []
    : [m.failure.next_retry_at, m.failure.next_retry_at + FAILURE_LINGER_MS]),
];

// A player's visits: consults from new page loads with the clock moving
// between them.
const commands = fc.commands(
  [
    outcome_arb.map((outcome) => new ConsultCmd(outcome)),
    advance_arb.map((ms) => new AdvanceCmd<Model, Real>(ms)),
    advance_to_deadline_arb<Model, Real>(deadlines),
  ],
  { maxCommands: 25 },
);

let db_counter = 0;

// Rule: after a success, the cache makes no request inside the freshness
// floor. After a failure, it makes no request before next_retry_at. Source:
// BOUNTY_BOARD_FRESHNESS_FLOOR_MS and the retry comments in bounty_board.ts.
// The model also checks that a consult outside both windows makes exactly
// one request.
test.prop([commands])(
  "BountyBoardCache makes no request inside its freshness or retry window",
  async (cmds) => {
    localStorage.clear();
    new FFConfig(TEST_PREFIX).key = "test-key";
    const clock = make_clock(Date.UTC(2026, 1, 2));
    const now = clock.now;
    const db_name = `bounty-board-model-${db_counter++}`;
    const next = { outcome: { kind: "success" } as Outcome };
    const log = { requests: 0 };
    const query = make_query(next, log);
    // The idle close never runs, so the database stays open until
    // delete_db. The stored board and failure live in it, so one FFCache
    // serves every page load.
    const store = new FFCache(db_name, { now, schedule: () => () => {} });
    const new_page_cache = () =>
      new BountyBoardCache(new FFConfig(TEST_PREFIX), {
        cache: store,
        query,
        now,
      });
    try {
      await fc.asyncModelRun(
        () => ({
          model: {
            clock,
            next,
            fetched_at: null,
            failure: null,
            requests: 0,
          },
          real: { new_page_cache, requests: () => log.requests },
        }),
        cmds,
      );
    } finally {
      await store.delete_db();
    }
  },
);
