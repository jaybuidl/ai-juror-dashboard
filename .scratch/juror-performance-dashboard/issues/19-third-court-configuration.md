---
status: done
blocked_by: []
---

# 19: Take the court's third configuration

**What to build:** The dashboard's account of court 34 matches the court again. On
2026-08-26 13:14:01 UTC, in block 498587731, court 34 was reconfigured a third time — the evidence
period from 45 minutes to 10 minutes, so a live demo in front of an audience does not spend
three quarters of an hour waiting for a panel. `timesPerPeriod` went `[2700, 2700, 1800, 129600]`
to `[600, 2700, 1800, 129600]`: the evidence window and nothing else.

Nothing a reader sees moves, and that is the finding rather than the assumption. `windows.ts`'s
`sameMeasuredWindows` compares the commit and vote windows only — the two periods this
dashboard's latencies are measured from — so the `†` marker does not spread and dispute 151
stays the only marked row. The evidence window is carried on `PeriodRun` but never printed: the
dispute timeline's evidence slot shows the submission count instead, because no window governs
how long evidence is accepted in practice. Confirmed live: five of the seven assertions in
`court-parameters.integration.test.ts` still pass, including the one asserting that 151 is
marked *however many disputes the court has since held*.

What did break is the tripwire ticket 08 built for exactly this, doing exactly its job. Two
assertions fail — the one pinning the history to the two configurations `/method` describes in
prose, and the one pinning it to the captured fixture — and its own doc comment says why: "a
third configuration, or a change to either of the two, fails here and the account gets
rewritten". CI's nightly `live` job is red until that rewrite happens. The offline suite is
green, because it reads the fixture rather than the chain, which is the other half of the same
arrangement.

So this ticket is the rewrite. It is mostly **prose**, and the prose is the part that needs
care. About twenty sentences across the repo count court 34's configurations, and they do not
all mean the same thing by the count. Three worth naming before anyone reaches for a global
replace:

- `windows.ts`'s "whether two configurations agree" is about comparing any two configurations,
  not about how many this court has had. It is correct as written.
- `Marginals.test.tsx`'s "a court reconfigured twice" describes a hand-built fixture whose shape
  the live court cannot produce. Also correct as written, and now confusingly so.
- `totals.test.ts`'s "the court has been reconfigured once, so no fixture can hold two superseded
  configurations at the same time" is stale in its *reasoning* and still true in its conclusion.
  The court has now been reconfigured twice, but the third change supersedes no **measured**
  window, so there is still exactly one superseded configuration to group by. Rewrite the reason,
  keep the claim.

The recapture buys one thing beyond currency. The fixture will hold a **real** evidence-only
reconfiguration for the first time, so the property that a harmless change marks nothing can be
pinned over captured data rather than only over the synthetic case in `windows.test.ts`, which
invents an evidence window of one second to make the point.

This is one ticket and not two on purpose. The integration test and `/method`'s prose are one
contract — the test exists to catch the prose drifting — so landing the fixture and the test
without the page ships a green suite over a public page that states a falsehood, which is the
precise failure the tripwire was built to prevent.

**Design:** No artboard. `/method` is prose with no canvas referent, and the window section it
touches was written against ADR-0005 rather than against a drawing.

- [x] `court-34-parameters.fixture.json` holds all three configurations as the chain reports them
- [x] `court-parameters.integration.test.ts` passes against the live court, and still fails if a
      configuration is added, removed or altered
- [x] Every offline assertion counting the court's regimes is updated, and `yarn test` is green
- [x] `/method` § The window names three configurations, sets the third beside the other two as
      absolute durations, and states no ratio between any of them (ADR-0005)
- [x] `/method`'s dated line names the date this account was last true as of
- [x] `/method` says the third change moved the evidence period only, and that no figure on this
      dashboard is measured from it — so a reader meeting an unmarked dispute 152 understands why
- [x] An offline test pins, over the captured three-regime fixture, that the third configuration
      marks no row: dispute 151 alone carries `underEarlierWindows`
- [x] Every sentence counting the configurations is reviewed individually, and the three named
      above are handled on their own terms rather than swept
- [x] `docs/knowledge/court-34.md` records the third configuration, its moment and its block,
      and no longer says the court has two events in its whole life
- [x] `README.md` § the live-suite description no longer describes the parameters check as
      pinning two configurations
- [x] Whatever this leaves untrue in ticket 08's own file is corrected there, since it states the
      same count

## Comments

**2026-09-04 — landed.** 917 offline tests green (from 914), types, Biome and build clean, and
`court-parameters.integration.test.ts` green against the live court: 8 assertions, up from 7.

**What the chain said.** The third configuration is `at: 1787750041` — 2026-08-26 13:14:01 UTC,
block 498587731 — `timesPerPeriod` `["600", "2700", "1800", "129600"]`. Exactly as the ticket
described it, evidence 45m → 10m and nothing else.

**Two facts read off chain that the ticket did not ask for, because the prose could not be written
honestly without them.**

- **All three configurations carry byte-identical reward parameters.** `hiddenVotes` true,
  `minStake` 11000e18, `alpha` 170, `feeForJuror` 2.7e14, `jurorsForCourtJump` 7, across
  `CourtCreated` and both `CourtModified` logs. `totals.ts` claimed this of "court 34's one
  reconfiguration" and now claims it of both, with the date and the blocks. Still unpinned in CI —
  that is ticket 21 — so it is recorded as a fact with a date rather than as a guarantee.
- **No evidence, commit or vote period straddles either reconfiguration**, over all 46 disputes.
  `windowsFor`'s doc comment asserted this of the one change it knew about; it is now asserted of
  both, with the read dated. One period does straddle 2026-08-20 — dispute 151's appeal — and the
  appeal window is the one the court has never moved.

**The blast radius was four offline assertions**, all in `windows.test.ts` and `performance.test.ts`,
and all of them consequences of the third regime becoming `current`. Nothing about a marker, a
footnote or a matrix row moved, which is the finding rather than the assumption. The live matrix was
checked in a browser and still reads "Dispute 151 ran with a commit window of 8h and a vote window
of 8h, against 45m and 30m configured now."

**The `/method` strip changed shape, and that was not in the ticket.** It was a two-up row of
`Dispute 151` / `152 onward` showing commit and vote only. Three configurations cannot be labelled
by dispute range — the third change falls in the middle of one — and a third box showing commit and
vote would have been a visual duplicate of the second. It is now three stacked lines labelled by the
date each came into force, carrying all four windows in `timesPerPeriod` order, so the three
duration strings line up and the one value that moved is the only thing that does not repeat.
Measured in a browser at 1440 and at 375: labels 92px as declared, durations all starting at x=437,
no horizontal overflow at either width. The dispute-to-configuration mapping stayed in the prose
below, where it already was.

**One error caught by looking at the rendered page rather than the diff.** A sentence read "Only the
second of those two changes reaches anything on this dashboard" — the change that reaches a figure
is the court's *first* reconfiguration and its *second* configuration, and the two ordinals are one
apart for the whole of this section. It is now worded as reconfigurations and pinned by its own
assertion in `MethodPage.test.tsx`.

**What the sweep found that the ticket's three named sentences did not.** Eleven further
count-bearing sentences across `windows.ts`, `totals.ts`, `row-flags.ts`, `court-parameters.ts`,
`dispute-detail.ts`, `latency.test.ts`, `court-parameters.test.ts`, `Matrix.test.tsx` and
`Marginals.test.tsx`. `Marginals.test.tsx` also held a `CURRENT` constant commented "what court 34
holds now" whose evidence window was the superseded 2700 — a stale value rather than a stale
sentence, and the sort a grep for prose does not find.

**`CLAUDE.md`'s line was replaced rather than removed.** "The court has been reconfigured three
times, the dashboard accounts for two" was both spent and miscounted (three configurations, two
reconfigurations); it now carries the distinction that outlives this ticket — three configurations,
one superseded *measured* window, and never make one count into the other. The file went 151 to 152
lines, still inside the 155 budget, so nothing had to leave.

## Review, at `high`

Seven findings, all confirmed against the data and all fixed. Three are worth carrying forward.

**The review caught a factual error introduced by this ticket's own prose sweep.** `windows.ts` had
read "No *measured* period straddles court 34's one change — dispute 151's commit and vote periods
both closed before it, and dispute 152 was created 48 minutes after". Rewriting it for two changes
reattached the 48 minutes to the wrong pair: "dispute 151's commit and vote periods both closed 48
minutes before dispute 152 was created". The real gaps are 151's vote period closing ~11h before
152's creation, and the **2026-08-20 change** falling 48 minutes before it. A reader trusting the
rewrite would have concluded 151's periods closed *after* the change, which inverts the reason 151
is the marked row — and it had been promoted into `docs/knowledge/court-34.md` as a dated chain
read, where it would have outlived the comment. Both fixed, and court-34.md now names the two gaps
side by side because one number in a sentence with two candidate gaps is how this happened.

**The new live assertion did not guard what its own comment claimed.** It destructured
`const [, second, third] = toRegimes(history)` — fixed positions, so a *fourth* configuration
moving a commit window would leave it comparing 2026-08-20 against 2026-08-26 and passing. It now
takes the last two regimes. The direction assertion (`evidenceSeconds` got smaller) also went: it
would go red if the court simply restored 45 minutes, which is not what that test is about.
`not.toEqual` says "a real change" without presuming which way.

**The stale-constant sweep was half a sweep.** This ticket's own notes record finding a `CURRENT`
holding the superseded 2700 evidence window in `Marginals.test.tsx` and calling it "the sort a grep
for prose does not find" — and then missed the same constant, under the same name, in
`StatTiles.test.tsx`, `row-flags.test.ts` and `totals.test.ts`. No assertion depended on the value
in any of them, which is exactly why they would read as current next time. All four now hold 600.

The remaining three: `useCourtPerformance.ts` still said the parameter read was "two logs deep";
`persistence.ts` and `useCourtPerformance.ts` both justified their caching on "a court is
reconfigured roughly never", which this ticket's own knowledge-base edit contradicts with **"Expect
more of these"** — the conclusions were fine and the premises were rewritten rather than the
behaviour; and `dispute-detail.ts` had a claim widened past what was read, asserting the ~18h appeal
duration "under all three configurations" when the capture stops at dispute 166, two days before the
third. The verified half (the appeal *window* has never moved) was kept and the quantifier dropped.
