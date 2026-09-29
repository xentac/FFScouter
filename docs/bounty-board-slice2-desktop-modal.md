# Bounty Board 2/5 — desktop modal on Torn's bounty page (+ settings)

Parent: #7. Depends on slice 1 (API client + board cache).
Status: blocked on needs-info (see §9). Do not scrape or fetch torn.com;
wait for a pasted DOM fixture of the desktop bounty page.

## Scope

A floating modal on `bounties.php#!p=main` (desktop layout only), titled
`FF Scouter Bounties`. This is a separate product surface from Torn's own
bounty list: distinct title, subtitle, and styling so the two cannot be
read as one system.

Out of scope for this slice: mobile / narrow container, attack-page UI,
claim progress or payout display, in-script `/register`.

## Feature gating

Add `features/bounty-board/BountyBoardFeature` using the existing `Feature`
interface.

- Mount only when `torn_page()` is the bounty page **and** the hash route
  is `#!p=main`. Observe hash changes with `on_navigation()` and remount.
- Keep a handle to the mounted root; unmount the previous root before
  remounting (ADR 0010).
- Master toggle `bounty.enabled` (default `true`). When off, tear down
  every bounty surface and send no bounty API traffic.
- React to the page through the page shims (ADR 0007). Custom elements
  use the construction fallback (ADR 0003).

## Settings (exactly two)

| Key | Default | Control |
|-----|---------|---------|
| `bounty.enabled` | `true` | Master toggle. Off removes the modal and suppresses traffic. |
| `bounty.attackNewTab` | `true` | Attack opens a new tab (`true`) or the same window (`false`). |

Filter values, row expansion, and faction collapse are **not** settings.
They live in modal-internal view state (§5).

## Board rows

- Source: slice-1 board cache (`getBoard()`). Render non-disabled targets
  only; disabled entries never appear.
- Sort: top price-per-hit, descending.
- Each row: target name, battle-stat estimate coloured on the FF scale
  (ADR 0002), and the top tier label (e.g. `$700k × 3`).
- Expanding a row shows the full tier ladder.
- Faction bounties: a collapsed card (faction name/tag, shared pool, top
  price) that expands into per-member rows of the same shape.
- Share a `BountyRow` component so the later mobile slice can reuse it
  unchanged.
- FF values come from the existing batched stats cache, not the board
  payload. A staler FF than the estimate is acceptable.

## Filters and view state

Quick filters: `stats less than X`, `FF less than Y`. Targets with no
available estimate are never hidden by filters.

Filter values, which rows are expanded, and faction collapse persist as
modal-internal view state (namespaced local storage key
`ffscouter.bounty.view.v1`). They survive reload and do not appear in
the settings panel.

## Row actions

- **Attack**: link to the attack screen for the target id. Honour
  `bounty.attackNewTab`.
- **Claim**: fire-and-acknowledge POST via slice 1 `claim()`, then toast
  success or the API error message verbatim. No claim-progress or payout
  state anywhere in this slice.

## Gates

- **Consent**: board `403` with code `86` replaces the modal body with a
  consent state — link to the published policy URL, an explicit
  "I have read the rules and data policy" confirmation, then POST
  acceptance and reload the board in place (no full page refresh).
  A policy version bump re-triggers the flow.
- **Key**: a missing or unregistered key shows the established key-nudge
  pattern (ADR 0012) instead of the board.

## Acceptance

- [ ] Modal lists non-disabled targets sorted by top price descending;
      disabled targets never appear
- [ ] Tier expansion and faction-card expansion work; filters never hide
      targets with an unknown estimate
- [ ] `403` / code `86` → policy link + explicit confirm → accept POST →
      board loads in place
- [ ] Missing / unregistered key shows the key nudge
- [ ] Attack honours the new-tab setting; Claim toasts success or the
      API error text
- [ ] Master toggle off removes the modal and issues no bounty traffic
- [ ] View state survives reload; `bun run test --run` and `bun run lint`
      are clean

## Blocked — needs-info

Do not implement against a guessed DOM. Waiting on:

1. Pasted DOM capture of `bounties.php#!p=main` (desktop layout).
2. Published URL and version of the Bounty Board Data Policy and Rules.
3. Maintainer Torn player id for `referrer_player_id`.
