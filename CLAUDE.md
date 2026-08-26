# ai-juror-dashboard

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 court 34 on Arbitrum One,
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling).

**Status: the matrix is live**, at <https://kleros-ai-jurors.netlify.app>, and **all eighteen
tickets are done**. Ticket 18 was the last, and it was a sweep rather than a feature: the palette
measured for the first time in either theme, the matrix given the two facts its cells were not
saying, a route change made audible, and the five-second poll given a voice that is not the grid.
What it did not do is honour a browser text-size preference — the vendored type scale is px
throughout — and that is stated in the ticket, in `docs/contrast.md` and below under § Traps.
Tickets 01, 02, 03, 04,
05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17 and 18 are done: Vite + React
+ TypeScript, yarn 4, Biome,
Vitest, a
`netlify.toml`
that is the single source of truth for the deploy, the Kleros ×AI tokens adopted and self-hosted
webfonts, and the dispute matrix — one row per dispute, headed by that dispute's own title and
category, one column per agent juror, each cell carrying that draw's commit latency, its reveal
latency and whether it voted with the final ruling. Ticket 15 put chrome and routes around it: five
views under one shell — the matrix and the court's totals at `/`, a dispute index, the six agent
jurors by nickname and avatar at `/agent-jurors`, `/method`, and a 404 — each carrying the same nav,
the same read-only statement, and a footer stating the provenance of what is above it. Ticket 09
added the sixth, at `/disputes/:id`: one dispute read whole — its question, its ruling card with a
vote count for every choice including the ones nobody picked, a timeline of the four periods as two
absolute durations each, and every panel member's published reasoning side by side in roster order,
Markdown rendered with raw HTML off at the parser and a warning before any link in it takes you
away. Ticket 11 added the seventh, at `/agent-jurors/:nickname` — one agent juror on its own: its
stack, its six marginals at length, its reveals plotted against every reveal the court recorded,
and the disputes it was drawn in with a panel size beside every coherence mark. It is the view that
needed no read of its own, because tickets 06 and 10 had already computed every figure on it; the
agent juror the court has never drawn gets an honest empty state there rather than an error, and an
address naming nobody says so itself rather than 404ing. CI exists
too — `.github/workflows/ci.yml`, added as toolchain upkeep rather than as a ticket, so do not
propose it again. Ticket 10 read the last of the four measures the design named — cumulative ETH and
net PNK per agent juror, from `TokenAndETHShift` on the core subgraph — so the matrix view's caveat
no longer names anything as unread at all, and what replaces that sentence says what the two sums
are *over* rather than what is missing from them. They are supporting context beside the marginals
and not a dimension anyone is ranked on; nothing on the page orders by them.
Ticket 06 put the per-agent-juror marginals in the column headers — the same three measures sliced
down each column, from `agentJurorMarginalsOf` in `totals.ts` — and with them the first figures on
this page that carry a caveat marker of their own. Ticket 07 also brought the first read that is not
a subgraph — `CommitCast` logs from an Arbitrum RPC — and with it `CourtPerformance.commitCoverage`,
the cross-check that turns a short log scan into a number the page states rather than an absence.
Ticket 08 read the court's own parameter history from the same chain (`src/performance/windows.ts`,
`court-parameters.ts`), so every dispute resolves the period windows that were in force while it
ran, dispute 151 carries a `†` wherever its figures are counted, and no latency is a fraction of
anything (ADR-0005). Ticket 12 then made the court **move**: the disputes and the draws are re-read
every five seconds for as long as anything in the court is unruled and not at all once nothing is,
live rows carry a rail, a tint and a pill naming the open period and how long it has run, and the
payloads are persisted to `localStorage` so a return visit renders before either endpoint answers.
It also settled what "finalised" means — the court has ruled, never `period === "execution"` —
which `CONTEXT.md` now defines and the spec was amended to match. Ticket 13 gave every one of those
reads somewhere to fail out loud: two tiers, decided by whether a failure costs a figure or only a
label, composed per view as `Failures` and rendered by `View` the way the footer is — a rose
blocking banner naming the source, the status and how long ago the page was last read whole, and an
amber degraded panel for ENS, the one documented exception. With it came the sixth cell state,
`?` / **Unknown** / "Not read", for a dispute whose draws were never read at all. Ticket 09 then
added the first read scoped to *one* dispute rather than to the court (`dispute-detail.ts`, its
subgraph reader and `useDisputeDetail`) — the ballot, the evidence count and the justification prose
— and with it the three states a justification can be in, which `CONTEXT.md` now defines: published,
published **empty**, and never published. None of the three is a failed read.
Ticket 16 then gave the whole thing a second layout rather than a second page: below
`breakpoints.narrow` the matrix is **not rendered at all** and `DisputeCards` replaces it — one
card per dispute, six fixed 52px slots along its foot, one per agent juror in roster order whether
drawn or not, so column position still means one agent juror when there are no columns. The chrome
folds with it: the lockup drops its diamond for the official wordmark paths, the four destinations
go behind a disclosure, three stat tiles replace four with the median reveal leading, and the deck
and the latency strip are absent without a measured figure leaving the page. It also answered its
own open question — the legend and the sparsity note reach a phone reader **inline at the head of
the card list, always visible**, because the sparsity note prevents a misreading rather than
answering a question, and a reader who does not know they have been misled never opens a
disclosure. `narrow` is the one width the *layout* changes at; the `600px` and `760px` literals are
gone.
Ticket 11 then answered the question ticket 16 handed it: the agent juror view has **no** reduced
form for its figures — the stat card, the latency profile and the disputes all render at 390pt, the
last as one block per dispute rather than a seven-column table — so it is the one place where
cumulative ETH and net PNK are legible wherever the matrix cannot show them, and the matrix's
caveat points there rather than staying silent about them.
Ticket 17 then gave the surviving grid a second **density** rather than a second layout. Past
`COMPACT_FROM_ROWS` — 40, in `src/performance/density.ts`, documented as a heuristic about screen
height rather than a fact about this court — the cell drops its commit line and halves in height,
the row drops its second line with the category and the ruling on it, the column header keeps three
of its six figures and **freezes**, and the commit median moves onto the dispute row as a figure
over that row's own draws. Nothing else changes: no dispute leaves the page, no column moves,
nothing is filtered, paginated or windowed away, and the comfortable density renders to the pixel
as it did. The switch is one flag read by the cell, the row and the header alike, driven by the row
count in the model, with no control for a reader to set — so the matrix compacts itself as the court
grows into it. It also closed the reading three tickets had handed it: a dispute that was read and
has **no panel yet** says so in words on both layouts, is counted separately on
`CourtTotals.sparsity`, and `Panel 0` is gone. The three figures its header drops are the two
reward sums and the commit median, so the caveat's compact branch borrows ticket 11's pointer for
the first two — which is why that sentence says "wherever" rather than "below the breakpoint".
**A later pass cut the matrix page's prose, and several paragraphs below describe elements it
removed.** Read them as history. Gone from `/`: the caveat card titled "Three measures, and what
is missing from them" (every claim in it was `/method`'s said a second time — checked claim by
claim, including the appeal-period one, which that page puts better), the matrix's lede, the
visible "The matrix" heading (the `h2` stays, visually hidden, because it names the section and is
a stop in the heading order), and the reason paragraph under the median-reveal stat tile, whose
dagger is a link carrying that reason in its own name now. The panel size went from the matrix row,
the phone's card and the dispute view — a row is six cells and a card six slots, so the number
counted what the reader was already looking at, and on dispute 155 it stood beside a `‡ Lone panel`
flag saying the same thing better. It survives on `/agent-jurors/:nickname`, which has no cells to
count and reads coherence against it. The headline names the dashboard rather than stating a
finding, and `aletheia` sits second from the right — a layout call about one rose column, **not** a
ranking, as `ROSTER` says at length. So: where a sentence below names the caveat card, its
branches, or a panel pill, it is describing what was there.

**A second pass continued it, and moved one thing rather than cutting it.** The sparsity note is
no longer the third footnote under the grid: it is in the provenance footer, between the read
range and the line naming how agent jurors are identified, because the † and ‡ notes beside it
decode marks a reader can see *in* the matrix and that one says what the whole record is like —
the same kind of claim as every other line down there. `Footer` takes a `note` slot for it and
`View` threads it as `footerNote`; the slot carries the 90ch measure, since a paragraph in a
column flex has none of its own. It stays gated on `!narrow`, so the phone still meets it as a
card at the head of the card list, which is ticket 16's call and unchanged. What went for good
is the **latency strip's caption** — "each mark is one draw … the comparison band is
illustrative … it measures no court" — whose last claim the provenance footer was already
making, one element below three figures that are measured. The band is still disclosed, once, in
that caveat. So a sentence below naming the sparsity note as a footnote, or the band as
labelled by its own caption, is describing what was there too.

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
| `docs/contrast.md` | Every contrast ratio, both themes, and the two exemptions. Read before changing a colour |
| `docs/accessibility.md` | Ticket 18's sweep: what was checked on each surface, what changed, the four things left — and what the sweep missed |

Ticket **05** was the keystone, and it has landed: `src/performance/` holds the seam,
`buildCourtPerformance(RawCourtData) → KlerosResult<CourtPerformance>`, which is where every
derivation belongs. It touches no network and reads no clock. Ticket 10 extended
`RawCourtData` and the model rather than fetching beside them, exactly as tickets 07 and 08 did when
they added `commits` and `parameters` — so `rewards` is the fourth nullable payload on it, and
`Draw.reward` and `AgentJurorMarginals.rewards` are derived from it under the same discipline as
every latency; a metric computed in a component is the mistake this seam exists to prevent. Ticket 15 added the first
**aggregate** on the far side of it — `CourtTotals` in `src/performance/totals.ts`, which the stat
tiles and the latency strip are figures of — so a court-wide number goes there and not into the view
that prints it. Ticket 06 added the second, in the same file: `agentJurorMarginalsOf` →
`CourtPerformance.marginals`, the same aggregates sliced by column, which the matrix's column
headers print and `totals.test.ts` pins as summing back to the court-wide ones. It also moved the
caption's `finalised`/`live` count out of `Matrix.tsx` and onto `CourtTotals`, which is where the
rule always said it belonged. Any aggregate over latency has to disclose the window change the way
any aggregate over coherence has to disclose a panel of one — `changedWindows` and
`lonePanelDisputes` are carried per column for exactly that. Ticket 13 added the seam's first input
that is about a *read* rather than about the court — `RawCourtData.drawsReadAt`, the moment the
draws on screen were fetched — because whether a row's draws were read at all is a derivation and
not a rendering decision. It still consults no clock: the moment arrives as data, exactly as the
commit timestamps do.
Ticket 16 added the third and fourth, in the same file: `CourtTotals.sparsity` — the blank count,
the position count and the empty-column count, over the rows that were read — and `row-flags.ts`,
the flag precedence lifted out of `Matrix.tsx` whole. Both moved for the same reason and it is the
rule stated once more: the matrix and the phone's card list are two renderings of one record, and
a figure or a ranking reduced inside either of them is two chances for a desktop and a phone to
disagree about one court.
Ticket 17 added the fifth and sixth, and made that rule count to **three**: `rowCommitLatencyOf` in
`totals.ts` — the median commit over one dispute's own draws, which the compact row prints — and
`Sparsity.undrawnDisputes`/`undrawnPositions`, the blanks that mean the court has not drawn yet
rather than that an agent juror was not selected. It also lifted `panel.ts` beside `cell.ts` and
`row-flags.ts` for the same reason ticket 16 lifted those: the panel slot's three states were
worded twice, in two files, and one of the two wordings was wrong in both. The density flag itself
is `density.ts` — pure, checked rather than looked at, and the one place the crossing point is
written down.
Ticket 18 added the seventh, and it is a derivation over *two* reads rather than one:
`transitionsBetween` in `transitions.ts`, the diff between one poll and the next, which
`CourtAnnouncer` speaks and nothing else consumes. It is below the seam for the reason every
other reduction is — which transitions are worth hearing is a judgement, and a judgement in a
component is one nobody can test. The rule it exists to keep is that a live region must never
contain the matrix: a hundred and sixty-eight cells announced every five seconds is a region a
reader switches off inside a minute.
Ticket 09 added the **second model** beside it rather than inside it —
`buildDisputeDetail` in `src/performance/dispute-detail.ts`, under the same discipline (pure, no
network, no clock) at a different altitude: one dispute rather than the court, joining the row, the
dispute and the template the court-wide model already holds to one read only that view needs. The
split is about what gets carried, not about what gets derived — the justification prose is 124 KB
today and `courtDraws` is persisted, so reading it court-wide would inflate every load to serve one
page. Ticket 11 then added the **third model**, `buildAgentJurorReading` in
`agent-juror-detail.ts`, and the shallowest of the three: it reduces nothing at all, because ticket
06 built `marginals` for that page and ticket 10 filled its last two figures. What it does is
*join* — which column of the matrix a nickname names — and it lives below the seam for one reason,
which is that the join is on an array index. `marginals` and every row's `cells` are both in roster
order, so an off-by-one shows one agent juror's draws under another's avatar with every figure on
the page internally consistent, no error and nothing in the console. It also lifted the six figure
*readings* out of `Marginals.tsx` into `marginal-figures.ts`, so the matrix's column header and the
agent juror's stat card are two renderings of one reading rather than two sets of judgements about
what an absent commit log means — ticket 16's rule applied one level down.
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
  Ticket 17 is the fourth: its criteria say a row's flag renders identically at both densities,
  and the artboards word it twice on purpose — `Main.dc.html:302` gives "† 8h window", "‡ Lone
  panel", "⋯ Live · commit 3m 12s" and `MatrixDense.dc.html:213` gives "† 8h", "‡ Lone", "⋯ Live".
  The canvas won, and a browser said why: the live pill was 175px of a 375px row and it was the
  dispute's title that paid. `ROW_FLAGS` carries `label` and `shortLabel` so the two cannot fork.
  **The rule only helps if the artboard being read is the one that draws the element.** The
  column header's reason line was built from `Errors.dc.html:201-217`, which demonstrates the
  dagger pattern on a standalone **400px explainer card**; the artboard for that block,
  `Main.dc.html:136-152`, is six bare key-value lines with no prose in it at all. A pattern
  specified at 400px, applied five times over inside a 145px column, cost 350px of column header
  and put the six columns' figures on three different baselines — the one comparison a block of
  marginals exists to allow. Before citing the canvas for how an element looks, find the artboard
  that draws *that element in that place*, not the one that explains the idea.
- Use `CONTEXT.md` vocabulary. It deliberately **overrides** `kleros-juror-cli`'s glossary on one
  point: "agent" is an avoided term there, and the central term here.

## Traps

Things that cost real effort to discover and are easy to get wrong again:

- **Court 34's parameters changed mid-experiment**, between dispute 151 and 152. Dispute 151 had an
  8-hour commit window and an 8-hour vote window; everything after has 45 minutes and 30 minutes.
  Never use the court's *current* `timesPerPeriod` as a historical denominator. This is why latency
  is stored in seconds (ADR-0001). Ticket 08 read the history — `CourtCreated` and `CourtModified`
  on KlerosCore, both of which carry `timesPerPeriod` in full, so no archive `eth_call` is needed —
  and `src/performance/windows.ts` resolves it **per period**, not per dispute: the court reads its
  own durations at the moment it passes a period, so a dispute created under one configuration and
  passed into its commit period under the next ran the later commit window. Two further traps in
  that read. The **deployed** event signatures are not the ones in `kleros-v2/contracts/src`, which
  have since gained an `_eligibility` argument — a signature carrying it hashes to a different topic,
  matches no log, and returns a court that was never configured, with no error and nothing marked.
  And `canvas/Errors.dc.html` samples the new vote window as 45m; it is 30m on chain, which is why
  the marker's durations are read rather than transcribed from the artboard.
- **Both windows changed, and three separate places in the design say only the commit one did.**
  Tickets 06 and 11 and `Juror.dc.html` all rest on "the window change touches commit latency and
  nothing else, which is why the agent juror view plots reveal latency only". It is false — commit
  went 8h → 45m and vote went 8h → 30m in the same `CourtModified` — and the artboard shows what
  believing it produces: `Juror.dc.html:73` prints a median commit while `:108` excludes commit
  latency from the chart directly below it as incomparable, so one page both declines to compare and
  compares (`canvas/README.md` § Known defects). Every latency aggregate is markable, and the marker
  belongs on the median the window it names actually governs — reveal from the vote window, commit
  from the commit window. `Marginals.tsx` and `windowFlagLabel` both compare per window against
  `CourtParameters.current` rather than marking anything in a changed group, so a future court that
  changes only one gets only one marker.
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
  the fix for a repeat scan**: `src/performance/block-times.ts` remembers block timestamps in
  `localStorage` and `blockTimestamps` in `arbitrum.ts` consults it, so a second scan costs one
  `eth_getLogs` plus only the blocks never seen before — one or two rather than 57. It is safe
  because a mined block's timestamp cannot change, which makes it the only cache here with no
  staleness to reason about. ADR-0004's preferred fix is still to put the timestamp in the
  subgraph. The cache also outlives a *test*: `commit-logs.test.ts` clears `localStorage` in a
  `beforeEach`, because without it an assertion about which blocks were read passes or fails on
  the order the cases happen to run in.
  **The cache does not rescue the live suite, and the budget belongs to the whole suite rather
  than to one file.** Vitest runs test files in parallel and gives each its own `localStorage`, so
  nothing carries between them and every file that scans pays full price. Measured on ticket 08:
  one whole `yarn test:integration` is ~130 Arbitrum calls and passes, **two back to back inside a
  minute do not** — the second run's `draws-subgraph` suite 429s. So a red live suite is worth
  re-running once after a pause before believing it. And a new suite that reads this chain must
  justify its calls: ticket 08 dropped a fourth read from `draws-subgraph.integration.test.ts`
  rather than add ~63 calls for something `court-parameters.integration.test.ts` already covers,
  and ticket 12 added a third scanning file, went red with `UnknownRpcError` while each file
  passed alone, and fixed it by not scanning — liveness is read from the ruling and the round
  timeline, so it never needed the commitments. Before adding a commit scan to a live test, ask
  whether the test actually needs a moment, and run the whole suite rather than the one file.
- **`TokenAndETHShift.isNativeCurrency` is `false` on a court that pays in native ETH.** All 56 of
  court 34's payouts carry it, with `feeToken: null` and `feeTokenAmount: "0"`, while `ethAmount`
  carries the full `feeForJuror` — and the raw `TokenAndETHShift` logs decode to
  `_feeToken = address(0)`, which *is* native ETH. The v0.17.2 mapping is simply wrong about it.
  This is the `blockTimestamp: "0x0"` trap in another entity: present, correctly typed, and wrong.
  A reader that believed it would take the fee-token branch, find `0`, and report that every agent
  juror has earned nothing — no error, no console warning, six columns of `0.0000`. The guard is
  that `rewards-subgraph.ts` **does not select the field at all**, and says why: a field absent
  from the query cannot be reached for by someone who has not read this. `feeTokenAmount` is
  selected as the one usable half and is a *partial* guard — the deployment that mislabels the flag
  gives no assurance about which field it would fill if court 34 were switched to the WETH fee
  token it already has registered and unused.
- **The arbitration fee is paid per vote ID, not per draw, so a payout is often a fraction of
  `feeForJuror`.** Nine of the captured court's 44 shifts are 1.25, 1.67 or 2.5 fees: a draw
  holding two of a dispute's three coherent vote IDs takes two thirds of that dispute's pot. An
  assertion that every payout divides evenly by `feeForJuror` looks obviously right and fails on
  real data — it was written and it failed. What *is* exact is court-wide: total ETH paid equals
  `feeForJuror × ` the vote-ID count over the executed disputes, which is 61 fees for the fixture
  and ties the payout read to the draw read through the court's own configured fee. PNK is a
  redistribution and nets to **zero** across the court, to within a wei or two of integer-division
  dust. Both are pinned in `totals.test.ts` and live in `rewards-subgraph.integration.test.ts`,
  because these two figures are *sums*: a read that comes back short renders as an agent juror that
  earned less, which nothing else on the page would catch.
- **Court 34's one reconfiguration changed no reward parameter.** `CourtCreated` and `CourtModified`
  carry byte-identical `minStake` (11000e18), `alpha` (170), `feeForJuror` (2.7e14) and
  `jurorsForCourtJump` (7); only `timesPerPeriod` moved. So the `†` window marker must **not** ride
  cumulative ETH or PNK — it would be a marker a reader can see is misplaced, and one they stop
  reading. Decoded from the logs rather than assumed, because "the court was reconfigured" reads as
  though everything about it changed.
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
- **The offline suite goes red under CPU contention, and it looks like a bug you just introduced.**
  `yarn test` is ~450 tests across 27 files, many of them rendering the whole matrix, and vitest
  runs the files in parallel against the default 5s timeout. Run it while something else is
  saturating the machine — a `/code-review` subagent, another worktree session, a dev server — and
  the run stretches several times its normal duration and a handful of tests time out. Measured on
  ticket 06: one run took 40s against a normal 8.6s and failed four tests, and three subsequent
  quiet runs were 449/449 with no other change. The tell is the **duration**, not the failure
  count. So a red offline suite whose run took far longer than usual is worth re-running on a quiet
  machine before believing it — the same advice § Traps already gives for a red *live* suite, for a
  completely different reason.
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
  just the case where the count is zero. This bit every ticket that fetches by id — 05, 07, 08 — and
  ticket 10 met a version of it with no known set to compare against: its read asks for "every payout
  in court 34" rather than for named ids, so the guard there is arithmetic instead (§ Traps, the
  per-vote-ID fee), which is what a *sum* needs and a count does not.
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
- **`yarn test` reads the deploy's `VITE_` variables on Netlify and none on your machine.** The
  build command is `yarn build:ci`, which runs lint, types *and the offline suite* inside the
  deploy environment — so every variable configured for the site is set while the tests run, and
  a green local suite says nothing about a test that reads `import.meta.env`. Production sets
  `VITE_ARBITRUM_RPC_URL`; the moment `arbitrumSource()` made the failure banner name the endpoint
  actually configured, two assertions expecting the literal `arb1.arbitrum.io` passed on every
  developer machine and failed only in the deploy. The comment beside them even stated the
  mechanism — "no `VITE_ARBITRUM_RPC_URL` is set under jsdom" — and drew the wrong conclusion from
  it. Assert what the accessor returns (`arbitrumSource().name`), and pin what the *default*
  derives to in one unit test that passes the URL explicitly. Before touching anything that reads
  `import.meta.env`, run the suite both ways: `yarn test` and
  `VITE_ARBITRUM_RPC_URL=… yarn test`. This applies to the other three overrides the moment
  anything derives from them.
- **The Kleros ×AI palette is measured now, and the numbers this file used to quote were the
  wrong theme's.** `--cyan-600` at 3.95, `--mint-600` at 3.65 and `--amber-600` at 4.10 are real
  and they disprove `tokens/themes.css`'s claim that its accents "hold 4.5:1 on white" — but they
  are the **light** theme, which is vendored and wired to nothing. The shipped dark accents are
  the `-400`s and all four clear 4.5:1 on every surface including their own washes, worst 5.29.
  Reading those figures as though they described the live page is the trap now.
  What did fail was `--text-4` (2.38–2.91 everywhere it inks, at 9px, on about thirty sites that
  carry meaning) and the **violet glow**, which `Shell.tsx` still describes as decoration carrying
  "no contrast anything else depends on" and which is the actual ground under the top 720px of
  every view — at its old 0.45 peak it took `--text-meta` from 5.43 to 3.71, so the nav's own
  links failed while every measurement taken against `--page` said they passed. Both are fixed in
  `src/styles/contrast.css`, a repo-owned layer *over* the vendored tokens so the copy under
  `kleros-ai/` stays a faithful record of the system as published. `--text-3` moved with
  `--text-4` and only because of it: lifting one far enough to clear its worst surface puts it
  brighter than the other and inverts the ramp. Every figure, both themes, is `docs/contrast.md`;
  `src/styles/contrast.test.ts` re-derives all of it from the token files on every run.
  **Two things about that test are the trap.** Vitest stubs stylesheets to the empty string
  unless `vite.config.ts` names them in `test.css.include`, silently — so a token file nobody
  listed declares nothing, the vendored value stands, and the wrong palette is measured by a
  passing test. And `--text-5` is asserted to stay **below** 3:1, because it inks the 3px "not
  drawn" dot and a well-meant fix that raised it would stop that mark being the quietest thing on
  the page, which is the whole of what it says (ADR-0006).
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
  — added another pair that can drift apart, and ticket 10's is now the fourth query on the matrix
  page, and ticket 12's five-second poll means they now drift
  apart *repeatedly* rather than once per load. Check *each* query's error, and say which half is
  stale rather than that "the court" is.
- **A flag that is false while a read is in flight is not a flag that the read failed.**
  `RosterView.isResolvedFromEns` is false during the mainnet lookup *and* after it fails, so a
  caveat keyed on it alone announces "ENS could not be reached" for the length of every cold load
  and then retracts it — and a caveat that comes and goes teaches a reader to ignore caveats.
  `isResolving` is the other half and both are required. This bit three call sites on ticket 15,
  including one pre-dating it in `Roster.tsx`, and the fixture hid it by hard-coding
  `isResolving: false` for a state whose own comment said it covered both. It applies to every
  caveat any ticket writes from here on. It is the **same shape** as `commitCoverage.read` and as
  `commitFigureOf`'s `scanned` argument: an absence only becomes a failure once there has been an
  answer to fall short of, and every one of these three is a "the read has happened" flag guarding
  a "the read came up empty" test. Ticket 13 reintroduced the bug a third time — converting the
  commit slot to rose put "Not read" on all 56 cells for the length of every cold load — so assume
  any new emptiness test needs its own gate and write the test for both directions. Ticket 08's
  `parameters.read` is the fourth of them.
- **`Thing.ts` and `Thing.tsx` differing only in case is a hard TypeScript error on macOS.**
  `TS1149`, raised at whichever file imports the second one, and it names both paths rather than
  saying "rename this". The house pattern of a pure model beside its component (`provenance.ts` +
  `Footer.tsx`) is fine because those names differ; `failure.ts` + `Failure.tsx` is not, and
  becomes `failures.ts` + `Failure.tsx`. Biome and Vite say nothing — only `yarn check-types` does.
- **`JSON.stringify` turns a `Map` into `{}`, and the query cache is persisted as JSON.** Ticket
  12 persists react-query's cache to `localStorage`, and `useDisputes`'s templates query holds a
  `Map<number, DisputeTemplate>`. Persisted, it comes back as an object with no `get` on it,
  `templateFor` finds nothing, and **every row on the page renders untitled** — which is exactly
  what a dispute that never had a template looks like, the reclassification ticket 04 built a
  counted notice to prevent. Nothing throws at write time or read time. This is why the persisted
  set in `src/persistence.ts` is an **allowlist** and not a filter: a query is not persisted until
  someone names it and answers whether its value survives a JSON round trip — no `Map`, no `Set`,
  no `bigint`, no `Date` — and then whether a *failed* read of it succeeds, which is what kept the
  ENS identities out. Ticket 08's `courtParameters` was admitted on those terms when the two
  branches were merged, and ticket 10's `courtRewards` on the same two. That one is worth keeping
  as the example, because the expected answer was wrong: the amounts are `bigint` in the model, so
  it looked like the first `bigint` payload here — and the subgraph serves every one of them as a
  decimal **string**, with the parsing inside the pure seam where nothing is stored. Asking is what
  showed that; assuming would have kept a perfectly safe read out of the cache.
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
- **The deployed subgraph carries no link from a dispute to its evidence.** `Dispute` has no
  `evidenceCount` and `ClassicEvidence` has no `dispute` — only an `evidenceGroup`, whose id is
  whatever the arbitrable passed as `_evidenceGroupID`. The mapping in `kleros-v2/subgraph` today
  *does* put `evidenceCount` on the dispute and `dispute` on the evidence; that is a later version
  than the v0.17.2 deployment answering the query, which is the same shape as the `_eligibility`
  trap — **the source in the monorepo is not what is answering**. So ticket 09's evidence count
  rests on an assumption: that court 34's one arbitrable
  (`0xb5526d022962a1fff6ed32c93e8b714c901f4323`) uses the core dispute id as its evidence group id.
  Verified across all 31 disputes on 2026-08-25 — every one has a group, and all 33 submissions
  fall inside their own dispute's evidence period — and guarded at runtime by comparing
  `externalDisputeId` against `disputeID`, so a mismatch renders "Submissions not read" rather than
  somebody else's count. `dispute-detail.integration.test.ts` re-checks both live. Also:
  `nextEvidenceIndex` **is** the submission count despite its name, and is read in preference to
  counting the entities because a counter cannot come back short and a paged list can.
- **A disabled react-query query is `pending` for ever, and that is the fourth face of the
  "flag that is false while a read is in flight" trap.** `useQuery({enabled: false})` leaves
  `status: "pending"` with no data and never resolves, so `isPending` is true for the whole life
  of a page whose read was never *started*. Ticket 09 hit it on `/disputes/latency`: the view
  correctly said the address names nothing while the footer permanently claimed the ballot was
  "still being read". `fetchStatus` is the half that tells them apart — `"idle"` for a query
  nobody asked, `"fetching"` for one in flight — and the flag a view consumes must be
  `isPending && fetchStatus !== "idle"`. As with `RosterView`, the fixture hid it by hard-coding
  the flag.
- **A dispute id is global across every court on the core subgraph.** `dispute(id: "50")` answers
  for a dispute in some other court, so `/disputes/50` is a read that *succeeds* and finds
  something this dashboard will never hold a row for. Two consequences ticket 09 met. The view
  has to say "this is not court 34's" rather than falling through to "has not been read yet",
  which would state an unread condition as a permanent fact about a read that worked. And the
  per-dispute model runs on **whatever comes back**, before anything checks the court — so a
  field like `numberOfChoices`, which is a `BigInt` from an arbitrable nobody here controls, is
  attacker-influenced input in a way the court-wide reads are not. It is capped at
  `MAX_CHOICES` for exactly that reason: filling a ballot from 0 to an eighty-digit number
  hangs the tab with no error and nothing on screen.
- **jsdom lays nothing out, so a whole class of defect is invisible to `yarn test`.** This is the
  same lesson ticket 09's clipping bug taught in one instance, and ticket 16 hit three more in one
  afternoon — every one of them with 619 green tests. A `ul` carries 40px of UA
  `padding-inline-start` and this repo has no reset that removes it, so the phone card stack was
  indented 40px and pushed the page 40px sideways, which is the single thing that layout must never
  do. `flex: 1 1 380px` on an item that also gets rendered inside a *column* container is a
  **height**, so the sparsity note became a three-line paragraph in a card three hundred pixels
  tall; the fix is to put the basis on the container as `> * { flex: … }`, where the arrangement
  owns it. And a `span` marked with a rule underneath it draws that rule across the whole container
  when the container stretches it, which a flex row never does and the folded nav's column always
  does. None of the three throws, warns, or fails a test. Anything positional in this repo needs a
  browser at the width it is claimed to work at, and `agent-browser` with `--executable-path` is
  how the rest of this ticket was checked. **Ticket 17 found three more the same way, with 736
  green tests**, and two of them are worth knowing as rules rather than as anecdotes.
  A state the live court has not reached yet still has to be *opened*: the compact density needs
  more than forty disputes and court 34 holds thirty-one, so it was checked by lowering
  `COMPACT_FROM_ROWS` in the dev server, reading the page, and putting it back. A fixture cannot
  stand in — jsdom lays nothing out, which is the whole reason the browser is being opened.
- **A green axe run is not an accessibility sweep, and no test here can measure a hit area.**
  Clicking a dispute row did nothing, and it was a reader who said so rather than the suite. The
  ID was the only link: 40x21px inside an 1104x80px row — one per cent of its area, under the 24px
  WCAG 2.5.8 asks for — with the title beside it inert text, so the row read as the way in
  everywhere except the forty pixels where it was. It shipped **through** ticket 18, whose axe
  audit returned zero violations on seven routes, because **axe does not check target size at
  all**; and no offline test could have caught it either, because jsdom lays nothing out and a hit
  area is a layout. Two rules come out of it. The first is ticket 16's, one level further on: the
  phone's card had the right target the whole time (`CardLink::after` at `inset: 0` over a
  positioned `Card`) and the desktop row never got it, so **two renderings of one record fork in
  the affordance as readily as in the prose** — and the fork the automated tool cannot see is the
  one that survives eighteen tickets. The second is about what a clean tool run licenses you to
  claim: an audit's silence covers what it tests, and naming the criteria it does *not* test is
  part of reporting it. The fix, for anything else that needs one, is the stretched pseudo-element
  rather than a second link — it adds no element, no second accessible name and no second tab
  stop, and inside the matrix it scopes itself, because `DisputeRow` renders into `RowHeaderCell`
  and the overlay stops at that cell. Its one load-bearing half is `position: relative` on the
  row, and that half fails *without a bound*: an absolutely positioned box with no positioned
  ancestor resolves against the initial containing block, so dropping the line does not shrink the
  target back to the digits but spreads one dispute's link across the viewport. A test pins the
  declaration; the area still needs a browser.
- **A `position: sticky` element sticks to its nearest *scroll container*, and `overflow: hidden`
  makes one.** Ticket 17's frozen column header needed two unrelated things fixed before it could
  freeze at all, neither of them in the matrix: `Shell.tsx`'s `Ground` wrapped every view in
  `overflow: hidden`, which is a scroll container even where nothing overflows, and the matrix's
  own `overflow-x: auto` box is one in *both* axes — `overflow-y: visible` beside it computes to
  `auto`, per CSS Overflow 3. A sticky header inside either sticks to a box that never scrolls
  vertically, so it simply never freezes: no error, no warning, and nothing a jsdom test can see.
  `Ground` is `overflow: clip` now, which clips identically and is not a scroll container; the
  matrix drops its own box at the compact density and takes a `min-width` instead. Anything sticky
  added here has to walk its ancestors first.
- **An `auto` grid track takes its content's width before a `1fr` sibling gets anything.** The
  compact row was `2.5rem minmax(0, 1fr) auto` — id, title, details — and the title measured
  **zero pixels** on every row in a browser: an id, some pills and no subject. The floor is
  `minmax(7rem, 1fr)` on the track that must survive. It is the same family as the
  `text-overflow: ellipsis` failure `DisputeList.tsx` already carries a comment about, and it fails
  in the same silence.
- **`table-layout: auto` settles a shortfall by crushing whatever can shrink, and a declared
  width is only a suggestion to it.** The third member of the family above, and the most
  expensive so far because it survived three tickets and a review. The matrix declared a 440px
  row header and six 148px columns — 1328px, exactly what `canvas/Main.dc.html` draws — inside a
  page that gives 1104px of content. An auto table does not overflow in that situation and does
  not warn; it finds the compressible column and takes the whole 224px out of it. Six columns of
  identity and figures are incompressible, so the row header rendered at **239px of the 440 it
  declared** and the dispute title inside it at 180px of its natural 836. A 1440px desktop showed
  a fifth of a question the 390pt phone showed whole, and the tell — a clipped title — is exactly
  what a title is *supposed* to look like when it does not fit. jsdom lays nothing out, so no
  offline test could see it; axe does not measure layout, so ticket 18 could not; and the code
  around it had already convinced itself otherwise, because `breakpoints.compactGrid`'s note
  described the compact grid as scrolling in its own box "exactly as the comfortable grid always
  does" when the comfortable grid had no `min-width` and never did. The fix is `table-layout:
  fixed` plus a `min-width` floor per density, so the widths are held and a page too narrow for
  them scrolls the box rather than the record. **Any declared width in this repo needs a browser
  to confirm it was honoured** — `getComputedStyle` reports what was *asked*, and
  `getBoundingClientRect` what was *given*, and the gap between them is silent.
- **A shared styled component sized for its first use is sized wrong for its second.**
  `MeasureKey` is 7px wide because a cell's key is one letter; the row's `MED C` overlapped the
  duration beside it. Fixed through a component selector where the second use is, rather than by
  widening the first.
- **Two layouts share their model by construction and their *prose* by hand, and the prose is
  where they drift.** Ticket 16 gave the matrix a second rendering; `cell.ts`, `row-flags.ts`,
  `Legend.tsx` and `Footnotes.tsx` are shared so the states, the flag precedence and the caveats
  cannot fork. **The caveat card this entry is worked through no longer exists** (§ Status) — the
  rule outlived it, and the shape to look for is any sentence naming a cell, a column, a row or an
  element of the chrome — and review then found five sentences copied from the desktop that were false on
  the phone. The provenance footer named the latency strip's comparison band on a page with no
  strip (and the comment beside the strip's removal claimed otherwise); the caveat card said "each
  column header" and "a blank cell" on a layout with neither, two hundred lines from a
  `SparsityNote` carefully parameterised to say "slot"; the commit-shortfall notice told a reader
  that N slots read "Not read" when a card slot shows the commit only while a reveal is still
  ahead, so almost none of them do. Every one passed lint, types and 619 tests. **Any string in a
  view that names a cell, a column, a row, a grid or an element of the chrome is a claim about
  which layout the reader is looking at**, and gets the same treatment `SparsityNote`'s noun does.
  **The 10 + 16 merge produced four more of them, and no branch could have caught one.** Ticket 10
  put two figures in the matrix's column headers and gave the footer three sentences about them;
  ticket 16 drops the column headers whole. Merged, all three described figures a phone reader
  cannot see — one promising a figure "is shown yet" on the one layout where none is coming — and
  a fourth, the payout failure banner, named the column headers outright. Both parents were
  correct alone. So the rule has a second half for anyone merging a branch into this one: **a
  ticket that adds a figure to a desktop-only element adds every sentence about that figure to the
  phone's list of things to gate**, and the gate is `!narrow` in `provenanceOf`, tested in both
  directions because a caveat that is absent for the wrong reason tests nothing. `MatrixPage`'s
  phone describe block carries those four. **Ticket 17 made it three renderings rather than two**,
  and the third is not a width: past `COMPACT_FROM_ROWS` the column header keeps three of its six
  figures, so the same sentences that were false on a phone are false on a long matrix. The gate is
  now `provenanceOf(props, narrow, dense)` with `payoutsShown = !narrow && !dense` — one predicate
  named for what it actually asks — and the caveat card has a third branch. The next reduction adds
  a fourth: the question to ask of any sentence here is not "which layout" but "is the figure this
  names on the screen the reader has".
- **Narrowing a set is a change to every sentence quantified over it, and gating the figure does
  not gate the prose.** The reverse direction of the trap above, found by the 11 + 17 merge and
  the one no gate on either branch could have caught. Ticket 17 split `Sparsity.undrawnDisputes`
  out of the read disputes, because a dispute the court has not drawn a panel for has no draw in
  *any* column — and it held those rows out of `Sparsity.emptyColumns`, whose own comment calls
  that "the one figure not gated on it". It was not: ticket 11 had built a page that states the
  same quantity **in words** — "across the N disputes whose draws have been read, this agent
  juror has not come up" — on the one view whose entire subject is a column being empty. Merged,
  a court in its opening hours would tell a reader that all six agent jurors had been passed over
  on the strength of a draw that has not happened, which is exactly the misreading `undrawnDisputes`
  exists to close. Both parents were correct alone, 809 tests were green, and nothing but reading
  found it. So when a ticket narrows a set, the sweep is not "which figures are computed from it"
  — the compiler finds those — but **which sentences anywhere are quantified over it**, including
  on views that ticket never opened. The tell is a number in prose with a noun after it.
- **A page can say something true of every figure on it and false about the thing it is naming.**
  Ticket 11's footer told a reader of `/agent-jurors/nope` that "the court has drawn it in none of
  the disputes read" and that "not being drawn is the measured record" — sentences written for
  baskerville, which is a real agent juror the court has never drawn, reaching a path segment that
  names nobody at all. Both states show no figures and only one of them is a reading of the court;
  the other has nothing for the court to have failed to do. It is the "not drawn" versus "not read"
  distinction one level up, and the same rule applies: **an empty page has as many empty states as
  it has reasons to be empty, and each needs its own words.** Nothing caught it — 731 tests, lint,
  types and a green build — because every test asserted what the page *shows*, and what was wrong
  was a sentence about something it does not.
  **The banner half is the same defect and is easier to miss**, because it is composed somewhere
  else. `failuresOf` runs before a view's not-found branch returns, so an address that names
  nothing gets the whole stack — and on ticket 11 every one of those sentences named the agent
  juror the address had just failed to name ("no cumulative ETH figure below is a measurement" over
  a page with no figures at all). The rule that settles it is ticket 13's own tiering read
  literally: **a failure is loud because it costs a figure, so a page carrying no figure raises no
  banner**, which is why `NotFoundPage` passes none. Compose the failures *after* the branch that
  can return early. `DisputePage` still does it the other way round and is the milder version of
  the same thing — its wording is generic, so it banners a page showing nothing rather than
  banners it about the wrong dispute. Worth fixing the day that view is touched; recorded here
  rather than changed inside ticket 11's branch.
- **`flex-direction: column-reverse` lays a column out from the bottom, so items stop sharing a
  baseline the moment one of their labels wraps.** The house pattern of a value above its own key
  needs the `dt` first in the markup (a `dd` before its `dt` is invalid), and reversing is the
  obvious way to get it. At 390pt "Median reveal" wraps to two lines where "Coherent" does not, and
  the three numbers beside each other then sit at three different heights — with `order: -1` on the
  value they do not. Invisible to every test, for the reason below.
- **jsdom has no `window.matchMedia` at all** — `undefined`, not a stub answering false. So
  `useIsNarrow` in `src/styles/breakpoints.ts` guards the read exactly as `useIsClipped` guards
  `ResizeObserver`, and returns false where there is nothing to ask; every test written before
  ticket 16 therefore keeps rendering the desktop form with no change. A test of the reduced form
  has to say so, through `src/test/viewport.ts`. An unguarded `window.matchMedia(…)` here would
  throw inside the render of most of the chrome, on every test in the suite.
- **The breakpoint is one number and it has to stay one.** `styles/breakpoints.ts` exports both the
  `narrow` media prelude and `useIsNarrow`, built from a single `NARROW_QUERY`, because two ways of
  asking one question is how a page ends up rendering the phone's card list under the desktop's
  chrome — broken only in the few pixels between two numbers, with nothing in the console. Ticket
  16 folded the last two strays (`600px` in `MatrixPage.tsx`, `760px` in `DisputePage.tsx`) into
  it. A new `@media` with a literal in it is a regression, not a local decision.
  **Ticket 17 added a second number to that file and it is not a second `narrow`.**
  `breakpoints.compactGrid` (1160px) asks a different question about a different element — whether
  the compact grid's own measurements fit the page — and its value is arithmetic rather than a
  choice: a 440px row header plus six columns a compact cell needs about 104px each for is
  `COMPACT_GRID_MIN_PX`, 1064, which this page's gutters put at that viewport. The test for a new
  width is not "is there already one" but "does it answer a question none of these do, and is its
  value derived from something". Both live in `breakpoints.ts` because that is still the one place
  a width anything reduces at is written down.
- **Deciding whether to clip and then clipping never clips.** `useIsClipped` measured
  `scrollHeight > clientHeight` to decide whether to apply a `max-height` — and at the moment of
  the test nothing had bounded the element, so the two were always equal and the answer was always
  "it fits". The cap has to be applied *unconditionally* while collapsed, with the measurement
  reporting whether the content exceeded it. Nothing failed and no test caught it: every offline
  test runs in jsdom, where every height is zero and every branch of this is unreachable. It was
  visible only in a browser, on dispute 154, whose 7,079-character justification ran five thousand
  pixels down the page and stretched every column beside it. Any measure-then-constrain layout in
  this repo has the same shape.
- **A view that renders inside the shell cannot be tested by asserting the shell.**
  `routes.test.tsx` checks the nav and the footer on every path in `ROUTES`, and the 404 renders
  both — so adding `/disputes/156` to that list proved nothing about whether the route matched.
  A route test has to assert something only that view says. This was found by opening the page,
  not by the suite.
- **`yarn preview` silently moves to another port when one is in use, and other worktrees are
  using them.** Three checkouts of this repo can each be serving a `dist`, so `localhost:4173`
  answers HTTP 200 with *a different branch's build* — the new route 404s, the bundle looks stale,
  and it reads exactly like a routing bug. The tell is in the server's own output ("Port 4173 is in
  use, trying another one…"), which is easy to miss when it is backgrounded. Read the port it
  actually chose, and confirm by matching the `assets/index-*.js` hash the page requests against
  the one on disk. The cheap prevention is to pick a port and refuse to move off it —
  `yarn dev --port 5199 --strictPort` fails loudly instead of serving somebody else's branch,
  which is what ticket 17's browser pass ran on.
- **Two translucent layers of the same gradient composite, and the token then lies about the
  page.** `--glow-violet` was painted twice — as a `body` `background-image` in `global.ts` and
  again as `Shell.tsx`'s `<Glow>` div, same gradient, same size, same position. A declared peak
  of `a` renders as `1-(1-a)²`, so 0.45 drew 0.70. Nothing looks wrong, because the result is
  simply a stronger glow; it bites the moment anyone *measures* the layer, because the figure
  computed from the token is not the figure on the screen. Ticket 18 dimmed the glow once
  against the wrong number before review found the second paint. The general form: before
  measuring against a decorative layer, count how many times it is painted.
- **A contrast surface is every layer under the ink, not the nearest one.** The failure banner is
  a rose wash, and it is the first thing inside `<main>`, which is inside the glow's 720px band —
  so its labels sit on ink-over-wash-over-glow-over-page, and the pairing this dashboard actually
  shipped was **1.33:1**. A test that asserts inks × washes and inks × glow but never the two
  together leaves exactly the region where both apply unmeasured, and passing.
  `src/styles/contrast.test.ts` composes them now.
- **A `<caption>` that is `position: absolute` can stop naming its table.** The house
  `VisuallyHidden` is absolutely positioned, and `as="caption"` computes the element away from
  `table-caption` display; several browser and screen-reader pairs then drop it from the table's
  accessible name, so the element added to name the grid does nothing. `dom-accessibility-api`
  computes the name from the element either way, so no jsdom test can see it. Use a real
  `<caption>` with a `VisuallyHidden` *inside* it.
- **`outline: none` does not suppress this repo's focus ring.** The design system's ring is
  `outline: none` plus a `--ring-focus` **box-shadow**, so a component writing `outline: none` to
  stop a ring being drawn suppresses nothing at all. It matters wherever a container takes
  programmatic focus — Chrome matches `:focus-visible` on a scripted focus when the last
  interaction was a keyboard one, so `<main>` taking focus on a route change would have drawn a
  2px halo round the whole view. Suppress `box-shadow`, and do it on `:focus-visible`.
- **An interpolation inside a CSS comment is still evaluated, exactly as a backtick there still
  closes the template.** The sibling of the trap below and found the same way — by writing a
  careful comment. `/* this read "outline: ${theme.focusRing}" */` inside a `styled.x` block is
  not a comment as far as the template literal is concerned: `${theme...}` is interpolated, and
  where the comment sits at module scope rather than inside the tagged template's own scope the
  error is `theme is not defined` at import time, taking down every test file that reaches the
  module. Name the token in prose (`theme.focusRing`) rather than quoting the code.
- **`title` is never the sole carrier of a fact.** It needs a pointer hovering the element, so a
  keyboard reader cannot reach it, a touch reader cannot reach it, and screen readers disagree
  about whether to announce it at all. Ticket 18 found three — `DisputePanel`'s `R`/`C` measure
  keys, whose phrases existed nowhere else, and the full agent juror address on
  `AgentJurorPage` — and the pattern that replaces it is the one the matrix already used:
  `aria-hidden` on the abbreviation, `VisuallyHidden` beside it with the words. A `title` that
  *duplicates* text already in the DOM is fine and the dispute row's is exactly that.
- **Accessible-name computation normalises the whitespace out from between adjacent nodes.**
  Two elements side by side in a grid track with a `column-gap` contribute their text with
  nothing between it: the matrix's row header announced as `"151x402 escrow dispute"` and its
  second line as `"EscrowRuling 1Panel 2"`, invisibly, because the gap is layout and the visible
  separator is a `·` that is `aria-hidden` (spoken as "middle dot" otherwise). The fix is a
  `VisuallyHidden` comma between them — and note that its trailing *space* is trimmed too, so
  the name reads `"151,x402…"`. That is enough, because a comma is a pause to a speech
  synthesiser, but an assertion written against `"151, x402"` will fail. The phone's six slot
  labels had the same defect for the same reason.
- **An inline `components` object for `ReactMarkdown` remounts every node it maps, on every
  render.** A new function identity for `a` is a new component *type* to React, so every anchor
  in a justification was unmounted and rebuilt whenever anything in `Justification` rendered —
  a state change, a parent re-render, ticket 12's five-second poll. Nothing looks wrong, because
  the links are rebuilt identically. It surfaces only when something holds a reference to one:
  ticket 18's interstitial could not hand focus back to the link it interrupted because the ref
  pointed at a detached node. Hoist the map and the plugin array to module scope.
- **Restoring focus has to happen after the thing holding focus is gone.** Calling `.focus()` on
  the element you want in the same handler that unmounts the currently-focused one leaves the
  document falling back to `<body>`: the unmount happens second and takes the focus with it. Do
  it in an effect keyed on the state that closed the panel, so the two orderings cannot be got
  the wrong way round. Ticket 18 hit this on the justification interstitial and again on the
  folded nav's Escape.
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
  there are, and every helper both branches touched. Tickets 10 and 16 then showed the *type*
  version of the same thing: 10 made `rewards` a required field of `RawCourtData`, and 16's
  `DisputeCards.test.tsx` builds one — so the merge failed `check-types` on a file neither branch
  had a reason to touch. That one is cheap, because the compiler finds it; the four prose defects
  in the same merge are the expensive half, and nothing found them but reading. Then look for what the merge newly connects
  that neither parent could test: ticket 04's `slotsFor` only reaches ticket 05's matrix once both
  are on the same branch, and on either branch alone that wire is `undefined`. The sentences and
  hunks that raise a conflict marker are the easy half.
- **Never machine-resolve a conflict hunk by concatenating both sides, however additive it looks.**
  Three branches merged at once (08, 12, 13) produce dozens of hunks whose base side is empty, and
  a script that keeps ours-then-theirs for those looks safe and is not: git splits hunks wherever
  the diff happens to align, which in this repo's house style lands **inside a prose doc comment**.
  Concatenating then swallows the `/**` opener of the second block, or drops the `});` closing a
  `describe`, and the error surfaces hundreds of lines away pointing at the wrong thing. Four files
  broke that way on the 08 + 12 + 13 merge — `totals.ts`, `Matrix.tsx`, `useCourtPerformance.ts`,
  `performance.test.ts` — and it was Biome's parser that caught every one, not review. Worse, the
  same technique can lose a *type field* rather than a brace: `unreadDisputes` was concatenated
  onto the end of `WindowChange` instead of `CourtTotals`, which parses fine and is simply wrong.
  Resolve hunks by hand. If a script is unavoidable, diff the result against **both** parents
  afterwards for lines appearing more often than in either — that check is what proved the rest of
  that merge clean.
- **One failed source gets one banner line, and the provenance footer never carries the failed
  half.** Ticket 13's rule, made concrete by the merge that first tested it. A read that fails is
  said exactly twice — in the banner at the top, and in the place where the figure would have been
  — so the footer stating it too makes one outage three voices, and a reader who meets the same
  sentence three times stops reading any of them. The half the footer keeps is the read still *in
  flight*, which is provenance for what is on screen rather than a failure. Two consequences that
  are easy to get wrong: when one endpoint serves two reads (Arbitrum serves the commit scan and
  the parameter history) an outage takes both, so `arbitrumFailureOf` returns the **worst one**
  rather than listing the source twice — and a caveat that goes quiet under a banner is correct,
  where one that says "still being read" about a read that gave up is the `RosterView` trap again.
  Tickets 06, 09 and 10 each added a read or a view and each met this; ticket 11 still will.
  Ticket 10 is the one that tested the rule on a **shared** endpoint from the subgraph side: its
  payouts come from the same Goldsky deployment as the disputes and the draws, so `coreFailureOf`
  now collapses four reads into one line the way `arbitrumFailureOf` collapses two, and it ranks
  last because it costs the least — two of six figures in a column header, against the matrix.

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
Court 34 windows     `timesPerPeriod` is `[evidence, commit, vote, appeal]` in seconds. Created
                     2026-08-11 10:34:50 UTC with [43200, 28800, 28800, 129600] — 12h, 8h, 8h, 36h.
                     Reconfigured once, 2026-08-20 12:52:00 UTC, to [2700, 2700, 1800, 129600] —
                     45m, 45m, 30m, 36h. Two events in the court's whole life, from
                     `CourtCreated`/`CourtModified` on KlerosCore; captured in
                     `src/performance/court-34-parameters.fixture.json` and asserted live by
                     `court-parameters.integration.test.ts`, which is what keeps `/method`'s prose
                     account true
CommitCast           CommitCast(uint256 indexed _coreDisputeID, address indexed _juror,
                     uint256[] _voteIDs, bytes32 _commit), on DisputeKitClassic. Dispute and
                     juror are indexed; the court is not, so the scan filters on the six roster
                     addresses and the seam drops what belongs to another court. 56 of them
                     across disputes 151–166 on 2026-08-25, one per committed draw, latency 14s
                     to 3,236s
Court 34 economics   feeForJuror 270000000000000 wei (0.00027 ETH), minStake 11000e18, alpha 170,
                     jurorsForCourtJump 7. All four **unchanged** across the court's one
                     reconfiguration, so no reward figure is qualified by the window marker.
                     Stake at risk per vote ID is minStake × alpha / 10000 = 187 PNK
TokenAndETHShift     TokenAndETHShift(address indexed _account, uint256 indexed _disputeID,
                     uint256 indexed _roundID, uint256 _degreeOfCoherency, int256 _pnkAmount,
                     int256 _feeAmount, address _feeToken), on KlerosCore. Read from the core
                     subgraph rather than from logs — it is one of the few things the deployment
                     carries in full, amounts included. 56 of them across disputes 151–166 on
                     2026-08-25, one per (juror, dispute, round), written at execution. The fee
                     is per **vote ID**, not per draw; `isNativeCurrency` is wrong on this
                     deployment — see § Traps for both
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
