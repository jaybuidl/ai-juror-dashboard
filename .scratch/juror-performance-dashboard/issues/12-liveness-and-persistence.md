# 12: Watch a live dispute without refetching history

**What to build:** A team member monitoring an active dispute sees it update as agent jurors act,
while finalised disputes are neither refetched nor re-scanned — including across a page reload. A
live dispute also has to *look* live: the row, the cells in it and the count in the matrix's corner
all say so, and none of them may say it by leaving something blank.

This ticket wires the data that makes the live cell state occur; it does not build that state.
Ticket 05 builds the cell and its five renderable states, the live one among them. The boundary is
the seam: everything here is supply — what refreshes, what counts as finalised, what persists — and
the surfaces below are what that supply is required to change.

**Blocked by:** 07

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
- [ ] The matrix's corner cell says how many disputes are finalised and how many are live, so the
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
