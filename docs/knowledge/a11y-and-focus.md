# Accessibility, naming and focus

What a clean axe run does not cover, how accessible names are actually computed here, and the two
focus-ordering rules.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **A green axe run is not an accessibility sweep, and no test here can measure a hit area.**
  Clicking a dispute row did nothing, and it was a reader who said so rather than the suite. The
  ID was the only link: 40x21px inside an 1104x80px row — one per cent of its area, under the 24px
  WCAG 2.5.8 asks for — with the title beside it inert text, so the row read as the way in
  everywhere except the forty pixels where it was. It shipped **through** ticket 18, whose axe
  audit returned zero violations on seven routes, because **axe does not check target size at
  all**; and no offline test could have caught it either, because jsdom lays nothing out and a hit
  area is a layout. Two rules come out of it. The first is ticket 16's, one level further on: the
  phone's card had the right target the whole time (`CardLink::after` at `inset: 0` over a
  positioned `Card`) and the desktop row never got it, so **two renderings of one record fork in
  the affordance as readily as in the prose** — and the fork the automated tool cannot see is the
  one that survives eighteen tickets. The second is about what a clean tool run licenses you to
  claim: an audit's silence covers what it tests, and naming the criteria it does *not* test is
  part of reporting it. The fix, for anything else that needs one, is the stretched pseudo-element
  rather than a second link — it adds no element, no second accessible name and no second tab
  stop, and inside the matrix it scopes itself, because `DisputeRow` renders into `RowHeaderCell`
  and the overlay stops at that cell. Its one load-bearing half is `position: relative` on the
  row, and that half fails *without a bound*: an absolutely positioned box with no positioned
  ancestor resolves against the initial containing block, so dropping the line does not shrink the
  target back to the digits but spreads one dispute's link across the viewport. A test pins the
  declaration; the area still needs a browser.
- **A `<caption>` that is `position: absolute` can stop naming its table.** The house
  `VisuallyHidden` is absolutely positioned, and `as="caption"` computes the element away from
  `table-caption` display; several browser and screen-reader pairs then drop it from the table's
  accessible name, so the element added to name the grid does nothing. `dom-accessibility-api`
  computes the name from the element either way, so no jsdom test can see it. Use a real
  `<caption>` with a `VisuallyHidden` *inside* it.
- **`outline: none` does not suppress this repo's focus ring.** The design system's ring is
  `outline: none` plus a `--ring-focus` **box-shadow**, so a component writing `outline: none` to
  stop a ring being drawn suppresses nothing at all. It matters wherever a container takes
  programmatic focus — Chrome matches `:focus-visible` on a scripted focus when the last
  interaction was a keyboard one, so `<main>` taking focus on a route change would have drawn a
  2px halo round the whole view. Suppress `box-shadow`, and do it on `:focus-visible`.
- **`title` is never the sole carrier of a fact.** It needs a pointer hovering the element, so a
  keyboard reader cannot reach it, a touch reader cannot reach it, and screen readers disagree
  about whether to announce it at all. Ticket 18 found three — `DisputePanel`'s `R`/`C` measure
  keys, whose phrases existed nowhere else, and the full agent juror address on
  `AgentJurorPage` — and the pattern that replaces it is the one the matrix already used:
  `aria-hidden` on the abbreviation, `VisuallyHidden` beside it with the words. A `title` that
  *duplicates* text already in the DOM is fine and the dispute row's is exactly that.
- **Accessible-name computation normalises the whitespace out from between adjacent nodes.**
  Two elements side by side in a grid track with a `column-gap` contribute their text with
  nothing between it: the matrix's row header announced as `"151x402 escrow dispute"` and its
  second line as `"EscrowRuling 1Panel 2"`, invisibly, because the gap is layout and the visible
  separator is a `·` that is `aria-hidden` (spoken as "middle dot" otherwise). The fix is a
  `VisuallyHidden` comma between them — and note that its trailing *space* is trimmed too, so
  the name reads `"151,x402…"`. That is enough, because a comma is a pause to a speech
  synthesiser, but an assertion written against `"151, x402"` will fail. The phone's six slot
  labels had the same defect for the same reason.
- **An inline `components` object for `ReactMarkdown` remounts every node it maps, on every
  render.** A new function identity for `a` is a new component *type* to React, so every anchor
  in a justification was unmounted and rebuilt whenever anything in `Justification` rendered —
  a state change, a parent re-render, ticket 12's five-second poll. Nothing looks wrong, because
  the links are rebuilt identically. It surfaces only when something holds a reference to one:
  ticket 18's interstitial could not hand focus back to the link it interrupted because the ref
  pointed at a detached node. Hoist the map and the plugin array to module scope.
- **Restoring focus has to happen after the thing holding focus is gone.** Calling `.focus()` on
  the element you want in the same handler that unmounts the currently-focused one leaves the
  document falling back to `<body>`: the unmount happens second and takes the focus with it. Do
  it in an effect keyed on the state that closed the panel, so the two orderings cannot be got
  the wrong way round. Ticket 18 hit this on the justification interstitial and again on the
  folded nav's Escape.
