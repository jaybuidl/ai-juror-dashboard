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

**Blocked by:** None (can start immediately)

**Design:** No artboard. `/method` is prose with no canvas referent, and the window section it
touches was written against ADR-0005 rather than against a drawing.

**Status:** ready-for-agent

- [ ] `court-34-parameters.fixture.json` holds all three configurations as the chain reports them
- [ ] `court-parameters.integration.test.ts` passes against the live court, and still fails if a
      configuration is added, removed or altered
- [ ] Every offline assertion counting the court's regimes is updated, and `yarn test` is green
- [ ] `/method` § The window names three configurations, sets the third beside the other two as
      absolute durations, and states no ratio between any of them (ADR-0005)
- [ ] `/method`'s dated line names the date this account was last true as of
- [ ] `/method` says the third change moved the evidence period only, and that no figure on this
      dashboard is measured from it — so a reader meeting an unmarked dispute 152 understands why
- [ ] An offline test pins, over the captured three-regime fixture, that the third configuration
      marks no row: dispute 151 alone carries `underEarlierWindows`
- [ ] Every sentence counting the configurations is reviewed individually, and the three named
      above are handled on their own terms rather than swept
- [ ] `docs/knowledge/court-34.md` records the third configuration, its moment and its block,
      and no longer says the court has two events in its whole life
- [ ] `README.md` § the live-suite description no longer describes the parameters check as
      pinning two configurations
- [ ] Whatever this leaves untrue in ticket 08's own file is corrected there, since it states the
      same count
