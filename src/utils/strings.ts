import { ffconfig } from "./ffconfig";
import type { FFData, FFDataComplete, TimestampSec } from "./types";

const HOUR = 60 * 60;
const DAY = HOUR * 24;

const OLD_ESTIMATE_INTERVAL = 14 * DAY; // sec

export function generate_info_line(data: FFData) {
  if (data.no_data) {
    return `<span style="font-weight: bold; margin-right: 6px;">FairFight:</span><span style="background: #444; color: #fff; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;">No data</span>`;
  }
  const ff_string = format_ff_score(data);
  const difficulty = format_difficulty_text(data);

  const fresh = format_relative_time(data);

  const background_colour = get_ff_colour(data);
  const text_colour = get_contrast_color(background_colour);

  let statDetails = "";
  statDetails = `<span style="font-size: 11px; font-weight: normal; margin-left: 8px; vertical-align: middle; font-style: italic;">Est. Stats: <span>${data.bs_estimate_human}</span></span>`;

  return `<span style="font-weight: bold; margin-right: 6px;">FairFight:</span><span style="background: ${background_colour}; color: ${text_colour}; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block;">${ff_string} (${difficulty}) ${fresh}</span>${statDetails}`;
}

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

export function format_relative_time(d: FFDataComplete) {
  const age = Date.now() / 1000 - d.last_updated;
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

// Source: https://mistic100.github.io/tinygradient/
// Inputs: rgb(33, 102, 172), rgb(27, 120, 55), rgb(215, 48, 39)
// Steps: 11
const _arrow_gradient = [
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
];

// Alternative variants, triplet generated using https://www.canva.com/colors/color-wheel/
// Just enter any of the three extreme values
const _arrow_gradient2 = [
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
];

const arrow_gradient3 = [
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
];

export function get_ff_arrow_colour(d: FFData) {
  if (d.no_data) {
    return "#000000";
  }

  // Calculate where on the 11 step gradient we are from 1.0 - 5.0
  let ff = d.fair_fight;
  if (ff < 1) {
    ff = 1;
  } else if (ff > 5) {
    ff = 5;
  }

  const ratio = Math.floor(((ff - 1) / 4) * 10);
  const r = arrow_gradient3[ratio];

  return r ?? "#000000";
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
