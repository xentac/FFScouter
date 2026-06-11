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
