// Pilot property tests for the floating placement geometry. Each test
// generates many random viewports, element sizes, anchors, and Keep-out Zones,
// and checks a rule that must hold for all of them.
import { fc, test } from "@fast-check/vitest";
import { describe, expect } from "vitest";
import {
  type Anchor,
  drop_anchor,
  EDGE_GAP,
  resolve_box,
  type Size,
} from "./floating-drag";
import type { Rect } from "./keep-out-zones";

// ============================================================================
// Arbitraries
// ============================================================================
// Integers only: every real input is whole CSS pixels from
// getBoundingClientRect() or a saved anchor, and integer edges let the
// brute-force oracle try every top position.

const viewport_arb = fc.record({
  width: fc.integer({ min: 200, max: 2000 }),
  height: fc.integer({ min: 200, max: 1500 }),
});

// Heights up to 1600, so some elements are taller than the viewport.
const size_arb = fc.record({
  width: fc.integer({ min: 10, max: 300 }),
  height: fc.integer({ min: 10, max: 1600 }),
});

// Insets up to 2500, so some saved anchors are wider than the viewport.
const anchor_arb: fc.Arbitrary<Anchor> = fc.record({
  side: fc.constantFrom("left" as const, "right" as const),
  inset: fc.integer({ min: 0, max: 2500 }),
  top: fc.integer({ min: -200, max: 2000 }),
});

// A zone before it is clipped to a viewport. Most are full-width strips (the
// chat bar and the header). Some are narrower, like a feature's own zone.
const raw_zone_arb = fc.record({
  top: fc.integer({ min: 0, max: 1500 }),
  height: fc.integer({ min: 1, max: 600 }),
  span: fc.option(
    fc.record({
      left: fc.integer({ min: 0, max: 2000 }),
      width: fc.integer({ min: 1, max: 800 }),
    }),
    { freq: 3 },
  ),
});
type RawZone = typeof raw_zone_arb extends fc.Arbitrary<infer T> ? T : never;

const zones_arb = fc.array(raw_zone_arb, { maxLength: 4 });

// Clips raw zones to a viewport and drops any that end up empty.
function clip_zones(raw: RawZone[], viewport: Size): Rect[] {
  const zones: Rect[] = [];
  for (const z of raw) {
    const top = Math.min(z.top, viewport.height);
    const bottom = Math.min(z.top + z.height, viewport.height);
    const left = Math.min(z.span?.left ?? 0, viewport.width);
    const right = z.span
      ? Math.min(z.span.left + z.span.width, viewport.width)
      : viewport.width;
    if (top < bottom && left < right) zones.push({ left, top, right, bottom });
  }
  return zones;
}

// ============================================================================
// Helpers and the oracle
// ============================================================================

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

function fits(size: Size, viewport: Size): boolean {
  return size.width <= viewport.width && size.height <= viewport.height;
}

function inside(rect: Rect, viewport: Size): boolean {
  return (
    rect.left >= 0 &&
    rect.top >= 0 &&
    rect.right <= viewport.width &&
    rect.bottom <= viewport.height
  );
}

function clear_of(rect: Rect, zones: Rect[]): boolean {
  return zones.every((zone) => !overlaps(rect, zone));
}

// The box a saved anchor names, clamped into the viewport: what resolve_box
// starts from before it escapes the zones.
function clamped_box(anchor: Anchor, size: Size, viewport: Size): Rect {
  const raw_left =
    anchor.side === "left"
      ? anchor.inset
      : viewport.width - anchor.inset - size.width;
  const left = Math.max(0, Math.min(raw_left, viewport.width - size.width));
  const top = Math.max(0, Math.min(anchor.top, viewport.height - size.height));
  return { left, top, right: left + size.width, bottom: top + size.height };
}

// The slow oracle: every top position in the viewport, on the same side edge
// (same left), whose box stays `gap` pixels above and below every zone.
// Returns the one nearest to `rect`, or null when there is no free spot.
// With gap 0, a free spot is any top with no overlap.
function nearest_free(
  rect: Rect,
  viewport: Size,
  zones: Rect[],
  gap: number,
): Rect | null {
  const height = rect.bottom - rect.top;
  let best: Rect | null = null;
  for (let top = 0; top + height <= viewport.height; top++) {
    const moved = { ...rect, top, bottom: top + height };
    const padded = { ...moved, top: top - gap, bottom: top + height + gap };
    if (!clear_of(padded, zones)) continue;
    if (!best || Math.abs(top - rect.top) < Math.abs(best.top - rect.top)) {
      best = moved;
    }
  }
  return best;
}

// The zone escape inputs: a box, its zones, and where resolve_box starts from
// and ends up. Mapped, so a counterexample prints the derived values too.
function escape_case_of(
  anchor: Anchor,
  size: Size,
  viewport: Size,
  raw: RawZone[],
) {
  const zones = clip_zones(raw, viewport);
  return {
    size,
    viewport,
    zones,
    start: clamped_box(anchor, size, viewport),
    box: resolve_box(anchor, size, viewport, zones),
  };
}

// The shrunk counterexamples from a deep run, for the known-failing
// properties. Pinned through `examples`, so every run tries them first: at the
// default 25 runs, random inputs alone almost never reach them, and a
// `test.fails` property that finds no counterexample passes and goes red.
const CORNER = { side: "left" as const, inset: 0, top: 0 };
const SMALL = { width: 10, height: 10 };
const SCREEN = { width: 200, height: 200 };
// Free tops 183 to 190 fit the element but not the 8px gap.
const THIN_STRIP_AT_EDGE = escape_case_of(CORNER, SMALL, SCREEN, [
  { top: 0, height: 183, span: null },
]);
// Stacked zones: the escape lands flush against the first zone.
const STACKED_ZONES = escape_case_of(CORNER, SMALL, SCREEN, [
  { top: 0, height: 1, span: null },
  { top: 19, height: 1, span: null },
]);

// ============================================================================
// Properties
// ============================================================================

describe("resolve_box properties", () => {
  test.prop([fc.option(anchor_arb), size_arb, viewport_arb, zones_arb])(
    "1. in-viewport: a box that fits stays inside the viewport",
    (anchor, size, viewport, raw) => {
      const zones = clip_zones(raw, viewport);
      const box = resolve_box(anchor, size, viewport, zones);
      if (fits(size, viewport)) expect(inside(box, viewport)).toBe(true);
    },
  );

  test.prop([anchor_arb, size_arb, viewport_arb, zones_arb])(
    "an element taller than the viewport pins to the top edge",
    (anchor, size, viewport, raw) => {
      const zones = clip_zones(raw, viewport);
      const box = resolve_box(anchor, size, viewport, zones);
      if (size.height > viewport.height) expect(box.top).toBe(0);
    },
  );

  const escape_case = fc
    .tuple(anchor_arb, size_arb, viewport_arb, zones_arb)
    .map((args) => escape_case_of(...args));

  test.prop([escape_case])(
    "2. out of zones: clear of the zones when a spot with the gap exists",
    ({ size, viewport, zones, start, box }) => {
      if (!fits(size, viewport)) return;
      if (nearest_free(start, viewport, zones, EDGE_GAP)) {
        expect(clear_of(box, zones)).toBe(true);
      }
    },
  );

  // Known bug: https://github.com/xentac/FFScouter/issues/61 (case A).
  // Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([escape_case], { examples: [[THIN_STRIP_AT_EDGE]] })(
    "2. strict: clear of the zones when any free spot exists",
    ({ size, viewport, zones, start, box }) => {
      if (!fits(size, viewport)) return;
      if (nearest_free(start, viewport, zones, 0)) {
        expect(clear_of(box, zones)).toBe(true);
      }
    },
  );

  test.prop([escape_case])(
    "2. with no free spot at all, it stays put",
    ({ size, viewport, zones, start, box }) => {
      if (!fits(size, viewport)) return;
      if (!nearest_free(start, viewport, zones, 0)) {
        expect(box).toEqual(start);
      }
    },
  );

  test.prop([escape_case])(
    "3. nearest free spot: a move is clear and no farther than the oracle",
    ({ size, viewport, zones, start, box }) => {
      if (!fits(size, viewport) || box.top === start.top) return;
      expect(clear_of(box, zones)).toBe(true);
      const oracle = nearest_free(start, viewport, zones, EDGE_GAP);
      // Distances, not tops: a spot above and a spot below can tie.
      if (oracle) {
        expect(Math.abs(box.top - start.top)).toBeLessThanOrEqual(
          Math.abs(oracle.top - start.top),
        );
      }
    },
  );

  // Known bug: https://github.com/xentac/FFScouter/issues/61 (case B).
  // Remove `.fails` when it is fixed. Keep the example.
  test.fails.prop([escape_case], { examples: [[STACKED_ZONES]] })(
    "3. strict: a moved box keeps the gap from every zone",
    ({ size, viewport, zones, start, box }) => {
      if (!fits(size, viewport) || box.top === start.top) return;
      const padded = {
        ...box,
        top: box.top - EDGE_GAP,
        bottom: box.bottom + EDGE_GAP,
      };
      expect(clear_of(padded, zones)).toBe(true);
    },
  );

  test.prop([anchor_arb, size_arb, viewport_arb, zones_arb])(
    "a box clear of the zones resolves to its saved place",
    (anchor, size, viewport, raw) => {
      const zones = clip_zones(raw, viewport);
      const start = clamped_box(anchor, size, viewport);
      if (!clear_of(start, zones)) return;
      expect(resolve_box(anchor, size, viewport, zones)).toEqual(start);
    },
  );

  test.prop([
    anchor_arb,
    size_arb,
    viewport_arb,
    zones_arb,
    fc.integer({ min: 0, max: 1500 }),
  ])(
    "zones that cover the whole height leave the box where it is",
    (anchor, size, viewport, raw, split) => {
      // Two full-width strips that meet, plus the random zones.
      const at = Math.min(split, viewport.height);
      const zones = [
        { left: 0, right: viewport.width, top: 0, bottom: at },
        {
          left: 0,
          right: viewport.width,
          top: at,
          bottom: viewport.height,
        },
        ...clip_zones(raw, viewport),
      ];
      const start = clamped_box(anchor, size, viewport);
      expect(resolve_box(anchor, size, viewport, zones)).toEqual(start);
    },
  );
});

// A dropped box: any position, including partly off screen.
const dropped_arb = fc
  .record({
    left: fc.integer({ min: -300, max: 2300 }),
    top: fc.integer({ min: -300, max: 1800 }),
    width: fc.integer({ min: 10, max: 300 }),
    height: fc.integer({ min: 10, max: 600 }),
  })
  .map(
    ({ left, top, width, height }): Rect => ({
      left,
      top,
      right: left + width,
      bottom: top + height,
    }),
  );

function size_of(rect: Rect): Size {
  return { width: rect.right - rect.left, height: rect.bottom - rect.top };
}

describe("drop_anchor properties", () => {
  test.prop([
    dropped_arb,
    viewport_arb,
    zones_arb,
    viewport_arb,
    zones_arb,
    fc.boolean(),
  ])(
    "4. resize: a saved anchor stays inside and out of zones in a new viewport",
    (dropped, before, raw_before, after, raw_after, snap) => {
      const size = size_of(dropped);
      if (!fits(size, before) || !fits(size, after)) return;
      const anchor = drop_anchor(
        dropped,
        before,
        clip_zones(raw_before, before),
        snap,
      );
      const zones = clip_zones(raw_after, after);
      const start = clamped_box(anchor, size, after);
      const box = resolve_box(anchor, size, after, zones);
      expect(inside(box, after)).toBe(true);
      if (nearest_free(start, after, zones, EDGE_GAP)) {
        expect(clear_of(box, zones)).toBe(true);
      }
    },
  );

  test.prop([dropped_arb, viewport_arb, zones_arb])(
    "5. round trip: a drop resolves where it landed, apart from clamping and zone escape",
    (dropped, viewport, raw) => {
      const size = size_of(dropped);
      if (!fits(size, viewport)) return;
      const zones = clip_zones(raw, viewport);
      // Without snapping, so the drop keeps its distance from the edge.
      const anchor = drop_anchor(dropped, viewport, zones, false);
      const box = resolve_box(anchor, size, viewport, zones);
      // Same left as the clamped drop, same top as the saved anchor.
      const left = Math.max(
        0,
        Math.min(dropped.left, viewport.width - size.width),
      );
      expect(box).toEqual({
        left,
        top: anchor.top,
        right: left + size.width,
        bottom: anchor.top + size.height,
      });
    },
  );

  test.prop([dropped_arb, viewport_arb])(
    "with no zones, a drop that fits resolves exactly where it was dropped",
    (dropped, viewport) => {
      const size = size_of(dropped);
      if (!fits(size, viewport) || !inside(dropped, viewport)) return;
      const anchor = drop_anchor(dropped, viewport, [], false);
      expect(resolve_box(anchor, size, viewport, [])).toEqual(dropped);
    },
  );
});
