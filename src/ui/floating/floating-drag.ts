// Generic floating-drag mechanism: makes a fixed-position element draggable
// (mouse and touch), keeps it inside the viewport and out of the shared
// Keep-out Zones, optionally snaps it to a side edge, and saves its position
// per caller. The pure geometry below is what the hook applies.
import default_storage from "@utils/storage";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type KeepOutZone,
  measure_zones,
  type Rect,
  watch_zones,
} from "./keep-out-zones";

export type Side = "left" | "right";

// A saved position: the side edge it hangs from, its distance from that edge,
// and its top edge. Always the side edge, so a resized viewport keeps the
// element on the side the player chose.
export type Anchor = { side: Side; inset: number; top: number };

export type Size = { width: number; height: number };

// Where an element with no saved position hangs.
const DEFAULT_SIDE: Side = "right";
// Gap kept from a side edge when snapping, and from a zone when escaping it.
const EDGE_GAP = 8;
// Without a chat bar, where the default anchor sits: clear of where Torn's
// bottom-right chat icons would be.
const DEFAULT_BOTTOM = 64;
// The smallest height an anchored element shrinks to when it doesn't fit.
export const MIN_ANCHORED_HEIGHT = 160;

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  );
}

function at_top(rect: Rect, top: number): Rect {
  return { ...rect, top, bottom: top + (rect.bottom - rect.top) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

function clamp_to_viewport(rect: Rect, viewport: Size): Rect {
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  const left = clamp(rect.left, 0, viewport.width - width);
  const top = clamp(rect.top, 0, viewport.height - height);
  return { left, top, right: left + width, bottom: top + height };
}

// A rect in a zone moves to the nearest free spot straight above or below it,
// so it stays on the same side edge. With no free spot, it stays put.
function escape_zones(rect: Rect, viewport: Size, zones: Rect[]): Rect {
  if (!zones.some((zone) => overlaps(rect, zone))) return rect;
  const height = rect.bottom - rect.top;
  let best = rect;
  for (const zone of zones) {
    for (const top of [zone.top - EDGE_GAP - height, zone.bottom + EDGE_GAP]) {
      if (top < 0 || top + height > viewport.height) continue;
      const moved = at_top(rect, top);
      if (zones.some((other) => overlaps(moved, other))) continue;
      if (
        best === rect ||
        Math.abs(moved.top - rect.top) < Math.abs(best.top - rect.top)
      ) {
        best = moved;
      }
    }
  }
  return best;
}

function box_of(anchor: Anchor, size: Size, viewport: Size): Rect {
  const left =
    anchor.side === "left"
      ? anchor.inset
      : viewport.width - anchor.inset - size.width;
  return {
    left,
    top: anchor.top,
    right: left + size.width,
    bottom: anchor.top + size.height,
  };
}

// Right edge, 8px above the zones on that edge, or DEFAULT_BOTTOM up from the
// viewport bottom without any.
function default_anchor(size: Size, viewport: Size, zones: Rect[]): Anchor {
  const column = box_of(
    { side: DEFAULT_SIDE, inset: EDGE_GAP, top: 0 },
    { width: size.width, height: viewport.height },
    viewport,
  );
  const below = zones.filter((zone) => overlaps(column, zone));
  const top =
    below.length > 0
      ? Math.min(...below.map((zone) => zone.top)) - EDGE_GAP - size.height
      : viewport.height - DEFAULT_BOTTOM - size.height;
  return { side: DEFAULT_SIDE, inset: EDGE_GAP, top };
}

// Where a saved anchor (or the default) shows right now: inside the viewport
// and out of the zones. Not saved back, so a zone that shrinks again lets the
// element return to where the player put it.
export function resolve_box(
  anchor: Anchor | null,
  size: Size,
  viewport: Size,
  zones: Rect[],
): Rect {
  const saved = anchor ?? default_anchor(size, viewport, zones);
  return escape_zones(
    clamp_to_viewport(box_of(saved, size, viewport), viewport),
    viewport,
    zones,
  );
}

// The anchor saved for a box dropped at `dropped`: the nearer side edge, the
// dropped height, inside the viewport and out of the zones.
export function drop_anchor(
  dropped: Rect,
  viewport: Size,
  zones: Rect[],
  snap: boolean,
): Anchor {
  const placed = clamp_to_viewport(dropped, viewport);
  const side: Side =
    (placed.left + placed.right) / 2 < viewport.width / 2 ? "left" : "right";
  const inset = snap
    ? EDGE_GAP
    : side === "left"
      ? placed.left
      : viewport.width - placed.right;
  const size = {
    width: placed.right - placed.left,
    height: placed.bottom - placed.top,
  };
  const box = resolve_box({ side, inset, top: placed.top }, size, viewport, []);
  return { side, inset, top: escape_zones(box, viewport, zones).top };
}

export type AnchoredLayout = {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

export type Align = "top" | "bottom";

// Which edges a larger element lines up with an anchor box: the bottom edges
// (growing upward) from the lower half of the viewport, the top edges
// (growing downward) from the upper half.
export function align_for(box: Rect, viewport: Size): Align {
  return (box.top + box.bottom) / 2 > viewport.height / 2 ? "bottom" : "top";
}

// Lays out a larger element against an anchor box: on the anchor's side
// edge, lined up by `align`, and shrunk to stay inside the viewport and clear
// of the zones it grows toward.
export function anchored_layout(
  box: Rect,
  side: Side,
  align: Align,
  viewport: Size,
  zones: Rect[],
): AnchoredLayout {
  const horizontal =
    side === "left"
      ? { left: box.left }
      : { right: viewport.width - box.right };
  if (align === "bottom") {
    let limit = 0;
    for (const zone of zones) {
      if (zone.bottom < box.bottom) limit = Math.max(limit, zone.bottom);
    }
    return {
      ...horizontal,
      bottom: viewport.height - box.bottom,
      maxHeight: Math.max(MIN_ANCHORED_HEIGHT, box.bottom - EDGE_GAP - limit),
    };
  }
  let limit = viewport.height;
  for (const zone of zones) {
    if (zone.top > box.top) limit = Math.min(limit, zone.top);
  }
  return {
    ...horizontal,
    top: box.top,
    maxHeight: Math.max(MIN_ANCHORED_HEIGHT, limit - EDGE_GAP - box.top),
  };
}

// Places an anchor-sized element at its box, against its side edge.
export function edge_style(box: Rect, side: Side, viewport: Size) {
  return side === "left"
    ? { left: box.left, top: box.top }
    : { right: viewport.width - box.right, top: box.top };
}

// ============================================================================
// Hook
// ============================================================================
// One key for every caller, mapping caller id to its Anchor. It lives in the
// default Storage namespace, so "Reset settings to defaults" leaves it alone.
const POSITIONS_KEY = "floating_positions";
// A press that moves less than this is a click, not a drag.
const DRAG_THRESHOLD = 5;
const NO_ZONES: readonly KeepOutZone[] = [];

function load_anchor(id: string): Anchor | null {
  return (
    default_storage.get<Record<string, Anchor>>(POSITIONS_KEY)?.[id] ?? null
  );
}

function save_anchor(id: string, anchor: Anchor) {
  default_storage.set(POSITIONS_KEY, {
    ...(default_storage.get<Record<string, Anchor>>(POSITIONS_KEY) ?? {}),
    [id]: anchor,
  });
}

function current_viewport(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

// The viewport and the zones in it, measured together.
function measure(extra: readonly KeepOutZone[]) {
  return { viewport: current_viewport(), zones: measure_zones(extra) };
}

function shifted(rect: Rect, dx: number, dy: number): Rect {
  return {
    left: rect.left + dx,
    right: rect.right + dx,
    top: rect.top + dy,
    bottom: rect.bottom + dy,
  };
}

export type FloatingDragOptions = {
  // Keys the saved position.
  id: string;
  // The size of the box the position describes.
  size: Size;
  // Drops move to the nearer side edge; the vertical position stays free.
  snap: boolean;
  // Added to the shared Keep-out Zones, never replacing them.
  zones?: readonly KeepOutZone[];
  // A press-and-release that didn't drag, or a keyboard activation. The zones
  // are measured again first, since the click may grow the element.
  onClick?: () => void;
  // Off: no listeners or observers, for a caller that isn't floating now.
  enabled?: boolean;
};

export function useFloatingDrag({
  id,
  size,
  snap,
  zones: extra = NO_ZONES,
  onClick,
  enabled = true,
}: FloatingDragOptions) {
  const [anchor, setAnchor] = useState(() => load_anchor(id));
  const [measured, setMeasured] = useState(() => measure(extra));
  // The box following the pointer during a drag.
  const [dragBox, setDragBox] = useState<Rect | null>(null);
  const watcher = useRef<ReturnType<typeof watch_zones> | null>(null);
  // Ends the in-flight press (removes its window listeners).
  const endPress = useRef<(() => void) | null>(null);
  // A drag that ends on its handle is followed by a click, which must not
  // count as one. The browser sends that click before any timer runs, so a
  // timer clears the flag when a drag released elsewhere gets no click.
  const suppressClick = useRef(false);
  const extraZones = useRef(extra);
  useEffect(() => {
    extraZones.current = extra;
  });

  const remeasure = () => {
    watcher.current?.refresh();
    const now = measure(extraZones.current);
    setMeasured(now);
    return now;
  };

  useEffect(() => {
    if (!enabled) return;
    const watching = watch_zones(() =>
      setMeasured(measure(extraZones.current)),
    );
    watcher.current = watching;
    const onResize = () => {
      watching.refresh();
      setMeasured(measure(extraZones.current));
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => {
      window.removeEventListener("resize", onResize);
      watching.disconnect();
      watcher.current = null;
      endPress.current?.();
    };
  }, [enabled]);

  const { viewport, zones } = measured;
  // Where the element rests: during a drag, where it was picked up from.
  const resting = resolve_box(anchor, size, viewport, zones);
  const box = dragBox ?? resting;

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    endPress.current?.();
    // Keeps the moves and the release coming when the pointer leaves the
    // handle or the window.
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    handle.setPointerCapture?.(pointerId);
    const start = box;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    // Only the pointer that pressed drives the drag, not a second finger.
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragging = true;
      setDragBox(shifted(start, dx, dy));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      end();
      if (!dragging) return;
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      const now = remeasure();
      const dropped = drop_anchor(
        shifted(start, ev.clientX - startX, ev.clientY - startY),
        now.viewport,
        now.zones,
        snap,
      );
      save_anchor(id, dropped);
      setAnchor(dropped);
      setDragBox(null);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      end();
      setDragBox(null);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      if (handle.hasPointerCapture?.(pointerId)) {
        handle.releasePointerCapture(pointerId);
      }
      endPress.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    endPress.current = end;
  };

  const handleClick = (e: ReactMouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      return;
    }
    remeasure();
    onClick?.();
  };

  return {
    box,
    resting,
    side: anchor?.side ?? DEFAULT_SIDE,
    viewport,
    zones,
    handleProps: { onPointerDown, onClick: handleClick },
  };
}
