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

**Blocked by:** 05, 07, 09, 12, 15

**Design:** `../canvas/Mobile.dc.html` (the whole 390pt artboard — the collapsed nav at `:32-42`,
what the hero keeps at `:44-52`, the live card at `:63-78`, a finalised card and the six-slot strip
along its foot at `:81-95`, and the rule the layout rests on at `:129`), `../canvas/README.md` for
provenance

**Status:** ready-for-agent

- [ ] Below one declared breakpoint the matrix is not rendered at all — not scaled down, not scrolled
      sideways, not wrapped and not transposed into a narrower grid. One card per dispute replaces it,
      newest first, in the same model order the matrix rows use, and nothing on the page scrolls
      horizontally at 390pt
- [ ] That breakpoint is declared once and reused, rather than chosen again per component.
      `src/Dashboard.tsx` already carries `@media (max-width: 600px)` rules, and this ticket adds no
      second, unrelated breakpoint
- [ ] Every card carries a strip of six slots along its foot, one per member of the roster, always six
      of them and always in roster order, whether or not that agent juror was drawn in that dispute
- [ ] Column position is still the agent juror: the nth slot is the same agent juror on every card, so
      one agent juror can be scanned down the page the way a matrix column is scanned. Nothing sorts,
      compacts, reorders or omits a slot, and a dispute with a panel of one still shows six
- [ ] Slot width is fixed and the gaps between slots absorb the remaining width, so slots align
      vertically from card to card whatever height the cards take, and all six fit on one line at 390pt
      without wrapping, without scrolling and without the slots shrinking
- [ ] A slot for an agent juror not drawn in that dispute renders as the same single dot the desktop
      cell uses, in that agent juror's fixed position: no avatar, no glyph, no figure, no fill, no
      border
- [ ] A drawn slot carries that agent juror's avatar, the state glyph and one latency figure, and
      nothing else
- [ ] All five cell states of ticket 05 are renderable at 390pt, each keeping the glyph and the accent
      ADR-0006 assigns it — including `NO VOTE`, which has no example on this artboard and none in the
      data, and whose figure reads as missed rather than as a number
- [ ] `NO VOTE` and not drawn stay as far apart at 390pt as they are in the desktop cell — the loudest
      slot on the card against a bare dot — sharing no glyph, no avatar, no fill and no border
- [ ] The word naming each state does not fit a slot and is not on its face. It survives in the slot's
      accessible name, so no state rests on hue alone: ADR-0006's greyscale test is met by the glyph,
      and the word stays reachable
- [ ] A slot shows one figure, and it is the latency of the most recent thing that draw did — the
      reveal latency once the draw has revealed, and on a live card, where no reveal exists yet, the
      commit latency of a draw that has committed. A draw that has not committed yet shows a dash in
      pending ink where the figure goes, never a blank, since a blank position means not drawn
- [ ] Commit latency is off the face of a finalised card, along with the vote-ID count that annotates a
      desktop cell and the two logarithmic rails. The card is the tap target rather than the slot, and
      it opens that dispute's own view, which is where both latencies and the published justifications
      live — see ticket 09
- [ ] The nav collapses onto one line: the Kleros ×AI lockup becomes a wordmark, and the section links
      fold behind a single menu affordance rather than being dropped
- [ ] The read-only label survives the collapse. That this page never votes, stakes or holds a key is a
      `CLAUDE.md` invariant, and the label is not the element that gives way for width
- [ ] The headline is the same sentence as the desktop hero at a smaller size, never a shortened or a
      different one
- [ ] The eyebrow keeps the court number and the chain and drops the court's name — the number and the
      chain locate the data, and the name is the one segment a reader can lose without losing the scope
- [ ] The deck paragraph and the latency strip are both absent below the breakpoint, and no measured
      figure leaves the page with them
- [ ] Three stat tiles, not four. The median reveal latency leads, in the accent ink the desktop gives
      it, because a phone reader gets one glance and that is the page's headline measure; the size of
      the record follows it, draws before disputes
- [ ] The tile that gives way is the count of the roster that has been drawn. It is a fact about the
      roster rather than about the record, and the roster and the agent juror views carry it in more
      detail than a tile can
- [ ] The draws tile drops the vote count from its label. The draw is the unit either way, and the vote
      count is context the desktop has the width for
- [ ] Every figure in the tiles is read from the model. No dispute count, draw count or latency is
      written into the phone layout as a literal — disputes arrive continually, and a hard-coded total
      would rot
- [ ] Each card heads with the core dispute ID, then the dispute's category, its ruling and its panel
      size on the same line in label ink, with the title on its own line below. Panel size is on every
      card, as it is on every desktop row, and no slot repeats it
- [ ] The title wraps to as many lines as it needs instead of truncating to one, so cards differ in
      height. This is a deliberate departure from ticket 04, whose rule that a title truncates keeps
      every desktop row one height
- [ ] A card carries at most one flag pill, in one slot and with the precedence the desktop row uses —
      window, then lone panel, then live
- [ ] The live card is marked as a whole, by its own border and tint, rather than by marking each of
      its slots, and carries a live pill naming the period it is in and how long it has been in it
- [ ] On a live card the metadata line moves below the title, because the live pill takes the space it
      occupies on a finalised card: the order is ID and pill, then title, then metadata. A dispute with
      no ruling yet reads as pending where the ruling sits, never as a blank
- [ ] An agent juror drawn and awaiting its commit renders with a dashed avatar box. Ticket 13 draws an
      unresolved ENS avatar dashed too, so the two must stay distinguishable at 390pt — one is a cell
      state and the other is a lookup that failed
- [ ] A phone reader reaches every caveat a desktop reader reaches: what the state glyphs mean, that a
      blank position is the normal state of a sparse matrix rather than missing data, the dispute-151
      commit-window caveat, the lone-panel caveat, and the read-only provenance the desktop footer
      carries
- [ ] The two with no home on this artboard — the legend and the sparsity note, both of which ticket 05
      places on the matrix itself — reach the phone reader by one mechanism chosen once, used for both,
      and recorded on this ticket when it is chosen. The artboard does not answer the question, so the
      implementer closes it rather than following the artboard
- [ ] The control row above the first card holds the ordering and filtering affordances and does not
      wrap. No earlier ticket builds either — ticket 03 fixes newest-first as a property of the model
      rather than a control — so this ticket either builds them here or shows no control row at all
