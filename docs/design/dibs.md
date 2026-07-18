# Dibs: fair claim coordination for ranked-war hospital targets

Status: **design approved, not yet implemented**. Domain vocabulary lives in
[`CONTEXT.md`](../../CONTEXT.md) (entries marked "Dibs system, in design"); this document is the
mechanics, in one place. Where the two disagree, fix whichever is wrong — they were written
together and should stay in sync.

## Why

Calling dibs in Torn chat fails structurally, not incidentally:

- **First-past-the-chat.** Whoever's message lands first wins, so faster computers and faster
  fingers win. Someone who started typing at 2:01 has no standing.
- **Ambiguity.** Look away for a second and you don't know whether a target was called. Is the
  person sitting out of hospital for a few seconds called or free? Take them and someone may be
  furious — especially if they were trying to fly.
- **No shared ordering.** Chat messages can render in different orders for different people, and
  chat itself slows down as more people use it.
- **Disputes have no record.** Fights break out over who had dibs; adjudication means scrolling
  back through chat.
- **Sharing rarely happens.** Handing a target off requires typing, being seen, and re-racing.

Any replacement must: give every active member the same opportunity to claim; allocate contested
hits more fairly than arrival order; make it unambiguous who holds a claim at every moment; and
expire claims after a configurable time so unused targets become free-for-all.

## Shape of the system

- **Server-authoritative.** All state lives on ffscouter.com, which already polls the data needed
  to know every war participant's hospital status and exit time. Clients ask; the server's answer
  is the truth. This is what makes "was he called?" unambiguous, and it is forced anyway by the
  Discord-only user, who has no script observing the war page.
- **Two surfaces, one record.** The userscript (FF Scouter V2) and a Discord bot are two
  renderings of the same claim record — a request from either surface updates both. Neither is
  primary.
- **Advisory, not enforced.** Torn lets anyone press attack. The system's contribution to a
  poaching dispute is the thing chat never had: an authoritative record of who held the claim.
  Enforcement is social, by the faction.
- **War-scoped.** The claim space begins empty at war start and dies at war end. No cross-war
  memory: last war's farming neither helps nor hurts this war. Only faction configuration (and
  admin delegation) persists. Outside a war the system is naturally dormant — there is nothing to
  claim — so factions leave it enabled permanently.
- **No faction-level API access, ever, in v1.** Everything runs on data the backend already has.
  See [Allocation inputs](#allocation-inputs).

## Claimable universe

A **Claimable Target** is an enemy faction member in the active ranked war who is currently in
hospital with a known exit time. Nothing else is ever claimable in v1 — okay, traveling, and
early-revived players are permanently free-for-all. Players hospitalized **abroad** are claimable;
location affects only who can usefully act on the claim, never claimability.

The hospital exit timestamp anchors the entire lifecycle. Exit times can shrink (self-medication)
or vanish (revive); they cannot grow while the target is in hospital (a re-hospitalization after
exit is a new event and a new cycle).

**Natural Hospital Exit** — the timer running out — is the only exit dibs protection applies to.
An early exit (revive or med) immediately voids any in-flight requests or held dibs and makes the
target free-for-all: they didn't naturally come out, and people will hit them no matter what.

## Lifecycle

All times are faction-configurable; defaults shown.

```
                     exit − 2:00              exit − 1:30                exit            exit + 0:30
─── cold ──────────────┬─────────────────────────┬──────────────────────┬───────────────────┬────────
                       │  request window open    │  claimed (or still   │  grace: holder's  │  free
                       │  (requests accumulate,  │  open if nobody      │  hit window       │  for
                       │  count visible, names   │  requested — late    │                   │  all
                       │  sealed)                │  request = instant   │                   │
                       │                         │  grant)              │                   │
```

States per target: **unclaimed** (cold or window open) → **claimed-by-X** → **free-for-all**.
Every participant sees the same answer at every moment.

1. **Cold.** Timer above `window_open_lead`. Timer changes re-derive the schedule freely — nobody
   has formed expectations yet. (In practice meds remove ~25+ minutes and people med to zero, so a
   med landing someone *inside* the window span is rare; if it lands the timer below
   `window_open_lead`, the window simply never opens and the target is free-for-all on exit.)
2. **Window open** (`window_open_lead` before exit). Any eligible member may request. Requests are
   never blocked or rationed; requesting several overlapping targets is fine. Withdrawal is free.
   **Once the window opens, the exit anchor is frozen: any change to it voids the cycle to
   free-for-all** (that's the early-exit rule above).
3. **Allocation** (`allocation_lead` before exit) — *contention-triggered, not
   deadline-triggered*. Runs only if requests are pending at that moment; exactly one requester
   becomes the **Dibs Holder**. If nobody requested, the target stays open and the **first late
   request wins by instant grant** — the fairness machinery exists for contention, and an
   unrequested target is by definition uncontended. The residual arrival-order race between two
   late requesters is accepted as rare and bounded.
4. **Losing is not final.** The request pool survives until exit. If the holder **releases**
   (out of energy, chain-called, asleep), allocation re-runs over the surviving requesters; only
   an empty pool reverts the target to open. This is the one-click sharing chat never had, and it
   removes the incentive to squat on dibs you can't use.
5. **Grace** (`grace` after natural exit, default 30s). The holder's window to take the hit. A
   held dibs ends by whichever comes first: early-exit void, release, grace expiry, or observed
   re-hospitalization — **without attribution**. The system deliberately cannot tell "holder hit
   them" from "poacher hit them"; nothing in the core loop needs to know, and knowing would
   require faction-level API access. (If polling observes the re-hospitalization only after grace
   expired, the target briefly reads free-for-all while lying in hospital — harmless, since a
   hospitalized target is unactionable and their next exit starts a fresh cycle.)
6. **Free-for-all.** Normal Torn rules. Visually identical to "no dibs machinery engaged."

## Allocation

### Invariant

**All requests within a window are identical.** Arrival order and arrival time are never allocator
inputs — requesting at 1:59 and 1:31 confer exactly the same thing. This is the property that
kills the fast-fingers race, and it must never be "optimized" away.

### Algorithm

Deterministic ranked comparison over the pending requesters; first differing factor wins:

1. **Under the soft dibs cap beats at/over it.** The cap (default **1** simultaneously held dibs)
   is *soft*: at or above it you lose to any competing requester below it, but you still win
   uncontested. A hard cap was rejected — denying the only interested player at 3 a.m. just sends
   the target free-for-all where they'd hit them anyway, minus the visibility.
2. **Least-recently-won dibs wins**; never-won counts as oldest. This is the anti-starvation
   mechanism: sustained contention degrades into round-robin among active requesters, and one
   round is the *maximum* penalty for having farmed uncontested targets off-peak. A
   recent-win-*count* factor (fewest dibs in the last N minutes) was explicitly rejected: it
   freezes out the 3 a.m. solo farmer for the whole recency window when the morning crowd arrives,
   punishing exactly the off-peak activity a farming faction wants — and it adds a window
   parameter with a priority cliff at its boundary.
3. **Lower war score wins.** The whole-war activity signal, read from public war data (no AA key).
   Voices mainly when timestamps tie — e.g. two never-won requesters at war start.
4. **Coin flip.**

Deterministic rather than weighted-lottery so every allocation is explainable in one sentence —
"B won because you won more recently" — and explainability is what kills disputes. Factor order is
faction-configurable; the above is the default. "Never-won = oldest" and the arrival-order
invariant are invariants, not knobs.

### Allocation inputs

Entirely system-internal: currently held dibs, per-war last-won timestamps, public war score. The
blind spot — free-for-all hits and hits by non-participants count against nobody — is accepted:
the fairness that matters is fairness among people competing through the system, and for them a
fulfilled dibs *is* a hit. In exchange, "we never need faction-level API access" is a real
adoption argument for a system asking factions to route war coordination through a third-party
server. An optional faction AA key is the designated v2 path for true hit counts (as an allocator
factor) and fulfillment/poach reporting — same key, same opt-in, two features.

## Identity and eligibility

An **Eligible Requester** is a current member of a faction in an active ranked war, with a
**verified Torn player ID**, requesting targets in the opposing faction. Verification is one of:

- a validated API key on ffscouter.com (script users — this is the existing registration flow), or
- **Torn's official Discord verification** (torn.com/discord) for Discord-bot users. No key
  required of them; the server resolves Discord → Torn ID via the API using keys it already
  holds, and checks membership live. A bare Discord identity is never enough — allocation ranks on
  per-player war data, so the system must know *which Torn player* clicked.

Outsiders (allies, mercs, alts) are categorically ineligible. Mid-war membership churn is not a
handled state: Torn locks faction membership during a ranked war. If no one in a faction is
registered, dibs is vacuously unavailable — which is fine, because then no one can call dibs
anyway.

The system is symmetric: both factions in a war may independently run dibs against each other, in
two disjoint claim spaces that never interact.

## Visibility

- **Cross-faction: sealed.** A faction's claim space — requests, holders, config, even the fact of
  its use — is invisible to the enemy. A leaked holder/expiry feed is live operational intel.
  Every read and write is scoped server-side to the caller's verified faction.
- **Intra-faction: sealed-bid.** During an open window, faction-mates see only the request
  *count*. Names are sealed until allocation; then the holder and the one-line justification are
  public to the faction. Losers stay unnamed (a runner-up surfaces only when a release hands them
  the target). Rationale: requests are mechanically identical, and visible names would make them
  *socially* unequal — deference to leaders and watching-who-loses re-enter through the sidebar.
  Sealed requests mean the only way to want a target is to request it and let the algorithm speak;
  losing stays emotionally cheap.

## Administration and configuration

Dibs configuration rides ffscouter.com's **existing faction-admin authority** — no new admin
model. The same authority gates the script's faction-settings UI and the bot's config commands.
Mid-war changes are allowed but **prospective only**: already-open windows and held dibs finish
under the rules they started with.

| Knob | Meaning | Default |
|---|---|---|
| `enabled` | dibs active for this faction | **on** (disable available) |
| `window_open_lead` | window opens at exit − this | **2:00** |
| `allocation_lead` | contested allocation at exit − this | **1:30** |
| `grace` | dibs lifetime after natural exit | **30s** (typical range 10–60s) |
| `soft_cap` | soft dibs cap | **1** |
| `factor_order` | allocator factor list | cap → least-recently-won → score → coin flip |
| `discord_channel` | lifecycle-message channel | unset (bot silent until set) |
| `discord_cleanup_delay` | delete resolved messages this long after the target left hospital | **1h** ("never" available) |

Save-time constraints: `window_open_lead > allocation_lead > 0`; `allocation_lead` floor ~10s so
allocation results are observable before exit at realistic polling latency.

## Surfaces

### Userscript: the dibs badge

Rides the hospital-countdown status cell on war-list rows — every dibs transition is anchored to
that timer, and the war box has no width budget for a new column. Hand-drawn SVG glyphs (no emoji,
per the Source Marker rationale); no state encoded by color alone.

| State | Badge |
|---|---|
| Cold, or free-for-all | *none* — no badge means normal Torn rules apply |
| Window open, not requested | outline raised-hand, blue, request count |
| Window open, you requested | same hand **filled**, blue, count (includes you) |
| Claimed by you | filled crosshair, green, `You` — plus a row *outline* (never a background fill; row backgrounds already carry other meanings) |
| Claimed by someone else | filled padlock, gray, **no name** (no width for it) |

You-vs-other is triple-encoded: glyph, color, text. Tap acts per state: request, withdraw, release
on your own; tapping another's padlock shows a transient "held by X" — who-holds-it is never more
than a tap away but never costs standing width. A naturally-exited target's status cell reads Okay
with no badge, which *is* the free-for-all display; the badge is the only thing that persists on a
row through the grace. The status cell re-renders constantly (countdown ticks), so the badge needs
the same reattach-on-mutation discipline as the existing column code.

Deferred to v2: claim-state filters/sorts in the filter box.

### Discord bot: lifecycle messages

One message per claimable window, posted to the configured channel at window-open and **edited in
place** through the lifecycle: request count ticks → "claimed by **Y**" with justification →
release/re-allocation → expiry/free. Buttons are state-contextual (Request/Withdraw while open;
Release visible only to the holder) and replies are **ephemeral**, preserving the sealed-bid
property — button presses are not publicly visible. The resolved message is the faction's audit
line; channel history is the dispute record, subject to `discord_cleanup_delay`. A single
edited dashboard message was rejected (edit rate limits during waves, no audit trail, 25-button
mis-click grid); announce-only was rejected because keyless participation via buttons is a
requirement.

Bot announcements are effectively instant while the script polls, so bot-watchers may learn
results a few seconds earlier. Harmless: the server adjudicates every action, so a click against
stale UI returns "already claimed by X," never a wrong grant.

## Client/server protocol shape

- **No push.** SSE/WebSockets are impossible from the userscript environment (see ADR 0001's
  transport constraints). Polling only.
- **One faction-wide read.** A single call returns all active claim state for the caller's war —
  every hot target's state *plus its schedule* (window-open, allocation, exit, grace-end
  timestamps).
- **Adaptive cadence.** Clients poll slowly (~15–30s) when nothing is hot, fast (~2–5s) for
  targets inside their hot span (window-open through grace-end), plus an immediate read right
  after each known allocation timestamp and after the user's own actions.
- **Mutations echo the schedule.** Every mutating response (request, withdraw, release) returns
  the target's expected-resolution time so the client self-schedules its check-back; the client
  can also derive it from the faction-wide read.

## Edge cases, collected

| Case | Outcome |
|---|---|
| Revive/med before window opens | Never claimable; free-for-all. |
| Timer shrinks before window opens (still ≥ open lead) | Schedule re-derives; window opens at new exit − lead. |
| Timer change after window opens | Cycle voided; free-for-all (early-exit rule). |
| Zero requests at allocation lead | Target stays open; first late request wins instantly. |
| Zero requests ever | Free-for-all at exit. |
| Holder releases, pool non-empty | Re-run allocation over survivors. |
| Holder releases, pool empty | Back to open (late requests welcome) until exit. |
| All requesters at/over soft cap | Someone still wins — the cap is soft. |
| Simultaneous exits, overlapping requests | Allocations run in sequence; each win updates the winner's last-won timestamp (and held count), naturally spreading a wave. |
| Grace expires before poll sees the re-hospitalization | Brief "free-for-all while hospitalized" — harmless, unactionable. |
| War ends mid-lifecycle | Claim space dies: windows void, dibs void, ledger discarded. |
| No registered members in faction | Dibs vacuously unavailable. |

## Non-goals (v1)

- Non-hospital claim flows (okay/traveling targets, chains, raids, territory).
- Hit attribution, fulfillment rates, poach naming — all gated on the optional v2 faction AA key.
- Cross-war fairness memory.
- Mechanical enforcement of dibs. Not possible in Torn; permanently a non-goal.
