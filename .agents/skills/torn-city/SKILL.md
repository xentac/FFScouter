---
name: torn-city
description:
  Reference for Torn City (torn.com), a text-based browser MMO running
  since 2004 — its API, game mechanics, and rules governing third-party
  tools. Use whenever Torn City, torn.com, or the Torn API is mentioned, or
  when writing/debugging code, scripts, or tools that read Torn data.
---

# Torn City

Torn City is a long-running (since Nov 2004), continuously-evolving browser
MMO. Both its game mechanics and its API change over patches, so treat
specific numbers/behaviors as a snapshot in time, not a permanent fact —
this skill records fetch dates and known drift so guidance can be checked
against how current it actually is. See `research-methods.md` for how to
re-verify anything here, and `../../snapshots/torn-city/` (in the source
repo — see the note in the Snapshots section below) for dated raw copies of
primary sources.

## Compliance comes first

**Before proposing or writing any script, extension, bot, or automation
that touches Torn**, read `rules-and-compliance.md`. Torn's Scripting Abuse
rule carries a game ban and was recently tightened to explicitly prohibit
tools that watch unfocused pages and generate alerts —a very common pattern
for "helpful" Torn tools (notifiers, background trackers). Flag this risk
proactively any time a design leans toward background polling, scheduled
non-API requests, or cross-window notifications, rather than waiting to be
asked.

**Never drive torn.com with browser automation yourself** (Claude in
Chrome, Playwright, computer-use, etc.) — an agent loading or reading Torn
pages is itself a Scripting Abuse violation against the user's account.
When something can only be learned from the live site, write a console
snippet for the user to run on a page they've loaded themselves and have
them paste the results back — see the AI agents section of
`rules-and-compliance.md`.

## Routing

- **Writing or debugging code against the Torn API** (auth, rate limits,
  v1/v2, error handling) → `api.md`
- **Fetching wiki.torn.com, rules.php, or other torn.com pages for
  research** (most are Cloudflare-gated) → `research-methods.md`
- **Game mechanics questions** — energy/nerve/happy/life, battle stats,
  gym, attacking, cooldowns, crimes, Organized Crime 2.0, factions, warfare
  (ranked war/raid/territory), jail, hospital → `game-mechanics.md`
- **Userscripts, extensions, or injected CSS that depend on page width**
  — the three fixed layouts (976 / 784 / 386px) and the breakpoints between
  them → `page-layout.md`
- **Torn's rules in general**, not just scripting →
  `rules-and-compliance.md`
- **Third-party tool ecosystem** (what's already out there, described
  neutrally — not tied to any particular developer) → `api.md`

## Snapshots

Dated raw copies of primary sources (API docs, rules text, wiki pages) live
in the **source repo** under `snapshots/torn-city/<YYYY-MM-DD>/` — that's a
sibling of `skills/`, not inside this skill directory. Keep it that way:
the `skills add` CLI copies a skill directory recursively (verified against
`skills@1.5.20` source — it only excludes `.git`, `__pycache__`,
`__pypackages__`, and `metadata.json`), so anything placed here ships to
every consumer on every install. Snapshots exist for git-history diffing in
this repo, not for distribution — they're only reachable when working
directly in the `xentac/skills` repo, not from an installed copy of this
skill. If you're working from an installed copy and can't find
`../../snapshots/torn-city/`, that's why — re-fetch from the live source
instead (see `research-methods.md`). Add a new dated snapshot when you
fetch something likely to drift and are citing it as fact — don't snapshot
everything, just what you're relying on.
