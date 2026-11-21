# The dispute page shows moments, and reads its own

Decides stage 3 of issue #8 (#13, 2026-11-20): what the dispute page shows of when things
happened, what the agent juror page shows in place of latency, and what is left of the Arbitrum
`CommitCast` scan. Amends ADR-0004 on scan ranges and ADR-0011 on the agent juror page, and closes
the options ADR-0010 and ADR-0011 left open.

ADR-0011 took every time off the matrix cell, the phone card and the dispute panel, and left two
questions. Should a dispute's commit and reveal moments come back on its own page, beside who
opened each period? And if they did not, the scan that dated every commitment could go. Until
now that scan read every commitment the whole roster had ever published, on every page,
including the matrix, which showed none of them.

Then, while this was being built, arb1 started refusing every scan the dashboard made (#25). Every
`eth_getLogs` ran from block 0, and the endpoint now caps one request at 10,000,000 blocks for a
topic given one value, and at 100,000 for a topic given a list.

## Decision

**The dispute page's period strip is a timeline.** Each period still says how long it ran
against its window. Below that it now lists that period's moments, in the order they happened:

- when the period opened, and who opened it;
- for each agent juror on the panel, when it committed (commit period) or revealed (vote period).

Moments, none counted from another. Each entry is a UTC clock reading (`14:02:11`), and nothing on
the strip counts the seconds between an opening and an agent juror acting. That count is latency,
and a column of five latencies under one period is the side-by-side comparison ADR-0010 and
ADR-0011 removed. (Each period's "closed in" beside its window is how long the period ran, as
before.) UTC rather than the reader's zone, so that a cited page reads the same for everyone. The
day is printed on the creation and on any moment that falls on a later UTC day.

**Who opened a period is named only when it is an agent juror on the roster, or the Kleros bot.**
`passPeriod` is permissionless and anyone may call it. The account that sent the transaction is
matched against the roster by address, and a match is named as the panel names it. The court's own
keeper, which advances a period once its time is up, is "the Kleros bot" (the maintainer's call,
2026-11-20: it is Kleros's account, and naming it shortens the routine case). Anyone else is "an
off-roster account", and the address never reaches the page. This is the same rule as an
off-roster draw: a kind or a count, never who.

**The agent juror page shows each dispute's time to appeal where the two latencies were.** Its
table of draws had kept each draw's commit and reveal latency as the per-draw record ADR-0011
decided. A column of one agent juror's latencies, on the page named after it, reads as that agent
juror's speed whatever the prose beside it says, and ADR-0010 makes time to appeal the one speed
figure (the maintainer's call, 2026-11-20). So the table shows one **Dispute's time to appeal**
column: the dispute's figure, in whole minutes, looked up from `CourtTotals` so it is the same
definition as the matrix's headline. It is the same for everyone on the panel, and the header says
"Dispute's" visibly, on the table and the phone's cards alike, as well as the caption.
No page shows commit or reveal latency as a figure any more; the moments are on each dispute's
timeline, which every row links to.

**The scan reads for the one view that shows its result, and never for the court.** The dispute
page reads its own dispute: `NewPeriod` from KlerosCore and `CommitCast` from the dispute kit,
filtered on the dispute id, plus one transaction per opening for its sender. The range is the
dispute's own blocks, from the first block anyone in it was drawn in to the block its execution
period opened in (or to the head while it runs), so the read is one window and a handful of calls.
The agent juror page and the matrix read nothing from Arbitrum except, on the matrix's behalf, the
court's parameter history.

The read is keyed on what the court read reports, and read again when it moves, never on a clock:
a new round, a new period, or a draw the subgraph newly reports as committed. The round is in the
key because a period and a count recur on appeal. The range holds every round's openings, so a
round's opening of a period is picked by its place in order, never as "the latest".

**Every scan is bounded and cut into windows.** No scan starts at block 0, and no topic takes a
list. Each one starts at a block the subgraph or the court's history fixes, and is cut into
windows no wider than 10,000,000 blocks (`LOG_RANGE_LIMIT`, `scanBlocks` in `arbitrum.ts`). The
parameter history now starts at court 34's creation block too.

`CommitCoverage` leaves the court model with the scan, and is retired. The dispute page counts its
own shortfall, over its commitments and its openings, and words each by what it costs: a
commitment not found is a moment unknown, an opening not found still has its moment and loses only
who opened it. A shortfall is counted only once a read answers for the dispute as the court now
reports it. A read standing in while a newer one is in flight has not fallen short.

**The appeal lane also says how the appeal was funded** (#32, 2026-11-21). Each side that raised
anything, what it raised in ETH, whether it was funded, and its funders by class only, under the
opener rule above: an agent juror by name, the Kleros bot, "a party" (an address under the
template's `aliases`), "the dispute creator", or "someone else". Not on the time axis, because no
contribution is dated here. Amended the same day at the maintainer's request: a funder nothing else
names is shown by its primary ENS name, a public name its holder chose and holds (reverse resolution,
forward-checked), unless it passes for an agent juror or for Kleros. Funding arrives after the
reveals, so the dispute's own read is read again when the court sees its period move, and every half
minute while its appeal period runs. The head says "Partially funded · no appeal" when one side was funded,
"Funding so far" while the period runs. An appealed round's funding moves to the top of the next
round's evidence lane, compact, so it does not drop out of view when that round starts.

## Considered Options

- **Drop the commit moments and the scan entirely.** Issue #13's other branch. Rejected because
  the dispute page is where a commit moment means something: beside the opening it follows and
  the account that opened it, it shows that Intendant opens a period and acts in it in the same
  block. Out of that context it was a latency.
- **Durations on the timeline ("+2m 07s after opening").** Rejected: those are the latencies, and
  set one under another down a period they rank the panel.
- **Roster order within a period, rather than the order things happened.** A timeline's order is
  the order of events; roster order would make one a reader cannot read as a sequence. Order by
  time is not a ranking either: it is a record of events, it carries no figure to compare, and
  ties keep roster order.
- **Keep the agent juror page's commit and reveal columns, with a scan of one agent juror.** Built
  first, and working, as ADR-0011 had decided. Replaced on review by the maintainer for the reason
  above. It also needed the only commit scan that grew with the court's age, one window a month.
- **Time to appeal per draw, or labelled as the agent juror's.** There is no per-draw time to
  appeal: a round reaches its appeal period once, for its whole panel. Labelling the column as
  the dispute's is what keeps it from reading as a measure of the agent juror.
- **Name every opener by address.** Rejected under the invariant above. The account most often
  seen opening periods is off the roster, and who runs it is not this dashboard's to say.

## Consequences

- `Dispute.dc.html:87-96` now draws the timeline, and `Juror.dc.html:113-134` and
  `JurorEmpty.dc.html:83-84` the time to appeal, all amended in place so their line citations
  hold. The dispute artboard's panel cards still draw `R` and `C`, which ADR-0011 overruled.
- The dispute page makes two reads of its own: `useDisputeDetail` and `useDisputeChain`. The detail
  read now carries the dispute's block range, and reads again once when the court sees a first
  draw it predates. Without that, the chain read would have no range until the first reveal.
- A failure of the chain read raises the Arbitrum banner on the dispute page, worded together with
  the parameter history when both fail. The agent juror page raises no Arbitrum banner.
- Nothing here re-times a period. Commit and reveal latency are still defined (`CONTEXT.md`,
  `/method`), as what the timeline declines to count, and `Draw.revealLatencySeconds` still checks
  that a reveal follows its vote period's opening before the timeline places it.
- The live suite reads one dispute rather than the roster, and pins dispute 156's record against
  its captured fixture.
