// PROTOTYPE — THROWAWAY. Do not ship. (Wayfinder ticket #18)
//
// Three variants of the estimate-age explanation surface, rendered in place of
// the normal FFHeaderLine on the real profile page, switchable via a
// `ffproto=A|B|C` URL search param and a floating bottom bar (also ← / → keys).
// Copy is placeholder — final wording is ticket #19.
//
//   A — inline expander: whole badge is the click target; a full-width card
//       opens BELOW the info line, pushing page content down. Glyph inside the
//       badge, after the freshness text. Dismiss: tap badge again, or the ×.
//   B — anchored popover: only the glyph + freshness text are click targets;
//       a small floating card anchors under the glyph, overlaying the page.
//       Glyph sits outside the badge, after the source marker.
//       Dismiss: outside-tap, Esc, tap-again.
//   C — full-width dropdown panel: the whole line is the click target; a
//       content-width panel overlays the page just below the line (no push).
//       Glyph at the very end of the line, after Est. Stats.
//       Dismiss: outside-tap, Esc, or the ×.

import {
  extract_bs_estimate_human,
  extract_last_updated,
  extract_source,
} from "@utils/estimate";
import {
  format_difficulty_text,
  format_ff_score,
  format_relative_time,
  get_contrast_color,
  get_ff_colour,
  get_source_marker,
} from "@utils/strings";
import type { EstimateSource, FFDataComplete } from "@utils/types";
import { useEffect, useRef, useState } from "react";
import styles from "./info-line.module.css";
import { SourceMarkerIcon } from "./source-marker-icon";

const VARIANTS = ["A", "B", "C"] as const;
type Variant = (typeof VARIANTS)[number];

const VARIANT_NAMES: Record<Variant, string> = {
  A: "Inline expander (push-down)",
  B: "Anchored popover",
  C: "Full-width dropdown panel",
};

export function explainer_prototype_variant(): Variant | null {
  const raw = new URLSearchParams(window.location.search).get("ffproto");
  const upper = raw?.toUpperCase();
  return VARIANTS.find((v) => v === upper) ?? null;
}

const GUIDE_URL = "https://ffscouter.com/guides/fair-fight-explained";
const FAQ_URL = "https://ffscouter.com/faq#profile-stats-old-inaccurate";

const SOURCE_PHRASE: Record<EstimateSource, string> = {
  bss: "public battle-stat data",
  premium: "premium data sources",
  spies: "a faction spy report",
};

type Props = {
  data: FFDataComplete;
  extraDetailsLine: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Shared pieces (content + glyph). The *surface* is what varies per variant.
// ---------------------------------------------------------------------------

function InfoGlyph({ size = 13 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "1.5px solid currentColor",
        fontSize: size * 0.72,
        fontWeight: "bold",
        fontStyle: "normal",
        lineHeight: 1,
        verticalAlign: "middle",
        fontFamily: "Georgia, serif",
      }}
    >
      i
    </span>
  );
}

function ExplainerContent({
  data,
  onClose,
}: {
  data: FFDataComplete;
  onClose?: () => void;
}) {
  const source = extract_source(data);
  const ageText = format_relative_time(extract_last_updated(data));
  const dynamicAge =
    ageText === "" ? "updated within the last day" : `last updated ${ageText}`;

  return (
    <div style={{ fontStyle: "normal", fontWeight: "normal", fontSize: 12 }}>
      <p style={{ margin: "0 0 6px", lineHeight: 1.45 }}>
        FF Scouter estimates are calculated from real attack logs shared by
        volunteers, so they only update when someone running the script fights
        this player. That means an estimate can lag behind a player&apos;s
        current stats — treat anything older than a month with caution.{" "}
        <a
          href={GUIDE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          How Fair Fight scoring works
        </a>
        .
      </p>
      <p style={{ margin: "0 0 6px", lineHeight: 1.45 }}>
        This player&apos;s estimate comes from {SOURCE_PHRASE[source]},{" "}
        {dynamicAge.replace("(", "").replace(")", "")}.
      </p>
      <p style={{ margin: 0, lineHeight: 1.45 }}>
        <a
          href={FAQ_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "underline" }}
        >
          Why estimates can look old or inaccurate (FAQ)
        </a>
        .
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close explanation"
          style={{
            position: "absolute",
            top: 4,
            right: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
            color: "inherit",
            padding: 4,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

const CARD_STYLE: React.CSSProperties = {
  position: "relative",
  background: "var(--ffscouter-alt-bg-color, #f2f2f2)",
  border: "1px solid var(--ffscouter-border-color, #ccc)",
  borderRadius: 6,
  padding: "8px 24px 8px 10px",
  color: "var(--ffscouter-text-color, inherit)",
};

// Closes an overlay on outside-tap and Esc.
function useDismiss(
  open: boolean,
  close: () => void,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close, containerRef]);
}

// Shared line fragments so each variant only restructures what it disagrees on.
function compute_line_parts(data: FFDataComplete) {
  const backgroundColor = get_ff_colour(data);
  return {
    ffString: format_ff_score(data),
    difficulty: format_difficulty_text(data),
    fresh: format_relative_time(extract_last_updated(data)),
    backgroundColor,
    textColor: get_contrast_color(backgroundColor),
    sourceMarker: get_source_marker(extract_source(data)),
  };
}

const EST_STATS_STYLE: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: "normal",
  marginLeft: "6px",
  verticalAlign: "middle",
  fontStyle: "italic",
};

// ---------------------------------------------------------------------------
// Variant A — inline expander. Whole badge clickable; card pushes content down.
// ---------------------------------------------------------------------------

function VariantA({ data, extraDetailsLine }: Props) {
  const [open, setOpen] = useState(false);
  const parts = compute_line_parts(data);

  return (
    <>
      <span className={styles["ffscouter-info-line__label"]}>FairFight:</span>
      <button
        type="button"
        className={styles["ffscouter-info-line__badge"]}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          background: parts.backgroundColor,
          color: parts.textColor,
          cursor: "pointer",
          border: "none",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
        }}
      >
        {parts.ffString} ({parts.difficulty}) {parts.fresh}{" "}
        <InfoGlyph size={12} />
      </button>
      {parts.sourceMarker && <SourceMarkerIcon marker={parts.sourceMarker} />}
      <span style={EST_STATS_STYLE}>
        Est. Stats: <span>{extract_bs_estimate_human(data)}</span>
      </span>
      {open && (
        <div style={{ ...CARD_STYLE, marginTop: 6 }}>
          <ExplainerContent data={data} onClose={() => setOpen(false)} />
        </div>
      )}
      {extraDetailsLine}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant B — anchored popover. Glyph + freshness text clickable; small card
// anchored under the glyph, overlaying the page.
// ---------------------------------------------------------------------------

function VariantB({ data, extraDetailsLine }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  useDismiss(open, () => setOpen(false), wrapRef);
  const parts = compute_line_parts(data);
  const toggle = () => setOpen((o) => !o);

  return (
    <>
      <span className={styles["ffscouter-info-line__label"]}>FairFight:</span>
      <span
        className={styles["ffscouter-info-line__badge"]}
        style={{ background: parts.backgroundColor, color: parts.textColor }}
      >
        {parts.ffString} ({parts.difficulty}){" "}
        {parts.fresh !== "" && (
          <button
            type="button"
            aria-expanded={open}
            onClick={toggle}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              color: "inherit",
              cursor: "pointer",
              textDecoration: "underline dotted",
              textUnderlineOffset: 2,
            }}
          >
            {parts.fresh}
          </button>
        )}
      </span>
      {parts.sourceMarker && <SourceMarkerIcon marker={parts.sourceMarker} />}
      <span
        ref={wrapRef}
        style={{ position: "relative", display: "inline-block" }}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-label="About this estimate"
          onClick={toggle}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            margin: 0,
            color: "inherit",
            cursor: "pointer",
            marginLeft: 5,
            verticalAlign: "middle",
            display: "inline-flex",
          }}
        >
          <InfoGlyph size={14} />
        </button>
        {open && (
          <div
            style={{
              ...CARD_STYLE,
              position: "absolute",
              top: "calc(100% + 6px)",
              left: -8,
              width: "min(320px, calc(100vw - 40px))",
              zIndex: 100000,
              boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
            }}
          >
            <ExplainerContent data={data} />
          </div>
        )}
      </span>
      <span style={EST_STATS_STYLE}>
        Est. Stats: <span>{extract_bs_estimate_human(data)}</span>
      </span>
      {extraDetailsLine}
    </>
  );
}

// ---------------------------------------------------------------------------
// Variant C — full-width dropdown panel. Whole line clickable; content-width
// panel overlays the page below the line (no push). Glyph at the line's end.
// ---------------------------------------------------------------------------

function VariantC({ data, extraDetailsLine }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), wrapRef);
  const parts = compute_line_parts(data);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <span className={styles["ffscouter-info-line__label"]}>FairFight:</span>
        <span
          className={styles["ffscouter-info-line__badge"]}
          style={{ background: parts.backgroundColor, color: parts.textColor }}
        >
          {parts.ffString} ({parts.difficulty}) {parts.fresh}
        </span>
        {parts.sourceMarker && <SourceMarkerIcon marker={parts.sourceMarker} />}
        <span style={EST_STATS_STYLE}>
          Est. Stats: <span>{extract_bs_estimate_human(data)}</span>
        </span>
        <span style={{ marginLeft: 6, verticalAlign: "middle" }}>
          <InfoGlyph size={14} />
        </span>
      </button>
      {open && (
        <div
          style={{
            ...CARD_STYLE,
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 100000,
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
          <ExplainerContent data={data} onClose={() => setOpen(false)} />
        </div>
      )}
      {extraDetailsLine}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Switcher — floating bottom-centre pill; ← / → cycle, URL stays shareable.
// ---------------------------------------------------------------------------

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: Variant;
  onChange: (v: Variant) => void;
}) {
  const cycle = (dir: 1 | -1) => {
    const idx = VARIANTS.indexOf(current);
    const next =
      VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length] ?? "A";
    const url = new URL(window.location.href);
    url.searchParams.set("ffproto", next);
    window.history.replaceState(null, "", url.toString());
    onChange(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const arrowStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    padding: "2px 8px",
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        background: "#1a1a2e",
        color: "#fff",
        borderRadius: 999,
        padding: "4px 10px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
        fontSize: 12,
        fontFamily: "sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      <button type="button" style={arrowStyle} onClick={() => cycle(-1)}>
        ←
      </button>
      <span>
        PROTOTYPE {current} — {VARIANT_NAMES[current]}
      </span>
      <button type="button" style={arrowStyle} onClick={() => cycle(1)}>
        →
      </button>
    </div>
  );
}

export function ExplainerLinePrototype({
  data,
  extraDetailsLine,
  initialVariant,
}: Props & { initialVariant: Variant }) {
  const [variant, setVariant] = useState<Variant>(initialVariant);
  const VariantComponent = { A: VariantA, B: VariantB, C: VariantC }[variant];
  return (
    <>
      <VariantComponent data={data} extraDetailsLine={extraDetailsLine} />
      <PrototypeSwitcher current={variant} onChange={setVariant} />
    </>
  );
}
