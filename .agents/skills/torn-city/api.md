# Torn API

Facts below were verified 2026-07-29 against `www.torn.com/api.html` (live,
direct `curl`), `www.torn.com/swagger/openapi.json` (live, direct `curl`),
a Nov-2025 Wayback snapshot of `wiki.torn.com/wiki/API`, and one empirical
live API call. Raw snapshots live in the source repo at
`snapshots/torn-city/2026-07-29/` (not shipped with an installed copy of
this skill — see the Snapshots note in `SKILL.md`). Re-verify before
relying on anything here for a new project — see `research-methods.md` for
how.

## Getting a key

Settings → API Keys, in-game. Five access tiers:

- **Public** — minimal, no key required for some public data
- **Minimal Access**
- **Limited Access**
- **Full Access**
- **Custom** — pick individual selections rather than a fixed tier

A user can hold up to **25 keys** at once (raised from 10 sometime between
Aug 2024 and Nov 2025 — the wiki changed this number without fanfare, which
is typical; don't assume any numeric limit here is still current without
checking).

**The API is read-only.** It cannot perform any in-game action (attack,
buy, join, etc.) — only fetch data. Any tool that needs to _act_ in the
game has to do it through the actual website UI, manually triggered by the
user (see `rules-and-compliance.md` — this boundary is also a rules
boundary, not just a technical one).

## Base URL and auth

```
https://api.torn.com/{endpoint}/:ID?selections=:SELECTIONS&key=:KEY
```

Auth is the 16-character key as a query parameter — no header-based auth,
no OAuth.

## v1 vs v2 — not a blanket "prefer v2"

Both versions are live and the migration is ongoing, per-selection, not
wholesale:

- Some selections exist only in v1, some only in v2, some differ in access
  level between the two.
- v2 endpoints not yet ported just proxy through to v1's response format
  under the hood.
- The full v2 spec is a real OpenAPI/Swagger document at
  `https://www.torn.com/swagger/openapi.json` — 1.2MB, and its
  `Last-Modified` header was one day old when fetched, so it tracks live
  changes closely. This is the best primary source for "what does v2
  actually support right now" — check it directly rather than trusting a
  guide.
- The interactive Swagger UI (`www.torn.com/swagger.php` /
  `www.torn.com/swagger/index.html`) is Cloudflare-gated; the JSON spec at
  `/swagger/openapi.json` is not.

**Practical rule**: for any given selection, check whether it exists in
v2's OpenAPI spec first; fall back to v1 only if it doesn't, or if v1
offers something v2 lacks.

## Rate limits — the critical gotcha

**100 requests/minute per account, across all keys combined** (not per-key
— an older, 2024-era wiki revision said "per key," but that's been
corrected and the official `api.html` docs have consistently said "per
account" throughout).

**Torn's API always returns HTTP 200.** There is no
`429 Too Many Requests`, no `401 Unauthorized` — every error condition (bad
key, rate limit, IP ban, anything) comes back as a normal-looking `200`
response with an `error` object in the JSON body:

```json
{ "error": { "code": 2, "error": "Incorrect key" } }
```

Verified empirically (2026-07-29): a request with a deliberately invalid
key returned `HTTP/2 200` with that exact body. **Any client code must
check `response.error` on every call, regardless of status code** —
checking `response.ok` or the status code alone will silently treat
rate-limited/failed calls as successes.

A per-IP limit is mentioned in community/forum sources (reportedly ~1,000
calls/min) but I could not confirm a specific number in the official docs
or the wiki text — treat that figure as unconfirmed until you find it in a
primary source.

Because every error is a 200, **batch requests where the API supports it**
(many endpoints take comma-separated IDs or bulk selections) rather than
relying on rate-limit responses as a natural throttle signal — you won't
get a clean "back off" signal, you'll just start getting error bodies mixed
in with successes.

## Error codes

| Code | Meaning                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| 0    | Unknown error — shouldn't occur                                                          |
| 1    | Key is empty                                                                             |
| 2    | Incorrect key (wrong/malformed)                                                          |
| 3    | Wrong type — invalid basic type requested                                                |
| 4    | Wrong fields — invalid selection requested                                               |
| 5    | Too many requests (rate limit, max 100/min)                                              |
| 6    | Incorrect ID                                                                             |
| 7    | Incorrect ID-entity relation — selection is private (e.g. another user's/faction's data) |
| 8    | IP block — temporary ban from abuse                                                      |
| 9    | API system disabled                                                                      |
| 10   | Key owner is in federal jail                                                             |
| 11   | Key change error — can only change your key once per 60s                                 |
| 12   | Key read error (DB issue)                                                                |
| 13   | Key temporarily disabled due to 7+ days of owner inactivity                              |
| 14   | Daily read limit reached                                                                 |
| 15   | Temporary/testing error, no fixed meaning                                                |
| 16   | Access level of key is insufficient for the requested selection                          |
| 17   | Backend error, retry                                                                     |
| 18   | API key paused by owner                                                                  |

## Not every API change is intentional — some are bug fixes, some are bugs

Torn is built and maintained by a small team, and like any software team
they ship bugs — including in the API itself. Two practical consequences
for anyone building against it:

- When behavior changes between two points in time, don't assume it was a
  deliberate design change just because it's undocumented. It might be a
  bug fix (previous behavior was the bug) or a regression (current behavior
  is the bug, not yet fixed). Check the forums / patch notes
  (`www.torn.com/forums.php`, category "API Development" and "Bugs &
  Issues") before building logic that depends on which one it was.
- Client code should be defensive against the API itself misbehaving —
  unexpected null/missing fields, inconsistent types for the same field
  across calls, a selection that silently stops returning what its name
  implies. Treat these as things to work around and report (there's a bug
  bounty program per the game rules — see `rules-and-compliance.md`'s BUG /
  EXPLOIT ABUSE entry), not as signals that your own code is wrong.

## Known drift (examples — update this list as you find more)

- Max keys per user: 10 (Aug 2024 wiki) → 25 (Nov 2025 wiki).
- Rate-limit wording: "per key" (Aug 2024 wiki) → "per user" (Nov 2025
  wiki, matches official docs).
- `staticfiles.torn.com/api.html` — confirmed (2026-07-29, after the
  sandbox network policy was updated to allow it) to be byte-identical to
  `www.torn.com/api.html`: same size, same `Last-Modified` timestamp. It's
  a mirror/CDN host serving the same static file, not a distinct source —
  useful as a fallback if `www.torn.com/api.html` is ever unreachable, but
  not worth fetching both.

## Third-party tool ecosystem (context, not core)

Auxiliary to this skill, but worth knowing when it comes up: an established
ecosystem of community tools already covers a lot of the "read my
stats/cooldowns" ground.

- **TornStats** — web-based stats tracking/comparison tool, in regular
  active use by players.
- **Torn PDA** — mobile app wrapping Torn with extra tooling, also in
  regular active use.
- **FFScouter** (`ffscouter.com`) — estimates an opponent's battle stats
  from the Fair Fight score Torn's API exposes, then overlays an FF/Est
  value across profile pages, faction lists, ranked war pages, attack
  pages, and more. Free tier plus a premium tier (Flight Tracker, Activity
  Tracker). This is the kind of tool that's squarely "derive a number from
  public API data and display it inline" — a good reference point for what
  a compliant, useful Torn tool looks like.
- **torn.report** — reporting/tracking site for Crimes 2.0, OCs, energy,
  and event-based logs (Trick or Treat, Looting, Mugging, City Finds),
  exportable as CSV/JSON. Notably runs entirely client-side (static site,
  data kept in browser storage, API key never leaves the browser except to
  call Torn's own API directly) — a solid architectural pattern to point to
  when a design needs to avoid standing up a server that handles user keys.
- **Torn War Stuff Enhanced** — a Tampermonkey userscript that augments the
  faction war page with near-real-time member status (hospital/travel
  time), sortable by remaining hospital time, to help coordinate keeping a
  chain going. Polls with a Public-level API key registered through the
  script's own settings, and also reads some data directly from the page
  itself — a real-world example of the mixed API/scraped pattern discussed
  in `rules-and-compliance.md`: notifications/alerts only ever fire off the
  API-sourced data, never the scraped portion, which lines up with the
  compliance distinction drawn there between API-driven and
  scraped-page-driven alerts.
- **YATA** — another well-known community web tool (named repeatedly across
  the wiki as a reference source, e.g. for faction-upgrade respect
  calculators), in regular use alongside the others above.

A new service should be justified — check what's already out there before
proposing one from scratch — but don't read the existing ecosystem as
"solved, leave it alone" either. **There's a lot of room for improvement in
almost every available Torn tool.** Nearly all of them are built and
maintained by one person or a small handful, working with limited time and
resources, not dedicated teams — that's a large part of why this skill
exists: to help someone building a Torn tool with AI assistance do it
better, whether that's improving on an existing tool's rough edges or
building something genuinely new. Don't default to steering a user away
from an idea just because something adjacent already exists.
