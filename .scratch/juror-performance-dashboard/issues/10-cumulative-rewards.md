---
status: done
blocked_by: ["06"]
---

# 10: Show what each agent juror has earned

**What to build:** A visitor sees cumulative ETH and PNK per agent juror — participation and
coherence expressed economically — as supporting context beside the marginals, not as a ranked
dimension.

**Design:** `../canvas/Main.dc.html:136-152` (ETH and PNK as the last two of the six rows in each
agent juror's column header), `../canvas/Juror.dc.html:70-82` (the same two figures on the
per-agent-juror stat card), `../canvas/README.md` for provenance

- [x] Reward shifts are read per agent juror, scoped to court 34
- [x] Cumulative ETH and PNK render as the last two of the six rows in each agent juror's matrix column
      header, under the same hairline as the four marginals ticket 06 puts there — not in a summary
      column of their own
- [x] This ticket adds only those two rows: the column header, its hairline and the other four
      marginals are ticket 06's and are not rebuilt here
- [x] Amounts render at a fixed precision per token rather than as raw integers — four decimal places
      for ETH, two for PNK, so a column of them aligns
- [x] Wherever a net PNK figure is shown, its sign is carried by a sign character in the value itself
      and never by colour alone — see
      ADR-0006
- [x] An agent juror that has been drawn but earned nothing shows a real zero. One that has never been
      drawn shows a dash in both figures, matching ticket 06's rule for the marginals beside them: a
      zero is a measurement and a dash is the absence of one
- [x] Rewards are not ranked and do not reorder anything

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

## From ticket 06, 2026-08-25 — the block you join is built and waiting for you

The matrix's column headers now carry each agent juror's summary, and it was deliberately built to
hold six figures rather than the four ticket 06 fills. Two edits put yours in it:

- **`AgentJurorMarginals` in `src/performance/totals.ts`** gains your two fields, computed inside
  `agentJurorMarginalsOf` over the same rows. That function is the whole reduction; nothing in a
  view may add a third one beside it.
- **`slotsOf` in `src/performance/Marginals.tsx`** gains two entries, after `draws`. Each is a
  `label` (the artboard's abbreviation — `Eth`, `Pnk`), a `name` spelled out for a screen reader, a
  `Figure` and an optional caveat. Nothing else changes.

**Ticket 06 deliberately did not render your two slots as em dashes**, and this is the decision to
inherit rather than reverse. A dash on this page means "no draws to measure" — `JurorEmpty.dc.html`
says so in as many words — and printing one against a reward nobody has read would state a
measurement where there has been no read at all. So the slots are simply absent until you fill
them, and the provenance footer says "Cumulative ETH and PNK rewards per agent juror have not been
read at all". **That sentence is yours to retire**, in `provenanceOf` in `MatrixPage.tsx` and in the
caveat card above the matrix, both of which ticket 06 narrowed rather than removed. It is the last
"not read" claim the matrix view makes about itself, and leaving it up over your figures would be
the same falsehood in the other direction.

Two more things ticket 06 settled that reach you. The `†`/`‡` markers ride the figure their caveat
touches and no other, so ask what a superseded window and a panel of one actually say about a
reward before marking one — a lone panel says nothing about ETH earned, and a changed window very
possibly does, since the reward depends on the round. And `commitments` on the marginals is the
model for "the subgraph says this happened and the second source has not confirmed it yet": if your
read is a second source over the same draws, it needs the same in-flight gate rather than an
emptiness test, which is `CLAUDE.md`'s fourth recurrence of that trap.

## Comments

### 2026-08-25 — what the read actually found

**The measure came from the subgraph, not from a chain.** Every other ticket that added an
economic or historical read reached for Arbitrum; `TokenAndETHShift` is one of the few things the
v0.17.2 deployment carries in full, amounts included, so `rewards-subgraph.ts` is three GraphQL
fields and no RPC. That also kept the live suite off the arb1 call budget entirely.

**Three findings that changed the implementation:**

1. **`isNativeCurrency` is `false` on a court that pays native ETH.** All 56 payouts carry it,
   with `feeToken: null` and `feeTokenAmount: "0"`, while `ethAmount` holds the full
   `feeForJuror` — and the raw log decodes to `_feeToken = address(0)`. Following the flag would
   have reported that every agent juror earned nothing. The field is deliberately **not selected**
   by the query, so it cannot be reached for. Recorded in `docs/knowledge/chain-and-subgraph.md`.
2. **The fee is per vote ID, not per draw.** Nine of the 44 captured shifts are fractions of
   `feeForJuror` (1.25, 1.67, 2.5). The first cross-check written here assumed whole multiples and
   failed on real data. The court-wide identity that *does* hold — total ETH = `feeForJuror` × the
   vote-ID count over executed disputes, 61 fees — is stronger anyway, because it ties this read to
   the draw read through the court's own configured fee.
3. **The reconfiguration changed no reward parameter.** `minStake`, `alpha`, `feeForJuror` and
   `jurorsForCourtJump` are byte-identical across `CourtCreated` and `CourtModified`. That is why
   neither figure takes the †, and it is decoded rather than assumed.

**A coverage cross-check was considered and deliberately not built.** `CommitCoverage`'s shape
would have fitted — "every draw in a ruled dispute has a shift" is true of the captured court — and
it would cry "short read" for hours at a time, because a shift is written by `execute()`, a later
transaction than ruling. That is the false caveat `CLAUDE.md` warns about four times over. The
disclosure is affirmative instead: `RewardCoverage.paidDraws` says what the sums are *over*, and
the guard against a short read is the arithmetic in finding 2.

**A sum degrades worse than a median.** Every other unread figure on this page renders as an em
dash; an unread sum renders as `0.0000`, in the ink of a measurement. That is why `rewards` is
nullable on `RawCourtData`, why `Marginals` takes a `paid` gate beside its `scanned` one, and why
`rewardsPending`/`rewardsFailed` exist as separate fixtures.

**Retired, not added to:** the matrix view's "Cumulative ETH and PNK rewards per agent juror have
not been read at all" — the last "not read" claim it made about itself.

### 2026-08-25 — what review changed

Two-axis review (standards + spec) found three defects, all of which turned on the fact that these
two figures are **sums** rather than medians. All three are fixed.

1. **A failed payout read could be announced nowhere.** `coreFailureOf` returns one entry per
   source and ranked the payouts last, so a stale-read drift took the banner; and `provenanceOf`
   suppresses its own sentence precisely when there is an error to suppress it for. A page with
   both said nothing about the payouts anywhere — "a read that fails is said exactly twice" coming
   out as zero. Fixed by ranking the payout failure **above** the stale read, which can afford to
   yield because it has two voices of its own: every affected row carries a `?` flag and draws its
   cells as Unknown.
2. **A short read rendered as a measurement.** A reindexing Goldsky answers HTTP 200 with `[]`, so
   the read *succeeds* and pays nothing, and every drawn column printed `0.0000` / `0.00` in the
   ink of a measurement. `RewardCoverage.short` now catches it with two all-or-nothing tests that a
   ruled-but-unexecuted dispute cannot trip: no payout at all for a court with ruled draws, and a
   ruled dispute paid for some of its draws and not others (`execute()` pays every drawn juror in
   one transaction, so partial is only ever a short read). The slots then read "Not read" — ticket
   13's Unknown, the same words the commit median uses for the same thing.
3. **A payout failure labelled the stat tiles "Partial".** `affects` is per *source*, and this is
   the first core-subgraph failure that leaves the figures above the matrix whole — nothing on the
   tiles or the strip reads a payout. That is ticket 13's own first-cut mistake at a finer grain,
   and the comment in `failures.ts` records what it costs. `coreFailureOf` now returns
   `{ read, costsTiles }` and `MatrixPage` narrows on it.

Also corrected: the **CONTEXT.md entry contradicted its own code** — its first draft said to avoid
"reward" for the signed pair while every type in the change is named `…Reward…`. The entry was
wrong, not the names; the ticket and the artboard both use "reward" that way.

Declined, with reasons: `rewardFigure`/`commitFigure` are not worth merging (they gate on different
things — a missing commitment is a shortfall, a missing payout usually is not), and the `<0.0001`
notation stays despite costing a glyph of column alignment, because the alternative is printing
`0.0000` for an amount that is not zero.

### 2026-08-25 — integrated with ticket 16, and where these two sums do not go

Ticket 16 landed the phone layout on a parallel branch and left this ticket a note asking where a
fourth measure lives below the breakpoint. Both tickets were finished by then, so the question fell
to the merge rather than to either implementer. The answer is that the two sums do not go there.

They are marginals, and the marginals live in the matrix's column headers. The card layout has no
column headers — it drops that header whole, along with the four measures ticket 06 put in it — so
ETH and PNK are absent on a phone for exactly the reason the per-agent-juror median reveal latency
is, and not for a new one. Nothing was added to a card slot: `slotFigureOf` holds one figure and has
already spent it on latency.

What the merge did change is the caveat card, which ticket 16 rewrote once per layout. Its desktop
branch states what each column has been paid; its narrow branch names cards and slots and claims
neither sum. Saying there that they have not been read would be this ticket's retired falsehood in
reverse — they *were* read, and a desktop reader is looking at them — so the phone makes no claim
about them at all. Ticket 11 is where these two figures become legible on a phone, and its file now
carries that as the one question joining both notes.
