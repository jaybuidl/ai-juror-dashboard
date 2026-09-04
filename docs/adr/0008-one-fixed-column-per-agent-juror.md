# One fixed column position per agent juror, reserved in every dispute

The matrix has one column per entry in `ROSTER`, in roster order, in every dispute and on both
layouts — whether or not that agent juror was drawn in that dispute, and whether or not it has ever
been drawn at all. A blank position is drawn as a 3px dot and nothing else, and the phone's card
list reserves the same slot in the same position on every card.

Nothing has ever proposed otherwise, which is exactly why this is being written down. The decision
survived as a comment in `agent-jurors.ts` and as acceptance criteria in a ticket that closed, and
the number that will make somebody reopen it is now calculable: 34 of the matrix's 78 cells were
blank across the first thirteen disputes — 43% — and the same court at eighteen columns would be
about 81% blank. Ticket 25 met that number while making room for nine agent jurors, and is
recording the reasoning rather than leaving it to be inferred.

## Considered Options

- **One fixed position per agent juror, reserved everywhere.** What is implemented. The position of
  a cell is a fact — the nth slot is the same agent juror on every row and on every card — so one
  agent juror can be read down the page the way a column is read across a grid, and two agent
  jurors can be compared by eye at the same latitude. It is also what makes a blank *mean*
  something: an empty position says "not drawn in this dispute", which is the sentence ticket 05
  exists to protect and the sparsity note exists to explain.
- **Render only the agent jurors actually drawn in each dispute**, so a panel of two draws two
  cells. Rejected, and deferred rather than closed — see below. It halves the ink and destroys the
  grid: the nth cell is then a different agent juror on every row, so nothing can be scanned down,
  nothing can be compared across, and the reader has to read a label on every cell to know whose
  measurement it is. The matrix stops being a matrix and becomes a list of lists.
- **Columns for the drawn, sorted by draw count.** Rejected on sight, and for a reason that is not
  about layout: `CONTEXT.md` is explicit that marginals rank nobody, and a column order that moved
  with activity would be a ranking the page never states and cannot defend. It would also change
  under the reader as the court drew.

## What made the difference

Sparsity is the record, not a defect in it. Agent jurors are drawn at random from the staked pool
and the court draws a handful of vote IDs per dispute, so most positions are empty by construction
and always will be. A rendering that hid the empty positions would hide the single most important
property of what is being measured — that participation is sparse and random — and would do it by
making the page look fuller.

The measurement that settles it is that **a panel does not grow when the roster does.** Across the
sixteen disputes captured in `court-34-draws.fixture.json` the court drew a mean of 4.75 vote IDs
per dispute, held by a mean of 3.5 jurors, with no panel larger than five. That is set by the
court's own parameters, so it stays about three and a half whether the roster holds six agent
jurors or eighteen. The emptiness is not a transitional state that volume will fix: it is what an
honest matrix of this court looks like, at every roster size, for ever — and it is where the 81%
above comes from, since a mean panel of 3.5 leaves 14.5 of eighteen positions blank.

## Consequences

**The grid gets emptier as the roster grows, and that is accepted.** 43% empty at six columns,
about 81% at eighteen. The page says so rather than hiding it: `SparsityNote` counts the blanks on
both layouts and states that sparsity is the normal state of this record and not missing data, and
past the density threshold the matrix adds a sentence saying that a longer matrix is a taller sparse
matrix rather than a fuller one.

**The width follows the roster and the density absorbs it.** `COMFORTABLE_GRID_MIN_PX` is a row
header plus one column per agent juror, the page measure is derived from it, and `densityOf` takes
the column count as well as the row count — so a roster that outgrows the comfortable grid compacts
rather than scrolling sideways (`breakpoints.ts`, `density.ts`). The row header does not shrink to
pay for a column; ticket 25 needed room for nine and took none of it from there.

**There is an upper bound and it is not written down.** At some roster size a reserved column per
agent juror stops being readable at any density — a compact column is 104px, so eighteen of them
are 1872px beside a 440px row header, a grid of 2312px on a desktop of 1440 — and at that point the
deferred option above becomes the
question again. It should be reopened with a measurement rather than a feeling, and the measurement
is the one in this file: what share of the grid is blank, and whether a reader can still find one
agent juror in it.

**Everything positional depends on this.** The cells are built over the roster in roster order and
in that order alone (`performance.ts`), the marginals are one per roster entry drawn or not
(`totals.ts`), the phone's slots are the same positions folded (`DisputeCards.tsx`), and every one
of those would have to change together. `ROSTER.length` and never a literal, which `CLAUDE.md`
carries as an invariant: a hard-coded count drops a column or a slot in silence.

**A draw the roster has no column for is now stated rather than dropped.** This decision has a cost
that went unnamed until ticket 25: the roster is the column set, so a juror outside it has nowhere
to sit and falls out of every figure except the panel size. Grokleros was in that state for weeks.
The § flag and its footnote count those draws per dispute, which is the tripwire that says the next
agent juror has gone live before anybody here knew its address.
