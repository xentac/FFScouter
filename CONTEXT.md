## Glossary

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
`.tt-last-action` and `.tt-stats-estimate` elements injected by TornTools after individual player rows, including on war page `.enemy` and `.your` rows. The sort path in `apply_filters_and_sort` collects and re-attaches these after each player row when reordering. The while loop that collects them must stop at `.table-row` (standard lists), `.enemy`, **and** `.your` (war lists) — a duplicate `"enemy"` check that omits `"your"` is a live bug causing all TornTools extras on the your-faction list to be collected by the first row.

### Torn Row Reordering
Torn's own JavaScript reorders faction member rows in response to the same state-change events (status, activity) that trigger our `MutationObserver`. Because of this, `apply_filters_and_sort` must always re-sort when called from the mutation path — not just reapply filters — to reassert our sort order over Torn's.

### Cleanup Interval
A `setInterval` (10 s period) attached to each active observer setup that checks `!element.isConnected` and tears down its associated `MutationObserver` and flight-poll interval when the element leaves the DOM. Preferred over a document-level `childList`+`subtree` `MutationObserver` because the Torn SPA produces many DOM mutations per second and a subtree observer would impose constant allocation and callback overhead.

### FF Color Scale
The single FF-value-to-hex-color mapping (`get_ff_arrow_colour` / `get_ff_colour` in `src/utils/strings.ts`) applied uniformly across every place an FF/BS value is color-coded: both [[Gauge Marker]] variants (arrow and bubble), the profile mini [[Info Line]] background, and the faction/war page FF column cell background. One scale, one preset choice — never configured per-consumer. See [[Color Scheme]] for how the scale's 11 colors are chosen, and ADR 0002 for why it stays a single shared scale.

### Color Scheme
`ffconfig.color_scheme` — selects which 11-hex-color palette the [[FF Color Scale]] indexes into. Eight named presets ship in the settings panel (`classic` is the default and matches the scale's original hardcoded colors exactly): `classic`, `cool_diverging`, `neon`, `colorblind_safe`, `grayscale`, `green_yellow_red`, `blue_yellow_red`, `plasma`. The last three (plus `colorblind_safe`, which matches Grafana's `Viridis`) are modeled on Grafana's default field color schemes for fidelity rather than invented from scratch. A ninth value, `custom`, is reserved in the type/storage layer (`ffconfig.custom_colors: string[] | null`, 11 hex strings) but intentionally hidden from the settings dropdown until a color-editing UI exists. The no-data indicator color (black) does not vary by scheme — it isn't a point on the gradient.

### Gauge Marker
The visual indicator placed on a `.ffsv3-gauge` track (see `make_marker()` in `src/utils/dom.ts`) showing a player's FF/BS value at the position computed by `ff_to_percent`. Style is selected via `ffconfig.gauge_marker_type`: `arrow` (the default colored arrow, `.ffsv3-arrow`) or one of two bubble variants (`bubble_ff`, `bubble_estimate`, rendered as `.ffsv3-bubble`). Its size is controlled by [[Marker Scale]], independent of which style is chosen.

### Marker Scale
`ffconfig.gauge_marker_scale` — a percentage (50–200, step 5; default 100) that uniformly resizes both the arrow and bubble [[Gauge Marker]] variants. Implemented as a single shared CSS custom property, `--ffsv3-marker-scale`, set on `document.body`: `--ffsv3-arrow-width` and `--ffsv3-bubble-font-size` are both `calc()`'d off it, so the arrow's width (and, via its native SVG aspect ratio, its height) and the bubble's font-size scale together from one value. The bubble's box (height, min-width, line-height, padding) is defined in `em` so it scales automatically off the font-size; `border-radius` is a large constant (`999px`) so it always renders as a full pill regardless of size. Only the bubble's own pill shape scales this way — the underlying `.ffsv3-gauge` track is untouched.

Unlike [[Color Scheme]] and Gauge Marker Style — which are baked into each marker inline at creation time and only affect markers created after the change — Marker Scale is live: because every marker reads the same body-level CSS variable, changing it (in `add_ff_arrow()` at creation time, and again explicitly on Settings save) instantly resizes every marker already on the page, with no need to recreate elements.

In the settings panel, configured via a range slider paired with a synced, clamped numeric input, plus a live preview showing a sample arrow and bubble side by side (colored from a mid-range entry of the currently selected draft [[Color Scheme]]) that reacts to the unsaved draft value via a locally-scoped `--ffsv3-marker-scale` override on the preview wrapper — independent of the saved/body-level value used by real markers on the page.

### Info Line
The `ff-header-line` LitElement component (`src/ui/info-line.ts`) rendering the FF/BS summary line on profile pages, including a background colored via the [[FF Color Scale]].
