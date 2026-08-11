# Core game mechanics

Distilled from wiki.torn.com pages (Energy, Nerve, Happy, Gym, Attacking,
Battle Stats, Drug, Merit), fetched via Wayback Machine snapshots between
Jul 2024 and Apr 2026 — see `research-methods.md` for how, and re-check the
live wiki for anything you're about to build logic around, since these
numbers and formulas change over patches. Several corrections and additions
below (Nerve's bar-vs-max distinction, OC 2.0 CPR's breadth, the Merits
system, the cooldown-management heuristic) came from an experienced
player/developer directly, not the wiki — flagged inline where relevant.

## The four resource bars

| Bar        | Regen                                                                        | Primary uses                                                                                                           | Max (base/absolute)                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Energy** | 5 every 10-15min (donator-dependent), fills in 5h                            | Gym training (5-50/train), Attacking (25), Reviving (25-75), other minor sinks                                         | 1,000 max                                                                                                                                   |
| **Nerve**  | 1 every 5 min, fills only up to your current bar — no natural regen above it | Crimes (2-18+ depending on crime), self-busting (half your bar), busting others (5, reducible)                         | Bar is uncapped (grows via crime completion + Merits/faction, see below); absolute max nerve you can hold at once is unconfirmed — see note |
| **Happy**  | 5 every 15 min, resets to base at :00/:15/:30/:45 if temporarily over max    | Improves Gym gains (the primary lever, especially at low stats); in Crimes 2.0 affects skill/XP gain, not success rate | Base 100, up to 5,025 with a fully-staffed Private Island; temporary max 99,999                                                             |
| **Life**   | Regenerates over time; restored by medical items/revives                     | Combat — reaching 0 sends you to Hospital                                                                              | 100-5,000+ base by level, up to ~7,500 with merits                                                                                          |

Energy, Nerve, and Happy are all **also inputs into Organized Crime 2.0's
CPR (Checkpoint Pass Rate)** indirectly, via the stats and crime experience
they let you build — there isn't a direct "spend energy on OC" mechanic.
**CPR itself is driven by a broad set of personal stats, not just battle
stats or crime skills** — which stat(s) matter depends on the specific role
in the specific scenario, and can pull in stats that wouldn't obviously
seem relevant (e.g. Hunting skill contributing to some roles). Don't assume
CPR reduces to "battle stats + crime experience" when reasoning about a
specific role — check that scenario's actual requirements rather than
generalizing from one example.

**Nerve's bar and its absolute max are two different numbers — don't
conflate them.** Your **nerve bar** (the ceiling natural regen fills to)
grows as you complete crimes — that's your Natural Nerve Bar (NNB) — plus
flat bonuses from Merits and faction upgrades (see Merits, below). Natural
regen (1 every 5 min) never fills you above this bar on its own.
Separately, boosters/items (alcohol bottles, a Points Building refill,
certain job specials) can push your _current_ nerve temporarily above your
bar, up to some absolute ceiling — the wiki (last substantively edited Oct
2023, no fresher snapshot available) states this as 32,767. That figure
wasn't independently reconfirmed against a live source in this research
pass — treat it as "what the wiki says as of Oct 2023," not a verified
current fact, and re-check before building logic that depends on it.

## Merits — permanent progression currency

Merits are a **fundamental system**, not a side mechanic — expect them to
intersect with nearly everything else in this file (nerve bar, battle
stats, crime XP, hospitalizing, education, and more).

- **Earned** by hitting milestones (level, stat totals, attack counts,
  etc.) — each merit-granting milestone also awards a Medal/Honor.
  **Buyable** at the Points Building for 300 points each, capped at one
  purchasable merit per 2 levels (max 50 purchasable by level 100).
- **Resettable** for an escalating points cost (500 the first time, +250
  each subsequent reset, capped at 5,000/reset). Free resets exist (via
  `Book: High School For Adults`, and an annual Christmas gift every year
  since 2018).
- Every upgrade category is **incremental**: each of the 10 possible
  purchases in a category costs 1 more merit than the last — 55 merits
  total to fully max out one category.

Categories:

- **Fighting Stats** (Brawn/Protection/Sharpness/Evasion) — +3% passive
  Strength/Defense/Speed/Dexterity per upgrade, up to +30% at 10/10. This
  is the merit-side half of the passive battle-stat bonuses referenced in
  "Battle stats and combat," below.
- **Weapon Masteries** — one per weapon category (Pistol, SMG, Rifle,
  Shotgun, Machine Gun, Heavy Artillery, Club, Piercing, Slashing,
  Mechanical, Temporary) — +1% damage and +0.2 accuracy per upgrade with
  that weapon type.
- **Miscellaneous** — the largest bucket: Nerve Bar (+1 to your bar per
  upgrade, max +10 — this is the "Merits" contribution referenced in the
  Nerve note above), Critical Hit Rate (+0.5%/upgrade), Life Points (+5%
  passive life per upgrade), Crime Experience/Crime Progression (+3% in
  Crimes 1.0, +1% in Crimes 2.0, per upgrade), Education Length
  (-2%/upgrade), Awareness (item-find luck), Bank Interest (+5%/upgrade),
  Masterful Looting (+5% mug income/upgrade), Stealth, Hospitalizing (+5%
  outgoing hospital time/upgrade), Addiction Mitigation (-2% addiction
  effects/upgrade), and Employee Effectiveness (+1, no effect for company
  directors).

## Cooldowns — the resource-management meta

Three independent cooldowns gate how fast you can refill/boost via
consumables (exact current caps should be re-verified against the live wiki
— a `Cooldown` wiki page exists but had no retrievable Wayback snapshot at
research time):

- **Medical cooldown** — increases every time you use a medical item (FAK,
  Blood Bag, etc.); base cap ~6 hours (extendable via faction Fortitude
  upgrades, up to +3h).
- **Booster cooldown** — increases when you use booster-type items (energy
  cans, candy, alcohol, hotel coupons, Easter eggs, etc.); base cap ~24h
  (extendable via faction Voracity upgrades).
- **Drug cooldown** — set per-drug (Cannabis ~60-90min up to Xanax
  ~360-480min); unlike the other two, you must wait for it to hit **zero**,
  not just under a threshold, before taking another drug.

Managing these three independently — not maxing one out while ignoring the
others — is core to efficient play. A tool that surfaces "time until each
cooldown clears" alongside current bar levels is a natural, clearly
API-compliant utility (see `rules-and-compliance.md` for what "compliant"
means here).

**The core efficiency heuristic (from an experienced player, not the wiki):
keep all three cooldowns counting down, not just one.** An idle cooldown at
0 with room to use another consumable is wasted capacity on that specific
cooldown — the efficient pattern is to have medical, booster, and drug
cooldowns all actively ticking at once, rather than treating any one of
them as optional to leave empty. This is the kind of judgment call a
stats/cooldown dashboard should be built around surfacing (e.g.
highlighting which of the three currently has idle headroom) rather than
just showing raw numbers.

## Battle stats and combat

Four stats, each with a distinct combat role:

- **Strength** — damage per hit
- **Defense** — damage reduction per hit taken
- **Speed** — chance to hit; reduces opponent's escape chance
- **Dexterity** — dodge chance, stealth chance, escape chance

Speed vs. Dexterity and Defense vs. Strength are the two head-to-head
curves that determine hit chance and damage mitigation — both follow
diminishing-returns curves that flatten hard past ~10-50M in the relevant
stat (see the wiki's Battle Stat Weights table for exact breakpoints). The
old "stat cap" at 50M (which flattened gym gains to near-zero) was
**removed in Aug 2022** — gains now continue at a slowly decreasing rate
indefinitely, which matters if you're consulting any pre-2022 guide.

Gym gains follow a formula combining gym multiplier ("gym dots"), energy
per train, current stat total, and happiness — happiness matters most at
low stat totals and less as stats grow. Each train also costs some
happiness (40-60% of energy used), so happy management directly gates
training efficiency.

Attacking costs 25 energy, gives 25 turns / 5 minutes to finish, and
resolves as Leave (most XP, least hospital time), Mug (steals 5-15% cash,
moderate outcomes), Hospitalize (most hospital time, least XP), or a
Stalemate/Timeout if neither side wins in time. Armor gives a flat % damage
reduction; weapons multiply damage; group attacks apply "distraction" that
reduces a defender's effective stats and turn frequency per additional
attacker.

## Crimes vs. Organized Crime 2.0 — two different systems

**Crimes (1.0)**, done solo: cost Nerve, scale in difficulty (2-18+ nerve),
and are gated by a hidden "Crime Experience" (CE) stat that determines your
effective "Natural Nerve Bar" (NNB) — higher NNB unlocks harder,
higher-payout crimes. Failing sends you to jail or hospital and can cost
CE.

**Organized Crime 2.0**, done as a faction group: scenarios have named
roles (Muscle, Hacker, Lookout, etc.), each with a stat/skill-driven **CPR
(Checkpoint Pass Rate)** — green (75+) is the target. Two phases: Planning,
then a short Execution phase. **Planning runs serially, not in parallel**:
each member gets up to 24h to complete their own step, one after another in
the join queue — not all members' clocks ticking at once. That makes total
planning time bounded by 24h × member count when every role is filled; a
smaller scenario (e.g. 3 roles) can therefore finish planning faster in the
worst case than a larger one (e.g. 6 roles), independent of difficulty
tier. If the OC isn't full and the current queue runs out (the last joined
member finishes their step with no next member waiting), the OC **pauses**
until a new member joins — per the wiki's own terminology for this state.
Every individual scenario also has a **numeric OC level**, and levels
currently go up to 10 (as of this research pass — treat as another
game-parameter number worth re-checking, not a permanent ceiling). Those
levels group into 5 named Scope tiers, each with its own Scope cost to
spawn and Scope reward on completion:

| Tier                | OC levels | Scope cost | Scope reward |
| ------------------- | --------- | ---------- | ------------ |
| Introductory Tasks  | 1-2       | 1          | 2            |
| Simple Assignments  | 3-4       | 2          | 3            |
| Intermediate Jobs   | 5-6       | 3          | 4            |
| Advanced Operations | 7-8       | 4          | 5            |
| Elaborate Campaigns | 8-10      | 5          | 6            |

**Scope** is the faction resource spent to spawn a scenario at all,
regenerated by completing scenarios (net-positive: reward always exceeds
cost) plus a passive +1/day. Rewards (cash, items, faction respect) get
split by a faction-configurable payout percentage between the faction and
participants.

## Jail and Hospital

**Jail**: entered via failed Crime/OC/Bust, or being arrested. Escape via
being **busted** (an outside player spends 5 nerve, success depends on your
level/jail-time/their bust skill) or **self-busting** (costs half your
nerve bar) or **bail** (cash, scales with remaining time × level). The
jail-only "Crims Gym" has better Defense gains than any lightweight gym and
is worth using if you're a new player who lands there.

**Hospital**: entered from losing a fight, failed crimes/OCs, and a few
other sources; sets Life to 1. **Release is governed by a separate hospital
timer, not by Life regenerating** — your Life total has no bearing on when
you're released; you leave when the timer hits zero regardless of your
current Life. Medical items (SFAK/FAK/Morphine/Blood Bags) reduce that
timer directly (and separately restore some Life as a side effect), each
adding to medical cooldown. Opium reduces the timer too, without a
medical-cooldown cost, but has its own drug cooldown. Being **Revived** by
another player is a separate, immediate exit (costs the reviver 25-75
energy depending on faction upgrades) rather than a timer reduction.

## Factions and warfare — three distinct war modes

**Respect is the fundamental faction currency — not just a war
scoreboard.** A faction accumulates a persistent, ever-growing respect
total (mainly from members attacking/chaining outside the faction, plus
territory income and OC rewards), and that accumulated total is what gets
spent to buy every faction upgrade — both the one-time Core branch upgrades
(Armory tiers, Chaining tiers, member Capacity, Territory capacity,
Organized Crime unlocks) and the reconfigurable Special Branches described
below. Separately, **Ranked War "score" uses the same per-hit respect
formula but is a war-scoped counter**, not a withdrawal from or deposit
into that persistent total — winning or losing a Ranked War doesn't spend
down the faction's accumulated respect, it's measured with the same unit.
Losing respect (down to a permanent-destruction floor of 0) happens through
Raids and Dirty Bombs specifically, not through normal Ranked War losses.

**Chains are a fundamental element of respect generation, not a side
feature.** Successive hits made on players outside the faction build a
chain: respect earned per hit scales up as the chain grows (roughly
logarithmic), with occasional "bonus hits" (13 of them per chain) paying a
large flat respect bonus on top. Chaining must first be unlocked by
spending respect (a faction's Chaining tier caps the maximum chain length
it can sustain, from 10 up to 100,000, each tier unlocked by completing a
chain of the previous tier's length), and a chain has a tight cadence
requirement — the first 10 hits must land within 5 minutes, and every hit
after that must land within 5 minutes of the last or the chain breaks into
a cooldown (10 seconds per hit already in the chain). Ranked War score and
Raid respect-taken are both measured in this same per-hit respect currency,
so a well-run chain directly drives both — but **this doesn't extend to
Territory War**, whose scoring is time-on-the-wall, not per-hit respect, so
chains aren't the lever there.

- **Ranked War** — matchmade 1v1 between factions of similar rank/size;
  "tug of war" score race to a target; win to climb rank tiers (Metal →
  Diamond), rewards scale with rank/participation.
- **Raid** — one faction declares indefinitely against another; attacks
  cause 100% respect loss to the target (vs. 25% normally) with no respect
  gained by the attacker — purely destructive. **Raids aren't "won" in the
  way Ranked Wars are** (there's no target score to reach); per the wiki, a
  raid only ends via faction destruction (the losing side's respect hits 0)
  or a cease — the leading side can cease any time after 24h, the losing
  side can cease under specific conditions (72h of mutual inactivity, or
  the winning side dropping under 10 members), and either side can offer to
  surrender, which only ends the raid if the other side accepts it.
  Functionally closer to a truce/ceasefire than a win condition.
- **Territory War** — factions fight over map blocks for a shared "wall";
  knocking a defender off (via hospitalizing/jailing them) replaces them
  with your own member; score accumulates per second held, not per hit;
  territories held give daily respect (and Racket income if applicable).

Factions also have an **Armory** (shared item storage, several sub-types)
and a **permissions system** (Green/Orange/Red/Black tiers) gating what
members can do, including a distinct **Faction API Access** permission —
relevant if you're building anything that reads faction-scoped data via a
member's key rather than the leader's.

**Special Branches** (Toleration, Steadfast, Aggression, Excursion,
Fortitude, Voracity, Criminality, Suppression — up to 6 of these 8 trees
active at once, each funded by respect) support **two independently
configured loadouts**, commonly built as a "War" build (leaning Aggression/
Suppression/Fortitude for combat) and a "Peace" build (leaning Excursion/
Voracity/Criminality for economy and crime output). **Switching which
loadout is active is unrestricted and instant** — factions can flip between
their War and Peace configurations freely. What's restricted is _editing_
the upgrades within a loadout: an individual Special Branch selection can't
be unset until 72 hours after it was set, so building out or changing a
loadout's contents is deliberate and slow even though toggling between two
already-built loadouts isn't.
