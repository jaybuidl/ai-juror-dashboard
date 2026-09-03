# Court 34: parameters, windows and economics

Court 34 "Agentic Commerce Court" on Arbitrum One is the single subject of this dashboard.
Its configuration changed once, mid-experiment, and that one change is behind most of the
arithmetic traps here.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **Court 34's parameters changed mid-experiment**, between dispute 151 and 152. Dispute 151 had an
  8-hour commit window and an 8-hour vote window; everything after has 45 minutes and 30 minutes.
  Never use the court's *current* `timesPerPeriod` as a historical denominator. This is why latency
  is stored in seconds (ADR-0001). Ticket 08 read the history — `CourtCreated` and `CourtModified`
  on KlerosCore, both of which carry `timesPerPeriod` in full, so no archive `eth_call` is needed —
  and `src/performance/windows.ts` resolves it **per period**, not per dispute: the court reads its
  own durations at the moment it passes a period, so a dispute created under one configuration and
  passed into its commit period under the next ran the later commit window. Two further traps in
  that read. The **deployed** event signatures are not the ones in `kleros-v2/contracts/src`, which
  have since gained an `_eligibility` argument — a signature carrying it hashes to a different topic,
  matches no log, and returns a court that was never configured, with no error and nothing marked.
  And `canvas/Errors.dc.html` samples the new vote window as 45m; it is 30m on chain, which is why
  the marker's durations are read rather than transcribed from the artboard.
- **Both windows changed, and three separate places in the design say only the commit one did.**
  Tickets 06 and 11 and `Juror.dc.html` all rest on "the window change touches commit latency and
  nothing else, which is why the agent juror view plots reveal latency only". It is false — commit
  went 8h → 45m and vote went 8h → 30m in the same `CourtModified` — and the artboard shows what
  believing it produces: `Juror.dc.html:73` prints a median commit while `:108` excludes commit
  latency from the chart directly below it as incomparable, so one page both declines to compare and
  compares (`canvas/README.md` § Known defects). Every latency aggregate is markable, and the marker
  belongs on the median the window it names actually governs — reveal from the vote window, commit
  from the commit window. `Marginals.tsx` and `windowFlagLabel` both compare per window against
  `CourtParameters.current` rather than marking anything in a changed group, so a future court that
  changes only one gets only one marker.
- **The arbitration fee is paid per vote ID, not per draw, so a payout is often a fraction of
  `feeForJuror`.** Nine of the captured court's 44 shifts are 1.25, 1.67 or 2.5 fees: a draw
  holding two of a dispute's three coherent vote IDs takes two thirds of that dispute's pot. An
  assertion that every payout divides evenly by `feeForJuror` looks obviously right and fails on
  real data — it was written and it failed. What *is* exact is court-wide: total ETH paid equals
  `feeForJuror × ` the vote-ID count over the executed disputes, which is 61 fees for the fixture
  and ties the payout read to the draw read through the court's own configured fee. PNK is a
  redistribution and nets to **zero** across the court, to within a wei or two of integer-division
  dust. Both are pinned in `totals.test.ts` and live in `rewards-subgraph.integration.test.ts`,
  because these two figures are *sums*: a read that comes back short renders as an agent juror that
  earned less, which nothing else on the page would catch.
- **Court 34's one reconfiguration changed no reward parameter.** `CourtCreated` and `CourtModified`
  carry byte-identical `minStake` (11000e18), `alpha` (170), `feeForJuror` (2.7e14) and
  `jurorsForCourtJump` (7); only `timesPerPeriod` moved. So the `†` window marker must **not** ride
  cumulative ETH or PNK — it would be a marker a reader can see is misplaced, and one they stop
  reading. Decoded from the logs rather than assumed, because "the court was reconfigured" reads as
  though everything about it changed.
- Every appeal period ran ~18h against a 36h configured value. Unexplained, affects no metric here,
  but do not treat appeal duration as understood.

## Court 34 is a live demo instrument, and gets reconfigured

*Migrated from session memory, 2026-09-03.*

Court 34 is not a static experiment. Its period durations get changed on chain to suit whatever is
being demonstrated: on **2026-08-26 the evidence period went 45 minutes to 10 minutes** — a third
`CourtModified`, block 498587731 — so a live demo in front of an audience would not spend three
quarters of an hour waiting for a panel to be drawn. **Expect more of these.**

This is why `CLAUDE.md` § Verified constants goes stale on its own, and why the two-event account
that stood for the whole of tickets 08–18 is no longer current. The fixture
(`src/performance/court-34-parameters.fixture.json`) still holds two entries; taking up the third is
open ticket 19, and tickets 20 and 21 exist because of the same change — 20 specifically to make the
tripwire say whether a *figure* moved or only an account went stale.

**When `court-parameters.integration.test.ts` is red** — it and the nightly `live` CI job fail on
*any* change to the history, including one that moves nothing a reader can see — read the history
off chain before treating it as a regression. Running that one integration file prints the new
regime in its own assertion diff, which is the cheapest way to see what changed. Then ask which
windows moved: a change leaving **commit and vote** alone moves no figure on the page at all,
because `sameMeasuredWindows` compares only those two and the evidence window is never printed.

A red *live* suite has a second, unrelated cause — the Arbitrum rate limit (see
`chain-and-subgraph.md`). Check which suite failed before assuming either.
