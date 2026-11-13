# Research: sharing counts and one sender across Torn tabs

Research for [issue #40](https://github.com/xentac/FFScouter/issues/40)
(child of wayfinder map [issue #39](https://github.com/xentac/FFScouter/issues/39)).

Question: how can several open Torn tabs share one set of Script Metrics
counts and agree on one tab that sends them? The endpoint
`POST https://ffscouter.com/api/v1/script-metrics` allows 5 requests per
minute per API key and 5 per IP. This file records facts only. The
coordination design is a later ticket.

Sources were read on 2026-11-13. Source code was read at these commits:

- Torn PDA (`Manuito83/torn-pda`): `28fdc2b` (2026-11-09)
- Violentmonkey (`violentmonkey/violentmonkey`): `49fa8e8` (2026-11-12)
- Safari Userscripts (`quoid/userscripts`): `8b743e3` (2026-05-10)

Tampermonkey is closed source. Its facts come from its documentation only.
Nothing here was tested on torn.com.

## Summary

- Every coordination tool except GM values is tied to the page origin
  (`https://www.torn.com`). Web Locks, BroadcastChannel, IndexedDB and
  `localStorage` all work in that origin in every manager the script
  supports. In the page this is certain. In a content script, Chrome
  documents it for Web Storage. For Firefox and Safari content scripts it
  is unconfirmed.
- `GM_addValueChangeListener` exists only in Tampermonkey and
  Violentmonkey. Greasemonkey 4, Safari Userscripts and Torn PDA do not
  have it.
- Torn PDA runs several tabs at once. Its tabs share one storage. So PDA
  needs cross-tab coordination too.
- A final report on `pagehide` is not reliable anywhere. On tab close or on
  a new page load, Violentmonkey aborts a pending `GM_xmlhttpRequest`.
- A hidden Chrome tab can fire a 60 second timer only once per minute
  wake-up, so the real gap can be close to two minutes.
- Surprise: the script calls `GM_xmlhttpRequest` (with `_`). Greasemonkey 4
  only gives `GM.xmlHttpRequest` (with `.`). The script very likely cannot
  send any request in Greasemonkey 4 today (unconfirmed, not tested).

## What the script does today

The built header (`dist/base-dev.user.js`, from `vite.config.ts` through
vite-plugin-monkey) grants only two things:

```text
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @run-at       document-start
```

The script has no `GM_setValue` grant. Settings live in page `localStorage`
(`src/utils/storage.ts`). The cache uses IndexedDB through the `idb`
library, and `src/utils/ffcache.ts` opens a `BroadcastChannel` named
`ffcache-channel-<db_name>` to tell other tabs about a database delete.
The database name is `FFSV3-cache` (`src/utils/ffscouter.ts`). Every
edition (standard, beta) uses the same name. So two installed editions
share one database and one channel. Other scripts on torn.com can also
open the same origin storage.

If `window.PDA_httpGet` is a function, `src/utils/api.ts` sends through
`PDA_httpPost`. If not, it sends through `GM_xmlhttpRequest` (ADR 0001).

## Which context the script runs in

The context decides which `window` the script sees. It does not change the
storage origin.

- Tampermonkey: `@sandbox` picks the world. With no `@sandbox` key, the
  default is `raw`, which runs the script in the page (`MAIN_WORLD`). If a
  CSP blocks that, Tampermonkey falls back to another enabled world.
- Violentmonkey: `@inject-into` defaults to `auto`. Auto tries the page
  first. If CSP rules block it, the script runs as a content script.
- Safari Userscripts: when a script grants any GM API, the extension
  injects it into the content script scope only. The README says so. The
  script grants `GM_xmlhttpRequest`, so it always runs as a content script
  there. `unsafeWindow` is not defined there (see `CONTEXT.md`).
- Greasemonkey 4: scripts with grants run sandboxed. The announcement
  post says `@grant none` scripts "have a different connection to
  unsafeWindow".
- Torn PDA: the app injects the script into the page. Its `unsafeWindow`
  points at the page `window`.

Chrome's extension docs say "Content scripts share storage with the host
page." So a content script uses torn.com `localStorage` and IndexedDB, not
the extension's storage. That page names Web Storage only. For
BroadcastChannel and Web Locks in an isolated content script, the same
origin rule is an inference, not a quote (unconfirmed). For Firefox and
Safari content scripts, no primary source states the storage origin
(unconfirmed). The existing `ffcache.ts` BroadcastChannel already depends
on this.

## Web platform APIs

### Web Locks (`navigator.locks`)

- Locks are scoped to the origin. Tabs and workers of the same origin share
  one lock namespace (MDN). The spec ties each lock manager to a storage
  bucket and says locks "do not span origins".
- With `ifAvailable: true`, the request does not wait for a held lock. The
  callback gets `null` instead. `steal: true` takes a held lock away (MDN).
- For a document that unloads, the spec releases its locks and pending
  requests. So a closed or discarded tab gives up its lock.
- For a document that is not fully active, `request()` rejects with
  `InvalidStateError` (spec).
- Needs a secure context. torn.com is HTTPS.
- Support: Chrome 69, Firefox 96, Safari 15.4 (MDN browser-compat-data).
  Android WebView follows Chrome. iOS WebView follows Safari.
- Chrome Energy Saver (Chrome 133) does not freeze a background tab that
  holds a Web Lock or an IndexedDB connection that blocks operations outside
  its group (Chrome blog).
- A page that holds a Web Lock and does not release it in `pagehide` is not
  put in Chrome's back/forward cache. This comes from a search summary of
  a Chrome developer discussion. The exact reason string is unconfirmed.

### BroadcastChannel

- Works between windows, tabs, frames and workers of the same origin and
  the same storage partition (MDN).
- Per the HTML spec, the object that posts a message does not receive it.
  Other objects with the same name do. MDN does not say this outright.
- No delivery guarantee to frozen or closed tabs. It only reaches live
  contexts. For the frozen state, Chrome's Page Lifecycle
  guide tells pages to close BroadcastChannel.
- Support: Chrome 54, Firefox 38, Safari 15.4 (MDN browser-compat-data).

### IndexedDB and localStorage

- Both are per origin. Every torn.com tab in one browser profile sees the
  same data.
- A change to a `localStorage` key fires a `storage` event in other
  same-origin tabs. That gives a change signal with no GM API.
- `ffcache.ts` already handles cross-tab IndexedDB version changes with the
  `blocking` callback.

### Timers in background tabs

- Chrome has three levels (Chrome blog, MDN `setTimeout`):
  - Minimal: visible or recently audible pages. Timers run near their time.
  - Throttling: timers are checked once per second.
  - Intensive (Chrome 88+): the page is hidden for more than 5 minutes,
    the chain count is 5 or more, the page is silent for 30 seconds, and
    WebRTC is off. Timers are then checked once per minute.
- Each `setInterval` run counts toward the chain. A 60 second interval
  reaches chain count 5 after five runs.
- Inference (not stated in the source): under intensive throttling a 60
  second timer fires at the next one-minute check. The real gap is between
  about 60 and 120 seconds.
- Firefox desktop: minimum 1 second timeout in inactive tabs. Firefox for
  Android: minimum 15 minutes, and it can unload the tab (MDN).
- Chrome Energy Saver (Chrome 133+) can freeze a background tab group
  that is hidden and silent for more than 5 minutes and is CPU intensive.
  A frozen tab runs no timers. The Web Lock and IndexedDB exemption above
  applies.
- Safari and WKWebView background timer rules: no primary source found
  (unconfirmed).

### Final report on page unload

- Chrome's Page Lifecycle guide says that `beforeunload`, `pagehide` and
  `unload` sometimes do not fire on tab close or app close. This happens
  mostly on mobile. It names `visibilitychange` to `hidden` as the last state
  change a page can rely on. It advises sending unsent analytics at that
  point.
- `navigator.sendBeacon` and `fetch(..., { keepalive: true })` are the
  browser tools built for this. The script cannot use them for this
  endpoint, because it sends through `GM_xmlhttpRequest` or `PDA_httpPost`
  (issue #40). They also run under Torn's page CSP `connect-src`,
  which this research did not check (unconfirmed).

What happens to a request started during `pagehide`:

- Tampermonkey: its docs say "GM_xmlhttpRequest is dispatched by
  Tampermonkey's background context." What happens on tab close is not
  documented (unconfirmed).
- Violentmonkey: the background aborts every pending request of a tab in
  `clearFrameData`. It calls that from two places. `onTabRemoved` runs on tab
  close. `GetInjected` runs as the next document in the same tab or frame asks
  for its scripts, which happens on every normal page load. So a request sent
  on `pagehide` is aborted as soon as the tab closes or the next page asks for
  its scripts. The abort is on the client side. Whether the server already got
  the POST body depends on timing (unconfirmed).
- Safari Userscripts: the background page makes the XHR. Only an `ABORT`
  message from the content script aborts it. Its port `onDisconnect`
  handler only logs. So the request seems to go on after the tab closes,
  while the background page lives (inferred from source, not tested).
- Torn PDA: `PDA_httpPost` calls the Flutter handler, which runs Dart
  `http.post`. Nothing in the handler ties the request to the page. Page
  unload does not stop a request that is already in Dart (inferred from
  source). For a call made in `pagehide`, it is unconfirmed whether the JS
  bridge call still reaches Dart. The injected `PDA_httpPost` awaits a ready
  promise first.

## Userscript managers

### GM values and change listeners

<!-- markdownlint-disable MD013 -->

| Manager | `GM_setValue` / `GM.setValue` | Value change listener | Storage |
| --- | --- | --- | --- |
| Tampermonkey | Both | `GM_addValueChangeListener`, `GM.addValueChangeListener` | Per script |
| Violentmonkey | Both | `GM_addValueChangeListener` | Per script |
| Greasemonkey 4 | `GM.setValue` only | None | Per script (unconfirmed) |
| Safari Userscripts | `GM.setValue` only | None | `browser.storage.local`, key `<script file>---<key>` |
| Torn PDA | Both | None | Page `localStorage`, value prefix `GMV2_` |

<!-- markdownlint-enable MD013 -->

- Tampermonkey: the listener's `remote` flag says "whether the change
  originated from a different userscript instance". The docs say it "can be
  used by userscripts to communicate with other userscript instances at
  other tabs."
- Violentmonkey: `remote` is true for a change from the script instance in
  another tab. The docs say it "Can be used by scripts of different browser
  tabs to communicate with each other." Values must be JSON serializable.
- GM values are per script. The standard and beta editions are separate
  scripts, so they do not share GM values. They do share origin
  storage.
- Torn PDA GM values are plain page `localStorage`. Torn and every other
  script share that 5 MB space. PDA also offers `PDA_storage`, an async
  per-script SQLite store. It has no change event in its docs.
- To use GM values, the script needs new `@grant` lines.

### Greasemonkey 4 and `GM_xmlhttpRequest`

The Greasemonkey 4 post says "There is only one object provided to user
scripts now, named GM." The Greasespot API page lists only
`GM.xmlHttpRequest`. The script calls `GM_xmlhttpRequest` and grants only
that name. So in Greasemonkey 4 the call is very likely undefined, and the
script cannot reach ffscouter.com at all (inferred, not tested).

## Torn PDA

Torn PDA is a Flutter app. Its browser uses a fork of
`flutter_inappwebview` 6.2.0-beta.3.

### Several tabs run at once

- The browser keeps a list of tabs. Each tab is its own WebView with its
  own UID. Scripts can read `isActiveTab` and `isWebViewVisible` through
  `PDA_getTabState` and the `tornpda:tabState` event
  (`docs/webview/tab-state-handler.md`).
- Android, tab switch: PDA calls `pause()` on the tab it leaves. This maps
  to `WebView.onPause()`. Android docs say this "does not pause
  JavaScript". So background tabs keep running script timers.
- Android, app in background: PDA calls `pauseTimers()`. Android docs say
  it pauses JavaScript timers "for all WebViews". The "Do not pause
  webviews" setting turns this off.
- Android, app in background, tab parking on: PDA loads a blank page in
  each inactive tab and restores the page later. A remote flag and a
  user override control tab parking (`parkBackgroundTabsActive`). Its
  default in code is off.
- iOS: `pauseThisWebview()` does nothing. A code comment says iOS
  `pauseTimers` "will always pause the current webview". So inactive iOS
  tabs are not paused by PDA. WKWebView's own throttling of hidden views
  is unconfirmed.
- The `Only load tabs when used` setting makes PDA destroy the WebView of
  an idle tab. The idle time is a user setting. PDA reloads the tab on its
  next use.
- Whether a PDA tab switch sets `document.visibilityState` to `hidden`
  is unconfirmed.

### Shared storage between tabs

- Android: Android docs say each WebView data directory "can be used by
  only one process". PDA calls no `setDataDirectorySuffix`. So all PDA
  WebViews in the app process share one data directory, and with it one
  `localStorage` and IndexedDB (inferred from docs and source).
- iOS: PDA's code sets no custom `WKWebsiteDataStore`, so WebViews use the
  default persistent store (inferred, unconfirmed).
- Web Locks and BroadcastChannel across separate WebView instances in one
  app: not documented anywhere found. The expected result is that they follow
  the shared storage partition. Nobody tested this (unconfirmed).
- PDA's iOS minimum is 15.0 (`ios/Podfile`). Web Locks and BroadcastChannel
  need Safari 15.4. On iOS 15.0 to 15.3 they are absent.

### `PDA_httpPost` details

- The injected helper drops a second call with the same URL, headers and
  body within 2 seconds. It returns `undefined` for the dropped call
  (`lib/utils/js_snippets/remote_snippets.dart`).
- The Dart handler runs `http.post` with the given headers and body
  (`lib/utils/webview/webview_handlers.dart`).
- PDA's GM layer also routes `GM_xmlhttpRequest` through these handlers
  (`docs/userscripts/gm-compatibility.md`).

## Environment table

<!-- markdownlint-disable MD013 -->

| API | Tampermonkey | Violentmonkey | Greasemonkey 4 | Safari Userscripts | Torn PDA |
| --- | --- | --- | --- | --- | --- |
| Web Locks | Yes, torn.com origin | Yes, torn.com origin | Yes (Firefox 96+), content script origin unconfirmed | Yes (Safari 15.4+), content script origin unconfirmed | Yes in WebView, cross-WebView sharing unconfirmed, absent on iOS below 15.4 |
| BroadcastChannel | Yes | Yes | Yes, content script origin unconfirmed | Yes (Safari 15.4+), content script origin unconfirmed | Yes in WebView, cross-WebView unconfirmed |
| IndexedDB shared across tabs | Yes | Yes | Yes (already used) | Yes (already used) | Yes, shared store inferred |
| GM value change listener | Yes | Yes | No | No | No |
| GM request survives tab close | Unconfirmed | No, aborted | Not usable (`GM_` name missing) | Likely yes (source) | Likely yes once in Dart (source) |

<!-- markdownlint-enable MD013 -->

## Sources

- MDN, Web Locks API:
  <https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API>
- W3C Web Locks spec: <https://w3c.github.io/web-locks/>
- MDN, Broadcast Channel API:
  <https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API>
- MDN, `setTimeout` (delays in inactive tabs):
  <https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout>
- MDN browser-compat-data, `api/LockManager.json` and
  `api/BroadcastChannel.json`:
  <https://github.com/mdn/browser-compat-data/tree/main/api>
- MDN, content scripts:
  <https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts>
- Chrome, `chrome.storage` API ("Content scripts share storage with the host
  page"): <https://developer.chrome.com/docs/extensions/reference/api/storage>
- Chrome blog, timer throttling in Chrome 88:
  <https://developer.chrome.com/blog/timer-throttling-in-chrome-88>
- Chrome, Page Lifecycle API:
  <https://developer.chrome.com/docs/web-platform/page-lifecycle-api>
- Chrome blog, freezing on Energy Saver:
  <https://developer.chrome.com/blog/freezing-on-energy-saver>
- blink-dev, Intent to Ship: Freezing on Energy Saver:
  <https://groups.google.com/a/chromium.org/g/blink-dev/c/OVoSqEhtpNI>
- Tampermonkey docs, GM values and listeners:
  <https://www.tampermonkey.net/documentation.php?locale=en&q=GM_values>
- Tampermonkey docs, `@sandbox`:
  <https://www.tampermonkey.net/documentation.php?locale=en&q=sandbox>
- Tampermonkey docs, `GM_xmlhttpRequest`:
  <https://www.tampermonkey.net/documentation.php?locale=en&q=api:GM_xmlhttpRequest>
- Violentmonkey docs, GM API: <https://violentmonkey.github.io/api/gm/>
- Violentmonkey docs, metadata block:
  <https://violentmonkey.github.io/api/metadata-block/>
- Violentmonkey source, `src/background/utils/requests.js`,
  `preinject-core.js`, `preinject.js`:
  <https://github.com/violentmonkey/violentmonkey/tree/49fa8e897cdd93f4b2b6a56eaf4053f2f37862e3/src/background/utils>
- Greasemonkey manual, API: <https://wiki.greasespot.net/Greasemonkey_Manual:API>
- Greasemonkey 4 for script authors:
  <https://www.greasespot.net/2017/09/greasemonkey-4-for-script-authors.html>
- Safari Userscripts README: <https://github.com/quoid/userscripts>
- Safari Userscripts source, `src/ext/background/main.js` and
  `src/ext/content-scripts/api.js`:
  <https://github.com/quoid/userscripts/tree/8b743e37dd7dfc8a510aff4e5e2ab8b1cc9210df/src/ext>
- Torn PDA repo at `28fdc2b`:
  <https://github.com/Manuito83/torn-pda/tree/28fdc2b8a0ea6e39758ceba8483d4cf4367c4067>
  - `docs/userscripts/gm-compatibility.md`
  - `docs/webview/tab-state-handler.md`, `docs/webview/http-handlers.md`
  - `userscripts/GMforPDA.user.js`, `userscripts/TornPDA_Storage.md`
  - `lib/providers/webview_provider.dart`,
    `lib/widgets/webviews/webview_full.dart`
  - `lib/utils/webview/webview_handlers.dart`,
    `lib/utils/js_snippets/remote_snippets.dart`
  - `ios/Podfile`, `pubspec.yaml`
- Android `WebView` reference (`onPause`, `pauseTimers`,
  `setDataDirectorySuffix`):
  <https://developer.android.com/reference/android/webkit/WebView>
- This repo: `vite.config.ts`, `src/utils/ffcache.ts`,
  `src/utils/storage.ts`, `src/utils/api.ts`, `src/utils/ffscouter.ts`,
  `docs/adr/0001-pda-http-transport.md`
