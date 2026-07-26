# Status-attack click investigation: what's confirmed, what's ruled out, what's still open

A user report described clicking an online/idle/offline status icon on the faction/war member
list and sometimes ending up on the clicked player's own profile page, or on a *different*
player's attack page, instead of the intended attack link. The report initially named "the code we
wrote to fix the memory leak" as a suspect — that was `mountFilterBox`'s React-root tracking (ADR
0010, `src/features/faction/index.ts`), read in full during this investigation and found unrelated
to the click-to-attack path (`src/features/status-attack/index.ts`). It shares no state, no DOM
scope, and no call path with `handleStatusClick`.

## What was confirmed

`handleStatusClick`'s player-ID resolution (`get_player_id_in_element`, `src/utils/dom.ts`) is
fully stateless: every click re-scans the clicked element's anchors fresh from the DOM, with no
memoization, `WeakMap`, or persisted variable anywhere in the chain down to `open_attack_link`.
This was verified by direct read of the full call chain, not inferred.

On faction/war pages, `closest(".table-row, .enemy, .your, .member")` was assumed (before real
markup was available) to resolve to the whole row, putting icon-tray badge links (Married/Company/
Faction, which happen to use `userID=`/`NID=` rather than `XID=`/`userId=`) within scanning
distance of a naive first-anchor-wins scan. A real ~70-row live war-list capture (2026-07-26, provided directly by the user during this
investigation; not yet committed as a fixture — see the follow-up implementation work for exact
fixture placement under `src/features/status-attack/__fixtures__/torn-markup/`) disproved this:
`closest()` actually resolves to the nearer,
tighter `.member` cell (the [[User Info Box]]'s immediate container in `CONTEXT.md`'s terms), not
the row, because CSS class matching is exact-token and the icon-tray cell's class is
`member-icons`, not `member`. Every row in the real capture — including hospital, traveling, and
abroad status rows — has exactly one `XID=`/`userId=`-matching anchor: its own honor-link to its
own player. No cross-player anchor contamination was found anywhere in the sample.

`apply_filters_and_sort` (`src/features/faction/filter-sort-engine.ts`) reorders rows by moving
each `<li>` as one complete DOM subtree (`tbody.appendChild(row)`). Name, honor-link href, and
status all move together as a unit, so this reorder cannot by itself produce a row whose visible
identity and attack target disagree.

The Mini Profile popup (`#profile-mini-root`) was considered as a possible source of a stale-DOM
race (a shared, reused container repopulated per player, unlike a dedicated per-row `<li>`). Ruled
out: its actual interaction model (press-and-hold to activate, floats at the hold point, previous
popup vanishes immediately when a new one is opened — confirmed by the reporting user, who
described the exact interaction) has no overlap window in which stale content from a previously
shown player would be visible to click.

## What remains open

Two distinct symptoms were reported and only one has a supported mechanism:

- **"Opens the clicked player's own profile"** — explained. The status dot
  (`userStatusWrap___*`) is a small (~12px) SVG immediately adjacent to the honor/profile-link
  anchor within the same [[User Info Box]]. A slightly off-target click lands on that anchor
  instead, which is a real link, so the browser navigates there natively — `handleStatusClick`
  never even sees it as a status click, since `target.closest()` won't match the status selector.
- **"Attacks a different (specifically: the last-clicked) player"** — **not explained by anything
  above.** This is not consistent with simple mis-aim (which would produce a spatially adjacent,
  effectively random wrong player, not specifically the *previous* click target), not consistent
  with the sort engine (rules out moving the wrong data, per above), not consistent with any
  caching in the JS path (there is none), and not consistent with the Mini Profile popup (ruled out
  above). Every static-analysis lead has been exhausted without a mechanism. This needs a live
  reproduction to make further progress.

## Decision: what to do about it

- **Do not implement DOM-scoping changes** to `handleStatusClick`'s faction/war extraction path.
  The originally-considered fix (scope explicitly to the `userInfoBox__` ancestor, matching the
  Item Market fallback) turned out to have no functional benefit once real markup showed `.member`
  already wins the `closest()` match ahead of the full row. Shipping it anyway would be a lateral,
  purely defensive change with no bug behind it, against this project's "prefer functional changes"
  mandate.
- **Do not touch `apply_filters_and_sort`'s row-reorder.** It's confirmed not to be the mechanism
  for either symptom; a rewrite here would carry real blast radius (it's load-bearing for
  faction/war sort behavior) for no established benefit.
- **Fix the confirmed mis-aim symptom with a CSS hit-area change** to the status dot, growing its
  clickable region only into currently-dead flex-gap space around it — never overlapping the
  honor/profile link's own box. This constraint comes directly from the reporting user: users
  legitimately want to tap the name/profile link as an action distinct from the status-icon click,
  so the fix must not blur that boundary. This change cannot be verified in this environment (no
  live, logged-in Torn page to render against) and needs manual verification in a real browser
  before being considered done.
- **Add diagnostic cross-check logging** at the click site (`handleStatusClick`) comparing the
  resolved player ID against the row's other available ID sources (honor-link `XID=`, attack-link
  `user2ID=`, and TWSE's `data-player_id` when present) so the next live occurrence of the
  unexplained symptom produces real console evidence instead of another vague report.
- **Add a real-fixture, unmocked-extraction regression test** for the faction/war click path
  (building on the existing `src/features/status-attack/index.test.ts` pattern already used for
  Item Market, and the 2026-07-26 war-list capture above) — this is a genuine test-coverage gap
  (existing faction/war tests mock `get_player_id_in_element` away entirely), but it guards the
  extraction logic's correctness, not the unexplained symptom above; it would not have caught, and
  will not catch, a click-geometry or live-rendering bug.
- **Answer directly**: no, a better integration test would not have caught this. `jsdom` (this
  project's test environment) models neither real click geometry/hit-testing nor live rendering
  races — the two remaining candidate mechanisms for anything beyond the mis-aim explanation. The
  path forward for the unexplained symptom is live reproduction, not more test coverage.

## Considered Options

- **Ship the `userInfoBox__` scoping change as defensive hardening anyway** (belt-and-suspenders,
  since it "can't hurt"): rejected. It's not free — it's still a diff to review and maintain — and
  this project's mandate is to prefer functional changes; a change motivated by a theory that real
  evidence disproved isn't a functional change.
- **Rewrite `apply_filters_and_sort` to avoid any DOM reorder during user interaction** (e.g. defer
  reorder until idle, or diff-and-patch instead of full remove/re-append): considered as a
  mitigation for a "reflow race" theory that was raised and then explicitly walked back once the
  row-reorder was confirmed to move complete, self-consistent row units. Not pursued — there's
  nothing currently evidencing this as the mechanism, and it's a substantial change to load-bearing
  sort code to chase an unconfirmed theory.
- **Switch primary ID extraction to `closest("[data-player_id]")`**: rejected. `data-player_id` is
  injected by TWSE (a third-party tool), present on war rows but absent on standard faction member
  rows — reliable as a diagnostic cross-check when present, not as a primary extraction source that
  needs to work on every page.
