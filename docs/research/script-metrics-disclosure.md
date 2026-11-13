# Research: disclosure rules for Script Metrics

Research for [issue #41](https://github.com/xentac/FFScouter/issues/41).
The parent is the wayfinder map
[issue #39](https://github.com/xentac/FFScouter/issues/39).

The script will report usage counts to
`POST https://ffscouter.com/api/v1/script-metrics`. It sends them under
the player's own FFScouter API key. Question: what do Torn's rules,
Greasy Fork's rules, and FF Scouter's developer terms require for this?
What do the script's current disclosures say?

Date of research: 2026-11-13. The FF Scouter OpenAPI spec was at version
1.22.0 on that date. This file records facts and requirements. It does not
choose wording. Ticket #45 chooses the wording.

## Short answer

- No rule found forbids Script Metrics or forbids on by default. Torn,
  Greasy Fork, and FF Scouter all require disclosure. None of them requires
  opt-in.
- Torn's API Terms of Service (ToS) say the player must know how the script
  uses their key. Using a key for a purpose that the ToS do not describe is
  a punishable offense. The script's current ToS names one purpose only:
  estimates. Script Metrics is a new use of the key. The script must
  disclose it before it ships.
- Torn wants the ToS table "clearly and visibly stated in any place where
  user is providing their API key". FF Scouter wants a data policy link
  "wherever a user is expected to provide their API key". Today the
  Settings Panel key field has neither. This gap exists already, before
  Script Metrics.
- Greasy Fork requires `@antifeature tracking` in the metadata block for
  "custom tracking code that reports user activity to the script author".
  The build has no `@antifeature` key today.
- FF Scouter's data policy panel does not mention Script Metrics. The only
  published description is in the API spec and changelog: submissions are
  "stored per key and visible to staff on player search". No retention
  period is published. So the script has no ffscouter.com page to link for
  Script Metrics retention and visibility.

## Hard requirements

1. Disclose the new purpose in the script's Torn ToS before the feature
   ships. The ToS must say that the key also sends usage counts and
   settings to ffscouter.com. (Torn API ToS)
2. Show the ToS table, or link it, where the player enters the key. The
   Settings Panel key field is such a place. (Torn API ToS)
3. Link FF Scouter's data policy wherever the player enters the key.
   (FF Scouter API guidance and spec `info.description`)
4. Do not claim server-side retention or sharing on xentac's own
   authority. Link to ffscouter.com's own text instead. (CONTEXT.md,
   "FFScouter Backend")
5. Add `@antifeature tracking` to the userscript metadata block for
   releases on Greasy Fork. (Greasy Fork code rules. Moderator
   classification is unconfirmed, see below.)
6. Send no Torn request to send a report. Send the report to
   ffscouter.com only. (Torn scripting rule)
7. Never put the key, a player ID, or a target ID into the `settings` or
   `metrics` maps. The decided design already says this. Staff can read
   every value on player search.

## Torn's rules

### API Terms of Service

Source: Torn API v1 docs, the "API Terms of Service (ToS) Guidelines"
section. This research reads the snapshot stored 2026-07-29 (upstream
Last-Modified 14 Jul 2026, last checked unchanged 2026-10-12). This
research did not re-fetch `torn.com/api.html`. The page is
Cloudflare-gated to automated fetches.

What the ToS say, in Torn's words:

- Scope: the ToS cover any "script, userscript, sheet, extension, API
  service, bot, 3rd party website or any other API tool". The script is in
  scope.
- "the end user must be aware of how will their API key be used."
- The table has five categories: Data Storage, Data Sharing, Purpose of
  Use, Key Storage & Sharing, and Key Access Level.
- Listed values for Data Sharing include "Service owners". Listed values
  for Purpose of Use include "Non malicious statistical analysis". These
  two values fit Script Metrics. The choice is for ticket #45.
- The page also says the following (verbatim):

```text
If the service is not storing or sharing the data or the key anywhere,
it's enough to state so, otherwise ToS with the information above needs
to be clearly and visibly stated in any place where user is providing
their API key in the table format highlighted above.

When integrating your service with another service (opt-in), make sure
there's at least a link to ToS of the service you're allowing the user
to integrate with. When integrating your service with another service
(automatically), your ToS need to cover the usage of the service you're
integrating with.

Using keys for purposes other than the ones described in the ToS or
deceiving the end user into believing that the key is being used for a
purpose other than described is prohibited and is a punishable offense.

If you're unsure how to describe your service, feel free to contact
Torn staff.
```

What this means for Script Metrics:

- The script sends the key to ffscouter.com automatically. So the script's
  ToS must cover how ffscouter.com uses it. Script Metrics adds a use.
- The ToS say nothing about telemetry by name. They also say nothing about
  opt-in or opt-out. The requirement is that the player knows.
- The page says ToS examples are at the bottom. The snapshot text does not
  contain them. This research did not see the examples.

### Scripting rule

Source: `rules.php`, "Scripting Abuse", text pasted by the user on
2026-07-29. The penalty is a game ban.

```text
The use of scripts, extensions, applications, or any other software is
permitted only when they rely on data from our API or from a page that
you have manually loaded and are actively viewing. Such software must
not make additional non-API requests to Torn, scrape pages that are not
currently being viewed, attempt to bypass CAPTCHA protections, or
extract data from unfocused pages to send elsewhere, generate alerts, or
draw attention to itself or another window.
```

What this means for Script Metrics:

- The report goes to ffscouter.com, not to Torn. The "non-API requests to
  Torn" clause does not apply to the POST.
- The rule does not mention telemetry or usage counts.
- Unconfirmed: the rule forbids extracting "data from unfocused pages to
  send elsewhere". The counts describe the script's own activity, not page
  content. No Torn staff ruling covers a report that a background tab
  sends. A safe reading is to count only what happens on a page the player
  views, and to keep page content out of every value. Ticket #44 (which tab
  sends) needs this fact. Torn's ToS invite questions to Torn staff.

## Greasy Fork's rules

Sources fetched 2026-11-13:
<https://greasyfork.org/en/help/code-rules>,
<https://greasyfork.org/en/help/antifeatures>, and
<https://greasyfork.org/en/help/meta-keys>.

- Code rules (verbatim):

```text
Scripts that contain features for the benefit of the author rather than
the user (such as tracking, ads, and miners) are allowed, but these must
be disclosed with @antifeature meta keys.
```

- Antifeatures page, type `tracking`: "The script includes code to track
  user activity. This includes trackers such as Google Analytics or custom
  tracking code that reports user activity to the script author."
- Format: `@antifeature type description`. The type is required. The
  description is optional. A locale variant `@antifeature:XX-YY` exists.
- Greasy Fork shows antifeatures to the user before install.

What this means for Script Metrics:

- Script Metrics reports usage counts to ffscouter.com. The metadata
  block lists Glasnost [1844049], who runs ffscouter.com, as an author
  (`vite.config.ts`). The `tracking` definition fits on its plain reading.
- Unconfirmed: no Greasy Fork moderator ruling exists for this script.
  Treat the key as required.
- `vite.config.ts` has no `antifeature` key today. The change touches the
  release header, not only the Settings Panel.
- Side note, outside this ticket: the type `referral-link` covers "some
  action that earns the author commission". Bounty claims carry the script
  author's `referrer_player_id` (CONTEXT.md, "FF Scouter Bounty"). Check whether
  that needs its own `@antifeature` key. This research did not check it further.

## FF Scouter's terms and published text

### The Script Metrics endpoint

Source: <https://ffscouter.com/openapi/spec.yaml>, version 1.22.0, fetched
2026-11-13.

- Tag "Script Metrics": "Self-reported script telemetry. Requires a
  registered FFScouter API key. Submissions are stored per key and visible
  to staff on player search."
- Operation `storeScriptMetrics`, summary: "Report script telemetry for
  the caller's API key". The description ends: "Staff can review a key's
  submission history on player search."
- The server stores the `authors` list "as given, not verified".
- The demo key stores nothing. Its response has `demo: true`.
- The spec says nothing about retention or deletion. It names no viewer
  other than staff.

Source: <https://ffscouter.com/api-docs/changelog>. The entry dated
2 November 2026 added the endpoint in contract 1.20.0. It repeats:
"Staff can review a key's history on player search." Rate limit: 5
requests per minute per IP address and per API key.

### Developer guidance

Source: <https://ffscouter.com/api-docs/guidance>, fetched 2026-11-13.

The guidance says (verbatim):

```text
You must always follow the rules of Torn. This includes linking users to
the appropriate data policy pages and sections. Even if you reproduce the
data policy within your own tool, you MUST provide a link to it wherever
a user is expected to provide their API key. The data policy of FFScouter
may change from time to time, so I would recommend having the user
acknowledge they have checked the website for the latest version, or
making it an obvious and implicit requirement of using the tool.
```

The guidance does not mention telemetry or script metrics.

The spec's `info.description` adds (verbatim):

```text
ensure you provide a link to the data policy of each feature where it
applies in accordance with Torn's rules.
```

### Data policy

Source: the "Data Policy" panel on <https://ffscouter.com/#data-policy>,
fetched 2026-11-13.

- The panel says it "only covers the main FFScouter service/tool as your
  API key is used".
- Its rows cover Player ID, battle stats, bss_private, Hall of Fame,
  attacks, the API key, bss_public, and personal stats. No row covers
  Script Metrics or script telemetry.
- For the API key itself, the panel gives these two values (verbatim):

```text
Data Storage: Persistent - until account deletion
Data Sharing: Service owners (only for debugging/bug fixing purposes)
```

### Privacy policy

Source: <https://ffscouter.com/privacy>, "Last Updated: September 2026",
fetched 2026-11-13. It predates the endpoint (2 November 2026) and does not
mention script metrics. Its "Analytics and ads" row is about website
cookies, Google Analytics, and AdSense. It does not describe Script
Metrics. Its general retention line says: "We retain your personal
information as long as your account is active."

### The gap

- Requirement 3 says to link the data policy. Requirement 4 says not to
  make first-party claims about server-side retention. The linked policy
  says nothing about Script Metrics.
- Bounties have their own policy page (`/claim-bounties`, linked from
  `BOUNTY_POLICY_URL` in `src/utils/api.ts`). Script Metrics has no such
  page.
- Today the only ffscouter.com text the script can cite is the spec and
  changelog line about staff review on player search.
- Per the map, a contract gap goes to Glasnost as a request. The request
  here: add Script Metrics to the data policy (storage, retention, who
  sees it, purpose), or publish a per-feature policy page to link.

## What the script says today

### Greasy Fork additional info

Source: `docs/greasyfork-additional-info.md` on `main` (commit
`77278f7d`), section "Privacy & Torn API Terms of Service".

- It gives the five-category Torn ToS table.
- Purpose of Use: "To calculate and serve Fair Fight / Battle Stat
  estimates back to you." Script Metrics is not listed.
- Data Sharing: "Your API key is sent only to `ffscouter.com`, never to
  any other third party." It then defers to FF Scouter's data policy.
- Data Storage names server-side storage by FFScouter and local caches
  (`localStorage`, `IndexedDB`).
- It links <https://ffscouter.com/#data-policy> and says the policy covers
  the core service.
- It does not mention usage reports, telemetry, or a way to turn them off.

### Settings Panel

Source: `src/ui/settings-panel.tsx` on `main`, the "API Key & Premium"
group. The `beta` bookmark adds only an OD Insurance toggle to this file.

- The text above the key field links <https://ffscouter.com/> and Torn's
  API preferences page. It tells the player to use the same key as on
  ffscouter.com.
- It has no link to `#data-policy`, no ToS table, and no link to the
  Greasy Fork ToS section.
- The only data toggle is "Enable local analytics logging (last 30 days)".
  It is a local log and is separate from Script Metrics (CONTEXT.md).
- So the place where the player enters the key misses both the Torn ToS
  and the FF Scouter link requirement today.

### Userscript metadata

Source: `vite.config.ts` on `main`. The header has `connect:
"ffscouter.com"` and an author list that includes Glasnost [1844049]. It
has no `antifeature` key.

## Not confirmed

- Whether Greasy Fork moderators class Script Metrics as `tracking`.
  The plain reading says yes.
- Whether Torn staff see a report sent from an unfocused tab as "data
  from unfocused pages". No ruling exists.
- The ToS examples at the bottom of Torn's API page. The snapshot text
  does not contain them.
- How long ffscouter.com keeps submissions, and whether anyone besides
  staff can see them. Nothing published says.
- Whether FF Scouter's privacy policy will class Script Metrics under a
  consent basis. The policy predates the endpoint.

## Sources

- Torn API docs, ToS section, snapshot 2026-07-29 (last checked
  2026-10-12):
  `xentac/skills` `snapshots/torn-city/2026-07-29/api-v1-docs.html`.
  Live page: <https://www.torn.com/api.html> (not re-fetched).
- Torn rules, Scripting Abuse, snapshot 2026-07-29:
  `xentac/skills` `snapshots/torn-city/2026-07-29/rules-current.md`.
  Live page: <https://www.torn.com/rules.php> (not re-fetched).
- FF Scouter OpenAPI spec 1.22.0:
  <https://ffscouter.com/openapi/spec.yaml>, fetched 2026-11-13.
- FF Scouter API changelog:
  <https://ffscouter.com/api-docs/changelog>, fetched 2026-11-13.
- FF Scouter API guidance:
  <https://ffscouter.com/api-docs/guidance>, fetched 2026-11-13.
- FF Scouter data policy panel: <https://ffscouter.com/#data-policy>,
  fetched 2026-11-13.
- FF Scouter privacy policy: <https://ffscouter.com/privacy>, fetched
  2026-11-13.
- FF Scouter API key guide: <https://ffscouter.com/guides/api-keys>,
  fetched 2026-11-13. It summarizes Torn's ToS expectations.
- Greasy Fork code rules: <https://greasyfork.org/en/help/code-rules>,
  fetched 2026-11-13.
- Greasy Fork antifeatures: <https://greasyfork.org/en/help/antifeatures>,
  fetched 2026-11-13.
- Greasy Fork meta keys: <https://greasyfork.org/en/help/meta-keys>,
  fetched 2026-11-13.
- This repo on `main` (`77278f7d`): `docs/greasyfork-additional-info.md`,
  `src/ui/settings-panel.tsx`, `vite.config.ts`, `src/utils/api.ts`,
  `CONTEXT.md`.
