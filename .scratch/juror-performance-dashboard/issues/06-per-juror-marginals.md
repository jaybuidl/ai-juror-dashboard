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
### From ticket 13, 2026-08-25 — a new read is three entries, not one

Every read this ticket adds needs somewhere to fail out loud, and the plumbing exists:

- **A name in `SOURCES`** (`src/read-failure.ts`) — the deployment or host a reader could go and
  check, not a description of it. Throw a `ReadFailure` carrying it and the banner gets a status
  line for free; anything else prints "No response", which is the honest answer rather than a gap.
- **A tier in the view's `failuresOf`** — `blocking` if the failure costs a figure, `degraded` if it
  costs only a label. ENS is the only documented exception, so a new read is almost certainly loud.
- **A `what` sentence** saying what the reader loses. It is printed in the banner beside the source,
  and it is the half a reader acts on.

Then two things that are easy to miss. `affects(failures, source)` is what decides whether an
aggregate is labelled partial, and it is **per source**: ask whether the endpoint behind *your*
figure failed, never whether anything on the page did. A page-wide flag was the first cut and it
labelled every stat tile partial over a missing dispute title, contradicting a notice a few hundred
pixels below it. And per `CLAUDE.md`, a new read is another query that can drift out of step with
the ones beside it — check its own error, and where a figure joins two reads, say which half is
stale rather than that "the court" is.

## From ticket 09: a new field on `Draw`, and a branch that will collide with yours

`Draw` now carries **`choices: readonly number[]`** — every distinct choice that draw's vote IDs
revealed, ascending, empty until it reveals. It is computed once in `drawOf` and handed to
`stateOf`, which used to derive it a second time to decide coherence. A list rather than a number
because the seam has always had to reckon with a draw whose vote IDs disagree, and a marginal that
collapsed it would report a choice the draw did not make. No persistence bump: it is derived from
the `courtDraws` payload the cache already holds, and the pure seam re-derives it on every load.

**Both branches touch the same two files.** Ticket 09 changed `performance.ts` (the `Draw` type,
`drawOf`, `stateOf`) and `useDisputes.ts` (a new `templateFor` on `DisputesView`, beside `slotsFor`
rather than replacing it). Ticket 06 was in a parallel worktree while this was written. `CLAUDE.md`
§ Traps is explicit about what that costs: resolve those hunks by hand, and afterwards diff the
result against **both** parents for lines appearing more often than in either. The failure mode is
not a conflict marker — it is a type field silently concatenated onto the wrong type, which parses.

One rule ticket 09 met that ticket 06 will meet in aggregate form: a figure that is `0` and a
figure that was not read are different, and the second must never be drawn as the first. The
ruling card lists a choice with no votes as `0 votes` and a ballot that could not be read as
nothing at all.
