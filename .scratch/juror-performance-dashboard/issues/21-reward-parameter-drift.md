# 21: Notice a reconfiguration that moves a reward parameter

**What to build:** If court 34 is ever reconfigured in a way that changes what a coherent draw
earns or what a wrong one costs, this dashboard notices. Today it cannot: `fetchCourtParameters`
returns `{at, timesPerPeriod}` and discards `minStake`, `alpha`, `feeForJuror` and
`jurorsForCourtJump`, all four of which `CourtCreated` and `CourtModified` carry in full.

A claim rests on those four being constant, and it is load-bearing. `docs/knowledge/court-34.md` states
that court 34's reconfiguration changed no reward parameter, and draws the conclusion the design
depends on: the `†` window marker must **not** ride cumulative ETH or PNK, because it would be a
marker a reader can see is misplaced, and one they stop reading. `totals.test.ts` pins the
arithmetic that follows from it — total ETH paid equals `feeForJuror` × the vote-ID count over
the executed disputes — which is exact only while there has been one fee for the court's life.

The claim is true. All three configurations are byte-identical on `hiddenVotes`, `minStake`
(11000e18), `alpha` (170), `feeForJuror` (2.7e14) and `jurorsForCourtJump` (7); only
`timesPerPeriod` has ever moved. It was checked by hand on 2026-08-20 and again on 2026-08-26,
and it held both times. That is the reason this ticket is prevention rather than a fix — and
also the reason it is worth doing, because a claim that has held by inspection twice is a claim
nothing checks.

What it would cost to be wrong is the shape this repo already carries three of. A changed
`feeForJuror` would not throw, would not warn, and would not blank a figure. Every cumulative
ETH sum would silently span two fee regimes, the cross-check that ties the payout read to the
draw read would start failing an assertion that looks like a short read, and the page would
report six agent jurors' earnings as one comparable quantity when they are two. Present,
correctly typed, and wrong — the `blockTimestamp: "0x0"` family.

Reading the four is nearly free: they arrive already decoded on the logs the parameter scan
already fetches, so this adds no RPC call. The judgement this ticket has to make is what to do
when they differ, and the answer wanted here is the affirmative disclosure this repo prefers
over a caveat: say what the sums are summed *over*, the way `RewardCoverage.paidDraws` does,
rather than inventing a second marker for a state that has never occurred. A failing test naming
the assumption is an acceptable floor if the display question is judged not worth answering
until a court actually changes a fee — but the assumption must stop being unchecked either way.

**Blocked by:** 19

**Design:** No artboard. `../canvas/Errors.dc.html:168-218` draws the window marker this ticket
is careful **not** to extend, and `../canvas/README.md` carries its provenance.

**Status:** ready-for-agent

- [ ] `RawCourtParameters` carries the reward parameters each configuration was emitted with,
      read from the logs the scan already fetches and costing no additional RPC call
- [ ] The model can answer whether every configuration in the history agrees about them
- [ ] A test pins that court 34's three configurations do agree, and fails — naming the parameter
      and both values — if one is ever changed
- [ ] The live suite catches the same drift against the chain rather than only against the fixture
- [ ] No new marker rides cumulative ETH or PNK while the parameters agree: today's page is
      unchanged, and `docs/knowledge/court-34.md`'s reasoning about the `†` marker still holds
- [ ] Where the parameters would disagree, what the reward figures are summed over is stated
      affirmatively rather than as a caveat — or, if that is deferred, the deferral is recorded in
      `## Comments` with the failing test as the floor
- [ ] `docs/knowledge/court-34.md` says that the agreement is checked rather than
      inspected, and stop implying it was established once by hand
