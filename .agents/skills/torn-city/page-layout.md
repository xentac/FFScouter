# torn.com page layout — the three fixed widths

Measured 2026-09-28 on `/factions.php` (logged in, Chrome, dark mode) by
the user running a read-only console snippet at six window widths. Raw
output is in `snapshots/torn-city/2026-09-28/` in the source repo. One page
was measured; other pages share the same outer containers but verify before
relying on these numbers for a page with unusual structure.

## The three layouts

Torn's main content column is **fixed-width, not fluid** — it snaps between
two widths rather than scaling with the window, and the sidebar moves out
from beside it on narrower screens.

| Layout  | Viewport (`innerWidth`) | `#mainContainer`    | `.content-wrapper` | `#sidebarroot`                                     |
| ------- | ----------------------- | ------------------- | ------------------ | -------------------------------------------------- |
| Desktop | > 1000px                | 976px, centred      | 784px              | Beside the content, in the 192px to its left       |
| Tablet  | 785–1000px              | Full viewport width | 784px, centred     | Spans the full container width, not beside content |
| Mobile  | ≤ 784px                 | Full viewport width | 386px, centred     | Spans the full container width, not beside content |

So the three widths to design against are **976** (desktop container),
**784** (content column on desktop and tablet), and **386** (content column
on mobile).

Measured points behind the table:

| `innerWidth` | `#mainContainer` | `.content-wrapper` | Content left offset  |
| ------------ | ---------------- | ------------------ | -------------------- |
| 1536         | 976              | 784                | 192 inside container |
| 920          | 906              | 784                | 61 (centred)         |
| 767          | 753              | 386                | 183 (centred)        |
| 613          | 599              | 386                | 106 (centred)        |
| 459          | 445              | 386                | 30 (centred)         |
| 454          | 441              | 386                | 27 (centred)         |

## Things that will trip up a userscript

- **The content column does not grow to fill the screen.** At a 767px
  viewport the content is still only 386px wide with ~183px of empty margin
  either side. Anything injected into `.content-wrapper` has 784px or 386px
  to work with and nothing in between.
- **Body classes don't tell you the layout.** `body` was
  `d body r regular with-sidebar dark-mode` at every width measured,
  including mobile. Detect the layout with `matchMedia` or by reading
  `.content-wrapper`'s width, not by class.
- **Breakpoints evaluate against `innerWidth`, which includes the
  scrollbar.** At `innerWidth` 613 / `clientWidth` 599, `(max-width: 600px)`
  did not match. Use `matchMedia('(max-width: 784px)')` rather than
  comparing `clientWidth` yourself.
- **The sidebar is still in the DOM on tablet and mobile.** `#sidebarroot`
  stays `display: block` and spans the container width; it just no longer
  sits beside the content. How it renders there (collapsed bar, drawer) was
  not measured.

## Breakpoints in Torn's CSS

Counted from the media rules in the stylesheets loaded on the page (number
of style rules inside each condition):

| Condition           | Rules | Effect on layout                                     |
| ------------------- | ----- | ---------------------------------------------------- |
| `max-width: 784px`  | 564   | Content column 784 → 386                             |
| `max-width: 1000px` | 473   | Container goes full width, sidebar leaves the side   |
| `max-width: 386px`  | 300   | **Not measured** — narrowest run was 454px           |
| `max-width: 600px`  | 260   | No change to container or content width (459 vs 613) |

Everything else (`976`, `578`, `805`, `768`, a few `em` values) had ten
rules or fewer. Match Torn's own thresholds — `1000` and `784` — in any
injected CSS so custom UI switches at the same moment the page does. The
`600` rules restyle components without changing the column width. Below
386px the content column can no longer fit at its fixed width, so expect a
fourth behaviour there, but it's unverified.

## Re-measuring

Never measure this with browser automation — see the AI agents section of
`rules-and-compliance.md`. Give the user this snippet to paste into the
DevTools console on a Torn page they've loaded themselves, once per window
width. It reads the current page only and makes no requests.

```js
(() => {
  const m = (el) => {
    const r = el.getBoundingClientRect();
    const cls = typeof el.className === 'string' && el.className.trim()
      ? '.' + el.className.trim().split(/\s+/).join('.') : '';
    return { el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls,
             w: Math.round(r.width), x: Math.round(r.left),
             display: getComputedStyle(el).display };
  };
  const main = document.querySelector('#mainContainer');
  const out = {
    path: location.pathname,
    innerWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyClass: document.body.className,
    matches: Object.fromEntries([1000, 784, 600, 386].map(
      (w) => [w, matchMedia(`(max-width: ${w}px)`).matches])),
    mainContainer: main && m(main),
    children: main
      ? [...main.children].filter((c) => !/^(SCRIPT|STYLE|LINK)$/.test(c.tagName)).map(m)
      : [],
  };
  const json = JSON.stringify(out, null, 1);
  console.log(json);
  try { copy(json); } catch (e) {}
})();
```

Chrome won't shrink a window much below ~450px; docking DevTools to the
side and dragging the divider gets the page narrower.
