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

**Status:** ready-for-agent

- [ ] Past a row-count threshold the matrix renders at the compact density; below it the comfortable
      density of `Main.dc.html` renders unchanged
- [ ] Both densities are one matrix behind one flag, not two components: the cell, the dispute row and
      the column header each read the same flag
- [ ] The row count that drives the switch is the number of disputes in the model, so the matrix crosses
      into the compact density on its own as disputes arrive, and no upper bound on the dispute range is
      written anywhere
- [ ] The threshold is one named constant with a documented default in the region of forty rows,
      referenced from one place, and commented as a heuristic about screen height rather than a fact
      about the court
- [ ] The matrix renders comfortable at a row count below the threshold and compact at one above it,
      whichever value that constant takes
- [ ] The compact cell drops its commit line — the figure, its `C` key and its rail — and halves in
      height, measured against whatever the comfortable cell stands at. The artboards disagree on the
      exact compact height, so the ratio is the requirement and the pixel is not
- [ ] Reveal latency and the coherence state are the only things that survive into the compact cell,
      the reveal rail riding the figure it belongs to. The state word, the vote-count annotation and the
      `R` key go with the commit line, the key because one latency needs no key to name it
- [ ] The compact cell keeps the state's glyph, its fill and its border, so the five states stay
      distinguishable in greyscale once the word is gone, and the legend goes on naming all five by
      glyph, word and colour — no state is carried by colour alone at any density, per ADR-0006
- [ ] A cell for an agent juror not drawn in that dispute is identical at both densities — one 3px dot,
      no tile, no border, no glyph — so the emptiest state and the loudest stay unconfusable however far
      the matrix is compressed
- [ ] At the compact density commit latency is carried on the dispute row and in no cell, per the corner
      cell: "commit latency moves to the row"
- [ ] The row's commit figure names what it summarises over the draws in that row rather than standing
      as an unlabelled number, since a row holds up to six draws and one figure cannot be all of them
- [ ] The column header stays on screen while the matrix scrolls, so a reader hundreds of rows down can
      still see which agent juror each column is
- [ ] The freeze is the column header's alone: the dispute rows, the legend and the footnotes do not
      stick, and the page keeps one scroll context
- [ ] The frozen column header keeps three of its six figures — median reveal latency, coherence as a
      count of coherent draws over resolved draws, and total draws — and drops the other three
- [ ] The three it drops are median commit latency, which is one of ticket 06's four, and the cumulative
      ETH and PNK that ticket 10 adds to the same block
- [ ] This ticket reduces the column header tickets 06 and 10 build and does not build a second one: the
      identity block, the hairline, the six figures and the computation behind them are theirs and are
      unchanged here
- [ ] The `†` and `‡` markers ticket 06 puts on a marked aggregate survive the reduction on the figures
      that are kept, and the full account of each stays one click from the marker — a caveat is never
      among what density drops
- [ ] The grid's corner cell says what this density did — that reveal latency and coherence survive it,
      and that commit latency moved to the row — so a reader meets the reduction as a stated choice and
      not as a figure that went missing
- [ ] What the row loses is closed and listed: the second line goes, taking the category and the ruling
      with it, and the commit figure this ticket moves onto the row takes their place. Nothing beyond
      that list changes — the six columns and their order, the newest-first row order, every row's flag
      and the documented flag precedence, and every dispute, draw and blank cell all render as they do
      at the comfortable density
- [ ] Density never filters, paginates, collapses, reorders or windows away a row. Every dispute in the
      model is in the compact matrix, which is the whole reason for compacting it
- [ ] The matrix goes on saying at this density that a blank cell is the normal case, and says that
      sparsity does not resolve with volume — one agent juror has still never been drawn, and a longer
      matrix is a taller sparse matrix, not a fuller one
- [ ] Tested by rendering one fixture at both densities and asserting the difference is exactly the
      reductions above: every state keeps its glyph, every row is present in both, and no column moves
- [ ] Tested at a row count either side of the threshold, so the switch itself is covered and not only
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
