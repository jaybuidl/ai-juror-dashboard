# react-query, caching and persistence

Reads that drift apart, flags that lie while a read is in flight, and what may and may not be
persisted to `localStorage`.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **Two reads that failed at different moments render as one page that was read at the later one.**
  react-query keeps what it already holds when a refetch fails, which is the right behaviour and is
  why the matrix survives a flaky subgraph — but the dispute read and the draw read are separate
  queries, so one can succeed while the other keeps hour-old data. The page then joins a fresh
  dispute list to stale draws, and a dispute created since that draw read has *no cells* — which
  this design defines as "not drawn", an unread state rendering as a fact about the court. Found by
  review on ticket 15, where both the notice and the provenance footer keyed on `disputes.error`
  alone and said nothing about `performance.error`. Every ticket that adds a read — 06, 07, 08, 10
  — added another pair that can drift apart, and ticket 10's is now the fourth query on the matrix
  page, and ticket 12's five-second poll means they now drift
  apart *repeatedly* rather than once per load. Check *each* query's error, and say which half is
  stale rather than that "the court" is.
- **A flag that is false while a read is in flight is not a flag that the read failed.**
  `RosterView.isResolvedFromEns` is false during the mainnet lookup *and* after it fails, so a
  caveat keyed on it alone announces "ENS could not be reached" for the length of every cold load
  and then retracts it — and a caveat that comes and goes teaches a reader to ignore caveats.
  `isResolving` is the other half and both are required. This bit three call sites on ticket 15,
  including one pre-dating it in `Roster.tsx`, and the fixture hid it by hard-coding
  `isResolving: false` for a state whose own comment said it covered both. It applies to every
  caveat any ticket writes from here on. It is the **same shape** as `commitCoverage.read` and as
  `commitFigureOf`'s `scanned` argument: an absence only becomes a failure once there has been an
  answer to fall short of, and every one of these three is a "the read has happened" flag guarding
  a "the read came up empty" test. Ticket 13 reintroduced the bug a third time — converting the
  commit slot to rose put "Not read" on all 56 cells for the length of every cold load — so assume
  any new emptiness test needs its own gate and write the test for both directions. Ticket 08's
  `parameters.read` is the fourth of them.
- **`JSON.stringify` turns a `Map` into `{}`, and the query cache is persisted as JSON.** Ticket
  12 persists react-query's cache to `localStorage`, and `useDisputes`'s templates query holds a
  `Map<number, DisputeTemplate>`. Persisted, it comes back as an object with no `get` on it,
  `templateFor` finds nothing, and **every row on the page renders untitled** — which is exactly
  what a dispute that never had a template looks like, the reclassification ticket 04 built a
  counted notice to prevent. Nothing throws at write time or read time. This is why the persisted
  set in `src/persistence.ts` is an **allowlist** and not a filter: a query is not persisted until
  someone names it and answers whether its value survives a JSON round trip — no `Map`, no `Set`,
  no `bigint`, no `Date` — and then whether a *failed* read of it succeeds, which is what kept the
  ENS identities out. Ticket 08's `courtParameters` was admitted on those terms when the two
  branches were merged, and ticket 10's `courtRewards` on the same two. That one is worth keeping
  as the example, because the expected answer was wrong: the amounts are `bigint` in the model, so
  it looked like the first `bigint` payload here — and the subgraph serves every one of them as a
  decimal **string**, with the parsing inside the pure seam where nothing is stored. Asking is what
  showed that; assuming would have kept a perfectly safe read out of the cache.
- **Persisting a *derived* value means today's code reads yesterday's shape.** The seam is pure and
  re-derives every figure on load, so persisting payloads needs no invalidation when the arithmetic
  changes — that is the whole safety argument for the cache. But three query functions store a
  shaped value rather than a raw one (`toDisputes` inside `useDisputes`, `toDisputeTemplates`, and
  the reduction in `fetchCommitCasts`), deliberately, because they throw on payloads they cannot
  read. A field added to `Dispute` therefore arrives `undefined` on every restored row, and
  `undefined` is what this dashboard draws as "not drawn", "no title" and "not read".
  `PERSISTED_MODEL_VERSION` busts the cache and `src/persistence.test.ts` pins those three shapes
  so that changing one fails a test naming the constant to bump. It is only a guard if the shapes
  stay pinned.
- **A disabled react-query query is `pending` for ever, and that is the fourth face of the
  "flag that is false while a read is in flight" trap.** `useQuery({enabled: false})` leaves
  `status: "pending"` with no data and never resolves, so `isPending` is true for the whole life
  of a page whose read was never *started*. Ticket 09 hit it on `/disputes/latency`: the view
  correctly said the address names nothing while the footer permanently claimed the ballot was
  "still being read". `fetchStatus` is the half that tells them apart — `"idle"` for a query
  nobody asked, `"fetching"` for one in flight — and the flag a view consumes must be
  `isPending && fetchStatus !== "idle"`. As with `RosterView`, the fixture hid it by hard-coding
  the flag.
