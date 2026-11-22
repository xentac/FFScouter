import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

let calls = 0;

test.prop([fc.string(), fc.string(), fc.string()])(
  "substring property",
  (a, b, c) => {
    calls++;
    expect((a + b + c).includes(b)).toBe(true);
  },
);

test("global numRuns from FC_NUM_RUNS was honoured", () => {
  expect(calls).toBe(Number(process.env["FC_NUM_RUNS"] ?? "25"));
});

test.prop([fc.array(fc.integer())])("async predicate works", async (xs) => {
  await Promise.resolve();
  expect([...xs].sort((a, b) => a - b).length).toBe(xs.length);
});
