# ai-juror-dashboard

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 court 34 on Arbitrum One,
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling).

**Status: the roster is live**, at <https://kleros-ai-jurors.netlify.app>. Tickets 01 and 02 are
done: Vite + React + TypeScript, yarn 4, Biome, Vitest, a `netlify.toml` that is the single source
of truth for the deploy, and a page that names all six agent jurors by nickname and avatar. There
is still no dispute data, no metric and no matrix — the page says so outright rather than rendering
an empty grid, and says it *below* the roster precisely because showing who the six are is the
point at which a visitor could start reading the page as a result. The design work behind it
(glossary, six ADRs, a spec, eighteen tickets) came out of a full grilling session and a later pass
that rebuilt the tracker on the finished design. Start by reading, not by writing.

`README.md` covers the toolchain, the scripts, the test split and the CSP; this file covers the
domain. Two constraints recorded there and easy to trip over: **yarn must be 4.18 or newer**
(earlier versions cannot install TypeScript 7 at all), and dependency floors are caret ranges
rather than exact pins because the maintainer's `npmMinimalAgeGate` quarantines fresh releases.

## Start here

| Read | For |
| --- | --- |
| `CONTEXT.md` | The glossary. Read before naming anything |
| `docs/adr/0001`–`0006` | The six decisions a reader would otherwise question |
| `.scratch/juror-performance-dashboard/spec.md` | The spec, and a Further Notes section of hard-won facts |
| `.scratch/juror-performance-dashboard/issues/` | 18 tickets, blockers-first, `01` upward |
| `DESIGN_PROMPT.md` | The UI brief. Answered — read the canvas below rather than re-deriving it |
| `.scratch/juror-performance-dashboard/canvas/README.md` | The design canvas: eight artboards, and which figures on them are real |

Ticket **05** is the keystone: it establishes the pure-function seam and is the first ticket where the
dashboard answers its question. Everything after it branches. Ticket **14** must land before it —
adopting the Kleros ×AI tokens after 05 means restyling several views instead of styling them once.
Every ticket from `03` up carries a `**Design:**` line naming what it is built against — an artboard
and its line range, or, for ticket 14, the design system itself.

## Invariants

- **Read-only, forever.** This dashboard never votes, stakes, holds a key, or connects a wallet.
- **No backend.** Every endpoint is public and keyless. Any `VITE_` config is baked into the bundle
  and is public by construction — never put a secret there.
- **No personal data.** Agent jurors are identified by nickname and stack, never by who built them.
- **Public deployment**, possibly cited in research. Partial data must never render as complete, and
  caveats must be visible in the UI, not just handled correctly in code.
- **The visual system is Kleros ×AI**, at `../kleros-design-system/kleros-ai/kleros-ai-design/`.
  Its `tokens/*.css` is adopted verbatim; `src/styles/theme.ts` still holds the Court dark palette
  as a placeholder. Do not re-derive a palette from `kleros-v2/web` — that repo is the reference for
  markdown rendering and react-query patterns, not for how this dashboard looks.
- **Where the canvas and a ticket disagree, the canvas wins.** Ruled 2026-08-25, resolving three
  conflicts at once; the tickets were amended, not the artboards. Two of those resolutions are now
  ADR-0005 and ADR-0006. This does not extend to the canvas's *data*, which is largely sampled.
- Use `CONTEXT.md` vocabulary. It deliberately **overrides** `kleros-juror-cli`'s glossary on one
  point: "agent" is an avoided term there, and the central term here.

## Traps

Things that cost real effort to discover and are easy to get wrong again:

- **Court 34's parameters changed mid-experiment**, between dispute 151 and 152. Dispute 151 had an
  8-hour commit window; everything after has 45 minutes. Never use the court's *current*
  `timesPerPeriod` as a historical denominator. This is why latency is stored in seconds (ADR-0001).
- **Commit timestamps do not exist in the subgraph.** `ClassicVote.commited` is a boolean. They come
  from `CommitCast` logs (ADR-0004). Reveal timestamps *are* in the subgraph, on the justification.
- **The unit is the draw, not the vote.** Across the first thirteen disputes, 61 votes collapsed to
  44 draws. The subgraph's `totalCoherentVotes` / `coherenceScore` are per-vote *and* global across
  all courts — unusable here (ADR-0002). `ClassicJustification` is conveniently one per draw.
- **Dispute 155 had a panel of one.** Coherence is tautological there. Any aggregate carries this.
- **The matrix is sparse** — it was 44% empty over the first thirteen disputes, and one agent juror
  has never been drawn at all. A design that assumes a full grid will look broken.
- **ENS reverse records are mostly unset.** Only three of the six addresses have one, because
  setting it requires each operator to act from the agent's own wallet. Resolve *forward* from the
  roster's subname; `getEnsName(address)` leaves half the roster anonymous.
- **`getEnsAvatar` is a `connect-src` fetch, not just an image load.** viem sends a `HEAD` to the
  avatar URL before it ever reaches an `<img>`. Blocked, it fails *silently* — viem catches it and
  falls back to `new Image()`, so avatars still appear and the only symptom is a console violation
  on every load. This is why `euc.li` is in `connect-src` and not left to `img-src`.
- **The ENS nickname is a display name, not a key.** `blaise` carries a `name` text record reading
  "Blaise", so what renders is not what the roster holds. Route, key and join on the roster
  nickname, never the resolved one.
- **agentkit is only partly browser-safe.** `src/core/juror-v2.ts` and `disputes-v2.ts` are clean;
  `config-source.ts`, `sdk-lock.ts`, `rate-limit.ts`, `report-issue.ts` are Node-only. Its
  `src/index.ts` does not export the domain readers, and `getSubgraphUrl` reads `process.env`.
- Dispute titles come from the **DRT subgraph** as plain JSON — no IPFS, no Kleros SDK. Using the SDK
  would drag the Node-only path into the bundle.
- Every appeal period ran ~18h against a 36h configured value. Unexplained, affects no metric here,
  but do not treat appeal duration as understood.
- **Latency is never shown as a fraction of a window** — not in a cell, not in an aggregate, not on a
  detail view. The court's durations changed mid-experiment, so the same ratio means different things
  either side of dispute 152, and a percentage is false the moment it is quoted away from the page.
  ADR-0005. Where the window matters it appears *beside* how long the period actually ran, as two absolute
  durations.
- **The CSP guard-rail comment in `netlify.toml` only covers `connect-src`.** It caught both of ticket
  02's data hosts and would miss a font host entirely. Adopting the design system's webfonts touches
  `style-src` and `font-src` — and Vite dev serves no CSP, so a missed edit looks perfect locally and
  falls back to system fonts only in production.
- **The Kleros ×AI palette has never had its contrast measured, and misses its own stated target.**
  `tokens/themes.css` claims "accents darkened to hold 4.5:1 on white"; measured, `--cyan-600` is
  3.95, `--mint-600` 3.65 and `--amber-600` 4.10 — only `--rose-600` (5.08) clears. In the dark
  theme `--text-4` (`#5b5675`) is 2.68–2.91:1 across page, card and raised, and it inks the pending
  dash, the rail keys and the vote count at 9px. Consistent with the system's own readme, which
  says its values were matched by eye from screenshots. Ticket 18 owns fixing it.
- **`Round.timeline` writes `0` for a period that has not opened yet** — and `0` is a real instant in
  1970, one subtraction away from a latency of fifty-six years. Every dispute still in `appeal` has
  it in the execution slot today. Parse it to null at the edge, as `src/disputes/disputes.ts` does,
  rather than guarding at each use.
- **Round ids are `<disputeID>-<n>` and The Graph orders `id` lexicographically**, so `151-10` sorts
  above `151-9`. Read the index from the id suffix, never from the position a `rounds` selection
  arrived in. Costless while every dispute has one round, and silently wrong the first time one does
  not. The same string ordering is why dispute lists order on `disputeID` and not on `id`, and why
  ordering happens in the model rather than the query — **ordering by `period` is rejected outright**
  by The Graph on the `Dispute` type, so the obvious query is the broken one.

## Verified constants

Confirmed against live chain and subgraph; no key needed for any of these.

```
Court                34 "Agentic Commerce Court", Arbitrum One (42161)
Disputes             start at 151; single-round so far. New ones arrive continually — query the
                     court, never hard-code an upper bound, and treat any total you read here or
                     in the spec as true only of the range it names
KlerosCore           0x991d2df165670b9cac3B022f4B68D65b664222ea
DisputeKitClassic    0x70B464be85A547144C72485eBa2577E5D3A45421
Core subgraph        api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/kleros-v2-coreneo/v0.17.2/gn
DRT subgraph         …/subgraphs/kleros-v2-drt/v0.12.0/gn
Arbitrum RPC         https://arb1.arbitrum.io/rpc  (accepts 8M-block eth_getLogs)
Mainnet RPC          https://ethereum-rpc.publicnode.com  (ENS only; ankr needs a key now, and
                     cloudflare-eth reverts inside the ENS universal resolver)
Nicknames            007, aletheia, baskerville, blaise, columbo, daemonhill — ENS subnames of
                     agents.kleroslabs.eth on mainnet, all six resolving with avatars on euc.li.
                     baskerville has never been drawn; the roster in src/roster/ is the only
                     place all six appear, and the live suite checks it against ENS
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

The five canonical triage roles, used verbatim as `Status:` values on issue files, plus a local `done` for finished ones — `ready-for-human` means *waiting on* a person, not completed by one. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
