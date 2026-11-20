# A self-opened vote period is timed from when it could open

ADR-0001 measures reveal latency from the moment the vote period opened. That moment is a
`passPeriod` call, and anyone may make it: the commit-to-vote transition is allowed once the commit
window has elapsed **or** every vote ID in the round is committed (`KlerosCore.passPeriod`, which
reverts with `CommitPeriodNotPassed` otherwise). Intendant makes the call itself and reveals in the
next transaction of the same block. Measured from the opening, its reveal latency is 0s by
construction, every time, and that figure is not a measurement.

So a draw whose reveal is recorded in the same second its vote period opened is a draw that
**opened the vote period**, and its reveal latency is measured from the moment the period *could*
have opened: the earlier of the commit deadline and the panel's last commitment. Every other draw
stays measured from the observed opening.

A self-opened reveal carries a mark, `↥`, wherever its figure is printed, and the legend names it
when one is on the page. Where the could-open moment cannot be placed, the figure is `Not dated`
with the mark, never `0s`. That happens when the commitment logs have not been read, when a log is
missing, or when a committed juror is off the roster: the logs are read for the roster only, and the
deadline alone would only be an upper bound.

## Considered Options

**Everyone from when the period could open.** One definition for every draw, and it would credit an
agent juror that opens the period over one that waits for somebody else to. It was rejected on the
data. Across disputes 151–166 the gap between the panel's last commitment and the period actually
opening runs from 14s to 498s, while reveals have a median of 85s. That gap is the court waiting for
a keeper, and charging it to every draw would measure the keepers instead of the jurors.

**Flag and drop.** Print "opened the period" in place of a figure and leave the draw out of every
median. It needs no new reads, but Intendant would have no reveal latency at all, and its reaction
time to the last commitment is a real figure that compares fairly with everyone else's reaction
to the opening.

**Detecting the opener from the transaction sender.** It is exact where the same-second test is a
proxy, but it costs one more RPC per dispute against an endpoint that rate-limits per call
(ADR-0004). The proxy's false positive would be another juror revealing in the same second as a
keeper's `passPeriod`. The fastest such reveal on record is 7s, so the proxy is kept and this
paragraph is where to look if that changes.

## Consequences

Reveal latency for a self-opened draw now depends on the Arbitrum reads (the commitment logs and
the court's parameter history), which no other reveal figure does. Until those reads land the draw
reads `Not dated`, and it takes its figure once they do.

The commit window used for the deadline is the one in force when the commit period opened, with
the limit `windowsFor` already states for a period that straddles a reconfiguration.

Separately, and in the same change: a draw's reveal is dated by the **earliest** justification
across its vote IDs, not the first one met in subgraph order, which is id order and not time order.
