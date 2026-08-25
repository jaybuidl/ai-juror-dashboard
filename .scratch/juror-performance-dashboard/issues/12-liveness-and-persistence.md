# 12: Watch a live dispute without refetching history

**What to build:** A team member monitoring an active dispute sees it update as agent jurors act,
while finalised disputes are neither refetched nor re-scanned — including across a page reload. A
live dispute also has to *look* live: the row, the cells in it and the count in the matrix's corner
all say so, and none of them may say it by leaving something blank.

This ticket wires the data that makes the live cell state occur; it does not build that state.
Ticket 05 builds the cell and its five renderable states, the live one among them. The boundary is
the seam: everything here is supply — what refreshes, what counts as finalised, what persists — and
the surfaces below are what that supply is required to change.

**Blocked by:** 05, 07

**Design:** `../canvas/Main.dc.html:131-133` (the finalised-versus-live count) and `:302-306` (the
live row's rail, tint and flag pill), `../canvas/Cell.dc.html:144-154` (the live cell state),
`../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Data refreshes on a five-second interval while any dispute is unfinalised
- [ ] A dispute is treated as finalised once its period is execution
- [ ] Finalised disputes are not refetched and their commit event scans are not repeated
- [ ] Finalised results persist across a page reload, so returning to the dashboard is fast
- [ ] Persisted results are keyed so that a change to how a metric is derived does not serve stale
      values computed by an older definition
- [ ] Watching a live dispute does not re-request the whole history
- [ ] An unfinalised dispute's row is distinguishable from a finalised one without reading it: a
      coloured left rail, a faint tint across the row, and a flag pill marking it live
- [ ] The flag pill names the period that is open and how long it has been open, so the row carries
      the elapsed time and not only the fact of being live
- [ ] That elapsed time is computed above the seam, since the pure function of ticket 05 reads no clock
- [ ] The corner of the matrix says how many disputes are finalised and how many are live, so the
      count is itself a liveness surface rather than a bare total
- [ ] Every draw in an unfinalised dispute reaches the view marked live, so that the live cell state
      ticket 05 builds is the one that renders — this ticket supplies that state, it does not draw it
- [ ] The model says which step each live draw has reached — committed but not yet revealed, or drawn
      and not yet acted at all — because ticket 05's live cell words itself from that
- [ ] A latency that has not happened yet arrives as pending rather than as absent, so that ticket 05's
      live cell can dim it to pending ink and dash it — a value arriving absent would render blank, and
      blank means the agent juror was not drawn
- [ ] A dispute that finalises while the page is open loses its live treatment on the next refresh,
      without a reload

## Comments

### From ticket 05, 2026-08-25 — the live flag has a slot waiting for it

**`ROW_FLAGS` in `src/performance/Matrix.tsx` is the mechanism, with the precedence documented in
place:** window (ticket 08), then lone panel (built), then live (yours). Each is one entry in that
array — an object with `applies`, a glyph, a label and a tone — and the row renders the first that
matches. Adding the live flag is an entry, not a change to the markup, and the commented
placeholder is already on the line below the lone panel.

**The live cell states are built and already occurring.** `awaiting`, `committed` and `revealed`
are stages of `LiveStage` in `performance.ts`, driven entirely by the model: whether the vote
period has opened, whether a commitment is recorded, whether a justification exists. Nothing waits
on a refetch interval — disputes 164–166 render as live today from a single read.

**`useCourtPerformance` holds a plain 60s staleTime and no interval**, matching `useDisputes`. Both
read the same court and there is nothing to gain from one being fresher than the other, so if you
give one a 5s interval, give both.

**A finalised row is one whose dispute has a ruling, not one whose period is `execution`.** The
matrix's own caption counts them that way (`ruling.state !== "pending"`), for the reason ticket 03
recorded: the subgraph reports a `currentRuling` for a dispute still in its appeal period.

### From ticket 07, 2026-08-25 — persistence now has a second reason, and a refetch interval has a cost

**The commit read costs one RPC call per commitment, and the endpoint rate-limits per call.**
`fetchCommitCasts` makes one `eth_getLogs` and then one `eth_getBlockByNumber` per commitment,
because the log's own `blockTimestamp` is always `"0x0"` on this endpoint and the block is the only
source of the moment. Measured: 62 blocks read three times over inside a second returns HTTP 429.
One page load a minute is nowhere near that; **a 5s refetch interval is**, and it would take the
commit line down for whoever is looking. If you shorten the interval, give the commit query its own
longer one, or gate it on the dispute set having changed.

**Persisting finalised rows now saves an RPC call per commitment, not just a subgraph round trip.**
A finalised dispute's commitments can never change, so a cache of them is exactly the thing that
keeps this read bounded as the court grows past the ~200 disputes where a single cold load starts
approaching the rate limit. That is the strongest argument this ticket has acquired.
