import type { TornTimestampSec } from "./types";

// Torn exposes a server-synced clock via window.getCurrentTimestamp() on its
// own pages, which can drift from the browser's local clock (Date.now()).
// Falls back to Date.now() if Torn's own script hasn't run yet on the page.
export function get_current_time_seconds(): TornTimestampSec {
  if (typeof (window as any).getCurrentTimestamp === "function") {
    return (window as any).getCurrentTimestamp() / 1000;
  }
  return Date.now() / 1000;
}
