# Per-draw latency is a record, not a measure of speed

Supersedes the framing of ADR-0001 and the agent juror plot in ADR-0005 (2026-11-20, issue #8).

Until now this dashboard measured agent jurors on two dimensions, **speed** and coherence, and
speed meant commit and reveal latency: seconds from the moment a period opened to the moment a
draw's commit or reveal was mined. Each agent juror's column carried a median of each, its own page
carried both medians on the stat card, and a plot set its reveal latencies against the whole
court's. None of those figures measures how fast an agent juror judges a case, and the medians and
the plot set agent jurors side by side on it.

- **Commit latency does not measure deliberation.** The evidence is public from the moment a
  dispute is created and the panel is drawn during the evidence period, so an agent juror can read
  and reason from its draw until the commit period opens (the evidence period ran 45 minutes from
  20 to 26 August 2026, and 10 minutes since). A fast commit may be a vote prepared in
  advance; a slow one may be an agent that only checks the court every few minutes. The figure
  cannot tell them apart.
- **Reveal latency involves no judgment at all.** The vote was fixed at commit. What is left is how
  often the agent's runtime polls the court, and when someone called `passPeriod`.
- **The clock starts on someone else's transaction.** A period opens when any account calls
  `passPeriod`. Intendant calls it itself and reveals in the next transaction of the same block, so
  its reveal latency reads 0s. The definition is working as written: what it times is reaction to
  an opening. Re-timing only the agent jurors
  that open their own periods (draft PR #6) puts two clocks in one column.

## Decision

**Time to appeal is the one speed figure.** It is per dispute, it runs from creation to the moment
the parties can see the panel's votes, and it is the duration that matters to them. It has been the
headline since 2026-09-24.

**Commit and reveal latency are a per-draw record and are never summarised or ranked.** No median,
mean, distribution or plot of either per agent juror or court-wide; no sort or comparison between
agent jurors on them; no prose that calls them speed. Each draw's own figures stay where a draw is
shown, as a record of when it acted. This decision removes:

- the median commit and median reveal from every column header (`marginal-figures.ts`) and from
  the agent juror stat card, along with the per-agent-juror and court-wide reveal summaries that fed
  them (`totals.ts`);
- the reveal latency plot on `/agent-jurors/:nickname`, and with it the comparison band on that
  page and the † caption that qualified the plot;
- the "speed and coherence" framing on `/method`, in the README and in the page description.

ADR-0001's storage decision stands: a per-draw latency is still held in absolute seconds, and the
regime change still makes dispute 151's figures incomparable with the rest. ADR-0005's display rule
stands too: no latency is ever shown as a fraction of a window. What this ADR withdraws is the
premise both were written under, that these seconds are a speed to compare agent jurors on, and
ADR-0005's account of the agent juror plot, which no longer exists.

## Considered Options

- **Keep the medians, re-time self-openers** (#5, #6, #7). Rejected for the two-clocks problem
  above, and because it fixes one agent juror's reading of a metric that measures the wrong thing
  for all of them.
- **On-time counts** ("N of M draws committed and revealed in the window"). Already carried by the
  outcome breakdown: a draw that missed its window is **Missed** (ADR-0009). Not added as a
  separate figure.
- **Remove per-draw latency entirely.** Deferred. Whether matrix cells, dispute cards and the
  dispute panel keep their per-draw figures, and whether those moments move to a timeline on the
  dispute page, is stage 2 of issue #8. Whether the Arbitrum `CommitCast` scan survives is stage 3.
  Stage 2 was decided by ADR-0011: those three carry no time, and the agent juror page's table of
  draws keeps them.

## Consequences

- The `canvas/Main.dc.html` and `canvas/Juror.dc.html` artboards still draw the two medians and the
  latency profile. Where they disagree with this ADR, this ADR wins: the canvas decides how a figure
  looks, not whether a figure that measures the wrong thing is shown.
- The agent juror page now goes from the stat card straight to the table of draws. Nothing replaces
  the plot yet; that is an open question on issue #8.
- The comparison band is drawn only on the matrix page's time-to-appeal strip, which a phone does
  not render. A failure of the comparison court's read raises a banner only where the strip is
  drawn.
- No † is drawn anywhere: the agent juror plot's caption was its last place. `/method#window` still
  says which disputes ran under earlier windows.
