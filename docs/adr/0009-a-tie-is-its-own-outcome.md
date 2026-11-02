# A tie is its own outcome, paid as coherent

Until 2026-11-02 a draw was coherent when it voted for the final ruling and diverged otherwise. A tie
broke that rule without anything saying so. When a round's vote ends level, DisputeKitClassic rules
0 — refuse to arbitrate — and then pays **every juror who voted** as coherent, whatever they chose:
`_getDegreeOfCoherence` returns full coherence for `vote.voted && (vote.choice == winningChoice ||
tied)` (`kleros-v2/contracts/src/arbitration/dispute-kits/DisputeKitClassicBase.sol`, the
`currentRuling` and `_getDegreeOfCoherence` functions). Almost nobody votes 0, so this dashboard
compared each vote against the 0 the tie ruled and called the whole panel diverged — the opposite of
what the court paid it.

Dispute 249 is the case that showed it: 2 votes for Si, 2 for No, ruled 0. On chain 007, Blaise and
one more voter took `degreeOfCoherency` 10000 and earned PNK; Columbo, who did not vote, took 0 and
lost 187 PNK. The matrix had all three voters as Diverged. 6 of court 34's first 166 disputes tied
(173, 209, 210, 217, 249, 292).

So a vote in a tied dispute is a sixth cell state, **Tied**: `=`, the word "Tied", cyan like
Coherent because it is paid like it, and outlined where Coherent is bare. The states a draw can end
in are now:

- **Coherent** — voted for the ruling of a dispute that did not tie. Paid.
- **Tied** — voted, in a dispute whose ruling is a tie. Paid as coherent; coherent with nothing.
- **Diverged** — voted against the ruling of a dispute that did not tie. Penalised.
- **No vote** (counted as **Missed**) — did not vote. Penalised, tie or not.

Every agent juror's draws are reported as that breakdown — coherent, tied, diverged, missed, and
acting while a dispute is undecided — each counted by its own state, so the lines sum to the draw
count. It replaces the single `coherent/ruled` figure, which folded ties, divergence and missed votes
into one unnamed remainder. The matrix header prints each line as a whole-percent share of the
draws, with the draw count beneath it as the base; the agent juror page prints "84% (86)", the
share and the count. Each line rounds on its own, so the shares can total 99% or 101%.

## Considered Options

**Tied as incoherent** (`incoherent = tied + diverged`) was the first framing, on the premise that
both are penalised. The contract says otherwise, and the dashboard would have kept calling paid votes
incoherent.

**Tied folded into Coherent** matches the payout exactly and needs no new state. It was rejected
because how a dispute was decided matters to reading the experiment: a tie is not agreement with the
ruling, and counting it as coherence would credit an agent juror with a judgment it did not make.

## Consequences

- The tie is read from `Dispute.tied` on the core subgraph, and only once `ruled`: before execution
  the subgraph tracks the running tally, which a later vote can break, and its `currentRuling` there
  is the leader rather than the 0 a tie rules. At execution it reads the contract, so a ruled
  dispute's flag is the contract's. A one-sided appeal that overrides a tie sets it false.
- The persisted model version moved (`persistence.ts`), because the dispute payload gained a field.
- Only the last round's tie counts, as the contract judges every round against the final ruling.
  Court 34 has had no appeal round.
- The subgraph's own `coherenceScore` still counts a tied voter as incoherent unless it voted 0. It
  was never used here (ADR-0002), and this is one more reason not to.
- ADR-0006's state list gains Tied; ADR-0002's "recomputed against `currentRuling`" now has this one
  exception.
