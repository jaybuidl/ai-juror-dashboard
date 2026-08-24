# Coherence is counted per draw, not per vote

A juror drawn in a dispute may hold several vote IDs — columbo held 2 of the 3 votes in dispute 151.
The Kleros subgraph counts coherence per vote ID (`totalCoherentVotes` / `totalResolvedVotes`). We
count it per draw instead: one agent juror in one dispute is one data point, however many vote IDs
it held.

## Considered Options

Counting per vote measures **influence over the ruling**, and it is the convention the subgraph and
the Kleros court frontend already use. Counting per draw measures **quality of judgment**, which is
what this experiment is actually asking about: an agent reasons once about a dispute and submits one
transaction per period, so a second vote ID is extra weight, not extra evidence.

We chose judgment over influence, deliberately diverging from the upstream convention. Vote counts
are still surfaced per cell, so a draw carrying disproportionate weight remains visible.

## Consequences

The subgraph's `totalCoherentVotes` and `coherenceScore` fields cannot be used — they are per-vote
and global across all courts, while this dashboard is per-draw and scoped to court 34. Coherence is
recomputed from `ClassicVote.choice` against `Dispute.currentRuling`. The 61 votes in court 34
collapse to 44 draws, which conveniently matches `ClassicJustification` — one per draw — so the draw
is a row the subgraph can return rather than a rollup we assemble.
