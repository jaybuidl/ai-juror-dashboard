# 05: The matrix answers the question, from subgraph data alone

**What to build:** A visitor sees the dispute matrix working end to end — one row per dispute, one
column per agent juror, each cell showing that draw's reveal latency and coloured by whether the
draw was coherent. This is the first ticket where the dashboard answers the question it exists to
answer, and it does so without touching an RPC.

This ticket establishes the seam described in the spec: one pure function turning raw fetched data
into the dashboard model, with every subtle derivation inside it and no network or clock anywhere
near it. Respect ADR-0001 (latency in seconds) and ADR-0002 (coherence per draw).

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] A pure function converts raw fetched data into the dashboard model, returning agentkit's result
      envelope. It performs no I/O and reads no clock
- [ ] Reveal latency is derived per draw as seconds between the moment the vote period opened and the
      moment the reveal was recorded
- [ ] Latency is held in seconds; short latencies display in seconds and long ones in minutes
- [ ] Coherence is computed per draw against the dispute's final ruling, never taken from the
      subgraph's global aggregate
- [ ] Several vote IDs held by one agent juror in one dispute collapse to a single draw
- [ ] Coherence is only asserted for disputes that have a final ruling
- [ ] A cell for an agent juror not drawn in that dispute renders blank, distinctly from any other state
- [ ] A cell for an agent juror that was drawn but did not act renders distinctly from blank
- [ ] The pure function is tested against fixtures captured from the real disputes, with no network and
      no mocks, covering: the vote-to-draw collapse, an absent justification, and an agent juror never drawn
- [ ] Rows are disputes and columns are agent jurors, so the matrix grows downward as disputes accumulate
