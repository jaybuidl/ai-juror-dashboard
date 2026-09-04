# Layout and CSS

Silent layout failures. Every one of these renders without an error, a warning or a failing test;
several were visible only in a browser at a stated width.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **`text-overflow: ellipsis` does nothing inside a `1fr` grid track.** A track's minimum is `auto`,
  which is its content's minimum, so the column grows to fit the longest title and the row overflows
  sideways instead of clipping — with nothing in the console. `minmax(0, 1fr)` on the track and
  `min-width: 0` on the item are both required. `DisputeList.tsx` carries them and a test pins the
  computed `grid-template-columns`, because the failure is invisible until someone reads a row.
- **The CSS `font` shorthand resets `font-feature-settings`, and every `--type-*` token is one.**
  `tokens/base.css` puts `font-feature-settings: var(--font-feature-numeric)` (`"tnum" 1`) on `body`
  so digits are tabular page-wide; any element typed through a `--type-*` token silently drops that
  for itself and its descendants. A column of latency figures then stops lining up, with nothing in
  the console. Re-declare `font-feature-settings` after the shorthand on anything holding a figure —
  `theme.featureMono` for mono values, `theme.featureNumeric` for sans. Every numeric element on
  every artboard carries its own, which is the tell.
- **A `position: sticky` element sticks to its nearest *scroll container*, and `overflow: hidden`
  makes one.** Ticket 17's frozen column header needed two unrelated things fixed before it could
  freeze at all, neither of them in the matrix: `Shell.tsx`'s `Ground` wrapped every view in
  `overflow: hidden`, which is a scroll container even where nothing overflows, and the matrix's
  own `overflow-x: auto` box is one in *both* axes — `overflow-y: visible` beside it computes to
  `auto`, per CSS Overflow 3. A sticky header inside either sticks to a box that never scrolls
  vertically, so it simply never freezes: no error, no warning, and nothing a jsdom test can see.
  `Ground` is `overflow: clip` now, which clips identically and is not a scroll container; the
  matrix drops its own box at the compact density and takes a `min-width` instead. Anything sticky
  added here has to walk its ancestors first.
- **An `auto` grid track takes its content's width before a `1fr` sibling gets anything.** The
  compact row was `2.5rem minmax(0, 1fr) auto` — id, title, details — and the title measured
  **zero pixels** on every row in a browser: an id, some pills and no subject. The floor is
  `minmax(7rem, 1fr)` on the track that must survive. It is the same family as the
  `text-overflow: ellipsis` failure `DisputeList.tsx` already carries a comment about, and it fails
  in the same silence.
- **`table-layout: auto` settles a shortfall by crushing whatever can shrink, and a declared
  width is only a suggestion to it.** The third member of the family above, and the most
  expensive so far because it survived three tickets and a review. The matrix declared a 440px
  row header and six 148px columns — 1328px, exactly what `canvas/Main.dc.html` draws — inside a
  page that gives 1104px of content. An auto table does not overflow in that situation and does
  not warn; it finds the compressible column and takes the whole 224px out of it. Six columns of
  identity and figures are incompressible, so the row header rendered at **239px of the 440 it
  declared** and the dispute title inside it at 180px of its natural 836. A 1440px desktop showed
  a fifth of a question the 390pt phone showed whole, and the tell — a clipped title — is exactly
  what a title is *supposed* to look like when it does not fit. jsdom lays nothing out, so no
  offline test could see it; axe does not measure layout, so ticket 18 could not; and the code
  around it had already convinced itself otherwise, because `breakpoints.compactGrid`'s note
  described the compact grid as scrolling in its own box "exactly as the comfortable grid always
  does" when the comfortable grid had no `min-width` and never did. The fix is `table-layout:
  fixed` plus a `min-width` floor per density, so the widths are held and a page too narrow for
  them scrolls the box rather than the record. **Any declared width in this repo needs a browser
  to confirm it was honoured** — `getComputedStyle` reports what was *asked*, and
  `getBoundingClientRect` what was *given*, and the gap between them is silent.
- **A shared styled component sized for its first use is sized wrong for its second.**
  `MeasureKey` is 7px wide because a cell's key is one letter; the row's `MED C` overlapped the
  duration beside it. Fixed through a component selector where the second use is, rather than by
  widening the first.
- **`flex-direction: column-reverse` lays a column out from the bottom, so items stop sharing a
  baseline the moment one of their labels wraps.** The house pattern of a value above its own key
  needs the `dt` first in the markup (a `dd` before its `dt` is invalid), and reversing is the
  obvious way to get it. At 390pt "Median reveal" wraps to two lines where "Coherent" does not, and
  the three numbers beside each other then sit at three different heights — with `order: -1` on the
  value they do not. Invisible to every test, for the reason below.
- **A flex basis on an item is a *height* once that item is rendered inside a column container.**
  `flex: 1 1 380px` on the sparsity note read as a width in the row it was written for and as
  380px of height in the card that later reused it — a three-line paragraph in a box three
  hundred pixels tall. The basis belongs to the arrangement, not to the item: put it on the
  container as `> * { flex: … }`. Carried at `src/performance/Footnotes.tsx`; the incident is in
  [`testing.md`](testing.md) among the defects jsdom cannot see.
- **The breakpoint is one number and it has to stay one.** `styles/breakpoints.ts` exports both the
  `narrow` media prelude and `useIsNarrow`, built from a single `NARROW_QUERY`, because two ways of
  asking one question is how a page ends up rendering the phone's card list under the desktop's
  chrome — broken only in the few pixels between two numbers, with nothing in the console. Ticket
  16 folded the last two strays (`600px` in `MatrixPage.tsx`, `760px` in `DisputePage.tsx`) into
  it. A new `@media` with a literal in it is a regression, not a local decision.
  **Ticket 17 added a second number to that file and it is not a second `narrow`.**
  `breakpoints.compactGrid` (1160px) asks a different question about a different element — whether
  the compact grid's own measurements fit the page — and its value is arithmetic rather than a
  choice: a 440px row header plus one column per agent juror at the ~104px a compact cell needs is
  `COMPACT_GRID_MIN_PX`, which this page's gutters put at that viewport. It was 1064 while the
  roster was six; ticket 24 made it derive from `ROSTER.length`, because a row header share and a
  column share that sum to 100% at six sum to 110% at seven and the browser rescales both in
  silence — the declared-versus-given gap again, one file down. The test for a new
  width is not "is there already one" but "does it answer a question none of these do, and is its
  value derived from something". Both live in `breakpoints.ts` because that is still the one place
  a width anything reduces at is written down.
- **Deciding whether to clip and then clipping never clips.** `useIsClipped` measured
  `scrollHeight > clientHeight` to decide whether to apply a `max-height` — and at the moment of
  the test nothing had bounded the element, so the two were always equal and the answer was always
  "it fits". The cap has to be applied *unconditionally* while collapsed, with the measurement
  reporting whether the content exceeded it. Nothing failed and no test caught it: every offline
  test runs in jsdom, where every height is zero and every branch of this is unreachable. It was
  visible only in a browser, on dispute 154, whose 7,079-character justification ran five thousand
  pixels down the page and stretched every column beside it. Any measure-then-constrain layout in
  this repo has the same shape.
- **An interpolation inside a CSS comment is still evaluated, exactly as a backtick there still
  closes the template.** The sibling of the trap below and found the same way — by writing a
  careful comment. `/* this read "outline: ${theme.focusRing}" */` inside a `styled.x` block is
  not a comment as far as the template literal is concerned: `${theme...}` is interpolated, and
  where the comment sits at module scope rather than inside the tagged template's own scope the
  error is `theme is not defined` at import time, taking down every test file that reaches the
  module. Name the token in prose (`theme.focusRing`) rather than quoting the code.
- **A backtick inside a CSS comment ends the styled-components template.** This repo's house style
  puts long prose comments inside `styled.x\`…\`` blocks, and the moment one of them quotes an
  identifier the way the rest of the codebase does — around a filename, say — the template literal
  closes there and the file fails to parse somewhere further down, with an error pointing at the
  wrong line. Write those comments without backticks.
