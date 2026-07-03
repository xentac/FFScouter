# Persist filter collapse via synchronous init, not effect-corrected state

The collapse state of the war and faction [[Filter Box]]es never survived a page refresh — both filters always reopened expanded — in both the Torn PDA webview and desktop Tampermonkey. The state was already persisted to config on toggle and read back on mount, and a jsdom test covered that round-trip, yet the feature was broken in every real browser.

Root cause: `collapsed` was seeded `useState(false)` and corrected in the mount effect (`loadState` calling `setCollapsed`). When the saved state is collapsed, that forces an `open → closed` flip on every mount. Real browsers fire a `toggle` event on *programmatic* `open` changes; **jsdom does not**. `onToggle` writes `!e.currentTarget.open` back to config, so the mount flip's toggle races that write-back and the browser consistently lands on persisting the expanded value. The test stayed green precisely because jsdom never fires the mount toggle — which is also why the bug shipped.

Decision: seed `collapsed` from `ffconfig` in the `useState` initializer (mode is known at first render), so the first committed render already matches the saved state — no flip, no spurious toggle, and no expand-flash on load. `loadState` keeps its `setCollapsed` for the resize / mode-reload path; on initial mount it is now a no-op because the value already matches. As untested defense-in-depth against any future reintroduced flip, `onToggle` also early-returns when the reported collapsed state already equals the current `collapsedRef` (a programmatic change always matches current intent; a user gesture always diverges).

Testability limitation, recorded deliberately: **no jsdom test can reproduce this race** — that is the exact reason it shipped. The existing user-toggle persistence test (`faction-filter-box.test.tsx`) is retained, and the race fix itself is validated by manual verification in a real browser (collapse a filter, refresh, confirm it stays collapsed).

## Considered Options

- **Guard `onToggle` only, no sync-init**: rejected as *the* fix — it neutralizes echo toggles but leaves the mount flip and its expand-flash in place. Kept as secondary defense-in-depth.
- **No-op write guard** (only write when the new value differs from stored config): rejected — insufficient, because a racing toggle can compute a *different* value than what's stored and would still clobber it.
- **Proxy / setter-spy test for the guard** (assert an echo toggle does not invoke the config setter): declined — it exercises the guard's echo-suppression, not the actual race, so it adds maintenance for low signal.
- **User-gesture flag guard** (set a flag on `<summary>` click, check it in `onToggle`): rejected — more moving parts and ordering-dependent, versus the uniform state-compare that covers mouse and keyboard activation identically.
