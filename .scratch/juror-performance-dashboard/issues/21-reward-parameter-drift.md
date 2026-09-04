---
status: done
blocked_by: ["19"]
---

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

**Design:** No artboard. `../canvas/Errors.dc.html:168-218` draws the window marker this ticket
is careful **not** to extend, and `../canvas/README.md` carries its provenance.

- [x] `RawCourtParameters` carries the reward parameters each configuration was emitted with,
      read from the logs the scan already fetches and costing no additional RPC call
- [x] The model can answer whether every configuration in the history agrees about them
- [x] A test pins that court 34's three configurations do agree, and fails — naming the parameter
      and both values — if one is ever changed
- [x] The live suite catches the same drift against the chain rather than only against the fixture
- [x] No new marker rides cumulative ETH or PNK while the parameters agree: today's page is
      unchanged, and `docs/knowledge/court-34.md`'s reasoning about the `†` marker still holds
- [x] Where the parameters would disagree, what the reward figures are summed over is stated
      affirmatively rather than as a caveat — or, if that is deferred, the deferral is recorded in
      `## Comments` with the failing test as the floor
- [x] `docs/knowledge/court-34.md` says that the agreement is checked rather than
      inspected, and stop implying it was established once by hand


## What was built

The four reward parameters are read off the logs the parameter scan already fetches — no extra
call, no extra log, the same three decodes — and carried on `RawCourtParameters` as canonical
decimal strings. `toRegimes` validates them against the same guard the durations get and hangs
them on each `ParameterRegime` as `rewards`, so a configuration stays one thing: the chain emits
the windows and the fee in one event, and splitting them would have meant ordering the court's
history twice.

`rewardParameterChanges` compares each configuration against the one before it and returns one
entry per parameter that moved, dated, with both values. Consecutive pairs, like `measuredRegimes`
and for the same reason: a fee lowered and later restored is two changes, because the draws
between earned something the draws either side did not. Per parameter rather than "the rewards
changed", because the first question a red assertion has to answer is which quantity stopped being
comparable.

**They are compared as strings and never parsed.** `minStake` is 1.1e22, and a double at that
magnitude steps in units of about 2.1 million wei — so `Number` maps two genuinely different
stakes onto one value and this function would report a court that had not changed, which is the
exact failure it exists to catch. Two tests pin the boundary: one in `court-parameters.test.ts`
that the reader hands over twenty-three digits and not an exponent, one in `windows.test.ts` over
a pair `Number` cannot tell apart.

The floor is two assertions and they fire at different moments. `windows.test.ts` reads the
**captured fixture**, so recapturing after a fee change turns the offline suite red and the drift
cannot enter the repository as a green commit. `court-parameters.integration.test.ts` reads the
**chain**, so it goes red the night of the change, before anybody recaptures anything — filed
under the live file's case 2, whose header now routes a reader through both halves of "a figure
moved".

The fixture was recaptured from Arbitrum through the changed reader rather than transcribed:
`minStake` 11000e18, `alpha` 170, `feeForJuror` 2.7e14, `jurorsForCourtJump` 7, byte-identical
across all three configurations, and the windows unchanged since ticket 19's capture.

`PERSISTED_MODEL_VERSION` moved to `2026-09-04`. A raw payload has no `rederive` to rebuild it, so
a cache written by the deployed bundle would restore a parameter history with no `minStake` on it,
`toRegimes` would refuse to read it, and every return visit for a day would render the page as a
failed build rather than a cold read.

Today's page is unchanged: no view was touched, no model field was added that nothing renders, and
the 935-test offline suite includes every component test that would have noticed.

## What review caught

Two findings at `high`, both in prose rather than in the comparison, and both fixed here.

**The docstring promised five parameters and the function compares four.** `rewardParameterChanges`
opened by saying `hiddenVotes`, `minStake`, `alpha`, `feeForJuror` and `jurorsForCourtJump` are
byte-identical — true of the court, and false as an account of what the function checks, in the one
place a maintainer would check it. `totals.ts` and `court-34.md` both carve `hiddenVotes` out
explicitly; the function itself did not. It now says so at length, including what the gap costs: a
court that turned hidden votes off would have no commit period, so commit latency would be the
duration of something that no longer happens, and nothing *named* would catch it — the live
suite's full-history assertion would go red for it as case 3 upkeep, which is the wrong name.

**One of the new reader tests was a duplicate.** `carries a stake past 2^53 across without
rounding it` built a log byte-identical to the default and asserted a value the test above it
already asserts inside a `toEqual`; its `not.toContain("e")` was vacuous after an exact `toBe` on
the same string. Deleted, and its reasoning moved onto the assertion that was already carrying the
weight. The test that actually pins the no-`Number` rule is the pair in `windows.test.ts` that
`Number` cannot tell apart.

**Also fixed, and outside the diff the review was asked about:** `.github/workflows/ci.yml`'s
account of the parameter suite was stale from ticket 19 — it said the suite asserts "exactly those
two configurations, so a third one fails here", and the court has held three since that commit. It
also counted the ENS suite's subnames as six where the suite counts `ROSTER.length` and the roster
is seven. Both rewritten to stop counting, along with a sentence saying that "a figure moved" now
covers the reward parameters. Two stale numbers in a comment about a suite this ticket extends is
the tripwire's own case: narrowing or widening a set changes every sentence quantified over it.

## Comments

**The display question is deferred, deliberately, on the ticket's own alternative.** Nothing on
the page says what the reward figures are summed over beyond what `RewardCoverage.paidDraws`
already says, and nothing new is rendered while `rewardParameterChanges` is empty — which it has
been for the court's whole life. Three reasons, in the order they weighed:

1. **No artboard draws it.** The ticket says so itself, and the canvas is what settles how a thing
   looks here. `Errors.dc.html:168-218` draws the window marker this ticket was careful not to
   extend, and nothing on the canvas draws a second one.
2. **It would be a code path that has never rendered**, exercisable only against a synthetic
   history, on a page whose caveats are load-bearing. A caveat that has never been seen is a
   caveat nobody has judged.
3. **The floor is real and it fires early.** The live assertion goes red against the chain on the
   night of the change, and its message says the deferred question is now due and names
   `CourtTotals` and the marginals as what to read. The offline one makes it impossible to
   recapture the fixture past it.

What would have to be decided on that day: whether the affirmative sentence belongs on the court
totals, on each column marginal, or on `/method`; and whether cumulative ETH gains a marker of its
own or the figures are split per fee regime. Neither is answerable without knowing what moved.

**`hiddenVotes` is the one parameter on those logs that is still unchecked.** It is not a reward
parameter and no figure here reads it, so it stayed out of `RewardParameters` rather than making
that type's name a lie. It is worth a follow-up on its own terms: a court that turned hidden votes
off would have no commit period, and commit latency — a column on the matrix and half of what this
dashboard measures — would be a duration of something that no longer happens. `court-34.md` names
it as the gap.

**Ticket 19's Comments were left as they stand**, saying the claim is "recorded as a fact with a
date rather than as a guarantee". That was true when it was written and the file is a record of
what that ticket decided; the current truth is in `court-34.md` and at the two assertion sites.
