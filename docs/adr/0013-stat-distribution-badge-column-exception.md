# Stat Distribution Badge: exception to Source Marker's column exclusion

Source Marker was kept out of the faction/war `.ffscouter-cell` (32×20px, no spare width) because data-provenance (spy/premium/public) wasn't judged worth crowding a cell that already carries the FF/Est number and its color. Stat Distribution Badge — a small icon for the player's highest (and, within 10 points, second-highest) `stats_percentage` stat, shown in the cell's top corner(s) — gets an exception to that rule: it's directly actionable war-targeting information (which stat a player leans on), not provenance metadata, so the crowding cost is worth paying here even though it wasn't for Source Marker. To limit that cost, the badge pokes into the cell's existing ~7px row margin gap rather than overlapping the number itself, so the FF/Est value stays fully legible either way.

## Considered Options

- **Widen `.ffscouter-cell`/`.ffscouter-header` to make real room**: rejected — touches shared war-box column-width CSS that other features (column visibility toggles, sort indicators) already depend on, for a badge that doesn't need a permanent width increase if it can poke into existing margin instead.
- **Tooltip-only, no visual badge**: rejected — the `cell.title` tooltip (`Top Stats: {distribution_human}`) already existed and wasn't enough motivation for this request; the point is glanceable-without-hovering info during a war, the same reason Dibs Badge exists as a badge rather than a tooltip.
