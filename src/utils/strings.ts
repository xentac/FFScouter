import parseDuration from "parse-duration";
import { extract_ff, extract_last_updated } from "./estimate";
import { ColorScheme, ffconfig } from "./ffconfig";
import type {
  EstimateSource,
  FFData,
  FFDataComplete,
  FFDataDistribution,
  TimestampSec,
} from "./types";

const HOUR = 60 * 60;
const DAY = HOUR * 24;

const OLD_ESTIMATE_INTERVAL = 14 * DAY; // sec

export type EstimateSourceIcon = "spy" | "premium";

export type SourceMarker = { icon: EstimateSourceIcon; label: string };

// The one place an EstimateSource maps to a visual marker. "bss" (the ordinary,
// default source) deliberately gets no marker — absence-of-marker-means-normal,
// same convention as no_data vs normal data elsewhere.
export function get_source_marker(source: EstimateSource): SourceMarker | null {
  switch (source) {
    case "spies":
      return { icon: "spy", label: "Faction spy data" };
    case "premium":
      return { icon: "premium", label: "Premium data" };
    case "bss":
      return null;
  }
}

// Shared geometry/color for the two Source Marker icons: an outline (fixed
// black stroke) around a solid fill, the same visual language as the FF arrow
// marker above. Deliberately hand-drawn shapes instead of emoji — an emoji's
// color and shape depend on the OS/browser's emoji font, which is exactly what
// made the previous glyphs read as "busy" and clash unpredictably with
// whatever Torn page background they sat over; a fixed solid fill sidesteps
// both problems. Consumed by dom.ts/mini-profile (raw DOM, via innerHTML) and
// SourceMarkerIcon (React, in src/ui/source-marker-icon.tsx) independently,
// each building their own markup from these same constants — the same split
// FF_ARROW_PATH_D already has between dom.ts's make_arrow and the JSX preview
// arrow in settings-panel.tsx.
export const SOURCE_MARKER_VIEWBOX = "0 0 20 20";
export const SPY_ICON_LENS = { cx: 8, cy: 8, r: 5 };
export const SPY_ICON_HANDLE = { x1: 12, y1: 12, x2: 18, y2: 18 };
export const SPY_ICON_COLOR = "#4a90d9";
// Classic 5-point star, one point up: 5 outer vertices (r=9) alternating with
// 5 inner vertices (r=4.2, ~0.47 of outer) around center (10,10) — a fatter
// inner/outer ratio than a mathematically "pure" pentagram (~0.382), chosen
// because fatter points stay legible at the tiny sizes this renders at.
export const PREMIUM_ICON_PATH_D =
  "M10,1 L12.47,6.6 L18.56,7.22 L13.99,11.3 L15.29,17.28 L10,14.2 L4.71,17.28 L6.01,11.3 L1.44,7.22 L7.53,6.6 Z";
export const PREMIUM_ICON_COLOR = "#d4af37";

export type StatKey = "strength" | "speed" | "defense" | "dexterity";

// Geometry for the Stat Distribution Badge icons, hand-sliced from Torn's own
// gym stat icon sheet (stat_icons.svg, root of repo). Each entry is one <g>
// group from that file: `d` and `transform` are copied verbatim (the group's
// path data is only meaningful together with its translate), and `viewBox` is
// a tight crop (with ~0.5 unit padding) around that group's own bounding box
// within the sheet's 136x34 viewBox, computed with svg-path-bbox rather than
// guessed by hand — the four icons are not evenly spaced (translate x-offsets
// -603.53/-868.4/-1097/-1224.75), so a naive 34px-wide slice per icon would
// cut some of them off. The sheet's own gradient fills (url(#a) etc.) are
// deliberately dropped here: the badge needs a solid get_contrast_color fill
// to match the cell's own text color, not the sheet's fixed lime-green look.
//
// Which shape is which stat was confirmed by rendering each group standalone
// and asking (2026-08-16): the 1st group (tx -603.53) is an arms-raised flex
// pose (Strength), the 2nd (tx -868.4) is a hunched one-arm-up guard/brace
// stance (Defense), the 3rd (tx -1097) is an unambiguous running figure
// (Speed), and the 4th (tx -1224.75) is a leaning, reaching pose (Dexterity)
// — do not reorder these to match file/DOM order without re-confirming, since
// that first guess (Speed/Defense/Dexterity/Strength in file order) was wrong.
export const STAT_ICON_GEOMETRY: Record<
  StatKey,
  { d: string; transform: string; viewBox: string }
> = {
  strength: {
    d: "M721.018,226.5a1.506,1.506,0,1,0,1.506-1.5A1.5,1.5,0,0,0,721.018,226.5Zm-1.712,2.517a.838.838,0,0,1-.856-.989l.255-1.708a1.05,1.05,0,0,0-1.009-.743.618.618,0,0,0-.678.743l-.493,2.3a2.77,2.77,0,0,0,2.662,1.961h.827a.812.812,0,0,1,.831.985l-.36,2.48-1.689,4c-.168.531.194.962.808.962a1.111,1.111,0,0,0,.955-.643l1.761-3.685h.376l1.79,3.687a1.118,1.118,0,0,0,.959.641c.614,0,.975-.43.805-.961l-1.709-4.063-.342-2.413a.816.816,0,0,1,.834-.986h.828a2.77,2.77,0,0,0,2.663-1.961l-.495-2.288a.625.625,0,0,0-.685-.751,1.062,1.062,0,0,0-1.02.751l.257,1.7a.837.837,0,0,1-.855.989Z",
    transform: "translate(-603.53, -215)",
    viewBox: "112.5 9.5 13 15",
  },
  defense: {
    d: "M916.08,233l-.886,3-.743,2.126a.63.63,0,0,0,.661.874,1.432,1.432,0,0,0,1.275-.874L917.13,236l.525-1.75,1.739.75-.381,3.1a.8.8,0,0,0,.841.9,1.08,1.08,0,0,0,1.063-.9l.381-3.1-1.838-3a1.244,1.244,0,0,1,1.05-1.234h.935a1.878,1.878,0,0,0,1.953-2l-.1-2.364a.9.9,0,0,0-.9-.693.6.6,0,0,0-.629.688L922,229h-3.79a1.4,1.4,0,0,0-1.3.97Zm1.05-6.5A1.577,1.577,0,1,0,918.7,225,1.539,1.539,0,0,0,917.13,226.5Z",
    transform: "translate(-868.4, -215)",
    viewBox: "45.5 9.5 10 15",
  },
  speed: {
    d: "M1116,226.5a1.5,1.5,0,1,0,1.5-1.5A1.5,1.5,0,0,0,1116,226.5Zm4,6.188s1-.252,1-1.108-1-1-1-1-1.65.08-1.82-.143a8.8,8.8,0,0,0-2.18-1.716c-1.04-.571-1.85-1.119-2.7-.944-.86.159-2.54,2.14-3.15,2.7s.21,1.681,1.23.9a14.436,14.436,0,0,0,1.78-1.6s.53-.349.59-.175a5.245,5.245,0,0,1-.56,1.253,22.382,22.382,0,0,0-1.21,1.918c-.46.539-.83,1.506-1.05,1.57a20.377,20.377,0,0,1-2.55-.952.878.878,0,0,0-1.26.334,1,1,0,0,0,.45,1.332s3.6,1.522,4.09,1.427,1.64-2.109,1.95-2.109a3.4,3.4,0,0,1,1.54.792c.02.175,0,3.013,0,3.013s-.17.824.87.824.9-.824.9-.824.1-3.679.11-4.012-1.58-1.363-1.93-1.442c.39-.6,1.05-1.855,1.22-1.776.15.1.56,1.293,1.1,1.445C1117.92,232.531,1120,232.688,1120,232.688Z",
    transform: "translate(-1097, -215)",
    viewBox: "9.5 9.5 15 15",
  },
  dexterity: {
    d: "M1315.748,233.172c0-1.188-1.713-2.818-1.713-2.818a5.12,5.12,0,0,0-2.3-1.785s-3.164-1.488-4.167-3.227a.679.679,0,0,0-.9-.262.611.611,0,0,0-.345.9,8.947,8.947,0,0,0,2.695,3.021c-1.661,1.051-2.308,4.288-2.308,4.288l-.167.758-1.755,4c-.178.531.2.962.835.962a1.154,1.154,0,0,0,.992-.643l1.838-3.685h.386l1.859,3.687a1.184,1.184,0,0,0,1,.641c.637,0,1.013-.43.836-.961L1310.755,234l-.178-.712a1.9,1.9,0,0,1,1.191-2.42,5.613,5.613,0,0,1,2.423,2.977l.073.155h1.149A2.038,2.038,0,0,0,1315.748,233.172Zm-3.426-6.672a1.568,1.568,0,1,0,1.567-1.5A1.533,1.533,0,0,0,1312.322,226.5Z",
    transform: "translate(-1224.75, -215)",
    viewBox: "79.5 9.5 12 15",
  },
};

export const STAT_ICON_LABELS: Record<StatKey, string> = {
  strength: "Strength",
  speed: "Speed",
  defense: "Defense",
  dexterity: "Dexterity",
};

// A Stat Distribution Badge is never more than 2 icons, tagged with the cell
// corner they render in — see get_stat_distribution_badges below.
export type StatDistributionBadge = {
  stat: StatKey;
  percent: number;
  position: "left" | "right";
};

// Ranking rule (see [[Stat Distribution Badge]] in CONTEXT.md): the highest
// stats_percentage entry always gets a badge. A close 2nd (within 10
// percentage points) also gets one, and when both show, the higher of the two
// sits on the left, the lower on the right — but a lone highest (no close
// 2nd) sits on the right by itself. Undefined stats_percentage fields are
// excluded from ranking entirely, and never more than 2 badges are shown even
// if a 3rd stat is also within 10 points of the 2nd.
const CLOSE_SECOND_THRESHOLD = 10;

export function get_stat_distribution_badges(
  dist: FFDataDistribution,
): StatDistributionBadge[] {
  const entries = Object.entries(dist.stats_percentage) as [
    StatKey,
    number | undefined,
  ][];
  const ranked = entries
    .filter((entry): entry is [StatKey, number] => entry[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);

  const top = ranked[0];
  if (!top) {
    return [];
  }

  const second = ranked[1];
  if (second && top[1] - second[1] <= CLOSE_SECOND_THRESHOLD) {
    return [
      { stat: top[0], percent: top[1], position: "left" },
      { stat: second[0], percent: second[1], position: "right" },
    ];
  }

  return [{ stat: top[0], percent: top[1], position: "right" }];
}

export function format_ff_score(d: FFDataComplete) {
  const ff = extract_ff(d).toFixed(2);

  const now: TimestampSec = Date.now() / 1000;
  const age = now - extract_last_updated(d);

  var suffix = "";
  if (age > OLD_ESTIMATE_INTERVAL) {
    suffix = "?";
  }

  return `${ff}${suffix}`;
}

export function format_difficulty_text(d: FFDataComplete) {
  const ff = extract_ff(d);
  if (ff <= 1) {
    return "Extremely easy";
  } else if (ff <= 2) {
    return "Easy";
  } else if (ff <= 3.5) {
    return "Moderately difficult";
  } else if (ff <= 4.5) {
    return "Difficult";
  } else {
    return "May be impossible";
  }
}

export function format_relative_time(timestamp_sec: TimestampSec) {
  const age = Date.now() / 1000 - timestamp_sec;
  if (age < DAY) {
    return "";
  } else if (age < 31 * DAY) {
    const days = Math.round(age / DAY);
    if (days === 1) {
      return "(1 day old)";
    } else {
      return `(${days} days old)`;
    }
  } else if (age < 365 * DAY) {
    const months = Math.round(age / (31 * DAY));
    if (months === 1) {
      return "(1 month old)";
    } else {
      return `(${months} months old)`;
    }
  } else {
    const years = Math.round(age / (365 * DAY));
    if (years === 1) {
      return "(1 year old)";
    } else {
      return `(${years} years old)`;
    }
  }
}

export function get_ff_colour(d: FFDataComplete) {
  return get_ff_arrow_colour(d);
}

// Single source of truth for the arrow shape rendered both live (dom.ts'
// make_arrow) and as a settings preview swatch (settings-panel.ts), so the
// two can't visually drift apart.
export const FF_ARROW_VIEWBOX = "0 0 20 13";
export const FF_ARROW_PATH_D = "M 0,0 H 13 20 L 10,12 Z";

const NO_DATA_COLOR = "#000000";

// Each palette is 11 discrete colors (one per gradient bucket, see get_ff_arrow_colour)
// rather than interpolated stops — see ADR 0002 for why.
const BUILTIN_PALETTES: Record<
  Exclude<ColorScheme, ColorScheme.CUSTOM>,
  string[]
> = {
  // Unchanged from the original hardcoded gradient — must stay byte-for-byte
  // identical so existing users see no visual change.
  [ColorScheme.CLASSIC]: [
    "#1734e8",
    "#1788e8",
    "#17dbe8",
    "#17e8a1",
    "#17e84e",
    "#34e817",
    "#88e817",
    "#dbe817",
    "#e8a117",
    "#e84e17",
    "#e81734",
  ],
  // Source: https://mistic100.github.io/tinygradient/
  // Inputs: rgb(33, 102, 172), rgb(27, 120, 55), rgb(215, 48, 39)
  [ColorScheme.COOL_DIVERGING]: [
    "#2166ac",
    "#2080a2",
    "#1f9497",
    "#1e8d75",
    "#1c8254",
    "#1b7837",
    "#2e8b1e",
    "#6c9e21",
    "#b1aa23",
    "#c47525",
    "#d73027",
  ],
  // Triplet generated using https://www.canva.com/colors/color-wheel/
  [ColorScheme.NEON]: [
    "#0c50ff",
    "#0cb1ff",
    "#0cffec",
    "#0cff8a",
    "#0cff29",
    "#50ff0c",
    "#b1ff0c",
    "#ffec0c",
    "#ff8a0c",
    "#ff290c",
    "#ff0c50",
  ],
  // Viridis-style: perceptually uniform and monotonically increasing in
  // brightness, so the signal doesn't depend on red/green hue discrimination.
  [ColorScheme.COLORBLIND_SAFE]: [
    "#440154",
    "#481a6c",
    "#472f7d",
    "#414487",
    "#39568c",
    "#2a788e",
    "#21908d",
    "#22a884",
    "#42be71",
    "#a8db34",
    "#fde725",
  ],
  // Light to dark — carries the signal through brightness alone, no color needed.
  [ColorScheme.GRAYSCALE]: [
    "#f0f0f0",
    "#e0e0e0",
    "#cccccc",
    "#b3b3b3",
    "#999999",
    "#808080",
    "#666666",
    "#4d4d4d",
    "#333333",
    "#1a1a1a",
    "#000000",
  ],
  // Grafana's default by-value gauge/stat gradient: the dark-theme "green",
  // "yellow", "red" viz colors from grafana/packages/grafana-data/src/themes/
  // createVisualizationColors.ts, linearly interpolated the same way Grafana
  // resolves its "Green-Yellow-Red" field color scheme.
  [ColorScheme.GREEN_YELLOW_RED]: [
    "#73bf69",
    "#8ec55c",
    "#a9cb50",
    "#c4d243",
    "#dfd837",
    "#fade2a",
    "#f8c034",
    "#f7a23e",
    "#f58548",
    "#f46752",
    "#f2495c",
  ],
  // Grafana's "Blue-Yellow-Red" field color scheme: dark-theme "dark-blue",
  // "super-light-yellow", "dark-red" stops, linearly interpolated. The muted
  // middle is inherent to interpolating blue and yellow in plain RGB — Grafana's
  // own rendering has the same characteristic.
  [ColorScheme.BLUE_YELLOW_RED]: [
    "#1f60c4",
    "#4c7ebb",
    "#799db3",
    "#a5bbaa",
    "#d2daa2",
    "#fff899",
    "#f3cb83",
    "#e79e6d",
    "#dc7056",
    "#d04340",
    "#c4162a",
  ],
  // Grafana's "Plasma" continuous color scheme (d3-scale-chromatic's
  // interpolatePlasma), sampled at the same 11 points used for our gradient.
  [ColorScheme.PLASMA]: [
    "#0d0887",
    "#41049d",
    "#6a00a8",
    "#8f0da4",
    "#b12a90",
    "#cc4778",
    "#e16462",
    "#f2844b",
    "#fca636",
    "#fcce25",
    "#f0f921",
  ],
};

function is_valid_custom_palette(colors: string[] | null): colors is string[] {
  return (
    colors !== null &&
    colors.length === 11 &&
    colors.every((c) => typeof c === "string")
  );
}

// Exported so settings UI can render a swatch preview for a scheme without
// duplicating the custom-palette fallback rule.
export function get_palette_for_scheme(
  scheme: ColorScheme,
  customColors: string[] | null = null,
): string[] {
  if (scheme === ColorScheme.CUSTOM) {
    if (is_valid_custom_palette(customColors)) {
      return customColors;
    }
    return BUILTIN_PALETTES[ColorScheme.CLASSIC];
  }
  return BUILTIN_PALETTES[scheme];
}

function get_active_palette(): string[] {
  return get_palette_for_scheme(ffconfig.color_scheme, ffconfig.custom_colors);
}

export function get_ff_arrow_colour(d: FFData) {
  if (d.no_data) {
    return NO_DATA_COLOR;
  }

  // Calculate where on the 11 step gradient we are from 1.0 - 5.0
  let ff = extract_ff(d);
  if (ff < 1) {
    ff = 1;
  } else if (ff > 5) {
    ff = 5;
  }

  const ratio = Math.floor(((ff - 1) / 4) * 10);
  const r = get_active_palette()[ratio];

  return r ?? NO_DATA_COLOR;
}

export function get_contrast_color(hex: string) {
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate brightness
  const brightness = r * 0.299 + g * 0.587 + b * 0.114;
  return brightness > 126 ? "black" : "white"; // Return black or white based on brightness
}

export function ff_to_percent(d: FFDataComplete) {
  // The percent is 0-33% 33-66% 66%-100%
  // With configurable ranges there are no guarantees that the sections are linear
  const low_ff = ffconfig.low_ff_range;
  const high_ff = ffconfig.high_ff_range;
  const max_ff = ffconfig.max_ff_range;
  const low_mid_percent = 33;
  const mid_high_percent = 66;
  const ff_lower = Math.min(extract_ff(d), max_ff);

  let percent: number;
  if (ff_lower < low_ff) {
    percent = ((ff_lower - 1) / (low_ff - 1)) * low_mid_percent;
  } else if (ff_lower < high_ff) {
    percent =
      ((ff_lower - low_ff) / (high_ff - low_ff)) *
        (mid_high_percent - low_mid_percent) +
      low_mid_percent;
  } else {
    percent =
      ((ff_lower - high_ff) / (max_ff - high_ff)) * (100 - mid_high_percent) +
      mid_high_percent;
  }

  return percent;
}

export function format_timestamp(ts: TimestampSec) {
  const d = new Date(ts * 1000);
  return `${d.getHours() < 10 ? "0" : ""}${d.getHours()}:${d.getMinutes() < 10 ? "0" : ""}${d.getMinutes()}:${d.getSeconds() < 10 ? "0" : ""}${d.getSeconds()} - ${d.getDate() < 10 ? "0" : ""}${d.getDate()}/${d.getMonth() + 1 < 10 ? "0" : ""}${d.getMonth() + 1}/${d.getFullYear() - 2000}`;
}

export function parse_suffix_number(valStr: string): number | null {
  const trimmed = valStr.trim().toLowerCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^([\d.,]+)\s*([kmbt])?$/);
  if (!match) return null;

  const matchStr = match[1];
  if (!matchStr) return null;

  const num = Number(matchStr.replace(/,/g, ""));
  if (Number.isNaN(num)) return null;

  const suffix = match[2];
  if (!suffix) return num;

  const multiplier: Record<string, number> = {
    k: 1_000,
    m: 1_000_000,
    b: 1_000_000_000,
    t: 1_000_000_000_000,
  };

  return num * (multiplier[suffix] ?? 1);
}

export function parse_duration_to_seconds(valStr: string): number | null {
  const trimmed = valStr.trim();
  if (!trimmed) return null;

  return parseDuration(trimmed, "s");
}
