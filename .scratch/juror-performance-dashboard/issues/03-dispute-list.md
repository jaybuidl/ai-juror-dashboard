# 03: List every dispute in the court

**What to build:** A visitor sees every dispute in court 34 as a row, newest first, showing its core
dispute ID, current period, and ruling where one exists.

**Blocked by:** 01

**Design:** `../canvas/Main.dc.html:131-134` (newest first, and the axes),
`../canvas/Main.dc.html:156-173` (the dispute row header), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Disputes are read from the Kleros v2 core subgraph, scoped to court 34
- [ ] Each dispute's round timeline — the observed moments each period opened — is fetched alongside it,
      since every later latency measurement depends on it
- [ ] Each row is headed by two lines: the core dispute ID alone on the first, everything else on the
      second
- [ ] The second line carries the dispute's category, then its ruling, then a `Panel N` pill giving the
      number of agent jurors drawn in that dispute — the category arrives with ticket 04, and this
      ticket leaves the slot for it
- [ ] The second line ends with a flag pill where one applies — a caveat carried by the dispute, or the
      period a still-live dispute is currently in — and carries no pill at all otherwise
- [ ] A dispute with no ruling yet reads as pending where the ruling sits, never as a blank
- [ ] The default subgraph endpoint requires no key, and is overridable by configuration
- [ ] Disputes are ordered newest core dispute ID first, and that order is a property of the model
      rather than of the order the subgraph returned rows, so it does not shift between loads
