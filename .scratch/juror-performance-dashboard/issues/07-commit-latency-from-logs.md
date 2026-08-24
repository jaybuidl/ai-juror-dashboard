# 07: Show how fast each agent juror committed

**What to build:** A visitor sees both halves of the speed dimension in every cell — commit latency
alongside reveal latency. Commit timestamps do not exist in the subgraph, so they are recovered from
chain event logs. See ADR-0004.

Because a truncating endpoint would produce a missing commit rather than an error — rendering as a
false "did not commit" for an agent juror that committed on time — this ticket also builds the
cross-check that makes that impossible to miss.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Commit events are read from an Arbitrum endpoint, filtered by dispute and by agent juror
- [ ] Commit latency is derived per draw as seconds between the moment the commit period opened and the
      moment the commitment was mined
- [ ] Scans are unchunked, per the decision to use an endpoint that supports wide ranges
- [ ] Every draw the subgraph reports as committed is cross-checked against a matching event; a
      discrepancy is surfaced as an error and never absorbed into a "did not commit" cell
- [ ] Cells show both latencies, distinguishable at a glance
- [ ] Tested against fixtures, including a case where a commit event is missing for a draw the subgraph
      reports as committed
