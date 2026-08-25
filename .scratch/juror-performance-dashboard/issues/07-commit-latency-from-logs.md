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

**Status:** ready-for-agent

- [ ] Commit events are read from an Arbitrum endpoint, filtered by dispute and by agent juror
- [ ] Commit latency is derived per draw as seconds between the moment the commit period opened and the
      moment the commitment was mined
- [ ] Scans are unchunked, per the decision to use an endpoint that supports wide ranges
- [ ] Every draw the subgraph reports as committed is cross-checked against a matching event; a
      discrepancy is surfaced as an error and never absorbed into a `NO VOTE` cell, which would blame
      an agent juror that committed on time
- [ ] Reveal latency is the cell's headline: the largest figure in it, and the only one in heading ink.
      Commit latency sits directly below, in the same unit and on the same scale, at a lower weight and
      a dimmer ink, so it reads as context for the reveal rather than as a competing figure
- [ ] Both latencies ride one shared rail, logarithmic from 1s to 1h, so that a reveal measured in
      seconds and a commit measured in tens of minutes are both visible on it. The rail is decoration
      only — every value it carries is printed as a number beside it, so removing it loses nothing
- [ ] A draw that committed but has not revealed renders its reveal slot as pending while the vote
      period is open, and as a missed reveal once that period has closed, never as blank — and either
      state is carried by a glyph and a word before it is carried by a colour, per ADR-0006
- [ ] Tested against fixtures, including a case where a commit event is missing for a draw the subgraph
      reports as committed
