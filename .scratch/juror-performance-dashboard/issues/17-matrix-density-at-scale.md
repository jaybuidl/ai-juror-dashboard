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
