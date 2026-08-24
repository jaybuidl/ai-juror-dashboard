# 03: List every dispute in the court

**What to build:** A visitor sees every dispute in court 34 as a row, in a stable order, showing its
core dispute ID, current period, and ruling where one exists.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Disputes are read from the Kleros v2 core subgraph, scoped to court 34
- [ ] Each dispute's round timeline — the observed moments each period opened — is fetched alongside it,
      since every later latency measurement depends on it
- [ ] Rows render with core dispute ID, period and ruling
- [ ] The default subgraph endpoint requires no key, and is overridable by configuration
- [ ] Disputes appear in a deterministic order that does not shift between loads
