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
- [ ] Each row is headed by two lines: the core dispute ID leads the first, with the title arriving
      beside it in ticket 04; everything else sits on the second
- [ ] The second line carries the dispute's category, then its ruling, then the panel size. The
      category arrives with ticket 04 and the panel size with ticket 05, so this ticket builds the two
      slots in that order and leaves each for the ticket that fills it
- [ ] The second line ends with one flag-pill slot, empty unless a flag applies. Ticket 05 builds the
      flag mechanism and its precedence; this ticket only reserves the position it occupies
- [ ] A dispute with no ruling yet reads as pending where the ruling sits, never as a blank
- [ ] The default subgraph endpoint requires no key, and is overridable by configuration
- [ ] Disputes are ordered newest core dispute ID first, and that order is a property of the model
      rather than of the order the subgraph returned rows, so it does not shift between loads
