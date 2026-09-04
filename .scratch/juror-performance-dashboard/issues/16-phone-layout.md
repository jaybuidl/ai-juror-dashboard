---
status: done
blocked_by: ["05", "07", "09", "12", "15"]
---

# 16: Fold the matrix into one card per dispute on a phone

**What to build:** A visitor opening the dashboard from a phone reads the same record a desktop
visitor reads, laid out as one card per dispute instead of as a matrix.

This is not a narrower matrix. Below the breakpoint the grid is gone: each dispute becomes a card,
and the six agent jurors become a strip of six fixed slots along that card's foot. A grid that
scrolled sideways instead would satisfy any loosely worded criterion about working on a phone while
destroying the thing the matrix exists for, so the criteria below pin the transposition rather than
the outcome.

What has to survive that transposition is the matrix's central property: a column means one agent
juror. `Mobile.dc.html:129` states the rule that carries it over — column position is still the agent
juror, on every card — and it only holds if the strip is always six slots, always in roster order,
always the same width, and always aligned from card to card. An agent juror not drawn in a dispute
keeps its position and collapses to the same single dot the desktop cell uses, so absence still reads
as absence and never as a failure to act. That is the distinction ticket 05 exists to protect, and it
has to hold at 390pt as well.

A finalised card's face carries one latency, and it is the reveal; a live card shows the commit,
because no reveal exists yet. The vote-ID count and the two logarithmic rails leave the face
altogether and are reached by tapping the card. Dropping the commit
series is a move this design has already made once: ADR-0005 records `canvas/Juror.dc.html:108`
excluding commit latency from the agent juror's latency profile outright, because dispute 151's
8-hour commit window makes it the least comparable figure on the page. Ticket 07 still owns commit
latency, keeps it in the desktop cell, and keeps it behind this layout's tap target. The rails cost
nothing to drop, because ticket 07 already treats them as decoration whose every value is printed as
a number beside them.

The hero drops the deck paragraph and the latency strip, and neither drop costs a measured fact: the
strip's headline figure is promoted into the stat tiles, its comparison band is illustrative by its
own caption, and the deck's read-only claim survives in the nav label. The caveats are the opposite
case. There is no legend, no footnote block and no provenance footer anywhere on the phone artboard,
and `CLAUDE.md` requires caveats to be visible in the UI rather than merely handled correctly in
code. Two of them arrive anyway: ticket 15 ends every view with the same provenance footer, so the
footer travels with the chrome, and ticket 06's `†` and `‡` markers ride the aggregates themselves,
so they travel to the tiles. The legend that decodes the state glyphs and the note that sparsity is
normal are the two with no home here at all — ticket 05 places both on the desktop matrix, and the
matrix is the thing this layout removes. The artboard does not answer how they reach a phone reader.
Closing that is this ticket's open question, and the one place where following the artboard exactly
would be wrong.

Where this meets ticket 17. That ticket compacts the matrix past roughly forty rows; this one
replaces the matrix outright below a phone breakpoint. They are two reduction paths rather than one
applied twice, so a phone shows cards at any row count and never the compact grid. What neither
ticket answers is what a stack of several hundred cards should do — the canvas draws four. That is
left open here deliberately, and is worth settling before the record grows long enough to matter.

**Design:** `../canvas/Mobile.dc.html` (the whole 390pt artboard — the collapsed nav at `:32-42`,
what the hero keeps at `:44-52`, the live card at `:63-78`, a finalised card and the six-slot strip
along its foot at `:81-95`, and the rule the layout rests on at `:129`), `../canvas/README.md` for
provenance

- [x] Below one declared breakpoint the matrix is not rendered at all — not scaled down, not scrolled
      sideways, not wrapped and not transposed into a narrower grid. One card per dispute replaces it,
      newest first, in the same model order the matrix rows use, and nothing on the page scrolls
      horizontally at 390pt
- [x] That breakpoint is declared once and reused, rather than chosen again per component.
      `src/Dashboard.tsx` already carries `@media (max-width: 600px)` rules, and this ticket adds no
      second, unrelated breakpoint
- [x] Every card carries a strip of six slots along its foot, one per member of the roster, always six
      of them and always in roster order, whether or not that agent juror was drawn in that dispute
- [x] Column position is still the agent juror: the nth slot is the same agent juror on every card, so
      one agent juror can be scanned down the page the way a matrix column is scanned. Nothing sorts,
      compacts, reorders or omits a slot, and a dispute with a panel of one still shows six
- [x] Slot width is fixed and the gaps between slots absorb the remaining width, so slots align
      vertically from card to card whatever height the cards take, and all six fit on one line at 390pt
      without wrapping, without scrolling and without the slots shrinking
- [x] A slot for an agent juror not drawn in that dispute renders as the same single dot the desktop
      cell uses, in that agent juror's fixed position: no avatar, no glyph, no figure, no fill, no
      border
- [x] A drawn slot carries that agent juror's avatar, the state glyph and one latency figure, and
      nothing else
- [x] All five cell states of ticket 05 are renderable at 390pt, each keeping the glyph and the accent
      ADR-0006 assigns it — including `NO VOTE`, which has no example on this artboard and none in the
      data, and whose figure reads as missed rather than as a number
- [x] `NO VOTE` and not drawn stay as far apart at 390pt as they are in the desktop cell — the loudest
      slot on the card against a bare dot — sharing no glyph, no avatar, no fill and no border
- [x] The word naming each state does not fit a slot and is not on its face. It survives in the slot's
      accessible name, so no state rests on hue alone: ADR-0006's greyscale test is met by the glyph,
      and the word stays reachable
- [x] A slot shows one figure, and it is the latency of the most recent thing that draw did — the
      reveal latency once the draw has revealed, and on a live card, where no reveal exists yet, the
      commit latency of a draw that has committed. A draw that has not committed yet shows a dash in
      pending ink where the figure goes, never a blank, since a blank position means not drawn
- [x] Commit latency is off the face of a finalised card, along with the vote-ID count that annotates a
      desktop cell and the two logarithmic rails. The card is the tap target rather than the slot, and
      it opens that dispute's own view, which is where both latencies and the published justifications
      live — see ticket 09
- [x] The nav collapses onto one line: the Kleros ×AI lockup becomes a wordmark, and the section links
      fold behind a single menu affordance rather than being dropped
- [x] The read-only label survives the collapse. That this page never votes, stakes or holds a key is a
      `CLAUDE.md` invariant, and the label is not the element that gives way for width
- [x] The headline is the same sentence as the desktop hero at a smaller size, never a shortened or a
      different one
- [x] The eyebrow keeps the court number and the chain and drops the court's name — the number and the
      chain locate the data, and the name is the one segment a reader can lose without losing the scope
- [x] The deck paragraph and the latency strip are both absent below the breakpoint, and no measured
      figure leaves the page with them
- [x] Three stat tiles, not four. The median reveal latency leads, in the accent ink the desktop gives
      it, because a phone reader gets one glance and that is the page's headline measure; the size of
      the record follows it, draws before disputes
- [x] The tile that gives way is the count of the roster that has been drawn. It is a fact about the
      roster rather than about the record, and the roster and the agent juror views carry it in more
      detail than a tile can
- [x] The draws tile drops the vote count from its label. The draw is the unit either way, and the vote
      count is context the desktop has the width for
- [x] Every figure in the tiles is read from the model. No dispute count, draw count or latency is
      written into the phone layout as a literal — disputes arrive continually, and a hard-coded total
      would rot
- [x] Each card heads with the core dispute ID, then the dispute's category, its ruling and its panel
      size on the same line in label ink, with the title on its own line below. Panel size is on every
      card, as it is on every desktop row, and no slot repeats it
- [x] The title wraps to as many lines as it needs instead of truncating to one, so cards differ in
      height. This is a deliberate departure from ticket 04, whose rule that a title truncates keeps
      every desktop row one height
- [x] A card carries at most one flag pill, in one slot and with the precedence the desktop row uses —
      window, then lone panel, then live
- [x] The live card is marked as a whole, by its own border and tint, rather than by marking each of
      its slots, and carries a live pill naming the period it is in and how long it has been in it
- [x] On a live card the metadata line moves below the title, because the live pill takes the space it
      occupies on a finalised card: the order is ID and pill, then title, then metadata. A dispute with
      no ruling yet reads as pending where the ruling sits, never as a blank
- [x] An agent juror drawn and awaiting its commit renders with a dashed avatar box. Ticket 13 draws an
      unresolved ENS avatar dashed too, so the two must stay distinguishable at 390pt — one is a cell
      state and the other is a lookup that failed
- [x] A phone reader reaches every caveat a desktop reader reaches: what the state glyphs mean, that a
      blank position is the normal state of a sparse matrix rather than missing data, the dispute-151
      commit-window caveat, the lone-panel caveat, and the read-only provenance the desktop footer
      carries
- [x] The two with no home on this artboard — the legend and the sparsity note, both of which ticket 05
      places on the matrix itself — reach the phone reader by one mechanism chosen once, used for both,
      and recorded on this ticket when it is chosen. The artboard does not answer the question, so the
      implementer closes it rather than following the artboard
- [x] The control row above the first card holds the ordering and filtering affordances and does not
      wrap. No earlier ticket builds either — ticket 03 fixes newest-first as a property of the model
      rather than a control — so this ticket either builds them here or shows no control row at all

## From ticket 15: the breakpoint now has one home, and it is not 600px

`src/styles/breakpoints.ts` is that home. It exports `breakpoints.narrow` (`720px`) and a `narrow`
media prelude used as `${narrow} { … }` inside a styled template. The chrome — nav, hero, stat
tiles, view padding, the lockup — reduces there and nowhere else, and this ticket's criterion about
declaring the breakpoint once is what the file exists for. **Move the number here rather than
picking a second one**, and if 390pt needs a different value, change it here and check the chrome
at the same time.

The `@media (max-width: 600px)` rules the criterion attributes to `src/Dashboard.tsx` are now in
`src/pages/MatrixPage.tsx` (the caveat card's padding) and in `DisputeList.tsx` and `Matrix.tsx`.
They pre-date `breakpoints.ts` and were deliberately left alone by ticket 15, which owned only the
chrome — so this ticket inherits two literals and one token, and reconciling them is part of its
job.

What ticket 15 built at narrow width is **legible, not final**, exactly as its criterion allowed:
the nav stacks the lockup over a wrapped destination row with the read-only pill beneath, the four
stat tiles wrap two-up, and the hero drops to body type. Verified in system Chrome at 390×844 —
nothing overflows horizontally and the full-page capture is exactly 390px wide. Which tiles survive,
in what order, and what the folded nav actually becomes are this ticket's calls, and none of them
were made.

`Mobile.dc.html` shows three tiles, not four, and in a different order — median reveal first. That
is the artboard, and the canvas wins.

## From ticket 09: the widest view on the dashboard now exists, and it has not been on a phone

`/disputes/:disputeId` renders up to six columns of prose side by side. It is built to wrap —
`grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr))`, the header and the ruling
card stack at `narrow`, and the timeline strip drops to two columns at 760px — but it was verified
at 1280px in Chrome and **not on a phone**. Treat the wrapping as intent rather than as evidence.

Three things on it that a narrow pass has to look at specifically:

- **The justification body is capped at 612px and clipped**, with a fade and a "Read all" control
  that appears only when the content actually overflows. That measurement is live: a narrower
  column is a taller one, so what clips changes with the viewport. It is re-measured on resize
  through a `ResizeObserver`, which is the part most likely to be wrong on a phone.
- **A GFM table inside a justification scrolls inside its own box** rather than widening the
  column. Dispute 154 holds a real one. `pre` does the same.
- **The column footer** puts the character count and the format at opposite ends of a flex row; at
  260px with a draw holding several vote IDs there are three things competing for that line.

## The open question, closed: the legend and the sparsity note reach a phone inline

The mechanism is **rendered inline at the head of the card list, always visible, never behind a
control or a link**, and it is used for both. `Legend.tsx` holds the state legend and
`Footnotes.tsx` the sparsity note; the matrix and the card list are two callers of each, so the
wording cannot fork.

Two alternatives were weighed and rejected.

- **Behind a disclosure.** The obvious phone answer, and wrong for the sparsity note specifically:
  it prevents a *misreading* rather than answering a question a reader knows they have. Somebody
  who has not been told that a blank slot means "not drawn" reads it as an agent juror that failed
  to act, and does not go looking for a control to correct them. `CLAUDE.md` requires caveats
  visible in the UI rather than merely handled correctly in code, and a closed panel is the second
  of those.
- **Moved to `/method` with a link.** Same objection, one navigation further away.

It sits at the **head** of the list rather than at its foot, which is the one place this departs
from the desktop. The desktop puts the sparsity note under the grid, where a reader arrives having
seen the whole thing; a phone reader scrolling a stack of thirty-one cards may never reach the
foot. The window and lone-panel footnotes stay at the foot on both, because those qualify figures
rather than teach a layout.

## What landed

**One breakpoint, and it moved nowhere.** `styles/breakpoints.ts` keeps `narrow: 720px` — the
matrix was already scrolling sideways in its own box at that width, so the card list takes over
exactly where the desktop grid stopped fitting. The two literals this ticket inherited are gone:
`600px` in `MatrixPage.tsx` and `760px` in `DisputePage.tsx` are both `${narrow}` now. The file
also gained `useIsNarrow`, because three of these criteria are not CSS questions — the matrix must
not be *rendered*, an SVG viewBox is an attribute, and a disclosure button has to exist and take
focus.

**`DisputeCards.tsx`** is the layout: one card per dispute, six fixed 52px slots along its foot,
gaps absorbing the rest. It shares everything that carries meaning with the matrix rather than
restating it — `cell.ts` for the states, `row-flags.ts` for the flag precedence, `Legend.tsx` and
`Footnotes.tsx` for the caveats — so a reader cannot be told different things about one court by
holding a different device. Three extractions made that possible, and each is a thing the matrix
had been keeping to itself.

**Three aggregates moved below the seam.** `CourtTotals.sparsity` is new: the blank count, the
position count and the empty-column count, over the rows that were read. They were reduced inside
`Matrix.tsx` while it rendered, which was survivable with one caller and is exactly the "two
chances to disagree" `CLAUDE.md` warns about with two.

**The chrome folds.** The nav is one line — the lockup drops its diamond and keeps the official
wordmark paths (cropped viewBox, nothing redrawn in type), the four destinations go behind a
disclosure that closes on navigation, and the read-only label stays in the bar because it is what
the hero's dropped deck falls back to. Three tiles, median reveal leading. The deck and the
latency strip are absent, and no measured figure leaves with them.

## What it cost to find, and none of it was findable in jsdom

- **A `ul` has 40px of UA padding and this repo has no reset for it.** The card stack was indented
  40px and overflowed the viewport by 40px to the right — the one thing this layout must never do.
  Every test passed.
- **`flex: 1 1 380px` in a *column* container is a height.** `SparsityNote` carried the flex basis
  the footnote row wanted; rendered alone on the phone it became a three-line paragraph in a card
  three hundred pixels taller than itself. The basis now lives on the `Footnotes` container as
  `> * { flex: … }`, which is where it always belonged.
- **A stretched `span` draws its underline across the panel.** The current destination is marked by
  a rule under the word, which is right in a flex *row* and wrong in the folded menu's column.
- **jsdom implements no `matchMedia` at all** — `undefined`, not a stub answering false. So
  `useIsNarrow` guards the read the way `useIsClipped` guards `ResizeObserver`, every pre-existing
  test kept rendering the desktop form untouched, and a test of the folded form says so with
  `src/test/viewport.ts`.

Verified in system Chrome at 390×844 and at iPhone 16's 393pt: no horizontal scroll anywhere, six
slots on one line with no wrapping and no shrinking, slots aligned card to card, and the wordmark
crop clipping no letter.

## What review found, and the shape most of it shared

Seven findings against 619 passing tests, and five of them were one fault wearing different
clothes: **a sentence transcribed from the desktop that is false on the phone.** The layouts share
their model, their vocabulary and their caveats by construction — and the prose *around* them was
copied by hand, which is exactly where the two were free to drift.

- **The provenance footer named the latency strip's comparison band** on a page that no longer has
  a strip. The comment beside the strip's removal even claimed the caveat went with it. It did
  not; `provenanceOf` now takes the flag.
- **The caveat card said "Each column header summarises…"** and "a blank *cell*", on a layout with
  no columns and no cells — while `SparsityNote` two hundred lines away had been carefully
  parameterised to say "slot". The stale-read notice said "this matrix" for the same reason.
- **The commit-shortfall notice said those slots read "Not read"**, which they almost never do: a
  slot shows the commit only while a reveal is still ahead, and this court's unresolved logs sit
  mostly in finalised disputes. It sent a reader hunting for a string that is not on the page, and
  left the shortfall itself unstated on this layout. It now names where the affected figures are.

The two that were not prose:

- **The folded menu reopened by itself.** State keyed on the path the menu was open *for* is state
  that never stops matching once you come back to that path: open at `/`, go to `/method`, tap the
  wordmark, and the panel is open over the page just asked for. Back did the same. It watches the
  path *changing* now, via React's adjust-during-render pattern, and there is a test for the
  return trip — the forward-navigation test could never have caught it.
- **Below about 352pt the sixth agent juror vanished.** Six 52px slots need 312px; the card clips
  its own overflow to keep its corners, so at 320pt the sixth slot was silently *gone* rather than
  scrolled — breaking the one property this file calls non-negotiable, with nothing in the
  console. `SLOT_WIDTH` now carries a floor, so from 352pt up it is a flat 52px and below it every
  slot narrows in unison. Verified at 320pt in Chrome.

And one comment that lied: `narrowList()` said "made once" and allocated a `MediaQueryList` per
render, subscribing its listener to a different object from the one `matches` was read from. It is
cached now, keyed on the accessor it was built from so a stubbed `matchMedia` still takes effect.

## Left for other tickets

- **No control row.** The criterion allowed either building the ordering and filtering affordances
  or showing no row at all, and nothing in the model supports either — ordering is a property of
  the model (ticket 03) and filtering does not exist. What the artboard's control row states
  rather than controls — "Newest first", and the finalised/live count — is kept, as a caption.
- **A stack of several hundred cards** is still unanswered, as the ticket says. The canvas draws
  four; the court holds thirty-one today. It is ticket 17's question in the other layout.
- **9.5px slot figures.** The artboard's size, and the smallest type on the dashboard. Nothing
  rests on reading it alone — the glyph carries the state and the dispute's own view carries both
  latencies — but ticket 18 owns the type scale and this is one of the figures it will weigh.
- **`/disputes/:disputeId` was checked on a phone** while this was open, which is what ticket 09
  left. All three of its flagged concerns hold at 390pt: the columns stack, the clipping
  measurement still fires, the GFM table scrolls in its own box and the column footer fits. No
  change was needed.

