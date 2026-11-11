import default_storage from "@utils/storage";
import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import styles from "./od-insurance.module.css";

const cls = {
  helper: styles["ff-od-helper"],
  bar: styles["ff-od-helper__bar"],
  grip: styles["ff-od-helper__grip"],
  press: styles["ff-od-helper__press"],
  icon: styles["ff-od-helper__icon"],
  steps: styles["ff-od-helper__steps"],
  current: styles["ff-od-helper__current"],
};

/** Where the player last dropped the helper, in the default storage. */
export const SEND_HELPER_POSITION_KEY = "od_send_helper_position";

type Position = { left: number; bottom: number };

// Torn's chat bar covers the full width of the bottom 43px, and chat windows
// open above it on the right. So the default is the bottom left, above it.
const DEFAULT_POSITION: Position = { left: 8, bottom: 43 + 8 };
// A drag must not leave less than this much of the helper on screen.
const KEEP_VISIBLE = 40;

function clamp_position(pos: Position): Position {
  const clamp = (v: number, max: number) =>
    Math.max(0, Math.min(v, Math.max(0, max)));
  return {
    left: clamp(pos.left, window.innerWidth - KEEP_VISIBLE),
    bottom: clamp(pos.bottom, window.innerHeight - KEEP_VISIBLE),
  };
}

function load_position(): Position {
  return clamp_position(
    default_storage.get<Position>(SEND_HELPER_POSITION_KEY) ?? DEFAULT_POSITION,
  );
}

export type HelperStep = { label: string; done: boolean; current: boolean };

const mark = (step: HelperStep) => (step.done ? "✓" : step.current ? "▸" : "·");

/**
 * The floating Send Helper. The step button does one step per press; the
 * grip drags it (mouse or touch); the arrow opens the full step list; the X
 * cancels the Selected Plan. The drag has its own grip, so the end of a drag
 * can never count as a press.
 */
export function SendHelper({
  label,
  problem,
  steps,
  onPress,
  onCancel,
}: {
  label: string;
  problem: boolean;
  steps: HelperStep[];
  onPress: () => void;
  onCancel: () => void;
}) {
  const [position, setPosition] = useState(load_position);
  const [expanded, setExpanded] = useState(false);
  // Ends the drag in progress (removes its window listeners).
  const endDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onResize = () => setPosition((p) => clamp_position(p));
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      endDrag.current?.();
    };
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    endDrag.current?.();
    const grip = e.currentTarget;
    const pointerId = e.pointerId;
    grip.setPointerCapture?.(pointerId);
    const start = position;
    const startX = e.clientX;
    const startY = e.clientY;
    const at = (ev: PointerEvent) =>
      clamp_position({
        left: start.left + (ev.clientX - startX),
        bottom: start.bottom - (ev.clientY - startY),
      });
    const move = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) setPosition(at(ev));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      end();
      const dropped = at(ev);
      setPosition(dropped);
      default_storage.set(SEND_HELPER_POSITION_KEY, dropped);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", end);
      if (grip.hasPointerCapture?.(pointerId)) {
        grip.releasePointerCapture(pointerId);
      }
      endDrag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", end);
    endDrag.current = end;
  };

  return (
    <section
      className={cls.helper}
      aria-label="OD Insurance Send Helper"
      data-problem={problem ? "true" : "false"}
      style={{ left: `${position.left}px`, bottom: `${position.bottom}px` }}
    >
      {expanded && (
        <ol className={cls.steps}>
          {steps.map((step) => (
            <li
              key={step.label}
              className={step.current ? cls.current : undefined}
            >
              {mark(step)} {step.label}
            </li>
          ))}
        </ol>
      )}
      <div className={cls.bar}>
        <button
          type="button"
          className={cls.grip}
          aria-label="Move the Send Helper"
          onPointerDown={onPointerDown}
        >
          ⠿
        </button>
        <button type="button" className={cls.press} onClick={onPress}>
          {label}
        </button>
        <button
          type="button"
          className={cls.icon}
          aria-label="Show all steps"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "▾" : "▴"}
        </button>
        <button
          type="button"
          className={cls.icon}
          aria-label="Cancel the send"
          onClick={onCancel}
        >
          ×
        </button>
      </div>
    </section>
  );
}
