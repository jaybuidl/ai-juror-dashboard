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
