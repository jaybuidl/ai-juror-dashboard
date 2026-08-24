# 06: Summarise each agent juror in the margin of the matrix

**What to build:** A visitor sees, alongside the matrix, a per-agent-juror summary: its typical
latency, its coherence as a count, and how many times it has been drawn. Nobody is ranked — these
are marginals on a matrix, not a leaderboard.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] A summary column shows, per agent juror: typical latency, coherence as a count of coherent draws
      over resolved draws, and total draws
- [ ] Typical latency is a median, not a mean, so a single unusual dispute cannot distort it
- [ ] Marginals are computed inside the pure function, not in the view
- [ ] An agent juror with no draws shows an honest empty summary rather than zeroes
- [ ] Tested against fixtures, including a case proving the median is not dragged by the dispute that
      ran under different court parameters
