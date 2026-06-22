## Glossary

### FFScouter Backend
The service at `ffscouter.com/api/v1` (`FF_SCOUTER_BASE_URL` in `src/utils/api.ts`) that this userscript queries for Fair Fight / Battle Stat estimates, sending the user's Torn API key as a URL query param on every call (`get-stats`, `check-key`, `player-flights`, `get-targets`). Operated as a partnership between Glasnost and xentac — neither party solely controls it, so user-facing docs (e.g. the GreasyFork additional-info doc) should link to its own published data policy (`https://ffscouter.com/#data-policy`) rather than asserting first-party claims about server-side retention/sharing on xentac's authority alone. Distinct from the "volunteer data gathering service," an unrelated, separate effort that this userscript does not interact with and that the linked data policy explicitly does not cover.


### Content Wrapper Width
The width budget our injected UI must lay out within, derived from Torn's `.content-wrapper` (the outer page container the [[Settings Panel]] attaches beside). Torn drives it from two viewport thresholds, giving three discrete widths:
- viewport ≥ **784px** → 784px (desktop)
- **386px** ≤ viewport < 784px → 386px (the "600px" figure sometimes quoted is inside this same bucket, not a separate threshold)
- viewport < **386px** → 320px (narrowest)
Only **784px** becomes an actual CSS breakpoint in our code (matching the existing `@media (min-width: 784px)` used by `.ff-filter-grid`); 386px and 320px both fall in the single "narrow" bucket where our grids collapse to one column. These are reference facts about Torn's layout, not values we set.

### Settings Panel
The `ff-settings-panel` LitElement (`src/ui/settings-panel.ts`) injected beside `.profile-wrapper` on profile pages. Laid out as a per-section CSS grid (one grid per `<h3>` section) that reflows safely within the [[Content Wrapper Width]]: plain selects and checkboxes are single grid cells (3-up at ≥784px, 1-up when narrow), while multi-control bundles (API key row, FF ranges, marker size + preview, color scheme + swatches, chain sub-options, prose notices, footer buttons) span the full grid width as their own rows. Selects stack their label above a cell-filling control; checkboxes stay inline control-first; nothing overflows the container at any of the three widths.

### War Box
The `.faction-war` element containing the side-by-side enemy/your faction lists on the Ranked War page.

### War List
Either `.enemy-faction` or `.your-faction` — the individual per-faction member lists inside the [[War Box]]. Each has its own `.white-grad` header row and receives its own injected [[FF Column Header]].

### White-Grad Header
The `.white-grad` element inside a [[War List]] containing the native Torn column header divs (Member, Level, Score, Status, Attack). Our [[FF Column Header]] is injected as a sibling inside this element.

### FF Column Header
The `<div class="ffscouter-header">` injected by `apply_ff_columns()` into the [[White-Grad Header]]. Displays "FF" or "Est" depending on the configured column display mode. Does not use Torn's CSS module classes.

### Filter Box
The `ff-faction-filter-box` LitElement component (`src/ui/faction-filter-box.ts`) that renders sort and filter controls. In war mode, a single shared instance sits at the top of the [[War Box]] and drives both [[War List]]s. Holds `sortBy` as its source of truth for sort state.

### Sort State
`"ff-asc" | "ff-desc" | "none"` — the current sort direction for the FF/Est column. Owned by the [[Filter Box]] and persisted to config. `"none"` means no FF sort is active (Torn's native sort is uninterrupted).

### Torn Sort Classes
Torn's CSS-module-hashed class names controlling the native column sort icon: `sortIcon___*` (the icon container), `desc___*` / `asc___*` (direction), `activeIcon___*` (currently active sort). These hashes change on Torn releases and should never be hardcoded.

### Sort Icon Class Detection
`detect_sort_icon_classes()` must be scoped to the list element being updated, not the full document. Both a [[War List]] and a standard member list can be visible simultaneously, each using a different CSS-module hash set for sort icons. A document-wide `querySelector` returns whichever set appears first in the DOM, applying the wrong classes to the other list. Fix: accept a `root: HTMLElement` parameter and query within that root.

### Column Display Mode
Resolved per call site (`apply_ff_columns`) from either `ffconfig.war_col_display` or `ffconfig.factions_col_display` depending on context, then passed into `apply_filters_and_sort` as part of the `filters` argument. Not re-read from config inside `apply_filters_and_sort` — doing so was both a localStorage hot-path hit and a correctness bug (war lists were always reading the faction display mode).

### TornTools Extra Rows
`.tt-last-action` and `.tt-stats-estimate` elements injected by TornTools after individual player rows, including on war page `.enemy` and `.your` rows. The sort path in `apply_filters_and_sort` collects and re-attaches these after each player row when reordering. The while loop that collects them must stop at `.table-row` (standard lists), `.enemy`, **and** `.your` (war lists) — a duplicate `"enemy"` check that omits `"your"` is a live bug causing all TornTools extras on the your-faction list to be collected by the first row. Distinct from [[TWSE Last Action Data]], which attaches directly to the row element rather than injecting siblings.

### Torn Clock
Torn exposes a server-synced clock via `window.getCurrentTimestamp()` on its own pages, distinct from the browser's local clock (`Date.now()`/`new Date()`), which can drift if the user's system clock is wrong. We encode this as two separate type families in `src/utils/types.ts`: `Timestamp`/`TimestampSec` (browser-clock-relative) vs `TornTimestamp`/`TornTimestampSec` (Torn-clock-relative). A value typed `TornTimestamp*` must have its age computed against the Torn Clock, not `Date.now()` — falling back to `Date.now()` only when `window.getCurrentTimestamp` isn't present (e.g. before Torn's own script has run on the page). The shared accessor lives in `src/utils/time.ts`. [[TWSE Last Action Data]] is a `TornTimestampSec` for this reason.

### TWSE Last Action Data
`data-twse-last-action-timestamp` — a `TornTimestampSec` (see [[Torn Clock]]) attribute published directly on war-page rows (`.enemy`/`.your`) by Torn War Stuff Enhanced (TWSE), a third-party tool, representing a player's last action time. Despite the name, TWSE only annotates [[War List]] rows — never the standard faction member list. Unlike [[TornTools Extra Rows]] (injected as sibling elements *after* a row), TWSE attaches its data directly to the row element itself, closer in shape to FFScouter's own `data-earliest-arrival`/`data-latest-arrival` attributes (`column-population.ts`) than to TornTools' sibling-row approach. A value of `0` is TWSE's sentinel for "last action unknown" (it still sets the attribute, just with this value) rather than omitting the attribute — treated as no-data, not as an actual 1970 timestamp, by both [[TWSE Presence Detection]] and the [[Last Action Range Filter]].

### TWSE Presence Detection
Whether TWSE is active on a war page is determined by scanning both [[War List]]s for at least one row carrying [[TWSE Last Action Data]] — not all rows, since TWSE may legitimately skip a row it can't resolve. Pushed onto `<ff-faction-filter-box>` as a property in `setup_reapply_watcher`, the same "setup code detects page context, then configures the filter box" shape already used for `mode` (see [[Filter Box]]). TWSE runs as an independent script and may annotate rows after our watcher is already set up, so detection re-runs from three places: once synchronously at setup, again whenever `data-twse-last-action-timestamp` changes on a row (added to the existing attribute `MutationObserver`'s filter — safe to share with that observer, since `apply_filters_and_sort`'s own row reordering only ever performs `childList` mutations, never attribute changes, so it can't retrigger this attributes-only watch), and on the same 30s interval already used to poll traveling flights, as a fallback for TWSE adding the attribute via a brand-new row element rather than annotating an existing one (a `childList` mutation the attribute observer doesn't watch). If the attribute later disappears (TWSE disabled, navigated away and back), the [[Last Action Range Filter]] group hides again, but its stored Min/Max values are left untouched in config — they reappear pre-filled if TWSE returns.

### Last Action Range Filter
A Min/Max range filter (`Min ≤ age ≤ Max`, the same direction as the Level/FF/Stats ranges) on a player's age since last action, computed against the [[Torn Clock]] from [[TWSE Last Action Data]]. Only ever rendered in war mode, gated by [[TWSE Presence Detection]] — faction mode never shows it. Min/Max are stored as raw typed duration strings (e.g. `"1h"`, `"4h2m15s"`) and parsed to seconds only when the filter snapshot is built, the same deferred-parsing convention the Stats range filter uses for its suffix-number strings (`parse_suffix_number` in `src/utils/strings.ts`) — parsing eagerly on every keystroke would make the input glitch mid-type. Unparseable text resolves to "no bound" rather than hiding every row. A row whose own last-action value is the `0` sentinel (see [[TWSE Last Action Data]]) always passes this filter, the same graceful fallback already used for rows missing FF/Stats data.

### Active-Filter Flag
`data-ffscouter-active-filter`, set by `is_filter_active()` in `filter-sort-engine.ts`. Despite the generic-sounding name, this means specifically "FFScouter is currently sorting by FF/Est" — it does not mean "any filter is active," and deliberately ignores the Level/FF/Stats/[[Last Action Range Filter]] bounds. Do not "fix" this to account for range filters; the narrow meaning is intentional.

### Torn Row Reordering
Torn's own JavaScript reorders faction member rows in response to the same state-change events (status, activity) that trigger our `MutationObserver`. Because of this, `apply_filters_and_sort` must always re-sort when called from the mutation path — not just reapply filters — to reassert our sort order over Torn's.

### Cleanup Interval
A `setInterval` (10 s period) attached to each active observer setup that checks `!element.isConnected` and tears down its associated `MutationObserver` and flight-poll interval when the element leaves the DOM. Preferred over a document-level `childList`+`subtree` `MutationObserver` because the Torn SPA produces many DOM mutations per second and a subtree observer would impose constant allocation and callback overhead.

### FF Color Scale
The single FF-value-to-hex-color mapping (`get_ff_arrow_colour` / `get_ff_colour` in `src/utils/strings.ts`) applied uniformly across every place an FF/BS value is color-coded: both [[Gauge Marker]] variants (arrow and bubble), the profile mini [[Info Line]] background, and the faction/war page FF column cell background. One scale, one preset choice — never configured per-consumer. See [[Color Scheme]] for how the scale's 11 colors are chosen, and ADR 0002 for why it stays a single shared scale.

### Color Scheme
`ffconfig.color_scheme` — selects which 11-hex-color palette the [[FF Color Scale]] indexes into. Eight named presets ship in the settings panel (`classic` is the default and matches the scale's original hardcoded colors exactly): `classic`, `cool_diverging`, `neon`, `colorblind_safe`, `grayscale`, `green_yellow_red`, `blue_yellow_red`, `plasma`. The last three (plus `colorblind_safe`, which matches Grafana's `Viridis`) are modeled on Grafana's default field color schemes for fidelity rather than invented from scratch. A ninth value, `custom`, is reserved in the type/storage layer (`ffconfig.custom_colors: string[] | null`, 11 hex strings) but intentionally hidden from the settings dropdown until a color-editing UI exists. The no-data indicator color (black) does not vary by scheme — it isn't a point on the gradient.

### Gauge Marker
The visual indicator placed on a `.ffscouter-gauge` track (see `make_marker()` in `src/utils/dom.ts`) showing a player's FF/BS value at the position computed by `ff_to_percent`. Style is selected via `ffconfig.gauge_marker_type`: `arrow` (the default colored arrow, `.ffscouter-arrow`) or one of two bubble variants (`bubble_ff`, `bubble_estimate`, rendered as `.ffscouter-bubble`). Its size is controlled by [[Marker Scale]], independent of which style is chosen.

### Marker Scale
`ffconfig.gauge_marker_scale` — a percentage (50–200, step 5; default 100) that uniformly resizes both the arrow and bubble [[Gauge Marker]] variants. Implemented as a single shared CSS custom property, `--ffscouter-marker-scale`, set on `document.body`: `--ffscouter-arrow-width` and `--ffscouter-bubble-font-size` are both `calc()`'d off it, so the arrow's width (and, via its native SVG aspect ratio, its height) and the bubble's font-size scale together from one value. The bubble's box (height, min-width, line-height, padding) is defined in `em` so it scales automatically off the font-size; `border-radius` is a large constant (`999px`) so it always renders as a full pill regardless of size. Only the bubble's own pill shape scales this way — the underlying `.ffscouter-gauge` track is untouched.

Unlike [[Color Scheme]] and Gauge Marker Style — which are baked into each marker inline at creation time and only affect markers created after the change — Marker Scale is live: because every marker reads the same body-level CSS variable, changing it (in `add_ff_arrow()` at creation time, and again explicitly on Settings save) instantly resizes every marker already on the page, with no need to recreate elements.

In the settings panel, configured via a range slider paired with a synced, clamped numeric input, plus a live preview showing a sample arrow and bubble side by side (colored from a mid-range entry of the currently selected draft [[Color Scheme]]) that reacts to the unsaved draft value via a locally-scoped `--ffscouter-marker-scale` override on the preview wrapper — independent of the saved/body-level value used by real markers on the page.

### Info Line
The `ff-header-line` LitElement component (`src/ui/info-line.ts`) rendering the FF/BS summary line on profile pages, including a background colored via the [[FF Color Scale]].

### Activity Status
Online/idle/offline state derived per-row from the `aria-label` ("{name} is online/offline/idle") on Torn's `userStatusWrap___*` div (`get_activity_status()` in `src/utils/dom.ts`), not from an `<img alt>` as in pre-2026-06 markup — `.icons` is now reused for multiple unrelated row sections (e.g. the achievement-icon tray on the regular faction member list) and can no longer scope the lookup. An unparseable label yields `"unknown"`, which always passes the [[Filter Box]]'s activity filter rather than being hidden, and is logged once per distinct label text so a future wording change is loud, not silent. See [[Torn Markup Snapshot]].

### Torn Markup Snapshot
A dated, untrimmed capture of a live Torn page fragment, stored under a feature's `__fixtures__/torn-markup/<date>/` directory (e.g. `src/features/faction/__fixtures__/torn-markup/2026-06-22/`). Captured opportunistically when Torn changes markup; the latest dated folder is wired into a test asserting our parsing still produces the expected result, so the snapshot and the parser can't silently drift apart. Older dated folders are kept for reference but not re-tested. Distinct from the trimmed inline `innerHTML` strings used elsewhere in `.test.ts` files, which exist only to exercise one assertion and aren't meant to be faithful.
