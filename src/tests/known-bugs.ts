// Property tests with known open bugs. A known bug owns the inputs that its
// `applies` accepts. The property skips those inputs with `fc.pre` and checks
// every other input, so a new bug in the same property still fails it. Each
// bug's example runs in its own strict test, which fails when the bug looks
// fixed. See "Known failures" in docs/testing/property-based-testing.md.
import { fc, test } from "@fast-check/vitest";

export type KnownBug<Ts extends unknown[]> = {
  // The issue URL.
  issue: string;
  // The shrunk counterexample. It must fail while the bug is open.
  example: Ts;
  // The inputs that the bug owns. State it in terms of the input, or of one
  // narrow output shape. Never write "the predicate fails": the property
  // then checks nothing.
  applies: (...args: Ts) => boolean;
  // The largest share of generated inputs that the bug may own, from 0 to 1.
  // Raise it above DEFAULT_MAX_SHARE only with a comment that says why.
  max_share?: number;
};

// A bug that owns more inputs than this hides too much of the input space.
export const DEFAULT_MAX_SHARE = 0.2;

// The share check needs this many inputs. At the 25 runs of the normal
// suite, the share is too noisy to judge, so only deep runs check it.
export const MIN_INPUTS_FOR_SHARE = 500;

// A predicate fails when it throws, or returns or resolves to false.
export type Predicate<Ts extends unknown[]> = (...args: Ts) => unknown;

// "#64" for an issue URL that ends in /64.
export function issue_label(issue: string): string {
  return `#${issue.split("/").pop()}`;
}

/**
 * The predicate with the known bugs' inputs skipped, and a plugin that fails
 * a passing run when a bug owns more than its share of the inputs.
 */
export function guard_known_bugs<Ts extends unknown[]>(
  known: KnownBug<Ts>[],
  predicate: Predicate<Ts>,
): { run: Predicate<Ts>; plugin: fc.Plugin<Ts> } {
  let total = 0;
  let owned = known.map(() => 0);

  const run = (...args: Ts) => {
    total++;
    const owner = known.findIndex((bug) => bug.applies(...args));
    if (owner >= 0) {
      owned[owner] = (owned[owner] ?? 0) + 1;
      fc.pre(false);
    }
    return predicate(...args);
  };

  // fast-check builds the plugin once for each assert, before the first run.
  const plugin: fc.Plugin<Ts> = () => {
    total = 0;
    owned = known.map(() => 0);
    return {
      onAllRunsComplete: (details) => {
        // A failed run also counts the shrink steps, so its shares are wrong.
        if (details.failed || total < MIN_INPUTS_FOR_SHARE) return;
        known.forEach((bug, i) => {
          const share = (owned[i] ?? 0) / total;
          const max = bug.max_share ?? DEFAULT_MAX_SHARE;
          if (share > max) {
            throw new Error(
              `Known bug ${bug.issue} owns ${Math.round(share * 100)}% of the generated inputs, more than ${Math.round(max * 100)}%. Make its applies() narrower.`,
            );
          }
        });
      },
    };
  };

  return { run, plugin };
}

/**
 * Throws unless the bug's example is in its own region and still fails.
 */
export async function check_known_example<Ts extends unknown[]>(
  bug: KnownBug<Ts>,
  predicate: Predicate<Ts>,
): Promise<void> {
  if (!bug.applies(...bug.example)) {
    throw new Error(
      `The example of ${bug.issue} is outside its applies(). Fix the example or applies().`,
    );
  }
  let failed: boolean;
  try {
    failed = (await predicate(...bug.example)) === false;
  } catch {
    failed = true;
  }
  if (!failed) {
    throw new Error(
      `${bug.issue} looks fixed: its example passes. Remove its entry from the known bugs, and add the example to the property's examples.`,
    );
  }
}

// test.prop, typed for a tuple of arbitraries only. Its own type picks the
// tuple or the record form with a conditional type, which TypeScript cannot
// resolve for a generic Ts.
const tuple_prop = test.prop as <Ts extends unknown[]>(
  arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> },
  params?: fc.Parameters<Ts>,
) => (name: string, predicate: Predicate<Ts>) => void;

/**
 * A property test with known open bugs. It registers the property, with each
 * bug's inputs skipped, and one strict test for each bug's example.
 */
export function prop_with_known_bugs<Ts extends [unknown, ...unknown[]]>(
  arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> },
  known: KnownBug<Ts>[],
  params: fc.Parameters<Ts> = {},
) {
  return (name: string, predicate: Predicate<Ts>) => {
    const { run, plugin } = guard_known_bugs(known, predicate);
    tuple_prop<Ts>(arbitraries, {
      ...params,
      plugins: [...(params.plugins ?? []), plugin],
    })(name, run);
    for (const bug of known) {
      test(`${name}: known bug ${issue_label(bug.issue)}`, () =>
        check_known_example(bug, predicate));
    }
  };
}
