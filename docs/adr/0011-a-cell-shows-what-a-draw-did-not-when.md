# A cell shows what a draw did, not when

Decides the open option in ADR-0010 for the matrix (2026-11-20, issue #12, stage 2 of #8). Amends
ADR-0006's live state.

_Amended by [ADR-0012](0012-the-dispute-page-shows-moments-and-reads-its-own.md) (2026-11-20): the
agent juror page's table no longer keeps each draw's two figures, and shows each dispute's time to
appeal instead; the dispute page's moments return on its timeline, as clock readings and not
latencies; and the commit scan reads one dispute, for that timeline, never the matrix._

ADR-0010 stopped summarising or ranking commit and reveal latency but left each draw's own figures
in place, and the matrix cell was the one place they still lined up in a column per agent juror. A
column of figures is a side-by-side comparison whatever the page calls it. At the compact density,
which every reader has seen since the court passed forty disputes, the one figure left in the cell
was reveal latency: the figure ADR-0010 says involves no judgment at all.

## Decision

**The cell carries no time.** Not in the matrix at either density, not in a phone card's slot, and
not on the dispute page's panel. A cell is the draw's state and, when the draw holds more than one
vote ID, how many:

```
Finalised                         Live (mint tile)
  ✓      Coherent (no tile)        ┆⋯┆   Awaiting: drawn, nothing committed (dashed)
  ✓ ×2   holding two vote IDs      [◐]   Committed, reveal ahead
 [=]     Tied                      [●]   Revealed, ruling ahead
 [✕]     Diverged
 [∅]     No vote                  [?]   Unknown: the draws were never read
  ·      Not drawn
```

- **No state word in every compact cell.** On a finalised row the glyph already is the state.
  Writing the word in several hundred cells adds ink and no information, and undoes the rule that
  the common case is quiet. The comfortable cell keeps the word as before; the compact cell says it
  in the accessible name, and the legend names every state.
- **Each live stage has its own glyph.** All three shared `⋯` until now, and at the compact density
  the only thing telling them apart was the figure beside it: a dash or a time. With the figure gone
  that would leave three states a reader cannot separate, so committed is `◐`, revealed is `●`,
  and awaiting keeps `⋯` and takes a dashed border.
- **The vote count comes back to the compact cell.** A draw holding two of a round's five votes
  decides more of it than one holding one, and it is more useful context than any latency.
- **The live flag names the period at the compact density too** ("Live · vote"). An awaiting cell is
  on time in the commit period and late in the vote period, and with no time in the cell the flag
  is the only thing on the row that says which.

Every one of these states comes from the subgraph alone. The matrix, its phone cards and the
dispute panel no longer read anything from the Arbitrum `CommitCast` scan, so they raise no notice
or banner about it. The scan still feeds the agent juror page's table of draws, which keeps each
draw's two figures as the per-draw record ADR-0010 describes, and its banner.

## Considered Options

- **Keep the figures, unranked.** ADR-0010 allowed it. Rejected for the column problem above: the
  layout ranks what the prose says not to.
- **A status word in every cell instead of the time.** Rejected as noise on finalised rows, which
  are nearly all of them; the word stays where there is room for it.
- **Show the vote, or a provisional outcome before the ruling.** Answer labels do not fit a 104px
  column and bare choice numbers mean nothing in a grid, and an outcome before the ruling is the
  prediction ADR-0007 already rules out.

## Consequences

- `Cell.dc.html`, `MatrixDense.dc.html` and `Mobile.dc.html` were amended to match, in place, so
  their line citations still resolve. `Main.dc.html` still draws the comfortable cell's two latency
  lines, `Dispute.dc.html` draws them on every panel card, and `Errors.dc.html` draws them in its
  cells; none of the three was amended, and where they disagree this ADR wins
  (`canvas/README.md`).
- The dispute page loses its per-draw moments. Whether they return, on the period timeline beside
  who opened each period, is stage 3 (#13) and still open. Until then they are on each agent
  juror's page.
- `◐` and `●` are not in the self-hosted JetBrains Mono subset, and neither are `✓ ✕ ∅ ⋯`: every
  state glyph renders in the system's fallback font, as it already did.
