FF Scouter overlays Fair Fight ("FF") or estimated Battle Stat ("Est") values for players on every Torn City page, computed by the [FFScouter service](https://ffscouter.com) using data Torn's own API exposes about you and the players you attack.

## Features

- FF/Est display on profile pages, faction member lists, ranked war pages, attack pages, the item market, mini-profiles, and the Russian Roulette page
- Faction and ranked war sorting and filtering
- A floating "FF" button to cycle through chain targets matching your filters
- Flight estimates for traveling players on profiles and mini-profiles (FF Scouter Premium)
- Configurable gauge marker style (arrow or bubble) and color scheme for FF/Est values
- Quick-attack links from online/idle/offline status indicators
- A link from player profiles to their full FF history on ffscouter\.com

Install both [FF Scouter](https://greasyfork.org/en/scripts/535292-ff-scouter-v2) and [Torn War Stuff Enhanced](https://greasyfork.org/en/scripts/529238-torn-war-stuff-enhanced) to enable additional features:

- Filter by last action
- Sort ranked war member lists by hospital timers

## Setup

FF Scouter needs your Torn API key to query [FFScouter](https://ffscouter.com) for Fair Fight / Battle Stat estimates. Open the FF Scouter Settings panel on your profile page and paste your key into the **API Key** field. If you're not sure which key you've already given it, check your [API preferences](https://www.torn.com/preferences.php#tab=api) for a key with "FFScouter3" in its comment history.

We recommend creating a **Custom** key by following the [sign up directions](https://ffscouter.com/#get-started) to limit unnecessary permissions being shared with [FFScouter](https://ffscouter.com).

## Screenshots

![Screenshot showing faction war box with Est columns and FF bubbles](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Faction%20War.png)
_Faction war box with Est columns and FF bubbles_

![Screenshot of faction filter settings](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Filter.png)
_Faction filter settings_

![Screenshot showing Plasma colour theme with arrows](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Arrows.png)
_Plasma colour theme with arrows_

![Screenshot of mini profile showing flight tracking and FF estimate](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Mini%20profile.png)
_Mini profile showing flight tracking and FF estimate_

![Screenshot of premium estimates on profile pages](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Premium%20estimates.png)
_Premium estimates on profile pages_

![Screenshot showing FF gauge settings](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Gauge%20settings.png)
_FF gauge settings_

![Screenshot showing feature settings](https://raw.githubusercontent.com/xentac/FFScouter/refs/heads/main/docs/screenshots/Feature%20settings.png)
_Feature settings_

## Privacy & Torn API Terms of Service

Per the [Torn API Terms of Service](https://www.torn.com/api.html#), here's what this script stores, shares, and why:

- **Data Storage**: Persistent, server-side, on infrastructure run by the FFScouter service (run by `Glasnost [1844049]`). The script caches data in `localStorage` and `IndexedDB` on your device.
- **Data Sharing**: Your API key is sent only to `ffscouter.com`, never to any other third party. What FFScouter itself does with it and with the data it returns about you and other players, is governed by FFScouter's own data policy.
- **Purpose of Use**: To calculate and serve Fair Fight / Battle Stat estimates back to you.
- **Key Storage & Sharing**: Stored locally in your browser's `localStorage`, unencrypted, and sent to `ffscouter.com` with each request. FFScouter's handling of the key server-side is covered by its own policy (linked below).
- **Key Access Level**: Custom is recommended, granting only the selections FFScouter needs (see Setup above and the Data Policy linked below for the current list). Limited and Full also work, but grant more than is necessary.

FFScouter (`ffscouter.com`) is a separate service this script depends on, run by `Glasnost [1844049]`. Its full, field-by-field breakdown of data storage, sharing, retention, and key handling is published at the **[FFScouter Data Policy](https://ffscouter.com/#data-policy)**. That policy covers the core FFScouter service this script uses; it explicitly does not cover FFScouter's separate volunteer data-gathering effort, which this script does not interact with.

## Editions

- [FF Scouter V2](https://greasyfork.org/en/scripts/535292-ff-scouter-v2) — stable
- [FF Scouter V2 beta](https://greasyfork.org/en/scripts/582442-ff-scouter-v2-beta) — experimental, newer features, may be less stable

## Support

Found a bug or have a feature request? [Open an issue on GitHub](https://github.com/xentac/FFScouter/issues).

Support is also available in the [FF Scouter discord server](https://discord.gg/cndwEmVSd).

## Disclaimer

This script is an independent, unofficial tool and is not affiliated with, endorsed by, or operated by Torn or its developers. It complies with Torn's API Terms of Service and scripting rules.
