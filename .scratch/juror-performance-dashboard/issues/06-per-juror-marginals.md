# 06: Summarise each agent juror in the margin of the matrix

**What to build:** A visitor sees each agent juror's summary in the header of that agent juror's own
column: its typical latencies, its coherence as a count, and how many times it has been drawn. Agent
jurors are the columns here, so a column's summary belongs to the column rather than to a margin of
its own. Keeping it on screen as the matrix scrolls is ticket 17's freeze, not this ticket's. Nobody
is ranked — these are marginals on a matrix, not a leaderboard.

**Blocked by:** 05, 07, 08

**Design:** `../canvas/Main.dc.html:136-152` (the marginals, under a hairline beneath each column
header's identity block), `../canvas/JurorEmpty.dc.html:66-76` (a dash, never a zero),
`../canvas/Errors.dc.html:201-217` (markers riding an aggregate), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Marginals sit inside each agent juror's column header, separated from its identity block by a
      hairline. There is no seventh column: the grid stays one row-header column plus exactly six
      agent juror columns
- [ ] This ticket fills four of the six figures in that block — median reveal latency, median commit
      latency, coherence as a count of coherent draws over resolved draws, and total draws
- [ ] Cumulative ETH and PNK are ticket 10 and join the same block, so it is built to hold six figures
      rather than four
- [ ] Total draws is shown with the vote count beside it, since the two differ — 61 votes collapsed to
      44 draws across the first thirteen disputes
- [ ] Typical latency is a median, not a mean, so a single unusual dispute cannot distort it
- [ ] Marginals are computed inside the pure function, not in the view
- [ ] The coherence count carries a `‡` marker when any draw behind it sat on a panel of one, because
      that draw's coherence is tautological. The marker rides the figure the caveat touches and not
      the other marginals, which a lone panel says nothing about
- [ ] The median commit latency carries a `†` marker when any draw behind it ran under a different
      commit window — dispute 151 today. It rides that figure alone: the window change touches commit
      latency and nothing else, which is why the agent juror view plots reveal latency only
- [ ] A marked aggregate names its reason on the line directly below the number, and that reason says
      how many of the counted draws are affected rather than only that some are
- [ ] The full account of either caveat is one click from the marker, and the marker never stands as
      the only mention of it
- [ ] An agent juror with no draws shows a dash for every figure it cannot have, never a zero. A dash
      means no draws to measure; a figure that could not be read is ticket 13's Unknown, which is rose
      and carries a `?` and the words "not read"
- [ ] Its draw count is the one figure that reads as a real zero, since zero draws is a measurement
      rather than an absence
- [ ] Tested against fixtures, including a case proving the median is not dragged by the dispute that
      ran under different court parameters

## From ticket 15: the aggregate already has a home

`src/performance/totals.ts` holds `CourtTotals`, computed by `buildCourtPerformance` and hanging off
`CourtPerformance.totals`. It is the court-wide version of what this ticket slices by column:
disputes, draws, vote IDs, agent jurors drawn, the whole reveal-latency distribution ascending, and
the ids of the disputes decided by a panel of one. The marginals belong in that file, as a second
export over the same rows — not in the column header that prints them, which is the rule ticket 15
followed for the stat tiles and the same rule this ticket states for itself.

Two things it settled that this ticket inherits:

- **The median is the lower of the two middles on an even count**, not their mean. Averaging invents
  a latency no draw recorded, and this page may be cited. `medianOf` in `totals.ts` is the one
  implementation; a marginal median must use it rather than a second convention beside it.
- **The caveat marker mechanism exists and is unused.** `StatTiles` takes an optional `TileCaveat` —
  a mark on the figure, the reason beneath it, and a link to the full account — because this
  ticket's criteria set the terms for it. No stat tile passes one today: the only caveat the model
  carries is the lone panel, which qualifies coherence, and none of the four tile figures is a
  coherence figure. **This ticket's per-agent-juror coherence is the first figure that takes the
  mark** — `totals.lonePanelDisputes` is what tells you which draws it applies to, and the matrix
  words the same caveat with `‡` (`Matrix.tsx`, `ROW_FLAGS`). Use that glyph, not a new one.

`/method#caveats` is where "the full account one click away" should point; the section is written
and names the panel of one, the sparsity of the matrix and the fact that nothing is sampled.

## From ticket 08: the second marker, and it is no longer unused

The `TileCaveat` mechanism above is now wired: the median-reveal tile carries a `†` reading
"2 of N draws ran under a vote window of 8h, which the court has since changed", linking to
`/method#window`. So this ticket inherits **two** markers, not one, and every marginal it prints
takes whichever apply:

- `‡` — a lone panel, from `totals.lonePanelDisputes`. Qualifies **coherence**.
- `†` — a superseded window, from `totals.changedWindows`. Qualifies **latency**. Each entry carries
  the disputes it covers, the commit and vote windows they ran under, and `revealedDraws`, which is
  the "N of M draws" count the reason line needs. Compare against `CourtParameters.current`.

A per-agent-juror median reveal is qualified by `†` exactly when that agent juror was drawn in one
of those disputes — which `changedWindows[].disputes` gives you and the rows give you the draws for.
`medianOfSeconds`'s rule applies unchanged.

Also inherited, and the trap worth reading before writing a marginal: **`totals.unplacedDisputes`.**
A dispute the parameter history could not place is not a dispute that ran under the current windows,
and a marginal that treated an empty `changedWindows` as "nothing to disclose" would state a clean
bill of health over a short read. Ticket 08's `Matrix.tsx` and `MatrixPage.tsx` both branch on it;
do the same rather than reading `changedWindows` alone.

### From ticket 12, 2026-08-25 — a court-wide count is waiting to be moved into your module

**The matrix's corner count is computed in the view, and `CLAUDE.md` says it should not be.**
`Matrix.tsx` derives `finalised` and `live` from `rows` to print `13 finalised · 6 live`. That is a
court-wide number, and the rule this repo set with ticket 15 is that those live on `CourtTotals` in
`src/performance/totals.ts`, not in the view that prints them. It predates ticket 12 — ticket 15
put the `finalised`/`running` count there and ticket 12 only renamed the second half — and moving
it was deliberately deferred because tickets 08 and 13 were open on `totals.ts` at the same time.

You are already adding to that module, so it is cheap for you: two counts on `CourtTotals`, read
with `isFinalised` from `src/disputes/liveness.ts` so there is still one definition of the word.

**Your marginals are sliced down a column, and coherence is only defined on finalised rows.**
ADR-0007 fixes what that means: a dispute the court has ruled on. A marginal that counted an
unruled dispute's draws as incoherent would be inventing a result out of a prediction.
