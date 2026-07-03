import {
  PREMIUM_ICON_COLOR,
  PREMIUM_ICON_PATH_D,
  SOURCE_MARKER_VIEWBOX,
  type SourceMarker,
  SPY_ICON_COLOR,
  SPY_ICON_HANDLE,
  SPY_ICON_LENS,
} from "@utils/strings";

type Props = {
  marker: SourceMarker;
  className?: string;
};

// React-side counterpart to make_source_marker_svg in dom.ts — same shared
// geometry constants, but built as JSX since a raw SVGElement can't be
// dropped into React's tree directly. Used by both Info Line (inline, right
// after the FF value) and the Settings Panel gauge preview (floating corner
// badge), so it lives here rather than being duplicated in each.
export function SourceMarkerIcon({ marker, className }: Props) {
  return (
    <svg
      className={className ?? "ffscouter-inline-source-marker"}
      viewBox={SOURCE_MARKER_VIEWBOX}
      role="img"
      aria-label={marker.label}
    >
      <title>{marker.label}</title>
      {marker.icon === "spy" ? (
        <>
          <circle
            cx={SPY_ICON_LENS.cx}
            cy={SPY_ICON_LENS.cy}
            r={SPY_ICON_LENS.r}
            fill={SPY_ICON_COLOR}
            stroke="#000000"
            strokeWidth={1.5}
          />
          <line
            x1={SPY_ICON_HANDLE.x1}
            y1={SPY_ICON_HANDLE.y1}
            x2={SPY_ICON_HANDLE.x2}
            y2={SPY_ICON_HANDLE.y2}
            stroke="#000000"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d={PREMIUM_ICON_PATH_D}
          fill={PREMIUM_ICON_COLOR}
          stroke="#000000"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
