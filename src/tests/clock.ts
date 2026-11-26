// A test clock for the code that takes a `now` option, and the model-based
// commands that move it. The unit tests and the model-based properties of
// the caches share it.
import { fc } from "@fast-check/vitest";
import type { Timestamp } from "../utils/types";

export type Clock = {
  // The time that the code under test reads. Pass it as the `now` option.
  now: () => Timestamp;
  // Moves the time forward, or back for a negative step.
  advance: (ms: number) => void;
  // Sets the time.
  set: (time: Timestamp) => void;
};

export function make_clock(start: Timestamp): Clock {
  let time = start;
  return {
    now: () => time,
    advance: (ms) => {
      time += ms;
    },
    set: (t) => {
      time = t;
    },
  };
}

// A model that holds the clock that the real code reads.
type ClockModel = { clock: Clock };

// Moves the clock forward by a fixed step.
export class AdvanceCmd<M extends ClockModel, R extends object>
  implements fc.AsyncCommand<M, R>
{
  constructor(readonly ms: number) {}
  check = () => true;
  async run(m: M): Promise<void> {
    m.clock.advance(this.ms);
  }
  toString = () => `advance(${this.ms})`;
}

// Moves the clock to a deadline that the model holds, plus an offset of a
// few ms. A fixed step reaches a deadline only when it follows the event
// that set the deadline. This command reaches it after any history.
//
// `deadlines` lists the model's deadlines. The command takes the deadlines
// that are still ahead after the offset, and `pick` chooses one of them. If
// none is ahead, `check` is false and fast-check skips the command, so the
// clock never moves back.
export class AdvanceToDeadlineCmd<M extends ClockModel, R extends object>
  implements fc.AsyncCommand<M, R>
{
  constructor(
    readonly deadlines: (m: Readonly<M>) => Timestamp[],
    readonly pick: number,
    readonly offset: number,
  ) {}
  private target(m: Readonly<M>): Timestamp | undefined {
    const now = m.clock.now();
    const ahead = this.deadlines(m)
      .map((t) => t + this.offset)
      .filter((t) => t > now);
    return ahead[this.pick % ahead.length];
  }
  check = (m: Readonly<M>) => this.target(m) !== undefined;
  async run(m: M): Promise<void> {
    const target = this.target(m);
    if (target !== undefined) m.clock.set(target);
  }
  toString = () =>
    `advance_to_deadline(pick=${this.pick}, offset=${this.offset})`;
}

// Commands that move the clock to one of the model's deadlines: 1 ms before
// it, on it, or 1 ms after it.
export function advance_to_deadline_arb<M extends ClockModel, R extends object>(
  deadlines: (m: Readonly<M>) => Timestamp[],
): fc.Arbitrary<AdvanceToDeadlineCmd<M, R>> {
  return fc
    .record({ pick: fc.nat({ max: 7 }), offset: fc.constantFrom(-1, 0, 1) })
    .map(
      ({ pick, offset }) =>
        new AdvanceToDeadlineCmd<M, R>(deadlines, pick, offset),
    );
}
