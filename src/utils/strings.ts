import { ColorScheme, ffconfig } from "./ffconfig";
import type { FFData, FFDataComplete, TimestampSec } from "./types";

const HOUR = 60 * 60;
const DAY = HOUR * 24;

const OLD_ESTIMATE_INTERVAL = 14 * DAY; // sec

export function format_ff_score(d: FFDataComplete) {
  const ff = d.fair_fight.toFixed(2);

  const now: TimestampSec = Date.now() / 1000;
  const age = now - d.last_updated;

  var suffix = "";
  if (age > OLD_ESTIMATE_INTERVAL) {
    suffix = "?";
  }

  return `${ff}${suffix}`;
}

export function format_difficulty_text(d: FFDataComplete) {
  if (d.fair_fight <= 1) {
    return "Extremely easy";
  } else if (d.fair_fight <= 2) {
    return "Easy";
  } else if (d.fair_fight <= 3.5) {
    return "Moderately difficult";
  } else if (d.fair_fight <= 4.5) {
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
};

function is_valid_custom_palette(colors: string[] | null): colors is string[] {
  return (
    colors !== null &&
    colors.length === 11 &&
    colors.every((c) => typeof c === "string")
  );
}

function get_active_palette(): string[] {
  const scheme = ffconfig.color_scheme;
  if (scheme === ColorScheme.CUSTOM) {
    const custom = ffconfig.custom_colors;
    if (is_valid_custom_palette(custom)) {
      return custom;
    }
    return BUILTIN_PALETTES[ColorScheme.CLASSIC];
  }
  return BUILTIN_PALETTES[scheme];
}

export function get_ff_arrow_colour(d: FFData) {
  if (d.no_data) {
    return NO_DATA_COLOR;
  }

  // Calculate where on the 11 step gradient we are from 1.0 - 5.0
  let ff = d.fair_fight;
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
  const ff_lower = Math.min(d.fair_fight, max_ff);

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
