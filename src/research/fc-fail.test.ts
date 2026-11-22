import { fc, test } from "@fast-check/vitest";
import { expect } from "vitest";

// Deliberately failing property, to capture the failure report format.
// Skipped so the suite stays green. Change to test.prop to see the report.
test.skip.prop([fc.array(fc.integer())])("naive sort is wrong", (xs) => {
  // biome-ignore lint/suspicious/useArraySortCompare: the missing comparator is the planted bug.
  const sorted = [...xs].sort();
  for (let i = 1; i < sorted.length; i++) {
    expect(sorted[i - 1]).toBeLessThanOrEqual(sorted[i] as number);
  }
});
