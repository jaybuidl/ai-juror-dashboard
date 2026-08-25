# ai-juror-dashboard

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 court 34 on Arbitrum One,
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling).

**Status: the matrix is live**, at <https://kleros-ai-jurors.netlify.app>. Tickets 01, 02, 03, 04,
05, 07, 12, 14 and 15 are done: Vite + React + TypeScript, yarn 4, Biome, Vitest, a `netlify.toml`
that is the single source of truth for the deploy, the Kleros ×AI tokens adopted and self-hosted
webfonts, and the dispute matrix — one row per dispute, headed by that dispute's own title and
category, one column per agent juror, each cell carrying that draw's commit latency, its reveal
latency and whether it voted with the final ruling. Ticket 15 put chrome and routes around it: five
views under one shell — the matrix and the court's totals at `/`, a dispute index, the six agent
jurors by nickname and avatar at `/agent-jurors`, `/method`, and a 404 — each carrying the same nav,
the same read-only statement, and a footer stating the provenance of what is above it. CI exists
too — `.github/workflows/ci.yml`, added as toolchain upkeep rather than as a ticket, so do not
propose it again. Three measures are read and no more: per-agent-juror marginals (06), rewards (10)
and the historical windows (08) are all still unread, and the caveat the matrix view carries says so
outright rather than leaving a reader to infer it. Ticket 07 also brought the first read that is not
a subgraph — `CommitCast` logs from an Arbitrum RPC — and with it `CourtPerformance.commitCoverage`,
the cross-check that turns a short log scan into a number the page states rather than an absence.
Ticket 12 made the court **move**: the disputes and the draws are re-read every five seconds for as
long as anything in the court is unruled and not at all once nothing is, live rows carry a rail, a
tint and a pill naming the open period and how long it has run, and the payloads are persisted to
`localStorage` so a return visit renders before either endpoint answers. It also settled what
"finalised" means — the court has ruled, never `period === "execution"` — which `CONTEXT.md` now
defines and the spec was amended to match.
The design work behind it (glossary, seven ADRs, a spec, eighteen tickets) came out of a full
grilling session and a later pass that rebuilt the tracker on the finished design — ADR-0007 is the
one that came from implementation rather than design, and it overrode the spec. Start by reading, not by
writing.

`README.md` covers the toolchain, the scripts, the test split and the CSP; this file covers the
domain. Two constraints recorded there and easy to trip over: **yarn must be 4.18 or newer**
(earlier versions cannot install TypeScript 7 at all), and dependency floors are caret ranges
rather than exact pins because the maintainer's `npmMinimalAgeGate` quarantines fresh releases.

## Start here

| Read | For |
| --- | --- |
| `CONTEXT.md` | The glossary. Read before naming anything |
| `docs/adr/0001`–`0007` | The seven decisions a reader would otherwise question |
| `.scratch/juror-performance-dashboard/spec.md` | The spec, and a Further Notes section of hard-won facts |
| `.scratch/juror-performance-dashboard/issues/` | 18 tickets, blockers-first, `01` upward |
| `DESIGN_PROMPT.md` | The UI brief. Answered — read the canvas below rather than re-deriving it |
| `.scratch/juror-performance-dashboard/canvas/README.md` | The design canvas: eight artboards, and which figures on them are real |

Ticket **05** was the keystone, and it has landed: `src/performance/` holds the seam,
`buildCourtPerformance(RawCourtData) → KlerosResult<CourtPerformance>`, which is where every
derivation belongs. It touches no network and reads no clock. Tickets 06 and 08 extend
`RawCourtData` and the model rather than fetching beside them, exactly as ticket 07 did when it
added `commits` — the first field on it that no subgraph fills; a metric computed in a component is
the mistake this seam exists to prevent. Ticket 15 added the first **aggregate** on the far side of
it — `CourtTotals` in `src/performance/totals.ts`, which the stat tiles and the latency strip are
figures of — so a court-wide number goes there and not into the view that prints it. Ticket 06's
marginals are the same aggregates sliced by column.
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
  Ticket 14 adopted it: the eight token files are vendored verbatim under `src/styles/kleros-ai/`,
  entered through the system's own `styles.css`, and `src/styles/theme.ts` is `var(--token)` aliases
  over them and holds no value of its own. Do not re-derive a palette from `kleros-v2/web` — that
  repo is the reference for markdown rendering and react-query patterns, not for how this dashboard
  looks.
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
  Re-confirmed by introspection on 2026-08-25: `ClassicVote` is `id, coreDispute, localRound, juror,
  draw, commit, commited, choice, voted, justification` and carries no moment at all.
- **`eth_getLogs` on arb1 returns `blockTimestamp: "0x0"` on every log.** The field is not in the
  JSON-RPC spec, the endpoint sends it anyway, it is always zero, and viem dutifully formats it to a
  well-typed `0n`. It is the perfect trap: present, correctly typed, and wrong. A reader that trusted
  it would date every commitment to 1970, and because a commitment predating its own commit period is
  dropped rather than shown, the whole court would render as an unread shortfall — no error, no
  console warning, just a page saying nothing was found. The moment comes from `eth_getBlockByNumber`,
  which is the only source that has it. `commit-logs.ts` carries the warning and a test pins it.
- **The Arbitrum endpoint rate-limits per RPC call, and counts a batch as its size.** Reading one
  block per commitment is 56 calls today; 62 blocks read three times over inside a second returns
  HTTP 429 with a `text/plain` body, which viem surfaces as `UnknownRpcError: Cannot read properties
  of undefined (reading 'error')` rather than as a rate limit. One page load is far from the ceiling
  and react-query's minute of staleness keeps it that way, but it arrives with roughly 200 more
  disputes, and a *live test suite* hits it immediately — which is why `commit-logs.integration.test.ts`
  reads once in `beforeAll` and shares the result rather than reading per test. **Ticket 12 landed
  the fix**: `src/performance/block-times.ts` remembers block timestamps in `localStorage`, so a
  repeat scan costs one `eth_getLogs` plus only the blocks never seen before — one or two rather
  than 57. It is safe because a mined block's timestamp cannot change, which makes it the only
  cache here with no staleness to reason about. ADR-0004's preferred fix is still to put the
  timestamp in the subgraph. The cache also outlives a *test*: `commit-logs.test.ts` clears
  `localStorage` in a `beforeEach`, because without it an assertion about which blocks were read
  passes or fails on the order the cases happen to run in.
  **The rate-limit budget belongs to the whole live suite, not to one file.** Vitest runs test
  files in parallel and gives each its own `localStorage`, so the block cache does not carry
  between them and every file that scans pays full price. Two files scanned; ticket 12 added a
  third and `yarn test:integration` went red with `UnknownRpcError` while each file passed alone.
  The fix was to stop scanning in the new file — liveness is read from the ruling and the round
  timeline, so it never needed the commitments. Before adding a commit scan to a live test, ask
  whether the test actually needs a moment, and run the whole suite rather than the one file.
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
  "every dispute the court holds" has this shape and will expire the same way.
- **Dispute 155 had a panel of one.** Coherence is tautological there. Any aggregate carries this.
- **A green suite here proves the healthy path and nothing else.** Every fixture in this repo is
  one successful read of a working court, so no test can contain a second read that failed, a
  round that does not exist yet, or a court that is not this one. A review pass over ticket 05
  found seven defects against 105 passing tests, five of them the same shape: a read that failed
  rendering as a read that returned nothing — an empty payload builds a *successful* model with no
  rows, and the page then states that the court has held no disputes. When adding to this seam,
  write the failure case by hand; the fixtures will not hand it to you.
- **A dispute in `appeal` has every vote in and no ruling.** Disputes 164–166 sat there with all
  twelve draws revealed and `ruled: false`. That is a real state and not a transient one — the
  appeal period runs ~18h — and it is none of the three the cell design first named: not coherent
  or diverged (no ruling to compare against), not a missed vote (it voted), not awaiting or
  committed (it revealed). The matrix words it `REVEALED`, a third stage of the live family. Any
  aggregate must exclude these draws from coherence while still counting their latency, or it will
  either undercount speed or invent a coherence figure out of a prediction.
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
  would drag the Node-only path into the bundle. The join is the core dispute's `templateId`, and it
  is **neither the dispute id nor a constant offset from it**: 151→161, 152→163. It is nullable on
  the subgraph's own type, so a dispute can have no title at all. `templateData` is a JSON *string*
  holding `title` and `category`; nothing validates it before publication, so treat every field as
  possibly missing, blank or not a string. Dispute 159's category is `""` today — the live example
  of the empty slot.
- **The DRT subgraph sorts `id` lexicographically too**, and the same trap bites harder there because
  template ids are small: `id_gte: "161"` returns templates 2 and 17–28 as well. Ask for templates by
  exact `id_in`, never by range. An id with no template is not an error — it simply does not come
  back, which is the tolerance the row rendering assumes.
- **A subgraph read that comes back short throws nothing.** A reindexing Goldsky deployment answers
  HTTP 200 with `[]` and no GraphQL error; a lagging one returns some of the ids it was asked for and
  not the rest. Both slip past every `response.ok` and `body.errors` check, and both render as an
  absence that is indistinguishable from a fact — a dispute with no title, a juror never drawn, a
  round with no votes. Where a read draws a **known set** of ids, compare what came back against what
  was asked for and report the shortfall as a count, not as an error: `src/disputes/useDisputes.ts`
  carries `{expected, resolved, isLoading}` and `DisputeList` names the number. A thrown error is then
  just the case where the count is zero. This bites every ticket that fetches by id — 05, 07, 08, 10.
- **`text-overflow: ellipsis` does nothing inside a `1fr` grid track.** A track's minimum is `auto`,
  which is its content's minimum, so the column grows to fit the longest title and the row overflows
  sideways instead of clipping — with nothing in the console. `minmax(0, 1fr)` on the track and
  `min-width: 0` on the item are both required. `DisputeList.tsx` carries them and a test pins the
  computed `grid-template-columns`, because the failure is invisible until someone reads a row.
- Every appeal period ran ~18h against a 36h configured value. Unexplained, affects no metric here,
  but do not treat appeal duration as understood.
- **Latency is never shown as a fraction of a window** — not in a cell, not in an aggregate, not on a
  detail view. The court's durations changed mid-experiment, so the same ratio means different things
  either side of dispute 152, and a percentage is false the moment it is quoted away from the page.
  ADR-0005. Where the window matters it appears *beside* how long the period actually ran, as two absolute
  durations.
- **The CSS `font` shorthand resets `font-feature-settings`, and every `--type-*` token is one.**
  `tokens/base.css` puts `font-feature-settings: var(--font-feature-numeric)` (`"tnum" 1`) on `body`
  so digits are tabular page-wide; any element typed through a `--type-*` token silently drops that
  for itself and its descendants. A column of latency figures then stops lining up, with nothing in
  the console. Re-declare `font-feature-settings` after the shorthand on anything holding a figure —
  `theme.featureMono` for mono values, `theme.featureNumeric` for sans. Every numeric element on
  every artboard carries its own, which is the tell.
- **Vite dev and `yarn preview` send no CSP at all**, so a missing host in `netlify.toml` looks
  perfect locally and fails only in production — for a font or a stylesheet, as a silent fall back
  rather than an error. The guard-rail comment there covered only `connect-src` until ticket 14 and
  would have missed a font host entirely; it now covers any host, in the directive that governs it.
  Verify with an A/B against a local server sending the exact policy, collecting through a
  `report-uri` or a `securitypolicyviolation` listener registered at document start — the browser
  console does not carry violations to automation.
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
- **Two reads that failed at different moments render as one page that was read at the later one.**
  react-query keeps what it already holds when a refetch fails, which is the right behaviour and is
  why the matrix survives a flaky subgraph — but the dispute read and the draw read are separate
  queries, so one can succeed while the other keeps hour-old data. The page then joins a fresh
  dispute list to stale draws, and a dispute created since that draw read has *no cells* — which
  this design defines as "not drawn", an unread state rendering as a fact about the court. Found by
  review on ticket 15, where both the notice and the provenance footer keyed on `disputes.error`
  alone and said nothing about `performance.error`. Every ticket that adds a read — 06, 07, 08, 10
  — adds another pair that can drift apart, and ticket 12's five-second poll means they now drift
  apart *repeatedly* rather than once per load. Check *each* query's error, and say which half is
  stale rather than that "the court" is.
- **A flag that is false while a read is in flight is not a flag that the read failed.**
  `RosterView.isResolvedFromEns` is false during the mainnet lookup *and* after it fails, so a
  caveat keyed on it alone announces "ENS could not be reached" for the length of every cold load
  and then retracts it — and a caveat that comes and goes teaches a reader to ignore caveats.
  `isResolving` is the other half and both are required. This bit three call sites on ticket 15,
  including one pre-dating it in `Roster.tsx`, and the fixture hid it by hard-coding
  `isResolving: false` for a state whose own comment said it covered both. It applies to every
  caveat any ticket writes from here on.
- **`JSON.stringify` turns a `Map` into `{}`, and the query cache is persisted as JSON.** Ticket
  12 persists react-query's cache to `localStorage`, and `useDisputes`'s templates query holds a
  `Map<number, DisputeTemplate>`. Persisted, it comes back as an object with no `get` on it,
  `templateFor` finds nothing, and **every row on the page renders untitled** — which is exactly
  what a dispute that never had a template looks like, the reclassification ticket 04 built a
  counted notice to prevent. Nothing throws at write time or read time. This is why the persisted
  set in `src/persistence.ts` is an **allowlist** and not a filter: a query is not persisted until
  someone names it and answers whether its value survives a JSON round trip — no `Map`, no `Set`,
  no `bigint`, no `Date`. Tickets 06, 08 and 10 each add a read, and two of them read a chain.
- **Persisting a *derived* value means today's code reads yesterday's shape.** The seam is pure and
  re-derives every figure on load, so persisting payloads needs no invalidation when the arithmetic
  changes — that is the whole safety argument for the cache. But three query functions store a
  shaped value rather than a raw one (`toDisputes` inside `useDisputes`, `toDisputeTemplates`, and
  the reduction in `fetchCommitCasts`), deliberately, because they throw on payloads they cannot
  read. A field added to `Dispute` therefore arrives `undefined` on every restored row, and
  `undefined` is what this dashboard draws as "not drawn", "no title" and "not read".
  `PERSISTED_MODEL_VERSION` busts the cache and `src/persistence.test.ts` pins those three shapes
  so that changing one fails a test naming the constant to bump. It is only a guard if the shapes
  stay pinned.
- **A backtick inside a CSS comment ends the styled-components template.** This repo's house style
  puts long prose comments inside `styled.x\`…\`` blocks, and the moment one of them quotes an
  identifier the way the rest of the codebase does — around a filename, say — the template literal
  closes there and the file fails to parse somewhere further down, with an error pointing at the
  wrong line. Write those comments without backticks.
- **Parallel ticket branches collide in the status prose *and* in the code.** Tickets 03, 14 and a
  CI branch each touched this file's status paragraph and `README.md` § Status. Git auto-merged all
  three textually and produced claims true of every parent alone and false of the merge — "no
  dispute data" one commit after the dispute list landed, and a `live` CI job describing one
  integration suite after `yarn test:integration` had silently picked up a second. Lint, types and
  tests passed on all of it. Tickets 04 and 05 then did it again in the source: both branches
  independently generalised the *same* private `fetch` helper so a second reader could share it, in
  different directions — `postSubgraphQuery` in a new `src/disputes/subgraph.ts` against an exported
  `postCoreQuery` left in `court-subgraph.ts` — so what conflicted was a design choice, not a text
  merge. Ticket 05's file records how that one was settled, under § Integrated with ticket 04.
  When integrating, re-read every sentence that counts what is done or says how many of something
  there are, and every helper both branches touched. Then look for what the merge newly connects
  that neither parent could test: ticket 04's `slotsFor` only reaches ticket 05's matrix once both
  are on the same branch, and on either branch alone that wire is `undefined`. The sentences and
  hunks that raise a conflict marker are the easy half.

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
DRT subgraph         …/subgraphs/kleros-v2-drt/v0.12.0/gn  — same host as the core subgraph, so
                     it added nothing to connect-src. Joined on the core dispute's templateId
Arbitrum RPC         https://arb1.arbitrum.io/rpc  — answers fromBlock 0 → latest for a topic-
                     filtered eth_getLogs in ~230ms, so the 8M-block figure understated it and
                     no start block need be maintained. Rate-limits per RPC *call* and counts a
                     batch as its size; see § Traps
CommitCast           CommitCast(uint256 indexed _coreDisputeID, address indexed _juror,
                     uint256[] _voteIDs, bytes32 _commit), on DisputeKitClassic. Dispute and
                     juror are indexed; the court is not, so the scan filters on the six roster
                     addresses and the seam drops what belongs to another court. 56 of them
                     across disputes 151–166 on 2026-08-25, one per committed draw, latency 14s
                     to 3,236s
Mainnet RPC          https://ethereum-rpc.publicnode.com  (ENS only; ankr needs a key now, and
                     cloudflare-eth reverts inside the ENS universal resolver)
Nicknames            007, aletheia, baskerville, blaise, columbo, daemonhill — ENS subnames of
                     agents.kleroslabs.eth on mainnet, all six resolving with avatars on euc.li.
                     baskerville has never been drawn; the roster in src/roster/ is the only
                     place all six appear, and the live suite checks it against ENS — now
                     nightly, in CI's `live` job, so drift surfaces without anyone asking
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
