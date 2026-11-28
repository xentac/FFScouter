import { describe, expect, test } from "vitest";
import {
  align_for,
  anchored_layout,
  drop_anchor,
  MIN_ANCHORED_HEIGHT,
  resolve_box,
} from "./floating-drag";
import type { Rect } from "./keep-out-zones";

const VIEWPORT = { width: 1024, height: 768 };
const SIZE = { width: 40, height: 40 };
const CHAT_ZONE: Rect = { left: 0, right: 1024, top: 728, bottom: 768 };
const HEADER_ZONE: Rect = { left: 0, right: 1024, top: 0, bottom: 80 };

function box(left: number, top: number): Rect {
  return { left, top, right: left + 40, bottom: top + 40 };
}

describe("resolve_box", () => {
  test("with no saved anchor, sits on the right edge 8px above the chat zone", () => {
    expect(resolve_box(null, SIZE, VIEWPORT, [CHAT_ZONE])).toEqual(
      box(976, 680),
    );
  });

  test("with no saved anchor and no chat zone, sits 64px from the bottom", () => {
    expect(resolve_box(null, SIZE, VIEWPORT, [])).toEqual(box(976, 664));
  });

  test("clamps an off-screen anchor back into a smaller viewport", () => {
    const anchor = { side: "left" as const, inset: 900, top: 700 };
    expect(resolve_box(anchor, SIZE, { width: 500, height: 400 }, [])).toEqual(
      box(460, 360),
    );
  });

  test("moves a resting anchor out of a zone that grew over it", () => {
    const anchor = { side: "left" as const, inset: 8, top: 680 };
    const taller = { ...CHAT_ZONE, top: 600 };
    expect(resolve_box(anchor, SIZE, VIEWPORT, [taller])).toEqual(box(8, 552));
  });

  // Between two zones with too little room for 8px on both sides, the box
  // sits in the middle: the 50px space holds the 40px box with 5px each side.
  test("between two close zones, sits in the middle of the space", () => {
    const anchor = { side: "left" as const, inset: 8, top: 30 };
    const feature: Rect = { left: 0, right: 1024, top: 130, bottom: 170 };
    expect(resolve_box(anchor, SIZE, VIEWPORT, [HEADER_ZONE, feature])).toEqual(
      box(8, 85),
    );
  });

  // The screen edge needs no gap, so the zone gets all the spare room.
  test("in a thin strip at the screen edge, sits flush with the edge", () => {
    const anchor = { side: "left" as const, inset: 0, top: 0 };
    const screen = { width: 200, height: 200 };
    const zone: Rect = { left: 0, right: 200, top: 0, bottom: 183 };
    expect(
      resolve_box(anchor, { width: 10, height: 10 }, screen, [zone]),
    ).toEqual({ left: 0, top: 190, right: 10, bottom: 200 });
  });

  test("prefers a nearer tight space to a farther one with the full gap", () => {
    const anchor = { side: "left" as const, inset: 8, top: 30 };
    const feature: Rect = { left: 0, right: 1024, top: 130, bottom: 170 };
    // The full-gap spot below the feature zone, at 178, is farther than 85.
    expect(
      resolve_box(anchor, SIZE, VIEWPORT, [HEADER_ZONE, feature]).top,
    ).toBeLessThan(178);
  });

  test("with room for the full gap, keeps 8px from the zone it left", () => {
    const anchor = { side: "left" as const, inset: 8, top: 30 };
    const feature: Rect = { left: 0, right: 1024, top: 200, bottom: 240 };
    expect(resolve_box(anchor, SIZE, VIEWPORT, [HEADER_ZONE, feature])).toEqual(
      box(8, 88),
    );
  });
});

describe("drop_anchor", () => {
  test("snaps to the nearer side edge and keeps the dropped height", () => {
    expect(drop_anchor(box(300, 200), VIEWPORT, [], true)).toEqual({
      side: "left",
      inset: 8,
      top: 200,
    });
    expect(drop_anchor(box(700, 200), VIEWPORT, [], true)).toEqual({
      side: "right",
      inset: 8,
      top: 200,
    });
  });

  test("without snapping, keeps the distance from the nearer edge", () => {
    expect(drop_anchor(box(700, 200), VIEWPORT, [], false)).toEqual({
      side: "right",
      inset: 284,
      top: 200,
    });
  });

  test("a drop inside a zone moves just above it on the same edge", () => {
    expect(drop_anchor(box(100, 740), VIEWPORT, [CHAT_ZONE], true)).toEqual({
      side: "left",
      inset: 8,
      top: 680,
    });
  });

  test("a drop on the header moves just below it on the same edge", () => {
    expect(
      drop_anchor(box(100, 20), VIEWPORT, [CHAT_ZONE, HEADER_ZONE], true),
    ).toEqual({ side: "left", inset: 8, top: 88 });
  });

  test("a drop past the viewport edge is clamped into it", () => {
    expect(drop_anchor(box(-50, -30), VIEWPORT, [], true)).toEqual({
      side: "left",
      inset: 8,
      top: 0,
    });
  });
});

describe("align_for", () => {
  test("lines up bottom edges from the lower half, top edges from the upper", () => {
    expect(align_for(box(8, 400), VIEWPORT)).toBe("bottom");
    expect(align_for(box(8, 340), VIEWPORT)).toBe("top");
  });
});

describe("anchored_layout", () => {
  test("from a lower-half anchor, bottom edges line up and it grows upward", () => {
    expect(
      anchored_layout(box(976, 680), "right", "bottom", VIEWPORT, [CHAT_ZONE]),
    ).toEqual({ right: 8, bottom: 48, maxHeight: 712 });
  });

  test("growing upward, it stops below a zone above it", () => {
    expect(
      anchored_layout(box(976, 680), "right", "bottom", VIEWPORT, [
        CHAT_ZONE,
        HEADER_ZONE,
      ]),
    ).toEqual({ right: 8, bottom: 48, maxHeight: 632 });
  });

  test("from an upper-half anchor, top edges line up and it stops above the zone", () => {
    expect(
      anchored_layout(box(8, 100), "left", "top", VIEWPORT, [CHAT_ZONE]),
    ).toEqual({ left: 8, top: 100, maxHeight: 620 });
  });

  test("a height that does not fit shrinks only to the minimum", () => {
    const zone = { left: 0, right: 1024, top: 260, bottom: 300 };
    expect(
      anchored_layout(
        box(8, 100),
        "left",
        "top",
        { width: 1024, height: 300 },
        [zone],
      ),
    ).toEqual({ left: 8, top: 100, maxHeight: MIN_ANCHORED_HEIGHT });
  });
});
