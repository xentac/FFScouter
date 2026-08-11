# Researching Torn (fetching docs, wiki, rules)

Torn's various properties have inconsistent bot-protection, discovered
empirically 2026-07-29. Use this to decide how to fetch something rather
than guessing per-page.

## What's directly fetchable (plain `curl`, no browser needed)

- `www.torn.com/api.html` — v1 API docs (HTML)
- `www.torn.com/swagger/openapi.json` — full v2 OpenAPI spec (JSON, ~1.2MB,
  updates near-live)

JSON/data endpoints on `www.torn.com` seem to skip Cloudflare's bot
challenge even when the equivalent HTML page on the same host doesn't.
Worth trying a `.json` sibling of any blocked page before giving up.

## What's Cloudflare-gated (a browser challenge, not fixable by policy)

Comes back as either an outright HTTP 403 or a 200 with a "Just a
moment..." challenge page as the body — check the body, not just the status
code, before assuming a page loaded.

- `wiki.torn.com` — **the entire domain**, every page, including MediaWiki
  API/raw endpoints (`api.php`, `index.php?action=raw`) — tested directly,
  all gated. This is edge-level, not per-page, so there's no bypass URL to
  look for.
- `www.torn.com/rules.php`
- `www.torn.com/swagger.php` and `/swagger/index.html` (the interactive UI,
  as opposed to the raw JSON spec above)

**There is no network-policy fix for this** — it's a JS challenge requiring
a real browser, not a firewall rule. Don't spend time hunting for bypasses
beyond checking for a JSON/raw sibling endpoint (see above); fall back to
the Wayback Machine instead.

## Alternatives to Wayback tried (2026-07-29) — none beat it for this case

Before defaulting to Wayback, these were tried and ruled out. Documenting
them so they aren't re-tried from scratch next time.

- **Spoofing a browser User-Agent/Accept headers, or trying
  `?printable=yes`, mobile, or AMP URL variants** — no effect, still
  challenged. The `cf-mitigated: challenge` response header confirms this
  is Cloudflare's managed challenge, which fingerprints at the TLS/HTTP
  level (JA3-style), not the header level — nothing `curl` sends can fix
  this from the request side.
- **archive.today (`archive.ph` / `archive.today` / `archive.is` /
  `archive.li`)** — unreachable from this sandbox: connection timeouts or
  resets rather than a clean HTTP response, on every alias tried. This
  matches archive.today's known aggressive blocking of datacenter/cloud IP
  ranges, independent of anything Torn-specific. Not usable from a
  sandboxed environment.
- **`torncity.fandom.com`** (a community mirror wiki found via search) —
  also Cloudflare-gated, but that's Fandom's own platform-wide bot
  protection, unrelated to Torn. Dead end.
- **Google / Bing search-result page caches** — both fully discontinued in
  late 2024, confirmed via search and direct test: Google killed the
  `cache:` operator by Sept 2024 (and pointed users at the Wayback Machine
  as its own replacement, two weeks before removing cache entirely — the
  same fallback used here), and Bing removed its cache link Dec 2024.
  `webcache.googleusercontent.com` was tested directly and just returns a
  "please enable JavaScript" redirect stub, not real content. Not worth
  revisiting unless both engines reverse course.
- **Common Crawl** (`index.commoncrawl.org` for the CDX API,
  `data.commoncrawl.org` for the actual WARC data) — genuinely interesting:
  fetched a real, non-challenge 200-status capture of `www.torn.com/` from
  Sept 2025 (verified by inspecting the actual WARC record — real CSP
  headers matching Torn's site, not a challenge-page stub), proving
  Cloudflare does let _some_ automated crawlers (CCBot) through, presumably
  via a verified-bot allowlist. **But it has no useful coverage of the
  pages that matter here** — checked 32 collections spread from 2009 to
  2026, and `wiki.torn.com/wiki/API` was never captured once;
  `www.torn.com/rules.php` was captured exactly twice (a dead 503 in 2019,
  and a stale 2009-2010 snapshot from Torn's early years). Common Crawl is
  worth a quick check for _other_ torn.com paths in the future — it reaches
  past Cloudflare where `curl` can't — but for the wiki and rules page
  specifically it's not a substitute for Wayback.
- **A real headless browser (Playwright)** — not attempted. The
  `playwright` npm package is available, but the actual Chromium binary
  isn't installed (would need `npx playwright install chromium`, a
  ~100-300MB download). Even installed, plain headless Chromium is
  frequently still caught by Cloudflare's managed challenge without
  additional stealth patching (masking `navigator.webdriver` and other
  automation fingerprints) — at that point it's less "use a browser to read
  a page" and more purpose-built anti-bot-evasion tooling, which is a
  different judgment call than the other methods here. Flagging as a
  possible future option, not something to reach for by default.

**Conclusion: the Wayback Machine remains the most reliable available
method** for `wiki.torn.com` and `rules.php` specifically, despite its own
gaps (stale snapshots, occasional challenge-page captures — see below).

## Using the Wayback Machine

The **WebFetch tool refuses `archive.org` URLs outright** — don't bother
trying it. Use `curl` directly instead:

```bash
# 1. List every snapshot of a URL, newest last:
curl -sS "https://web.archive.org/web/timemap/link/<URL>" | grep -oE '[0-9]{14}'

# 2. Fetch a specific snapshot:
curl -sSL "https://web.archive.org/web/<TIMESTAMP>/<URL>" -o page.html
```

Notes:

- `web.archive.org` (the subdomain) works fine over HTTPS via `curl`. The
  bare `archive.org` apex domain (used by the `/wayback/available`
  convenience API) may be blocked by sandbox network policy independently
  of Torn — if so, ask the user to `sbx policy allow network archive.org`
  rather than working around it, since the timemap approach on
  `web.archive.org` covers the same need anyway.
- **Not every snapshot has real content.** The Wayback crawler sometimes
  captures Cloudflare's challenge page instead of the actual site (this
  happened for several `rules.php` snapshots from 2024–2025). Check: if the
  extracted text is ~2 lines and says "Just a moment..." / "Enable
  JavaScript and cookies to continue", that snapshot is worthless — try an
  older one from the timemap list, not just the newest.
- Strip HTML to text for reading with something like:
  ```bash
  python3 -c "
  import re, html
  with open('page.html') as f: content = f.read()
  content = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', content, flags=re.S)
  text = html.unescape(re.sub(r'<[^>]+>', ' ', content))
  print('\n'.join(l.strip() for l in re.sub(r'[ \t]+', ' ', text).split('\n') if l.strip()))
  "
  ```

## Snapshotting for change-tracking

Torn's docs, rules, and wiki pages all evolve, and old guides/API calls can
silently go stale. When pulling a primary source for something likely to
drift (API docs, rules, core mechanics numbers), save a dated copy under
`snapshots/torn-city/<YYYY-MM-DD>/` **at the repo root** (a sibling of
`skills/`, not inside this skill directory — see the Snapshots note in
`SKILL.md` for why: the install CLI copies skill directories recursively
with no size filtering, so anything placed inside `skills/torn-city/` ships
to every consumer). Include a short README noting: source URL, fetch
method, and any diff observed against the previous snapshot. See
`snapshots/torn-city/2026-07-29/README.md` for the format. Don't snapshot
everything — just things you're citing as fact, so a future check can
confirm it's still true.

**Commit snapshot files raw — don't gzip them first.** Tested empirically
(2026-07-29): two simulated snapshots of the same ~1.2MB JSON file with ~1%
line drift between them, packed by git, came to 90,659 bytes committed raw
vs. 141,163 bytes (56% larger) when each was gzipped before committing. Git
already zlib-compresses blobs in its packfiles and, more importantly,
delta-compresses similar versions of the same file across commits — which
is exactly what repeated snapshots of a slowly-evolving doc are.
Pre-compressing defeats that: gzip output for two near-identical inputs
isn't byte-similar, so git can no longer see the similarity and ends up
storing each version at close to full size. Let git's own packing handle
repo size.
