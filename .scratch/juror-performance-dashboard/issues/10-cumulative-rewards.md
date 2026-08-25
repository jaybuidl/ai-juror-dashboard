# 10: Show what each agent juror has earned

**What to build:** A visitor sees cumulative ETH and PNK per agent juror — participation and
coherence expressed economically — as supporting context beside the marginals, not as a ranked
dimension.

**Blocked by:** 06

**Design:** `../canvas/Main.dc.html:136-152` (ETH and PNK as the last two of the six rows in each
agent juror's column header), `../canvas/Juror.dc.html:70-82` (the same two figures on the
per-agent-juror stat card), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Reward shifts are read per agent juror, scoped to court 34
- [ ] Cumulative ETH and PNK render as the last two of the six rows in each agent juror's matrix column
      header, under the same hairline as the four marginals ticket 06 puts there — not in a summary
      column of their own
- [ ] This ticket adds only those two rows: the column header, its hairline and the other four
      marginals are ticket 06's and are not rebuilt here
- [ ] Amounts render at a fixed precision per token rather than as raw integers — four decimal places
      for ETH, two for PNK, so a column of them aligns
- [ ] Wherever a net PNK figure is shown, its sign is carried by a sign character in the value itself
      and never by colour alone — see
      ADR-0006
- [ ] An agent juror that has been drawn but earned nothing shows a real zero. One that has never been
      drawn shows a dash in both figures, matching ticket 06's rule for the marginals beside them: a
      zero is a measurement and a dash is the absence of one
- [ ] Rewards are not ranked and do not reorder anything

### From ticket 12, 2026-08-25 — your read is not persisted until you say so

**`PERSISTED_QUERIES` in `src/persistence.ts` is an allowlist.** The query cache is written to
`localStorage`, and a new query is not persisted until it is named there. Two questions to answer
before adding one, both learned the hard way:

1. **Does the value survive `JSON.stringify`?** No `Map`, no `Set`, no `bigint`, no `Date`. The
   dispute-templates query holds a `Map`, which serialises to `{}` and restores as an object with
   no `get` — every row would have rendered untitled, with nothing thrown anywhere. Rewards read
   from a chain, so a `bigint` reaching storage is the live risk here; it throws on the way out
   rather than degrading quietly, which is better but still not a production discovery.
2. **Does a *failed* read of it produce a successful query?** If it has a fallback, it does. The
   ENS identities were dropped from the allowlist for exactly this: a mainnet failure returns the
   checked-in roster entry, so the query succeeds, and persisting it re-served one bad load for an
   hour across reloads.

**Anything derived inside a query function is a third question.** `stripDerived`/`rederive` in the
same file exist because `useDisputes` models inside its query function, so a cache could otherwise
serve yesterday's definition of a ruling to today's code. If your query function shapes its result
rather than returning the payload, extend those two rather than trusting the version constant.
### From ticket 13, 2026-08-25 — a new read is three entries, not one

Every read this ticket adds needs somewhere to fail out loud, and the plumbing exists:

- **A name in `SOURCES`** (`src/read-failure.ts`) — the deployment or host a reader could go and
  check, not a description of it. Throw a `ReadFailure` carrying it and the banner gets a status
  line for free; anything else prints "No response", which is the honest answer rather than a gap.
- **A tier in the view's `failuresOf`** — `blocking` if the failure costs a figure, `degraded` if it
  costs only a label. ENS is the only documented exception, so a new read is almost certainly loud.
- **A `what` sentence** saying what the reader loses. It is printed in the banner beside the source,
  and it is the half a reader acts on.

Then two things that are easy to miss. `affects(failures, source)` is what decides whether an
aggregate is labelled partial, and it is **per source**: ask whether the endpoint behind *your*
figure failed, never whether anything on the page did. A page-wide flag was the first cut and it
labelled every stat tile partial over a missing dispute title, contradicting a notice a few hundred
pixels below it. And per `CLAUDE.md`, a new read is another query that can drift out of step with
the ones beside it — check its own error, and where a figure joins two reads, say which half is
stale rather than that "the court" is.
