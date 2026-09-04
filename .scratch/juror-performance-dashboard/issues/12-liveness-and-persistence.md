---
status: done
blocked_by: ["05", "07"]
---

# 12: Watch a live dispute without refetching history

**What to build:** A team member monitoring an active dispute sees it update as agent jurors act,
while finalised disputes are neither refetched nor re-scanned — including across a page reload. A
live dispute also has to *look* live: the row, the cells in it and the count in the matrix's corner
all say so, and none of them may say it by leaving something blank.

This ticket wires the data that makes the live cell state occur; it does not build that state.
Ticket 05 builds the cell and its five renderable states, the live one among them. The boundary is
the seam: everything here is supply — what refreshes, what counts as finalised, what persists — and
the surfaces below are what that supply is required to change.

**Design:** `../canvas/Main.dc.html:131-133` (the finalised-versus-live count) and `:302-306` (the
live row's rail, tint and flag pill), `../canvas/Cell.dc.html:144-154` (the live cell state),
`../canvas/README.md` for provenance

- [x] Data refreshes on a five-second interval while any dispute is unfinalised
- [x] ~~A dispute is treated as finalised once its period is execution~~ **Amended on
      implementation: a dispute is finalised once the court has ruled on it.** See § How it was
      built. The spec's Liveness paragraph carried the same wording and has been amended with it.
- [x] Finalised disputes are not refetched and their commit event scans are not repeated
- [x] Finalised results persist across a page reload, so returning to the dashboard is fast
- [x] Persisted results are keyed so that a change to how a metric is derived does not serve stale
      values computed by an older definition
- [x] Watching a live dispute does not re-request the whole history
- [x] An unfinalised dispute's row is distinguishable from a finalised one without reading it: a
      coloured left rail, a faint tint across the row, and a flag pill marking it live
- [x] The flag pill names the period that is open and how long it has been open, so the row carries
      the elapsed time and not only the fact of being live
- [x] That elapsed time is computed above the seam, since the pure function of ticket 05 reads no clock
- [x] The corner of the matrix says how many disputes are finalised and how many are live, so the
      count is itself a liveness surface rather than a bare total
- [x] Every draw in an unfinalised dispute reaches the view marked live, so that the live cell state
      ticket 05 builds is the one that renders — this ticket supplies that state, it does not draw it
- [x] The model says which step each live draw has reached — committed but not yet revealed, or drawn
      and not yet acted at all — because ticket 05's live cell words itself from that
- [x] A latency that has not happened yet arrives as pending rather than as absent, so that ticket 05's
      live cell can dim it to pending ink and dash it — a value arriving absent would render blank, and
      blank means the agent juror was not drawn
- [x] A dispute that finalises while the page is open loses its live treatment on the next refresh,
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

## How it was built

### Finalised means ruled, not `execution` — an amendment, made deliberately

The acceptance criterion and `spec.md` § Liveness both said a dispute is finalised once its
period is `execution`. Both were written before disputes 164–166 were observed sitting in
`appeal` with every draw revealed and `ruled: false`, and ticket 05's comment above already
recorded the disagreement. The predicate implemented is `ruling.state !== "pending"`, in
`src/disputes/liveness.ts`, and the reasoning is in the doc comment there. In short:

- **As a display predicate** the period version contradicts the page already shipped. The matrix
  caption has counted finalised rows as `ruling.state !== "pending"` since ticket 05, and the
  seam gives every draw in an unruled dispute a `live` state. A caption calling a dispute
  finished while its own cells read `Revealed` is the page disagreeing with itself.
- **As a caching predicate** it is unsafe. Entering `execution` is not the last thing that
  happens to a dispute — `ruled` and `currentRuling` are written when someone executes it — so
  freezing there caches a ruling the court has not reached.

Cost of the stricter predicate, recorded because it is real: a dispute nobody ever executes
stays live for ever and is polled for as long as someone is looking at it. react-query does not
poll a hidden tab, which is what makes that acceptable. It spends requests rather than stating
a result, which is the right way round for a page that may be cited.

`spec.md:103-104` has been amended to match, rather than left to contradict the code.

### What "not refetched" was taken to mean, and what was left alone

Two of the criteria — "finalised disputes are not refetched and their commit event scans are not
repeated" and "watching a live dispute does not re-request the whole history" — cannot be met
literally without splitting the subgraph reads by finalisation, and that was deliberately not
done. What was done instead:

- **The Arbitrum scan is the cost that matters and it is now nearly free to repeat.**
  `src/performance/block-times.ts` remembers block timestamps in `localStorage`. A block's
  timestamp cannot change, so the cache has no staleness to reason about and no invalidation to
  get wrong — it caches a fact of the chain rather than a figure derived from one. A repeat scan
  falls from one `eth_getLogs` plus one `eth_getBlockByNumber` per commitment (57 calls today)
  to one `eth_getLogs` plus only the blocks never seen before, typically one or two. That is the
  per-call rate limit ADR-0004 measured, removed as a constraint.
- **The commit query is still not on an interval**, per ticket 07's warning above. It is gated
  on the draw set changing, which is the other option that comment offered.
- **The two subgraph reads are still whole-court, once every five seconds while anything is
  live.** Splitting them into "finalised, cached" and "live, polled" needs a merge, a way to
  notice a dispute that became finalised between polls, and a way to notice new disputes. Each
  is a place where a dispute can silently go missing, and a read that comes back short throws
  nothing — the failure mode `CLAUDE.md` warns about most. One GraphQL request for nineteen
  disputes is not what this ticket was protecting against; 57 RPC calls was. If the court grows
  to where the subgraph read is itself the cost, the honest fix is paging by finalisation with
  the shortfall counted, and it should be its own ticket.

### Persistence, and the one thing that would have broken silently

`@tanstack/react-query-persist-client` with a `localStorage` persister, wired in `src/App.tsx`
and configured in `src/persistence.ts`. Two things worth knowing:

- **What is persisted is payloads, not figures.** `buildCourtPerformance` is pure and runs on
  every render, so a restored cache is re-derived by whatever the code says a latency is today.
  A cache of computed medians would need invalidating whenever anyone changed the arithmetic;
  this one does not. `PERSISTED_MODEL_VERSION` covers the residue — the three query functions
  that store a *shaped* value rather than a raw one — and `src/persistence.test.ts` pins those
  shapes so that changing one fails a test that names the constant to bump.
- **The `disputeTemplates` query is excluded, and had to be.** It holds a `Map`, and
  `JSON.stringify` renders a Map as `{}`. It would have restored as an object with no `get`,
  `templateFor` would have found nothing, and every row on the page would have rendered
  untitled — which is exactly what a dispute that never had a template looks like, the
  reclassification ticket 04 built a counted notice to prevent. Nothing throws anywhere on that
  path. So the persisted set is an **allowlist**, not a filter, and a query added by a later
  ticket is not persisted until someone names it and answers whether its value is plain JSON.
  Tickets 06, 08 and 10 each add a read; 08 and 10 read from a chain, and a `bigint` anywhere
  in either would throw on the way out — the better failure, still not one to meet in
  production.

### What the live cell states needed, which was nothing

Three criteria here — every draw in an unfinalised dispute reaching the view marked live, the
model saying which step a live draw has reached, and a latency that has not happened arriving as
pending rather than absent — were already satisfied by ticket 05 and needed no change.
`LiveStage` and `revealFigureOf`/`commitFigureOf` do all three, driven entirely by the model.

One correction to the first of them: a draw in an unfinalised dispute that let its *vote period*
close without revealing is `no-vote`, not live, and that is right. The criterion should be read
as "every draw whose period is still open", which is what the seam does. Implementing it
literally would relabel a genuine miss as still acting.

## Comments

### To ticket 08, 2026-08-25 — the row flag list now takes a computed label

`ROW_FLAGS` in `src/performance/Matrix.tsx` is unchanged in shape except that `label` is now
`(row, now) => string` rather than a string, because the live flag counts elapsed time. Your
window flag is a static one and ignores both arguments — `label: () => "8h window"`. The slot
reserved for it is still the first entry, above the lone panel, and the live flag is below both.

### To ticket 13, 2026-08-25 — two things that are now yours to fold in

**The row tint and rail are on a new `BodyRow` styled `tr`**, not on the cells, so a designed
failure state that wants to mark a row will find the mechanism already there.

**Nothing in this ticket claims the word "Unknown"** — ADR-0006 reserves it for you. A live
latency that has not happened is a dash in pending ink, as ticket 05 built it.

### To whoever adds the next read, 2026-08-25 — the persisted set is an allowlist

`PERSISTED_QUERIES` in `src/persistence.ts`. A new query is not persisted until it is named
there, and the question to answer first is whether its value survives `JSON.stringify` — no
`Map`, no `Set`, no `bigint`, no `Date`. The `disputeTemplates` exclusion above is what happens
when the answer is no and nobody checked.

### What review changed, and what it recorded

A two-axis review (standards, spec) ran before the commit. Five findings were real and fixed:

- **The ENS identities were being persisted, and a failed ENS read is a *successful* query.**
  `resolveAgentJurorIdentity` catches a mainnet failure and returns the checked-in roster entry
  with `resolvedFromEns: false`, by design. Persisted under `useRoster`'s hour of staleness with
  a restored `dataUpdatedAt`, one failed load would have been re-served for an hour across
  reloads with no retry — the page saying ENS could not be reached long after it could. Dropped
  from the allowlist, and the allowlist now asks two questions of a candidate rather than one.
- **The buster only guarded shape, and the criterion asks about derivation.** `useDisputes`
  stored `toDisputes(raw)` output, so changing what `rulingOf` counts as a ruling — the very
  predicate this ticket turns on — would have been served out of a day-old cache with nothing
  to say so. `stripDerived`/`rederive` now drop the modelled half on the way out and rebuild it
  on the way in, so the criterion holds by construction instead of by remembering to bump a
  constant.
- **`gcTime` was the five-minute default under a 24-hour `maxAge`.** The persisted cache is
  written from what is in memory, so the shorter `gcTime` would have evicted the record the
  cache exists to keep. Raised in `query-client.ts`.
- **The rail was painted from liveness; the canvas paints it from the flag.** `Main.dc.html:305`
  gives `mark` the flag's colour (amber for a lone panel or a changed window, mint for live) and
  `bg` mint only when live. A lone panel that is live now has an amber rail over a mint tint, and
  a finalised one has the rail alone. The canvas wins, per the repo rule, and this also means
  ticket 08's window flag gets its rail for free.
- **The live pill is the first pill to carry a figure**, and `Pill` set a mono family without
  the mono feature settings, so the elapsed time rendered with a plain zero beside slashed ones
  everywhere else. Declared on `Pill`.

Recorded rather than changed:

- **The pill is lost when a higher-precedence flag applies**, so "a coloured left rail, a faint
  tint across the row, and a flag pill" is met in full only where no other flag does. That is the
  canvas's own precedence (`window` → `lone` → `live`) and `Matrix.test.tsx` pins it; the rail and
  the tint are unconditional, so the row is still marked.
- **The finalised/live count is computed in the view, not in `CourtTotals`.** `CLAUDE.md` says a
  court-wide number belongs in the aggregate. It predates this ticket — ticket 15 put the
  `finalised`/`running` count in `Matrix.tsx` — and moving it means editing `totals.ts` while
  tickets 08 and 13 are open on the same file. **Ticket 06** is the natural place to move it, as
  it is already adding marginals to that module.
- **Everything is persisted, not only the finalised half.** The criterion says "*finalised*
  results persist". Splitting the payload by finalisation is the same silent-loss risk as
  splitting the read, so the whole payload is kept and the live rows are corrected by the poll
  within five seconds. A restored live row can therefore print an elapsed figure from a
  `lastPeriodChange` that has since moved, for less than one interval.
- **`PERSISTED_MAX_AGE_MS` was not asked for by ticket or spec.** A day, as a backstop for a tab
  reopened after a week. The provenance footer already labels old data with when it was read, so
  this is about when restoring stops being worth it rather than about staleness.

### Verified

`yarn verify` (lint, types, 293 offline tests) and `yarn test:integration` (6 live suites, 24
tests, against Goldsky, Arbitrum and mainnet). `src/performance/liveness.integration.test.tsx` is
new and renders the real court, asserting that the rows the model calls unfinalised are exactly
the rows wearing the flag — a correspondence rather than a count, so it does not expire the week
the court finishes everything it holds.

**Not verified: the page in a browser.** `agent-browser` was unusable in this session — the
daemon returned stale content from a tab, then failed every screenshot and most selector queries.
What that leaves unconfirmed is the *appearance* of the rail and tint (the row tint uses
`color-mix`, which no test here evaluates) and the polling actually firing in a real browser.
The reasoning for the latter: `useDisputes` reads `dataUpdatedAt`, which react-query tracks, so
every successful poll re-renders the tree and the pill re-reads the clock. It should be watched
once on a real page before this is trusted.
### From ticket 13, 2026-08-25 — three things persistence now has to carry

**The draws query no longer returns a bare array.** It is
`{ draws, requestedAt }`, and `requestedAt` is stamped *before* the request goes out. That is
deliberate and it is the input to `RawCourtData.drawsReadAt`, which decides whether a row's draws
were read at all (`MatrixRow.read`). Dating the read by react-query's `dataUpdatedAt` — when the
answer arrived — classifies a dispute created *during* the request as read, and it then renders as
six blank "not drawn" cells: an unread state rendering as a fact about the court. Whatever this
ticket does to that query, the moment must stay the request's start.

**Persisting a draws read across sessions makes two latent bugs live.** Both were found by review
on ticket 13 and both are fixed, but they are fixed *because* this ticket is coming:

- `emptyColumns` in `Matrix.tsx` used `readRows.every(...)`, which is vacuously true on an empty
  array — a court whose every row was unread would have reported all six agent jurors as never
  drawn, on no evidence at all. Guarded now. Restoring a day-old draws read beside a fresh dispute
  list is the way to reach it.
- The whole `MatrixRow.read` mechanism matters far more once a draws read can be hours old rather
  than a minute. Today the drift window is one `staleTime`; after this ticket it is however long a
  persisted read survives.

**`retry` and `isPaused` are on both `DisputesView` and `CourtPerformanceView` now.** The retry
refetches every query behind a view, and the banner is computed from their state — so it clears by
the read succeeding, with nothing to dismiss. A refetch interval must not fight that: a banner that
disappears on its own schedule rather than on a successful read is a caveat that comes and goes,
which `CLAUDE.md` says teaches a reader to ignore caveats.
