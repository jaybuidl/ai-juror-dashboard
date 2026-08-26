# 17: Keep the matrix readable once it outgrows the screen

**What to build:** A visitor scrolling a matrix hundreds of rows deep still reads every cell's reveal
latency and coherence state, and still knows which agent juror each column belongs to. Past a
threshold the matrix compacts: the cell drops its commit line and halves in height, the column header
freezes, and nothing else changes.

`MatrixDense.dc.html:50` states the whole rule in two sentences: "Past forty rows the cell drops its
commit line and halves in height; the column header freezes so the agent a column belongs to is never
off screen. Nothing else changes." `Cell.dc.html:201` says the same from the cell's side: "Past
roughly forty rows the commit line drops and the cell halves in height. Reveal latency and the
coherence state survive at every density; nothing else does."

That last clause is the discipline of this ticket. Density is a legibility change, not a licence to
edit the record: no dispute leaves the page, no column moves, no caveat is dropped, and no state
loses what makes it readable in greyscale. What density costs is the commit figure in the cell, the
word beside the glyph, the vote-count annotation, three of the six figures in the column header,
and the row's second line with the category and ruling on it — nothing more. ADR-0006 survives the
reduction because the glyph, the fill and the border survive it, and because the legend goes on
naming all five states by glyph, word and colour after the cell has stopped carrying the word.

The threshold is soft in both sources — the artboard says "past forty rows", the densities panel says
"roughly forty". Nothing in the record makes forty special: it is a guess about how much vertical
space a reader has, and a bare `40` in the render path would read as a fact about the court when it
is a fact about screens. So the criteria pin the behaviour at both ends — comfortable at the thirteen
disputes of the measured record, compact at sixty rows — and require the crossing point to be one
named constant with a documented default in the region of forty, leaving the exact value open.

A reader-facing density control is out of scope, and deliberately so. Both artboards expose density
as an editor prop — `Main.dc.html:233` offers a comfortable/compact enum and drives `showCommit` and
the row height from it, while `MatrixDense.dc.html:128` makes the row count the control instead —
which settles that the two densities are one matrix behind one flag rather than two components, and
the criteria below require exactly that. But an editor prop is an authoring control in the canvas
tool, not a control on the page: neither artboard draws one in its own chrome, and the row count is
what the rule switches on. Build the flag; do not build a toggle for it.

Two notes on the artboard. Its sixty rows are an illustrative projection, and its own banner says so
— only disputes 151-163 on it are the measured record, and every title, latency and coherence mark
above 163 is sampled. That warning is a property of the mockup and not a requirement of the product:
nothing here asks the dashboard to label its own rows. Take the layout from the artboard and none of
its numbers, and read sixty rows as a demonstration of what the layout does at scale, never as a
forecast of how many disputes there will be. And `MatrixDense.dc.html:64` states that commit latency
moves to the row without drawing it, so the criteria below fix that it stays on the page and on the
row, and that whatever the row shows says what it summarises.

This is the desktop path. Ticket 16 replaces the matrix with one card per dispute below a phone
breakpoint, so the two reductions never compose — a phone gets cards at any row count, not a compact
grid. What a stack of several hundred cards should do is open, and belongs to 16.

**Blocked by:** 06, 07, 10

**Design:** `../canvas/MatrixDense.dc.html:45-122` (the compact matrix entire: the rule at `:50`, the
corner cell at `:62-65`, the reduced column header at `:67-82`, the one-line row at `:85-92`, the
single-line cell at `:94-107`, the legend and the sparsity line at `:111-118`),
`../canvas/Cell.dc.html:199-218` (the two densities from the cell's side, 76px against 44px),
`../canvas/Main.dc.html:136-152` (the six-figure column header this reduces),
`../canvas/Main.dc.html:176-196` (the comfortable cell, whose commit line at `:188-194` is already
conditional on the density flag), `../canvas/README.md` for provenance

**Status:** done

- [x] Past a row-count threshold the matrix renders at the compact density; below it the comfortable
      density of `Main.dc.html` renders unchanged
- [x] Both densities are one matrix behind one flag, not two components: the cell, the dispute row and
      the column header each read the same flag
- [x] The row count that drives the switch is the number of disputes in the model, so the matrix crosses
      into the compact density on its own as disputes arrive, and no upper bound on the dispute range is
      written anywhere
- [x] The threshold is one named constant with a documented default in the region of forty rows,
      referenced from one place, and commented as a heuristic about screen height rather than a fact
      about the court
- [x] The matrix renders comfortable at a row count below the threshold and compact at one above it,
      whichever value that constant takes
- [x] The compact cell drops its commit line — the figure, its `C` key and its rail — and halves in
      height, measured against whatever the comfortable cell stands at. The artboards disagree on the
      exact compact height, so the ratio is the requirement and the pixel is not
- [x] Reveal latency and the coherence state are the only things that survive into the compact cell,
      the reveal rail riding the figure it belongs to. The state word, the vote-count annotation and the
      `R` key go with the commit line, the key because one latency needs no key to name it
- [x] The compact cell keeps the state's glyph, its fill and its border, so the five states stay
      distinguishable in greyscale once the word is gone, and the legend goes on naming all five by
      glyph, word and colour — no state is carried by colour alone at any density, per ADR-0006
- [x] A cell for an agent juror not drawn in that dispute is identical at both densities — one 3px dot,
      no tile, no border, no glyph — so the emptiest state and the loudest stay unconfusable however far
      the matrix is compressed
- [x] At the compact density commit latency is carried on the dispute row and in no cell, per the corner
      cell: "commit latency moves to the row"
- [x] The row's commit figure names what it summarises over the draws in that row rather than standing
      as an unlabelled number, since a row holds up to six draws and one figure cannot be all of them
- [x] The column header stays on screen while the matrix scrolls, so a reader hundreds of rows down can
      still see which agent juror each column is
- [x] The freeze is the column header's alone: the dispute rows, the legend and the footnotes do not
      stick, and the page keeps one scroll context
- [x] The frozen column header keeps three of its six figures — median reveal latency, coherence as a
      count of coherent draws over resolved draws, and total draws — and drops the other three
- [x] The three it drops are median commit latency, which is one of ticket 06's four, and the cumulative
      ETH and PNK that ticket 10 adds to the same block
- [x] This ticket reduces the column header tickets 06 and 10 build and does not build a second one: the
      identity block, the hairline, the six figures and the computation behind them are theirs and are
      unchanged here
- [x] The `†` and `‡` markers ticket 06 puts on a marked aggregate survive the reduction on the figures
      that are kept, and the full account of each stays one click from the marker — a caveat is never
      among what density drops
- [x] The grid's corner cell says what this density did — that reveal latency and coherence survive it,
      and that commit latency moved to the row — so a reader meets the reduction as a stated choice and
      not as a figure that went missing
- [x] What the row loses is closed and listed: the second line goes, taking the category and the ruling
      with it, and the commit figure this ticket moves onto the row takes their place. Nothing beyond
      that list changes — the six columns and their order, the newest-first row order, every row's flag
      and the documented flag precedence, and every dispute, draw and blank cell all render as they do
      at the comfortable density
- [x] Density never filters, paginates, collapses, reorders or windows away a row. Every dispute in the
      model is in the compact matrix, which is the whole reason for compacting it
- [x] The matrix goes on saying at this density that a blank cell is the normal case, and says that
      sparsity does not resolve with volume — one agent juror has still never been drawn, and a longer
      matrix is a taller sparse matrix, not a fuller one
- [x] Tested by rendering one fixture at both densities and asserting the difference is exactly the
      reductions above: every state keeps its glyph, every row is present in both, and no column moves
- [x] Tested at a row count either side of the threshold, so the switch itself is covered and not only
      the two layouts it switches between

## Comments

### From ticket 07, 2026-08-25 — the cell grew a line

**Every drawn cell now carries two measures, not one.** Reveal on top in heading ink, commit below
it a step smaller and dimmer, each with its own rail. That is roughly 14px of extra height on all
56 drawn cells, and it lands before you compact anything — the comfortable density this ticket
measures its reduction against is now the two-line cell.

**The commit line is the obvious thing to drop at compact density, and dropping it is a decision
rather than a saving.** It is the half of the speed dimension that ticket 07 exists to show, and
`Cell.dc.html:87-92` calls it context for the reveal rather than a competing figure — which is an
argument both ways. If it goes, the legend key for the commit rail has to go with it, or the page
keys a rail no cell carries; `Matrix.tsx` has both in the legend's second `LegendGroup`.

**`commitFigureOf` never returns blank**, exactly as `revealFigureOf` never does. A compact cell
that drops the line must drop it entirely rather than render it empty, because an empty slot beside
a full one reads as missing data.

## From the 07 + 15 integration, 2026-08-25 — a blank row that is not sparsity

Running the merged page against the live court turned up a row shape neither branch could have
seen, because every fixture in this repo stops at dispute 166. Disputes 167, 168 and 169 are in
the `evidence` period: no juror has been drawn for them yet, so each renders as six blank cells
with `PANEL 0`, above the finalised rows.

The cells are correct. The **footnote is not.** `Matrix.tsx`'s "On the empty cells" card says every
blank is random draw sparsity — "Agent jurors are drawn at random: sparsity is the normal state of
this matrix, not missing data" — and that is true of a dispute whose panel exists and false of one
whose panel does not. Today 18 of the blank cells it counts are the second kind, and the sentence
tells a reader they mean something they do not: not *this agent juror was not selected*, but *no
selection has happened*. Same words, different fact, on a page that may be cited.

This is yours because you own what the matrix does as rows accumulate, and running disputes are now
a permanent fraction of them — the count is in the matrix header already (`13 finalised · 6
running`). Three options, none of them decided here: word the footnote to separate the two absences
and count them separately; give a not-yet-drawn cell a state of its own rather than blankness, which
ADR-0006 would have to admit; or keep running disputes out of the grid until they have a panel,
which loses the fact that the court is busy. The first is the smallest and probably right.

Not a merge artifact and not new to the merge — `master` renders the same rows today. It surfaced
here only because integration verification runs against the live court.

### From ticket 13, 2026-08-25 — the empty-cells note is still half wrong, and now says so about less

Ticket 13 fixed the neighbouring case and **not** yours. A dispute whose draws were never *read* is
now drawn as Unknown, counted out of the sparsity figure, and named in the card's own words. A
dispute that *was* read and genuinely has no panel yet — 167, 168 and 169 on the day this was
written, sitting in `evidence` with nobody drawn — is still six blank cells under a note saying
every blank is random draw sparsity. That claim is true of a dispute with a panel and false of one
without: the draw has not happened, rather than not selected anyone.

Two things that make it easier than it was:

- The vocabulary now exists. `UNREAD_PRESENTATION` and `UNREAD_FIGURE` in `cell.ts` are the pattern
  for a row-level state that is not a `DrawState`, and `ROW_FLAGS` in `Matrix.tsx` takes a
  precedence-ordered entry rather than a second hard-coded pill.
- Whatever you word it, it must not be rose and must not be Unknown. A court that has not drawn yet
  is not a read that failed, and ADR-0006 gives rose exactly two meanings — neither is this.

## From ticket 06, 2026-08-25 — the header your freeze has to carry is now much taller

The column headers hold each agent juror's summary since ticket 06: four figures under a hairline,
plus a reason line under any figure carrying a `†` or a `‡`. On the live court today that is a
header of roughly 330px, set by columbo — which carries all three markers, being both the column
drawn in dispute 151 and the one that sat on the panel of one. It was ~90px before.

That is the real cost of "a marked aggregate names its reason on the line directly below the
number", and it was paid deliberately. What it hands you is a sticky header that is a third of a
viewport on the widest column, and this ticket's density work is where that gets answered — by a
compact density that trades the reason lines for the footnotes below the grid, by a header that
collapses on scroll, or by something else. Two things not to do: drop the marker (it must not be
the only mention, but it must be a mention), and let the six columns take five different heights,
which is why `AgentColumn` is `vertical-align: top`.

### From ticket 10, 2026-08-25 — the last two figures are in, and they cost less than the first four

The header now holds all six the artboard designs for. The two ticket 10 added are cheap in exactly
the dimension this ticket cares about: **they carry no reason line**, because neither the `†` nor
the `‡` rides a reward — the window marker is about the commit and vote periods, and court 34's one
reconfiguration left every reward parameter unchanged. So they add two lines to every column and
nothing more, and the tallest header is still set by columbo's three caveat reason lines rather than
by how many figures there are.

That is worth knowing before you reduce it. Your criterion says the frozen header keeps three of its
six figures, and the 330px above is what four figures plus three reason lines came to — the two new
rows move it by roughly the height of two lines, not by a third again. **The reason lines are the
budget, not the figures.** A reduction that dropped ETH and PNK would buy two lines; one that trades
the reason lines for the footnotes below the grid buys eight, which is the trade ticket 06 already
pointed you at.

## From ticket 09, 2026-08-25 — the blank-row wording, solved on one view and not on the matrix

This ticket owns the reading the matrix gives a dispute that has been read and genuinely has no
panel yet: six blank cells under a note saying every blank is random draw sparsity. Ticket 09 met
the same state on the per-dispute view and worded it, which makes the matrix the only place left
where it is wrong.

What that view says, and why:

- **Read, and nobody drawn** → "Nobody has been drawn for this dispute yet, so there is no
  reasoning to show. A panel is selected when the dispute leaves its evidence period." The panel
  size pill is **omitted entirely** rather than rendered as `Panel 0` — a zero there is a claim
  that the court drew a panel of nobody. That defect was live until a hand-built test caught it;
  the captured court holds no such dispute, so searching the fixture for one found nothing and
  passed.
- **Not read at all** → "The draws for this dispute have not been read, so who was on the panel and
  what they did is unknown rather than absent", which is ticket 13's vocabulary unchanged.

The two share no wording on purpose. The distinction the matrix has to draw is the same one, and
`MatrixRow.read` plus `panelSize > 0` is the whole test.

## From ticket 16, 2026-08-25 — the other reduction path is built, and it is not yours

The phone layout has landed. The two tickets stay two paths and never compose: **a phone shows
cards at any row count and never the compact grid**, so whatever this ticket does to the grid is
gated above `breakpoints.narrow` and `DisputeCards` is untouched by it.

Three things that are now facts rather than plans:

- **The sparsity figures moved onto `CourtTotals.sparsity`** — blank count, position count, empty
  columns, over the rows that were read. Anything this ticket does that changes what is on screen
  must not recompute them beside that field; the whole reason they moved is that two layouts were
  about to disagree about how sparse one court is.
- **The frozen header ticket 06 warned you about is unchanged**, and the phone route does not
  relieve it. The compaction still has to carry a column header holding an avatar, a nickname, a
  stack and three marked figures.
- **`CLAUDE.md` § Traps now records the cross-layout prose trap**, which this ticket will meet the
  moment it words anything about a compacted grid: a string naming a cell, a column or a row is a
  claim about which layout the reader is on, and the caveat card in `MatrixPage.tsx` is already
  written twice for that reason.

**And the open question this ticket inherits is the one ticket 16 could not answer.** What a stack
of several hundred *cards* should do is unsettled — the canvas draws four and the court holds
thirty-one today. It is this ticket's question in the other layout, and the two answers should
probably be decided together: whatever the grid does past forty rows, the card list needs a story
past the same number, and neither may quietly stop showing disputes it has read.

## From ticket 11, 2026-08-26 — the column now has somewhere to go

`/agent-jurors/:nickname` exists, and every column header in the matrix links to it. That changes
one option on this ticket's table: a denser grid no longer has to carry a column's own figures,
because six marginals at length are one click from the header. If density costs the column headers
their summary block, what replaces it is a link rather than an omission — and the sentence saying
so is the phone caveat's, which ticket 11 already wrote for the card layout.

Two smaller things ticket 11 leaves you.

- **`rowFlagOf` now has a third caller** (`AgentJurorDraws`), so the flag precedence is read in
  three places and defined in one. A density pass that adds or reorders a flag changes all three at
  once, which is the point of the table.
- **The dispute with a panel of nobody is still yours and still unfixed.** Disputes arriving in
  `evidence` with no panel render as blanks under a note saying every blank is random draw
  sparsity. The agent juror view inherits the same gap in a different shape: such a dispute is
  simply absent from every agent juror's list, which is correct — nobody was drawn — but the count
  in "Drawn in N disputes." is over a court that holds more than N. Only the unread case is
  disclosed there today.

## What landed

**One flag, `src/performance/density.ts`.** `COMPACT_FROM_ROWS = 40` with its own paragraph
saying it is a heuristic about screen height rather than a fact about this court, and
`densityOf(rows)` — "past forty rows", so forty is comfortable and forty-one is not. It switches
on `performance.rows.length`, so the matrix crosses over on its own as the court grows, and no
upper bound on the dispute range is written anywhere. The cell, the dispute row and the column
header all read that one value. `CELL_HEIGHT_PX` and `COMPACT_CELL_HEIGHT_PX` live beside it as
76 and half of it, derived rather than typed, because the artboards disagree about the compact
pixel and the ratio is what the ticket asks for.

**The cell keeps two things and loses four.** Reveal latency and the coherence state survive with
the reveal rail riding the figure; the commit figure, its `C` key and its rail go, and so do the
`R` key and the vote-count annotation. The state's word leaves the ink and stays in the accessible
name beside the glyph — the glyph is `aria-hidden` decoration, so removing the word outright would
have left a reader hearing the page with a bare duration. A not-drawn position is byte-identical
at both densities: one 3px dot, no tile, no border, no glyph.

**Commit latency moves to the row**, which is what the corner cell had been promising since
`MatrixDense.dc.html:64` without drawing it. `rowCommitLatencyOf` in `totals.ts` is the reduction —
below the seam, like every other figure — and the row prints `MED C` and the median. A row's draws
all ran under one set of windows, so unlike the column medians this one needs no `†` of its own.

**The column header keeps three of six figures and freezes.** `Marginals` filters on a `dense`
flag per slot rather than branching, so a compact header is the comfortable one with three lines
removed and never a second block. The freeze needed two things that had nothing to do with this
grid: `Shell.tsx`'s `Ground` went from `overflow: hidden` to `overflow: clip`, and the matrix's
own scroll box is absent at this density — both are scroll containers, and a `position: sticky`
element sticks to its nearest scroll container rather than to the page.

**The row loses its second line.** `DisputeRow` gained a `compact` form: one line, no category and
no ruling, the pills inline and a `measure` slot at the end of them. `panelPillOf` in
`panel.ts` is new and shared with the phone's card, which is where the three panel states are now
worded once — including the one both layouts had wrong.

## What the browser found, and none of it was findable in jsdom

Three defects, all with 736 tests green, all of them positional. `CLAUDE.md` already says anything
positional here needs a browser at the width it is claimed to work at; this is the fourth ticket
to prove it.

- **An `auto` grid track takes its content before a `1fr` sibling gets anything.** The compact row
  was `2.5rem minmax(0, 1fr) auto`, and the title measured **zero pixels wide** on every row: a
  dispute id, some pills, and no subject. `minmax(7rem, 1fr)` on the title track is the floor that
  fixes it. It is the same family as the `text-overflow: ellipsis` failure `DisputeList.tsx`
  already carries a comment about, one column over.
- **`MeasureKey` is 7px wide, because a cell's key is one letter.** `MED C` in 7px overlapped the
  duration beside it. The row's measure widens it through a component selector rather than
  changing the cell's key.
- **The frozen header was 295px of a 900px viewport**, over rows 43px tall — seven rows of matrix
  behind a header that never moves. Eight of those lines were columbo's three caveat reason lines,
  which is exactly the trade ticket 06 handed this ticket.

Measured against the live court at 1440, 1280, 900 and 390: the comfortable density is unchanged
to the pixel (239px row header, 145px columns, 142px rows, a static header and a sideways-scrolling
box), the compact one is 442/110/43 with the header stuck at `top: 0` after a 2,588px scroll, and
no width scrolls the page sideways.

## Where the canvas, the criteria and a browser disagreed

Four calls, each recorded here because each is a place a reviewer will otherwise read a criterion
as unmet.

- **The flag abbreviates at this density, against criterion 19.** `Main.dc.html:302` gives
  "† 8h window", "‡ Lone panel" and "⋯ Live · commit 3m 12s"; `MatrixDense.dc.html:213` gives
  "† 8h", "‡ Lone" and "⋯ Live" for the same rows. It is the one place the two artboards
  deliberately word one thing twice, the canvas wins over a ticket (`CLAUDE.md`), and here it has
  to: the live pill was 175px of a 375px row, and it was the title that paid. `ROW_FLAGS` carries
  both labels so the two densities cannot fork.
- **The reason line under a marked figure goes; the marker, its link and its reason do not.**
  Ticket 06's own hand-off offered this trade — "by a compact density that trades the reason lines
  for the footnotes below the grid" — and the 295px header is what makes it necessary. The mark
  stays on the number, its `aria-label` now carries the reason in full, `/method` has the account,
  and the `†` and `‡` footnotes below the grid state both facts at either density. What density
  drops is the fourth telling.
- **The row's commit figure names itself and counts its draws only in its accessible name.**
  "· 4 draws" measured 40px of a 441px row and they came out of the title. What criterion 11
  protects against is a bare duration read as *the* commit latency of a dispute holding up to six
  draws, and `MED` is what prevents that: a median is by construction not one draw's figure.
- **The freeze needs `breakpoints.compactGrid` (1160px) and says so.** The compact grid has a
  `min-width` of 1064px — 440 for the row header and six columns a compact cell needs about 104px
  each for — and below that width the box scrolls sideways again, exactly as the comfortable
  density always does. A sticky header inside a scroll container does not stick, so between 720px
  and 1160px the column header scrolls away with the rows. Every other reduction holds at every
  width. Left rather than solved because the alternatives are worse: a bounded-height box is a
  second scroll context, which criterion 14 forbids, and crushing the columns spills durations
  into the column beside them.

## The blank-row reading three tickets handed here, closed

Disputes 167, 168 and 169 arrived in their evidence period with nobody drawn, and both layouts
drew them as six blanks under a note saying every blank is random draw sparsity. That claim is
true of a dispute with a panel and false of one without.

- `panelPillOf` gives it words on the row and on the card: **"No panel yet"**, quiet, neither rose
  nor Unknown, per ticket 13's instruction. `Panel 0` is gone from both layouts.
- `Sparsity.undrawnDisputes` and `undrawnPositions` count them below the seam, so the matrix and
  the card list cannot disagree, and `SparsityNote` names them by id: "6 of those blanks are a
  different absence: dispute 167 has no panel at all yet, so there the draw has not happened
  rather than an agent juror not having been selected."
- The third absence is still counted out entirely and still says so: a dispute whose draws were
  never *read* is ticket 13's Unknown.

## Left for other tickets

- **What a stack of several hundred cards should do is still open**, and this ticket did not close
  it. The grid's answer is a density; the card list's cannot be the same one, because a card is
  already one line per dispute at the only density it has. It is ticket 16's question and it is
  still worth settling before the record grows into it.
- **The frozen header below 1160px**, above.
- **Ticket 18 inherits four new inks at 9-11px**: the row's `MED C` key and its median, the
  compact cell's glyph and duration at 11.5px, and `PanelLabel` — which is `textPending`
  (`--text-4`, measured at 2.68-2.91:1 in the dark theme) on a plain background rather than inside
  a pill. The palette's contrast is that ticket's, and the compact density puts more weight on it.

## What review found, and the shape four of the six shared

Six findings, all real, all fixed. Four of them are the same fault at four grains: **a claim that
was true of the comfortable density and false of the compact one**, which is `CLAUDE.md`'s
cross-layout prose trap with a third rendering added to it.

- **The commit-shortfall notice sent readers to look for cells that carry no commit figure.** It
  said `those cells read "Not read"` — true of a two-line cell, false of a one-line one. Worse,
  the compact grid has no place for a *partial* shortfall to show at all: a row's median is taken
  over the commitments that were dated and says "Not read" only where none of them could be. The
  notice now says exactly that. `DisputeCards.tsx` even carried a comment claiming the grid could
  safely say the old sentence "because every cell there has a commit slot", which this ticket had
  just made untrue.
- **The lede promised both latencies in every cell**, two elements above the corner cell that says
  where the commit figure went.
- **`RowCommit` printed an em dash on a row whose draws were never read** — the dash this design
  defines as "nothing to measure", beside six cells and a flag all reading "Not read". It reads
  "Not read" now, on the same read-first ordering the row itself is drawn in.
- **`emptyColumns` and "Never drawn" were not gated on the undrawn rows this ticket introduced.**
  On a court whose read disputes are all still in their evidence period — its opening hours, or a
  page holding nothing else — all six agent jurors read "blank end to end" over a draw that has
  not happened. The one figure that had not been given the guard the whole ticket is about.

The other two are ordinary bugs, and both were invisible for the same reason: court 34's values
happen to hide them.

- **The flag's abbreviation truncated at the first space.** `formatWindowSeconds` returns two words
  whenever the minutes do not divide by 60, so a court whose earlier window was 5,400s would have
  been marked "1h" — a duration it never had, on the marker whose whole job is to name the one that
  differs. Both labels are composed from one reduction now, and a 90-minute window is pinned.
- **`overflow: clip` is dropped whole where it is unsupported**, which is Safari below 16 — and
  what `Ground` clips is a 1,560px decorative orbit and a matrix wider than the page. It is behind
  `@supports` with `hidden` as the fallback: losing the freeze on an old browser is a reduction,
  letting the page scroll sideways is the thing this repo says a layout must never do.

Every fix carries a test, and the two whose absence would be silent were checked by reverting the
fix and watching the test fail.
