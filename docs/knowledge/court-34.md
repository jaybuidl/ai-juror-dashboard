# Court 34: parameters, windows and economics

Court 34 "Agentic Commerce Court" on Arbitrum One is the single subject of this dashboard.

**Count carefully: three configurations, two `CourtModified` events.** One `CourtCreated`
(2026-08-11) and two modifications (2026-08-20, 2026-08-26). The 2026-08-20 change — commit 8h →
45m, vote 8h → 30m — is the one behind most of the arithmetic traps below, and the entries that
follow were written while it was the only one, so some still say "the one reconfiguration". Read
that as *that* reconfiguration.

**Both counts are load-bearing and they are not the same count**, which is the trap ticket 19 spent
most of its effort on. Three configurations is what `/method` and the live tripwire state. *One*
superseded set of **measured** windows is what the marker, `changedWindows` and every "the court
has been reconfigured once" comment are about — because the 2026-08-26 change moved the evidence
period alone, and no figure here is measured from it. A sentence counting one of these is almost
never improved by being made to count the other, and a global replace across the repo gets it
wrong in both directions.

All three configurations are in `court-34-parameters.fixture.json` as of ticket 19, and the third
is what `CourtParameters.current` holds — so the offline suite pins "a harmless change marks
nothing" over captured data rather than only over the invented one-second evidence window in
`windows.test.ts`.

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
- **No reconfiguration of court 34 has changed a reward parameter — and the claim is meant to hold
  for the next one too.** Across all three `CourtCreated`/`CourtModified` logs, `hiddenVotes`
  (true), `minStake` (11000e18), `alpha` (170), `feeForJuror` (2.7e14) and `jurorsForCourtJump` (7)
  are byte-identical; only `timesPerPeriod` moved. Re-decoded from chain on 2026-09-04 under ticket
  19, third configuration included — the blocks are 493394990, 496518927 and 498587731. Stake at risk per vote ID is
  `minStake × alpha / 10000` = **187 PNK** — the divisor is the part that gets dropped, and
  `src/performance/rewards.ts` states the product without it.
  Note the live suite pins only `timesPerPeriod`, so a future reconfiguration that moved a reward
  parameter would go green (open ticket 21). So the `†` window marker must **not** ride
  cumulative ETH or PNK — it would be a marker a reader can see is misplaced, and one they stop
  reading. Decoded from the logs rather than assumed, because "the court was reconfigured" reads as
  though everything about it changed.
- Every appeal period ran ~18h against a 36h configured value, under all three configurations —
  the appeal window is the one period the court has never retimed. Unexplained, affects no metric
  here, but do not treat appeal duration as understood.
- **No evidence, commit or vote period has straddled either reconfiguration.** Read off chain over
  all 46 disputes on 2026-09-04. Dispute 151's commit and vote periods closed ~11h before dispute
  152 was created; what happened 48 minutes before 152's creation is the **2026-08-20 change
  itself**, and those are two different gaps that a sentence naming only one number will
  cheerfully swap (it did, and ticket 19's review caught it). Nothing was mid-period on 2026-08-26
  either. One period does straddle 2026-08-20 — dispute 151's appeal — and it costs nothing,
  because the appeal window never moved. This is why `windowsFor`'s per-period resolution has never yet *had* to disagree
  with a per-dispute one, and why it must stay per-period anyway: the first dispute that straddles
  a change is the one a per-dispute lookup gets wrong, and it will look correct until then.

## Court 34 is a live demo instrument, and gets reconfigured

*Migrated from session memory, 2026-09-03.*

Court 34 is not a static experiment. Its period durations get changed on chain to suit whatever is
being demonstrated: on **2026-08-26 the evidence period went 45 minutes to 10 minutes** — the
court's third configuration, its *second* `CourtModified`, at 13:14:01 UTC (unix 1787750041) in
block 498587731 — so a live demo in front of an audience would not spend three quarters of an hour
waiting for a panel to be drawn. **Expect more of these.**

This is why any hard-coded parameter list goes stale on its own, and why the two-event account
that stood for the whole of tickets 08–18 is no longer current. Ticket 19 took the third
configuration up — into the fixture, the live tripwire and `/method` — and tickets 20 and 21 exist
because of the same change: 20 specifically to make the tripwire say whether a *figure* moved or
only an account went stale, which ticket 19 had to work out by hand and by reading.

**When `court-parameters.integration.test.ts` is red** — it and the nightly `live` CI job fail on
*any* change to the history, including one that moves nothing a reader can see — read the history
off chain before treating it as a regression. Running that one integration file prints the new
regime in its own assertion diff, which is the cheapest way to see what changed. Then ask which
windows moved: a change leaving **commit and vote** alone moves no figure on the page at all,
because `sameMeasuredWindows` compares only those two and the evidence window is never printed.

A red *live* suite has a second, unrelated cause — the Arbitrum rate limit (see
`chain-and-subgraph.md`). Check which suite failed before assuming either.

## How big the court is, and what turns on the size

*Read off chain 2026-09-04.*

Court 34 holds **46 disputes, ids 151 to 196 with no gaps**, over **226 draw records**. All 46 are
ruled and sitting in `execution`; a dispute passes hours in `appeal` first, so the ruled/unruled
split moves between reads and is worth nobody's assertion. The court held 13 disputes when the
fixture was captured and 31 while most of this repo's prose was being written, which is the whole
lesson: **a count in a sentence here is a claim about the day it was written**, this one included.
Date it, or drop it and read `ROSTER.length` and the model instead.

Two things turn on the size rather than on any dispute in it.

- **The compact density is live in production, and has been since the fortieth dispute.**
  `COMPACT_FROM_ROWS` is 40 against 46 rows, so the compact matrix is what a desktop reader has been
  getting — not a state waiting on a court that might one day be big enough. It was specified,
  built and checked as a future state (`testing.md` § the dev-server workaround), and the court
  crossed the threshold within a fortnight of it being written. Nothing may describe compact as
  unreached, and the first browser read of it against real rows is ticket 24's.
- **Every roster column has draws in it.** Per agent juror on 2026-09-04, as vote IDs over disputes
  drawn: `blaise` 49/32, `daemonhill` 42/30, `aletheia` 42/30, `007` 38/29, `columbo` 37/29,
  `baskerville` 14/8, `grokleros` 4/3. `baskerville` went undrawn from ticket 02 to ticket 18 and
  the design leaned on it as *the* permanently empty column; it has been drawn eight times, and
  `grokleros` — added by ticket 24 — is now the sparsest column instead. The rule that survives is
  about newness and not about a name: **a column is near-empty for as long as it takes the court to
  draw the agent juror it belongs to**, which for a build that joined last week is most of the grid,
  and the next roster entry starts the same way.
