# Measurement rules: what counts, and what must never be computed

The unit of measurement, the dispute states that break an aggregate, and the one ratio this
dashboard never shows. Every rule here exists because a plausible-looking aggregate was wrong.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **A ruled dispute can legitimately have no payout.** Shifts are written by `execute()`, a later
  and separate transaction from ruling, so cumulative rewards lag coherence by hours. This is why
  ticket 10 has **no** coverage cross-check in the shape of `CommitCoverage`: "every draw in a ruled
  dispute has a shift" is true of the captured court and would cry "short read" over an ordinary
  state lasting hours — the false caveat this file warns about four times over. The disclosure is
  the affirmative one instead: `RewardCoverage.paidDraws` says what the figures are summed *over*.
- **The unit is the draw, not the vote.** Across the first thirteen disputes, 61 votes collapsed to
  44 draws. The subgraph's `totalCoherentVotes` / `coherenceScore` are per-vote *and* global across
  all courts — unusable here (ADR-0002). `ClassicJustification` is conveniently one per draw.
- **A dispute arrives in `evidence` with no panel and an all-zero timeline.** Disputes 167, 168 and
  169 landed that way on 2026-08-25. Nobody has been drawn yet, so the row is six blank cells and a
  panel size of zero, and `commitOpenedAt` parses to null — the same null the execution slot carries
  for a dispute in `appeal`. Two things this breaks, both found by running against the live court
  rather than a fixture. The matrix's own "On the empty cells" note says every blank is random draw
  sparsity, which is true of a dispute that has a panel and false of one that does not — the draw
  has not happened rather than not selected anyone. And `court-subgraph.integration.test.ts`
  asserted `commitOpenedAt > 0` for every dispute the court returns, which was true until it wasn't;
  it now asserts null for `evidence` and a moment for everything else. Any assertion quantified over
  "every dispute the court holds" has this shape and will expire the same way. Ticket 13 fixed the
  neighbouring case — a dispute whose draws were never *read* is drawn as Unknown and counted out
  of the sparsity figures — and **ticket 17 closed this one**: there are now three absences and
  each has its own words. A dispute that was read and has no panel yet says "No panel yet" on the
  row and on the card (`panel.ts`, quiet, neither rose nor Unknown), its blanks are counted apart
  on `Sparsity.undrawnDisputes` and `undrawnPositions`, and the sparsity note names them by id
  before claiming that a blank means an agent juror was not selected. `Panel 0` is gone from both
  layouts: a zero there claims the court drew a panel of nobody.
- **Dispute 155 had a panel of one.** Coherence is tautological there. Any aggregate carries this.
- **A dispute in `appeal` has every vote in and no ruling.** Disputes 164–166 sat there with all
  twelve draws revealed and `ruled: false`. That is a real state and not a transient one — the
  appeal period runs ~18h — and it is none of the three the cell design first named: not coherent
  or diverged (no ruling to compare against), not a missed vote (it voted), not awaiting or
  committed (it revealed). The matrix words it `REVEALED`, a third stage of the live family. Any
  aggregate must exclude these draws from coherence while still counting their latency, or it will
  either undercount speed or invent a coherence figure out of a prediction.
- **The matrix is sparse** — it was 44% empty over the first thirteen disputes, and one agent juror
  has never been drawn at all. A design that assumes a full grid will look broken.
- **Latency is never shown as a fraction of a window** — not in a cell, not in an aggregate, not on a
  detail view. The court's durations changed mid-experiment, so the same ratio means different things
  either side of dispute 152, and a percentage is false the moment it is quoted away from the page.
  ADR-0005. Where the window matters it appears *beside* how long the period actually ran, as two absolute
  durations.
