# The dispute page shows moments, and reads its own

Decides stage 3 of issue #8 (#13, 2026-11-20): what the dispute page shows of when things
happened, and what is left of the Arbitrum `CommitCast` scan. Amends ADR-0004 on scan ranges, and
closes the options ADR-0010 and ADR-0011 left open.

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

Moments and never durations. Each entry is a UTC clock reading (`14:02:11`), and nothing on the
strip counts the seconds between an opening and an agent juror acting. That count is latency, and
a column of five latencies under one period is the side-by-side comparison ADR-0010 and ADR-0011
removed. UTC rather than the reader's zone, so that a cited page reads the same for everyone. The
day is printed on the creation and on any moment that falls on a later UTC day.

**Who opened a period is named only when it is an agent juror on the roster.** `passPeriod` is
permissionless and anyone may call it. The account that sent the transaction is matched against
the roster by address. A match is named, as the panel names it. Anyone else is "an off-roster
account", and the address never reaches the page. This is the same rule as an off-roster draw: a
kind or a count, never who.

**The scan reads for the view that shows its result, and never for the court.**

- The dispute page reads its own dispute: `NewPeriod` from KlerosCore and `CommitCast` from the
  dispute kit, filtered on the dispute id, plus one transaction per opening for its sender. The
  range is the dispute's own blocks, from its first draw to the block its execution period opened
  in (or to the head while it runs), so the read is one window and a handful of calls.
- The agent juror page reads its one agent juror's commitments, from court 34's creation block to
  the head, so its table keeps each draw's commit figure as ADR-0011 decided.
- The matrix reads nothing from Arbitrum except the court's parameter history.

Both reads are keyed on what the court read reports, and are read again when it moves, never on a
clock: a new period, or a draw the subgraph newly reports as committed.

**Every scan is bounded and cut into windows.** No scan starts at block 0, and no topic takes a
list. Each one starts at a block the subgraph or the court's history fixes, and is cut into
windows no wider than 10,000,000 blocks (`LOG_RANGE_LIMIT`, `scanBlocks` in `arbitrum.ts`). The
parameter history now starts at court 34's creation block too.

`CommitCoverage` leaves the court model with the scan. Each view counts its own shortfall: the
agent juror page over its draws, the dispute page over its commitments and its openings. A
shortfall is counted only once a read answers for the dispute or the agent juror as the court now
reports it. A read standing in while a newer one is in flight has not fallen short.

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
- **Keep the agent juror page's commit column, or drop it so only the dispute page scans.** Kept,
  as ADR-0011 decided, with a scan of one agent juror. Dropping it remains open to the maintainer;
  it would leave the parameter history as the only scan that grows with the court's age, by one
  window a month.
- **Name every opener by address.** Rejected under the invariant above. The account most often
  seen opening periods is off the roster, and who runs it is not this dashboard's to say.

## Consequences

- `Dispute.dc.html:87-96` now draws the timeline, amended in place so its line citations hold.
  Its panel cards still draw `R` and `C`, which ADR-0011 overruled; those are unchanged.
- The dispute page makes two reads of its own: `useDisputeDetail` and `useDisputeChain`. The detail
  read now carries the dispute's block range, and reads again once when the court sees a first
  draw it predates. Without that, the chain read would have no range until the first reveal.
- A failure of the chain read raises the Arbitrum banner on the dispute page, worded together with
  the parameter history when both fail. A failure of the agent juror's read raises it on that page.
- Nothing here re-times a period or a latency, and every per-draw figure is as it was.
- The live suites read one agent juror and one dispute rather than the roster: fewer calls, and
  they now pin dispute 156's record against its captured fixture.
