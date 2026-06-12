## Glossary

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
