# 07: Show how fast each agent juror committed

**What to build:** A visitor sees both halves of the speed dimension in every cell — commit latency
alongside reveal latency. Commit timestamps do not exist in the subgraph, so they are recovered from
chain event logs. See ADR-0004.

Because a truncating endpoint would produce a missing commit rather than an error — rendering as a
false `NO VOTE` for an agent juror that committed on time — this ticket also builds the
cross-check that makes that impossible to miss.

**Blocked by:** 05

**Design:** `../canvas/Cell.dc.html:87-92` (cell anatomy), `../canvas/Cell.dc.html:180-196` (why the
shared rail is logarithmic), `../canvas/README.md` for provenance

**Status:** done

- [x] Commit events are read from an Arbitrum endpoint, filtered by dispute and by agent juror
- [x] Commit latency is derived per draw as seconds between the moment the commit period opened and the
      moment the commitment was mined
- [x] Scans are unchunked, per the decision to use an endpoint that supports wide ranges
- [x] Every draw the subgraph reports as committed is cross-checked against a matching event; a
      discrepancy is surfaced as an error and never absorbed into a `NO VOTE` cell, which would blame
      an agent juror that committed on time
- [x] Reveal latency is the cell's headline: the largest figure in it, and the only one in heading ink.
      Commit latency sits directly below, in the same unit and on the same scale, at a lower weight and
      a dimmer ink, so it reads as context for the reveal rather than as a competing figure
- [x] Both latencies ride one shared rail, logarithmic from 1s to 1h, so that a reveal measured in
      seconds and a commit measured in tens of minutes are both visible on it. The rail is decoration
      only — every value it carries is printed as a number beside it, so removing it loses nothing
- [x] A draw that committed but has not revealed renders its reveal slot as pending while the vote
      period is open, and as a missed reveal once that period has closed, never as blank — and either
      state is carried by a glyph and a word before it is carried by a colour, per ADR-0006
- [x] Tested against fixtures, including a case where a commit event is missing for a draw the subgraph
      reports as committed

## Comments

### From ticket 05, 2026-08-25 — what is already built and what it left you

**The cell, the rail and the legend all exist; the commit line does not.** `src/performance/`
holds the seam (`performance.ts`), the presentation table (`cell.ts`) and the view
(`Matrix.tsx`). The reveal line is `Measure` / `MeasureKey` / `MeasureValue` / `Rail` in
`Matrix.tsx`; the commit line is the same block with `theme.accentQuiet` on the fill and no
heading ink. `railFraction` in `latency.ts` is already the shared log scale — 1s to 1h, floored at
2% — so both measures ride it without a second function.

**The legend deliberately keys only the reveal rail.** Ticket 05's criterion asked for both; a
legend key for a rail no cell carries would name a measurement the page has not made. The comment
marking where the commit key goes is in `Matrix.tsx`, in the legend's second `LegendGroup`.

**`NO VOTE` is already conservative, which is the half of your cross-check the model gives you.**
It is asserted only when the vote period has closed with nothing revealed — never from a missing
commit. So a truncated log scan cannot turn into a false `NO VOTE` through the *state*; it can
only turn into a missing commit figure. Your cross-check is about the figure, and the place to
surface it is the failure envelope `buildCourtPerformance` already returns.

**Add your logs to `RawCourtData`, not beside it.** The seam takes one value and derives
everything; `RawCourtData` is where `CommitCast` logs belong, so the derivation stays in one pure
function. Its result envelope is `KlerosResult`, and every rejection today is data that would
otherwise produce a confident wrong number.

**The live family has three stages, not two.** `awaiting`, `committed`, `revealed` — see
`LiveStage` in `performance.ts`. A draw that has committed and not revealed is already worded
`COMMITTED`, from the subgraph's boolean; your work adds *when*, not *whether*.

### Closing notes, 2026-08-25 — what was built, and where it departed from the brief

**The cross-check is a count on the model, not a failure of it.** Ticket 05's note above pointed at
`buildCourtPerformance`'s failure envelope. That was not taken: a single missing log would have
blanked sixteen rows of reveal latency and coherence that are read from the subgraph and are
perfectly true. `CourtPerformance.commitCoverage` is `{read, expected, resolved}` instead — the same
shape ticket 04 uses for unresolved titles, plus a flag for whether the read has happened at all,
and what `docs/knowledge/chain-and-subgraph.md` prescribes for a read that comes back short. The matrix names the count in a rose notice, the cell wording carries it as
`Unknown`, and ticket 13 raises it to the blocking banner it classifies the endpoint as deserving.
Nothing is absorbed; a thrown error remains the case where the count is zero.

**`Draw.committed` had to be added.** The cell's wording turns on the difference between committed
with no moment (a log this dashboard failed to read) and not committed with the window closed (an
agent juror that failed to act). The state enum alone cannot separate them: a `no-vote` draw may
have committed and then failed to reveal. Without the flag, `Missed` would appear under a
commitment that happened, which is the one outcome ADR-0004 exists to prevent.

**A commitment predating its round is dropped, not rejected.** Unlike a reveal, a commitment has a
round to belong to and the log does not say which, so `commitAt` picks the earliest timestamp at or
after that round's commit period opened. That makes a negative latency structurally impossible
rather than something to detect, and an earlier round's commitment is simply not selected. It then
counts as a shortfall, which says the same thing without putting a negative duration on a page.

**An unfinished read is not an empty one, and review caught that it was being reported as one.**
Because the matrix does not wait on the chain, `commitCoverage` was computed from `[]` for the
first second of every load and the page announced that all 56 commitments had failed to read.
`RawCourtData.commits` is now `readonly RawCommitCast[] | null` and the notice is gated on `read`.
Two tests pin the distinction, because the resolved count is identical in both states — which is
what made it invisible.

**Measured, on the day this landed:** 56 commitments across disputes 151–166, every one matching a
committed draw and none missing. Latency 14s to 3,236s; dispute 151 holds both ends of the range
the canvas was drawn against, 2m 06s and 53m 56s.
