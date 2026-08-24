# 13: Fail loudly rather than showing a half-true dashboard

**What to build:** When a data source cannot be reached, a visitor sees a prominent, unmissable
error saying so. Nobody should ever read a partly-loaded dashboard as fact — least of all on a
public deployment whose numbers may be cited.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] A failure to reach the core subgraph, the template subgraph, the Arbitrum endpoint or the
      Ethereum mainnet endpoint produces a prominent error
- [ ] The error names which source failed, so it is actionable
- [ ] Partial data is never presented as though it were complete
- [ ] A failure of ENS resolution alone is the documented exception: it degrades to roster nicknames
      rather than raising an error
- [ ] The commit cross-check discrepancy from ticket 07 surfaces through this same prominent channel
- [ ] Recovery is possible without a full page reload once the source is reachable again
