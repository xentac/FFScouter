// Keep-out Zones: areas of Torn's own page that FF Scouter floating elements
// must not cover. One shared list applies to every floating element; a caller
// can add zones of its own but cannot remove the shared ones.

// Viewport coordinates, as from getBoundingClientRect().
export type Rect = { left: number; top: number; right: number; bottom: number };

// A zone is measured on demand, because Torn's page changes under it. null
// means the zone is absent right now.
export type KeepOutZone = () => Rect | null;

// Torn's chat button bar. Found through the stable button ids, never Torn's
// hashed class names (e.g. `root___Ef1Ql`), which change on Torn deploys.
export function find_chat_bar(): Element | null {
  return (
    (
      document.getElementById("people_panel_button") ??
      document.getElementById("notes_panel_button")
    )?.parentElement ?? null
  );
}

// A full-width strip, not the bar's own width: the bar grows as the player
// opens conversations. Open chat windows are deliberately not zones, since
// enough of them cover the whole screen.
function chat_bar_zone(): Rect | null {
  const bar = find_chat_bar();
  if (!bar) return null;
  return {
    left: 0,
    right: window.innerWidth,
    top: bar.getBoundingClientRect().top,
    bottom: window.innerHeight,
  };
}

// Torn's page header, found through its id. It stacks above FF Scouter's
// floating elements, so it hides them.
function find_header(): Element | null {
  return document.getElementById("header-root");
}

// A full-width strip from the top of the viewport as tall as the header
// reaches with the page scrolled to the top. The header scrolls with the
// page, so a modal expanded on a scrolled page would otherwise end up under
// it when the player scrolls back up. A header that stays in place (fixed or
// sticky) is measured where it is now. A hidden header is no zone.
function header_zone(): Rect | null {
  const header = find_header();
  if (!header) return null;
  const rect = header.getBoundingClientRect();
  if (rect.height <= 0) return null;
  const { position } = getComputedStyle(header);
  const bottom =
    position === "fixed" || position === "sticky"
      ? rect.bottom
      : rect.bottom + window.scrollY;
  if (bottom <= 0) return null;
  return { left: 0, right: window.innerWidth, top: 0, bottom };
}

const SHARED_KEEP_OUT_ZONES: readonly KeepOutZone[] = Object.freeze([
  chat_bar_zone,
  header_zone,
]);

// The elements the shared zones are measured from.
function zone_elements(): Element[] {
  return [find_chat_bar(), find_header()].filter(
    (el): el is Element => el !== null,
  );
}

// How often the zones' elements are looked up again. Torn can render its
// chat after the script starts, or replace the bar, and a resting element
// must still move out of its zone. A lookup by id is cheap enough to poll, which saves
// observing the page's mutations.
const BAR_LOOKUP_MS = 1000;

// Watches the shared zones' elements for size changes, so a bar that grows
// pushes a resting element out right away. refresh() looks the elements up
// again now, and onChange runs when a lookup finds different elements.
export function watch_zones(onChange: () => void): {
  refresh(): void;
  disconnect(): void;
} {
  const observer =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => onChange());
  let watched: Element[] = [];
  const refresh = () => {
    const elements = zone_elements();
    if (
      elements.length === watched.length &&
      elements.every((el, i) => el === watched[i])
    ) {
      return false;
    }
    observer?.disconnect();
    watched = elements;
    for (const el of elements) observer?.observe(el);
    return true;
  };
  refresh();
  const poll = setInterval(() => {
    if (refresh()) onChange();
  }, BAR_LOOKUP_MS);
  return {
    refresh,
    disconnect: () => {
      clearInterval(poll);
      observer?.disconnect();
    },
  };
}

export function measure_zones(extra: readonly KeepOutZone[] = []): Rect[] {
  return [...SHARED_KEEP_OUT_ZONES, ...extra]
    .map((zone) => zone())
    .filter((rect): rect is Rect => rect !== null);
}
