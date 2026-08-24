# ai-juror-dashboard

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 court 34 on Arbitrum One,
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling).

**Status: designed, not built.** No application code exists yet. A full grilling session produced the
glossary, four ADRs, a spec and thirteen tickets. Start by reading, not by writing.

## Start here

| Read | For |
| --- | --- |
| `CONTEXT.md` | The glossary. Read before naming anything |
| `docs/adr/0001`–`0004` | The four decisions a reader would otherwise question |
| `.scratch/juror-performance-dashboard/spec.md` | The spec, and a Further Notes section of hard-won facts |
| `.scratch/juror-performance-dashboard/issues/` | 13 tickets, blockers-first, `01` upward |
| `DESIGN_PROMPT.md` | UI brief handed to a design agent; UI design is not settled |

Ticket **05** is the keystone: it establishes the pure-function seam and is the first ticket where the
dashboard answers its question. Everything after it branches.

## Invariants

- **Read-only, forever.** This dashboard never votes, stakes, holds a key, or connects a wallet.
- **No backend.** Every endpoint is public and keyless. Any `VITE_` config is baked into the bundle
  and is public by construction — never put a secret there.
- **No personal data.** Agent jurors are identified by nickname and stack, never by who built them.
- **Public deployment**, possibly cited in research. Partial data must never render as complete, and
  caveats must be visible in the UI, not just handled correctly in code.
- Use `CONTEXT.md` vocabulary. It deliberately **overrides** `kleros-juror-cli`'s glossary on one
  point: "agent" is an avoided term there, and the central term here.

## Traps

Things that cost real effort to discover and are easy to get wrong again:

- **Court 34's parameters changed mid-experiment**, between dispute 151 and 152. Dispute 151 had an
  8-hour commit window; everything after has 45 minutes. Never use the court's *current*
  `timesPerPeriod` as a historical denominator. This is why latency is stored in seconds (ADR-0001).
- **Commit timestamps do not exist in the subgraph.** `ClassicVote.commited` is a boolean. They come
  from `CommitCast` logs (ADR-0004). Reveal timestamps *are* in the subgraph, on the justification.
- **The unit is the draw, not the vote.** 61 votes collapse to 44 draws. The subgraph's
  `totalCoherentVotes` / `coherenceScore` are per-vote *and* global across all courts — unusable here
  (ADR-0002). `ClassicJustification` is conveniently one per draw.
- **Dispute 155 had a panel of one.** Coherence is tautological there. Any aggregate carries this.
- **The matrix is 44% empty** and one agent juror has never been drawn. Sparsity is normal.
- **agentkit is only partly browser-safe.** `src/core/juror-v2.ts` and `disputes-v2.ts` are clean;
  `config-source.ts`, `sdk-lock.ts`, `rate-limit.ts`, `report-issue.ts` are Node-only. Its
  `src/index.ts` does not export the domain readers, and `getSubgraphUrl` reads `process.env`.
- Dispute titles come from the **DRT subgraph** as plain JSON — no IPFS, no Kleros SDK. Using the SDK
  would drag the Node-only path into the bundle.
- Every appeal period ran ~18h against a 36h configured value. Unexplained, affects no metric here,
  but do not treat appeal duration as understood.

## Verified constants

Confirmed against live chain and subgraph; no key needed for any of these.

```
Court                34 "Agentic Commerce Court", Arbitrum One (42161)
Disputes             151–163, single-round, all in execution
KlerosCore           0x991d2df165670b9cac3B022f4B68D65b664222ea
DisputeKitClassic    0x70B464be85A547144C72485eBa2577E5D3A45421
Core subgraph        api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/kleros-v2-coreneo/v0.17.2/gn
DRT subgraph         …/subgraphs/kleros-v2-drt/v0.12.0/gn
Arbitrum RPC         https://arb1.arbitrum.io/rpc  (accepts 8M-block eth_getLogs)
Nicknames            ENS subnames of agents.kleroslabs.eth (mainnet), all six resolve with avatars
Round.timeline       [commit start, reveal start, appeal start, execution start]
```

## Related repos

`../agentkit` (the `kleros` CLI) and `../kleros-juror-cli` (the voting CLI, and the glossary this one
extends). Metric logic is deliberately built here first, shaped for later extraction into agentkit
(ADR-0003).

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used verbatim as `Status:` values on issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
