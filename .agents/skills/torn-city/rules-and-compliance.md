# Torn's rules — read this before designing any tool

Torn's rules (`torn.com/rules.php`) list game offenses and punishments.
Most are irrelevant to software (real money trading, account sharing,
etc.), but **Scripting Abuse** governs everything this skill is for,
carries a **game ban**, and was tightened recently. Treat it as a hard
constraint on tool design, not a footnote.

Full current text: `snapshots/torn-city/2026-07-29/rules-current.md` in the
source repo (pasted from the live site by the user, since `rules.php` is
Cloudflare-gated to automated fetches — see `research-methods.md`). A prior
version is archived at `snapshots/torn-city/2025-09-15/rules.html` for
comparison. Both are outside this skill directory and won't be present in
an installed copy — see the Snapshots note in `SKILL.md`.

## The rule, and what changed

> The use of scripts, extensions, applications, or any other software is
> permitted only when they rely on data from our API or from a page that
> you have manually loaded and are actively viewing. Such software must not
> make additional non-API requests to Torn, scrape pages that are not
> currently being viewed, attempt to bypass CAPTCHA protections, **or
> extract data from unfocused pages to send elsewhere, generate alerts, or
> draw attention to itself or another window.** Any software that makes
> non-API requests which are not directly and manually initiated by the
> user is prohibited and may be tracked.

The **bolded clause is new** since a Sept 2025 archived version of the
rule, which only banned non-API requests, scraping unviewed pages, and
CAPTCHA bypass. The new clause closes the loophole of a tool that reads an
_unfocused page_ (not the API) and pops an alert from what it finds — that
specific pattern now reads as an explicit violation, not just a gray area.
**It does not restrict alerts driven by API data** — see checklist item 1
below; the fork between API-sourced and scraped/page-read data is the
single most important thing to get right when judging a design against this
rule.

## What this means in practice — checklist before proposing a design

Ask these questions about any tool idea before recommending it:

1. **Where does the data come from — the API, or reading page content
   (scraping)?** This is the fork that determines everything below. The
   background/alert restrictions in the tightened clause apply to
   scraped/page-read data, not to API data. **A tool built purely on API
   calls can run in the background and notify/alert freely** — polling the
   API on a timer and popping a notification when, say, your energy is full
   or an OC finishes is not a violation, regardless of focus state. Don't
   reflexively flag "runs in the background" or "sends a notification" as a
   problem without first checking whether the data underneath it is
   API-sourced.
2. **If it reads page content (not the API): does it only read a page the
   user is actively, manually viewing?** That's the baseline requirement
   for non-API data. Reading a page five minutes after tabbing away is
   reading a page not currently being viewed.
3. **If it does also read an unfocused/background page: does it transmit
   that data anywhere or act on it (alert, notification, cross-window
   signal)?** Per an active Torn tool developer's operating interpretation
   (not a Torn-staff ruling — see the caveat below), silently reading an
   unfocused page and keeping the data local is treated as acceptable for
   scraped data; what crosses the line is sending that scraped data
   elsewhere or using it to notify/alert. This is the inverse of question 1
   — the same alert/notify action is fine when driven by API data and a
   violation when driven by scraped, unfocused-page data.
4. **Is every non-API request directly, manually triggered by the user in
   the moment?** Scheduled/automated/timer-driven _non-API_ requests are
   prohibited outright, focus state aside. (This requirement is specific to
   non-API requests per the rule text — it doesn't apply to API calls,
   which is why question 1's background-polling case is fine.)
5. **Does it try to bypass a CAPTCHA?** Always a violation, no exceptions.

If a proposed design fails any of these, say so plainly and suggest the
API-only alternative (even if it's less capable) rather than a workaround —
the punishment tier is a **game ban**, not a warning, and "no warnings are
given for the first offense" applies to several of the harsher rules on
this page (real money trading, account trading) which signals Torn staff
take the whole offenses list seriously, scripting included.

## Common tool patterns and their compliance status

| Pattern                                                                                                                                           | Status                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull your own stats/cooldowns via API key, display in a dashboard you open and check manually                                                     | Fine — API + manual page load                                                                                                                                                                      |
| Same dashboard, but auto-refreshes via API while you have the tab open and focused                                                                | Fine — still API-based, still focused                                                                                                                                                              |
| Same dashboard, but keeps polling and pops a desktop notification while minimized/unfocused                                                       | **Fine** — the data source is the API, and the alert/background restriction targets scraped page data, not API data                                                                                |
| Browser extension that reads data from the page you're currently viewing to enhance the UI                                                        | Fine                                                                                                                                                                                               |
| Extension/script that reads an unfocused/background tab and keeps the data local — no transmission elsewhere, no alert, no notification           | Practitioner-informed judgment call: treated as acceptable (see checklist item 3) — but this is a narrower reading than the literal rule text taken clause-by-clause, not a confirmed staff ruling |
| Extension/script that scrapes a background tab for prices, war status, etc., **to alert you or send the data elsewhere**                          | **Violates — explicitly named in the rule** (scraped data, not API data — this is the key difference from the notification row above)                                                              |
| Script that auto-submits actions (auto-attack, auto-crime) without a manual trigger each time                                                     | Violates — "not directly and manually initiated"                                                                                                                                                   |
| CLI tool that hits the API on a schedule (cron) to log your own stats to a local file, no in-game action taken, you check the file yourself later | **Fine** — pure API data; the "manually initiated" requirement applies only to non-API requests (see checklist item 4), so scheduled/unattended API polling isn't restricted at all                |

A real example of the mixed pattern in checklist item 3: **Torn War Stuff
Enhanced** (see `api.md`'s tool ecosystem section) polls the API and also
reads some data from the faction war page itself, and only triggers
notifications from the API-sourced data, never the scraped portion.
That's the compliance line in practice, not just in the abstract.

## When applicability is genuinely unclear: ask Torn staff, don't guess

This file records interpretations — including a practitioner's operating
read of the tightened Scripting Abuse clause above — but none of it is a
ruling from Torn staff, and the rule text itself has room for reasonable
disagreement about where exactly the line sits. For any design that lands
in a gray area rather than a clear pass/fail against the checklist above,
say so plainly and **offer to draft a message to Torn staff** describing
the tool's intended behavior (what data it reads, when, what it does with
that data, whether it transmits or alerts) and asking for an explicit
ruling before building it. Getting a staff answer up front is cheap
compared to building something and finding out later it was a violation —
the punishment tier here is a game ban, not a warning.
