# Research: canonical FF-calculation and staleness explanation on ffscouter.com

Research for [issue #17](https://github.com/xentac/FFScouter/issues/17)
(child of wayfinder map [issue #16](https://github.com/xentac/FFScouter/issues/16)).
There was no existing research-notes convention in `docs/` (only `adr/`,
`agents/`, `design/`, `screenshots/`), so this file establishes
`docs/research/` for wayfinder research tickets.

Question: what is the canonical published explanation of (a) how Fair
Fight estimates are calculated and (b) why an estimate can be old or
stale, so in-script explainer copy never contradicts the site.

Sources fetched 2026-09-29 (raw HTML verified with `curl`):

- Guide: <https://ffscouter.com/guides/fair-fight-explained>
- FAQ: <https://ffscouter.com/faq>
- About: <https://ffscouter.com/about>
- Premium: <https://ffscouter.com/premium>

## How estimates are calculated

### The formulas (guide, `#battle-stat-score` and `#fair-fight-formula`)

The guide renders these via KaTeX; LaTeX sources extracted from the page:

```text
BSS = sqrt(Strength) + sqrt(Defense) + sqrt(Dexterity) + sqrt(Speed)
FF = 1 + (8/3) * (BSS_defender / BSS_attacker)
BSS_defender = (3/8) * (FF - 1) * BSS_attacker
```

On BSS (guide, "Battle Stat Score (BSS)"): "FFScouter uses the same
definition as Torn's battle-stat API: the sum of the square root of each
stat, rounded to a whole number."

On FF (guide, "The Fair Fight formula"): "FF starts at 1 when the
defender is vastly weaker and rises as the defender's BSS approaches the
attacker's. FFScouter rounds displayed FF to two decimal places,
matching the API."

The third formula is the reverse derivation. The guide's worked example
(attacker BSS 4,000, observed FF 2.50) concludes: "BSS_defender =
(3 ÷ 8) × (2.50 − 1) × 4,000 = 0.375 × 1.5 × 4,000 = 2,250", followed
by: "That is exactly how FFScouter learns opponents' public BSS from
volunteer attack logs when you are the attacker."

### Public (attack-derived) data (guide, `#how-ffscouter-works`)

Verbatim, from "How FFScouter uses this":

> When you register with an API key, FFScouter pulls your battle stats
> and attack history. Your stats become bss_private (this isn't shared
> with anyone else). Each qualifying attack includes a Fair Fight value;
> combined with your BSS, FFScouter estimates each opponent's bss_public
> and stores it in a shared pool other players can query on Player View,
> Target Finder, and the JSON API.

Qualifying-attack criteria, verbatim:

> To improve the pool, FFScouter only learns from attacks where Torn's
> reported FF is strictly between about 1.05 and 3.00 (hits showing
> exactly 1.00 or 3.00 are skipped), the attack is recent enough,
> finished cleanly, and not interrupted. Those rules mirror Torn's
> display cap and keep bad data out of the estimator.

Display of estimates, verbatim:

> For anyone else looking you up, FFScouter computes calculated FF from
> your public BSS and theirs using the formula above. That value can
> exceed 3.00 when the true gap is huge, even though Torn's chain UI
> often caps at 3.00.

The About page (`#how-ffscouter-works` equivalent section, "How
FFScouter works") adds: "FFScouter periodically refreshes your battle
stats and attack log, finds new targets from that history, and stores
anonymised estimates in a shared pool other players can query." It also
notes the pool "holds over 500,000 total stat estimates, with about
10,000–80,000 new updates per day", and that "for more than 99% of
players the estimates are stable and useful."

Privacy framing (FAQ, `#how-does-ffscouter-know-my-stats`): "Public stat
data is never from private stat data provided when signing up."

### Limits of the public model (guide, `#limits-and-premium`)

Verbatim list from "Limits and premium":

> - Torn caps displayed FF at 3.00, which blocks learning from many hits
>   on very weak or very strong targets.
> - Extreme stat imbalance (stat whoring) makes BSS a rough proxy for
>   true total stats.
> - Some top battle-stat players always report FF 3.00 in logs, so the
>   reverse formula rarely applies to them.
> - Generally, the math breaks down above about 20 billion total battle
>   stats, where gaps are huge and public FF alone cannot pin down
>   opponents reliably.

### Premium data (guide `#limits-and-premium`; premium page)

Guide, verbatim: "FFScouter Premium adds other data sources so estimates
stay useful where Fair Fight alone hits a ceiling, as well as providing
other tools like the flight tracker, stat distribution breakdowns and
faction tools. Basic public estimates remain free for everyone."

Premium page, "More Accurate Predictions", verbatim:

> The mechanism for FFScouter to work has one major limitation - the FF
> ceiling. This is the point where estimates above it are impossible to
> make from the FairFight calculations alone, and because most high end
> players use stat whoring techniques, it is even less reliable. This is
> where our additional pools of information come in, combining machine
> learning, premium signals and other data we can collect, to produce
> much more accurate data.

### Faction spy reports: not mentioned anywhere

No ffscouter.com page checked (guide, FAQ, About, Premium) mentions spy
reports or the word "spy" at all (verified with `grep -i spy` on the raw
HTML of all four pages). The site attributes premium accuracy to
"machine learning, premium signals and other data we can collect"
(premium page) and otherwise only to unspecified "other data sources"
(guide). Explainer copy should therefore not claim that FFScouter
estimates use faction spy reports; the site never says that.

## Why an estimate can be old or stale

### FAQ anchor confirmed

The anchor `id="profile-stats-old-inaccurate"` exists on
<https://ffscouter.com/faq> (verified in raw HTML), so
`https://ffscouter.com/faq#profile-stats-old-inaccurate` is a stable
deep link. The section heading is "My profile shows my stats as being
old/inaccurate?", which matches the claim "profile stats can be
old/inaccurate".

### FAQ, `#how-does-ffscouter-know-my-stats`, verbatim

> FFScouter uses attack data to estimate the stats of players on Torn.
> Therefore, estimates of your stats (as shown on your own profile) are
> from when a user of FFScouter has attacked you (or you attacked them),
> and this triggered an estimate update. Public stat data is never from
> private stat data provided when signing up.

### FAQ, `#profile-stats-old-inaccurate`, verbatim

> When you view your own profile, you see it as others would see it.
> Therefore, if the stat estimate on your page is old, it is because
> another player hasn't attacked you (or the attack criteria isn't met)
> and so the value hasn't been updated in a while. When using FFScouter,
> your own private stat data is frequently checked and kept up to date,
> if this was to become outdated then FFScouter would not work for you
> and will return an error.

### FAQ, `#how-accurate-is-ffscouter`, verbatim

> Generally, very accurate. This is discussed in more detail on our
> About page (see Accuracy compared to alternatives). However, no tool
> is 100% accurate nor can it be; be more cautious with estimates over
> 28 days old, or brand new players, as both have a higher likelihood to
> be inaccurate.

### Canonical staleness story, condensed

Per the site, an estimate goes stale because updates are event-driven:
a public estimate only refreshes when an attack involving an FFScouter
user occurs (in either direction) and that attack meets the qualifying
criteria (FF strictly between about 1.05 and 3.00, recent, finished
cleanly, not interrupted). If no such attack happens, the stored value
simply ages. The site's stated caution threshold is 28 days: estimates
older than that (and estimates for brand-new players) "have a higher
likelihood to be inaccurate" (FAQ). The guide's
"fair-fight-explained" page itself does not discuss staleness; the FAQ
is the canonical source for the staleness explanation.
