# ai-juror-dashboard

A public, read-only dashboard measuring the AI agent jurors in Kleros v2 court 34 on Arbitrum One
— six of them in the roster today — on two dimensions: **speed** (commit and reveal latency) and
**coherence** (voting with the final ruling). Vite + React + TypeScript, yarn 4, Biome, Vitest; `netlify.toml` is the single source of
truth for the deploy.

## Status

Live at <https://kleros-ai-jurors.netlify.app>.

- **Done:** tickets 01–18 and 22. **Open:** 19, 20, 21, 23, 24, 25, 26.
- **"Six agent jurors" is true of `src/roster/agent-jurors.ts`, not of the court.** `grokleros` is
  live and drawing (ticket 24) and more are expected. Read every "six" in this repo as a claim about
  the roster file when it was written. See `docs/knowledge/ens-and-roster.md`.
- **The court has been reconfigured three times, and the dashboard accounts for two** (ticket 19).
  It gets reconfigured for demos — see `docs/knowledge/court-34.md` before believing a red
  parameters suite.
- Seven views: the matrix and court totals at `/`, a dispute index, `/disputes/:id`,
  `/agent-jurors`, `/agent-jurors/:nickname`, `/method`, and a 404 — all under one shell.
- CI (`.github/workflows/ci.yml`) exists as toolchain upkeep, not as a ticket. Do not propose it.
- Ticket-by-ticket history, and which elements later passes removed:
  `docs/knowledge/project-history.md`. Current truth is the ticket files, not that account.

Two toolchain constraints that are easy to trip over: **yarn must be 4.18 or newer** (earlier
versions cannot install TypeScript 7 at all), and dependency floors are caret ranges rather than
exact pins because the maintainer's `npmMinimalAgeGate` quarantines fresh releases. `README.md`
covers the toolchain, scripts, test split and CSP; this file covers the domain.

## Start here

| Read | For |
| --- | --- |
| `CONTEXT.md` | The glossary. Read before naming anything |
| `docs/knowledge/` | The domain knowledge base — every tripwire below, in full |
| `docs/adr/0001`–`0007` | The seven decisions a reader would otherwise question |
| `.scratch/juror-performance-dashboard/spec.md` | The spec, and a Further Notes section of hard-won facts |
| `.scratch/juror-performance-dashboard/issues/` | 26 tickets, blockers-first, `01` upward; seven still open |
| `.scratch/juror-performance-dashboard/canvas/DESIGN_PROMPT.md` | The UI brief. Answered — read the canvas rather than re-deriving it |
| `.scratch/juror-performance-dashboard/canvas/README.md` | The design canvas: eight artboards, and which figures on them are real |
| `docs/contrast.md` | Every contrast ratio, both themes, and the two exemptions. Read before changing a colour |
| `docs/accessibility.md` | Ticket 18's sweep: what was checked, what changed, the four things left — and what the sweep missed |

Start by reading, not by writing. Every ticket from `03` up carries a `**Design:**` line naming the
artboard and line range it is built against.

## Domain knowledge

**Routing: new durable domain facts go to the matching `docs/knowledge/` file** (+ a tripwire line
here only if mistake-preventing); auto-memory = user/feedback/tooling facts only; never grow this
file with domain prose.

The fourteen topic files are indexed in `docs/knowledge/README.md`, and each group of
tripwires below names the file it came from.

## Invariants

- **Read-only, forever.** This dashboard never votes, stakes, holds a key, or connects a wallet.
- **No backend.** Every endpoint is public and keyless. Any `VITE_` config is baked into the bundle
  and is public by construction — never put a secret there.
- **No personal data.** Agent jurors are identified by nickname and stack, never by who built them.
- **Public deployment**, possibly cited in research. Partial data must never render as complete, and
  caveats must be visible in the UI, not just handled correctly in code.
- **Every derivation lives below the seam** — `src/performance/`, pure, no network, no clock. A
  metric computed in a component is the mistake that seam exists to prevent.
  See `docs/knowledge/architecture.md`.
- **The visual system is Kleros ×AI**, at `../kleros-design-system/kleros-ai/kleros-ai-design/`,
  vendored verbatim under `src/styles/kleros-ai/`; `src/styles/theme.ts` is `var(--token)` aliases
  over it and holds no value of its own. Do not re-derive a palette from `kleros-v2/web` — that repo
  is the reference for markdown rendering and react-query patterns, not for how this looks.
- **Where the canvas and a ticket disagree, the canvas wins** (ruled 2026-08-25) — but only if the
  artboard you are reading is the one that draws *that element in that place*.
  See `docs/knowledge/architecture.md` § The design canvas.
- Use `CONTEXT.md` vocabulary. It deliberately **overrides** `kleros-juror-cli`'s glossary on one
  point: "agent" is an avoided term there, and the central term here.

## Tripwires

One line per trap, phrased to stop the mistake on its own. The full account of each — what it cost,
how it was found, what guards it now — is in the `docs/knowledge/` file named at the head of its
group. **Read the topic file before acting on a line here.**

### Court 34: parameters and economics → `court-34.md`

- **Parameters changed mid-experiment**, between dispute 151 and 152: commit 8h → 45m, vote 8h →
  30m. Never use the *current* `timesPerPeriod` as a historical denominator, and resolve windows
  **per period**, not per dispute.
- **Both windows changed; three places in the design say only the commit one did.** Mark a latency
  median against the window that governs it — reveal from the vote window, commit from the commit.
- **The deployed event signatures are not the ones in `kleros-v2/contracts/src`** — those gained an
  `_eligibility` argument, hashing to a different topic that matches no log, with no error.
- **The arbitration fee is paid per vote ID, not per draw**, so a payout is often a fraction of
  `feeForJuror`. "Every payout divides evenly" looks right and fails on real data.
- **No reconfiguration has changed a reward parameter** — the `†` window marker must never ride
  cumulative ETH or PNK.
- **The court has been reconfigured a third time** (2026-08-26, evidence 45m → 10m) and the
  dashboard has not taken it up yet — open ticket 19. Anything asserting two events is stale, and
  the court gets reconfigured for demos, so a red parameters suite is usually that, not a regression.
- Every appeal period ran ~18h against a 36h configured value. Unexplained; do not treat appeal
  duration as understood.

### Chain, subgraph and RPC → `chain-and-subgraph.md`

- **Commit timestamps do not exist in the subgraph** — `ClassicVote.commited` is a boolean. They
  come from `CommitCast` logs (ADR-0004). Reveal timestamps *are* there, on the justification.
- **`eth_getLogs` on arb1 returns `blockTimestamp: "0x0"` on every log** — present, correctly typed,
  wrong. The moment comes from `eth_getBlockByNumber`.
- **The Arbitrum endpoint rate-limits per RPC *call*, counting a batch as its size**, and surfaces
  it as `UnknownRpcError`. Before adding a chain read to a live test, ask if it needs a moment.
- **`TokenAndETHShift.isNativeCurrency` is `false` on a court that pays native ETH.** The v0.17.2
  mapping is wrong; `rewards-subgraph.ts` does not select the field at all. Do not reach for it.
- **Dispute titles come from the DRT subgraph**, joined on `templateId`, which is **neither the
  dispute id nor a constant offset from it**. `templateData` is unvalidated — every field may be
  missing, blank or not a string.
- **The DRT subgraph sorts `id` lexicographically**, so `id_gte: "161"` also returns 2 and 17–28.
  Ask by exact `id_in`, never by range.
- **A subgraph read that comes back short throws nothing** — HTTP 200, `[]`, no error, rendering as
  an absence indistinguishable from a fact. Where a read draws a **known set** of ids, compare
  returned against asked-for and report the shortfall as a count.
- **`Round.timeline` writes `0` for a period not yet open**, one subtraction from a latency of
  fifty-six years. Parse it to null at the edge.
- **Round ids are `<disputeID>-<n>` and The Graph orders `id` lexicographically**, so `151-10` sorts
  above `151-9`. Read the index from the id suffix. Order lists on `disputeID`, in the model —
  **ordering by `period` is rejected outright**.
- **The deployed subgraph carries no dispute→evidence link** — the monorepo source is a later
  version than the deployment answering the query. The count rests on a verified assumption,
  guarded by comparing `externalDisputeId` against `disputeID`.
- **A dispute id is global across every court**, so `/disputes/50` *succeeds* and finds another
  court's dispute. Say "not court 34's", not "not read yet" — and treat its fields as
  attacker-influenced (`numberOfChoices` is capped at `MAX_CHOICES`).

### Measurement rules → `measurement-rules.md`

- **The unit is the draw, not the vote** — 61 votes collapsed to 44 draws. The subgraph's
  `totalCoherentVotes` / `coherenceScore` are per-vote *and* global across courts (ADR-0002).
- **Latency is never shown as a fraction of a window** (ADR-0005) — where the window matters it
  appears *beside* how long the period ran, as two absolute durations.
- **A dispute in `appeal` has every vote in and no ruling**, for ~18h. Exclude those draws from
  coherence while still counting their latency.
- **A dispute can arrive in `evidence` with no panel and an all-zero timeline.** Three distinct
  absences — not drawn yet, not read, not selected — each needing its own words.
- **Dispute 155 had a panel of one.** Coherence is tautological there; any aggregate carries it.
- **A ruled dispute can legitimately have no payout** — shifts are written by `execute()`, hours
  later, so a coverage cross-check there cries "short read" over an ordinary state.
- **The matrix is sparse** — 44% empty over the first thirteen disputes, one agent juror never
  drawn. A design that assumes a full grid will look broken.

### react-query and persistence → `react-query-and-persistence.md`

- **Two reads that failed at different moments render as one page read at the later one.** Check
  *each* query's error and say which half is stale — never that "the court" is.
- **A flag that is false while a read is in flight is not a flag that the read failed.** An absence
  becomes a failure only once there has been an answer to fall short of. Every emptiness test needs
  its own gate, tested **both** ways. Reintroduced four times so far.
- **A disabled react-query query is `pending` for ever** — consume
  `isPending && fetchStatus !== "idle"`.
- **`JSON.stringify` turns a `Map` into `{}`, and the query cache is persisted as JSON.** The
  persisted set in `src/persistence.ts` is an **allowlist**: nothing is persisted until someone
  answers whether its value survives a JSON round trip *and* whether a failed read of it does.
- **Persisting a *derived* value means today's code reads yesterday's shape**, and `undefined` is
  what this dashboard draws as "not drawn", "no title" and "not read". Bump
  `PERSISTED_MODEL_VERSION`.

### Layout and CSS → `layout-and-css.md`

- **Any declared width needs a browser to confirm it was honoured.** `getComputedStyle` reports what
  was *asked*, `getBoundingClientRect` what was *given*, and the gap is silent — `table-layout: auto`
  crushed the matrix's row header for three tickets.
- **`text-overflow: ellipsis` does nothing inside a `1fr` grid track.** `minmax(0, 1fr)` on the
  track and `min-width: 0` on the item are both required.
- **An `auto` grid track takes its content's width before a `1fr` sibling gets anything** — put a
  floor on the track that must survive.
- **The CSS `font` shorthand resets `font-feature-settings`, and every `--type-*` token is one**, so
  a column of figures silently stops lining up. Re-declare it on anything holding a figure.
- **`position: sticky` sticks to the nearest *scroll container*, and `overflow: hidden` makes one** —
  as does `overflow-x: auto`, in *both* axes. Walk the ancestors first.
- **Deciding whether to clip and then clipping never clips.** Apply the cap unconditionally while
  collapsed; let the measurement report whether content exceeded it.
- **The breakpoint is one number and it has to stay one.** A new `@media` with a literal is a
  regression; a new width must answer a question `styles/breakpoints.ts` does not.
- **`flex-direction: column-reverse` breaks the shared baseline** once a label wraps — use
  `order: -1` on the value. **`flex: 1 1 380px` on an item inside a column container is a *height*** —
  put the basis on the container.
- **A shared styled component sized for its first use is sized wrong for its second.** Fix at the
  second use through a component selector.
- **A backtick inside a CSS comment ends the styled-components template**, and **an interpolation
  inside one is still evaluated**. Name tokens in prose, without backticks.

### Contrast and theme → `contrast-and-theme.md`

- **Before measuring against a decorative layer, count how many times it is painted.** Two
  translucent layers of one gradient composite: a declared 0.45 rendered as 0.70.
- **A contrast surface is every layer under the ink, not the nearest one.** Ink-over-wash-over-glow
  shipped at 1.33:1 while every test measuring against `--page` passed.
- **The shipped dark accents pass; the light theme is vendored and wired to nothing.** Quoting the
  light figures as though they describe the live page is the trap now. `--text-5` is asserted to
  stay **below** 3:1 on purpose (ADR-0006).
- **Vitest stubs stylesheets to the empty string unless `vite.config.ts` names them in
  `test.css.include`** — silently, so the wrong palette is measured by a passing test.

### Accessibility, naming and focus → `a11y-and-focus.md`

- **A green axe run is not an accessibility sweep — axe does not check target size at all.** Naming
  the criteria a tool does *not* test is part of reporting it. Row-sized targets use a stretched
  pseudo-element whose load-bearing half is `position: relative` on the row; dropping it spreads the
  link across the viewport.
- **`title` is never the sole carrier of a fact** — `aria-hidden` on the abbreviation, a
  `VisuallyHidden` beside it. One that duplicates visible text is fine.
- **Accessible-name computation normalises the whitespace out from between adjacent nodes**, so two
  elements in a grid track announce as one run-on string. A `VisuallyHidden` comma fixes it; its
  trailing space is trimmed too, so assert `"151,x402"`.
- **A `<caption>` that is `position: absolute` can stop naming its table**, invisibly to jsdom. Use
  a real `<caption>` with a `VisuallyHidden` *inside* it.
- **`outline: none` does not suppress this repo's focus ring** — it is a box-shadow. Suppress
  `box-shadow`, on `:focus-visible`.
- **An inline `components` object for `ReactMarkdown` remounts every node on every render**, so a
  held ref points at a detached node. Hoist the map and plugin array to module scope.
- **Restoring focus has to happen after the thing holding focus is gone** — in an effect keyed on
  the state that closed the panel, never in the handler that unmounts.

### Prose, caveats and the layout fork → `prose-and-caveats.md`

- **Any string naming a cell, column, row, grid or element of the chrome is a claim about which
  layout the reader is looking at.** One record, three renderings; the model is shared by
  construction, the prose by hand.
- **Gate a caveat on the *element*, not on the condition that usually removes it.** A plot with an
  empty branch still draws a sentence, so `!narrow` was not enough.
- **A ticket that adds a figure to a desktop-only element adds every sentence about it to the
  phone's list of things to gate**, tested both ways. The question is not "which layout" but "is the
  figure this names on the screen the reader has".
- **Narrowing a set changes every sentence quantified over it**, including on views the ticket never
  opened. The compiler finds the figures; only reading finds the sentences. The tell is a number in
  prose with a noun after it.
- **An empty page has as many empty states as it has reasons to be empty**, each needing its own
  words — "never drawn" and "names nobody" are different pages.
- **A failure is loud because it costs a figure, so a page carrying no figure raises no banner.**
  Compose failures *after* the branch that can return early.
- **One failed source gets one banner line, and the provenance footer never carries the failed
  half.** Where one endpoint serves several reads, collapse to the worst rather than list it twice.

### What the suites cannot prove → `testing.md`

- **A green suite proves the healthy path and nothing else.** Every fixture is one successful read
  of a working court, so no test contains a read that failed — write the failure case by hand. A
  review over ticket 05 found seven defects against 105 passing tests.
- **jsdom lays nothing out, so a whole class of defect is invisible to `yarn test`** — hit areas,
  clipping, indentation, anything positional needs a browser at the width it is claimed to work at.
  A state the live court has not reached yet must still be *opened*; a fixture cannot stand in.
- **jsdom has no `window.matchMedia` at all** — `undefined`, not a stub. Guard every read; a test of
  the reduced form must say so through `src/test/viewport.ts`.
- **A view that renders inside the shell cannot be tested by asserting the shell.**
- **The offline suite goes red under CPU contention and looks like a bug you just introduced.** The
  tell is the **duration**, not the failure count. Same advice for a red *live* suite, different
  reason (rate limits).
- **`yarn preview` silently moves port when one is in use**, and another worktree may be serving a
  different branch there. Use `--strictPort`; if a server is already up, look before killing — a
  vite **dev** server pointed at this checkout is already compiling your edits.

### Build, deploy and toolchain → `build-deploy-and-tooling.md`

- **Vite dev and `yarn preview` send no CSP at all**, so a missing host in `netlify.toml` looks
  perfect locally and fails only in production, silently. Verify against a local server sending the
  exact policy — the browser console does not carry violations to automation.
- **`yarn test` reads the deploy's `VITE_` variables on Netlify and none on your machine**, because
  `build:ci` runs the suite inside the deploy environment. Before touching anything reading
  `import.meta.env`, run the suite **both** ways.
- **`Thing.ts` and `Thing.tsx` differing only in case is a hard macOS TypeScript error** (`TS1149`).
  Only `yarn check-types` says so.
- **agentkit is only partly browser-safe** — `config-source.ts`, `sdk-lock.ts`, `rate-limit.ts` and
  `report-issue.ts` are Node-only, and `getSubgraphUrl` reads `process.env`.

### ENS and the roster → `ens-and-roster.md`

- **Resolve *forward* from the roster's subname** — reverse records are mostly unset, so
  `getEnsName(address)` leaves half the roster anonymous.
- **The ENS nickname is a display name, not a key.** Route, key and join on the roster nickname.
- **`getEnsAvatar` is a `connect-src` fetch, not just an image load**, and blocked it fails
  *silently*. This is why `euc.li` is in `connect-src`.

### Merging parallel branches → `merging-and-branches.md`

- **Never machine-resolve a conflict hunk by concatenating both sides** — git splits hunks inside
  prose doc comments, and the technique can swallow a `/**`, a `});` or a type field. If a script is
  unavoidable, diff the result against **both** parents.
- **When integrating, re-read every sentence that counts what is done**, and every helper both
  branches touched — then look for what the merge newly connects that neither parent could test.

## Verified constants

Confirmed against live chain and subgraph; no key needed for any of these. The commentary that used
to sit here is in `docs/knowledge/chain-and-subgraph.md` and `docs/knowledge/court-34.md`.

```
Court                34 "Agentic Commerce Court", Arbitrum One (42161)
Disputes             start at 151; single-round so far. New ones arrive continually — query the
                     court, never hard-code an upper bound, and treat any total quoted anywhere
                     as true only of the range it names
KlerosCore           0x991d2df165670b9cac3B022f4B68D65b664222ea
DisputeKitClassic    0x70B464be85A547144C72485eBa2577E5D3A45421
Core subgraph        api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/kleros-v2-coreneo/v0.17.2/gn
DRT subgraph         …/subgraphs/kleros-v2-drt/v0.12.0/gn — same host, so it added nothing to
                     connect-src. Joined on the core dispute's templateId
Arbitrum RPC         https://arb1.arbitrum.io/rpc — answers fromBlock 0 → latest for a topic-
                     filtered eth_getLogs in ~230ms, so no start block need be maintained
Mainnet RPC          https://ethereum-rpc.publicnode.com (ENS only; ankr needs a key now, and
                     cloudflare-eth reverts inside the ENS universal resolver)
Court 34 windows     `timesPerPeriod` is [evidence, commit, vote, appeal] in seconds.
                     Created  2026-08-11 10:34:50 UTC — [43200, 28800, 28800, 129600] (12h/8h/8h/36h)
                     Modified 2026-08-20 12:52:00 UTC — [2700, 2700, 1800, 129600] (45m/45m/30m/36h)
                     Modified 2026-08-26 13:14:01 UTC — [600, 2700, 1800, 129600] (10m evidence)
                     The first two are captured in court-34-parameters.fixture.json and asserted
                     live by court-parameters.integration.test.ts, which keeps /method's prose true
                     From CourtCreated / CourtModified. **The third is on chain but not yet in the
                     dashboard** — that is open ticket 19, so the fixture and `/method`'s prose
                     still describe two events. Do not treat the two-event account as current.
Court 34 economics   feeForJuror 270000000000000 wei (0.00027 ETH), minStake 11000e18, alpha 170,
                     jurorsForCourtJump 7 — all four **unchanged** across the reconfiguration.
                     Stake at risk per vote ID = minStake × alpha / 10000 = 187 PNK
CommitCast           CommitCast(uint256 indexed _coreDisputeID, address indexed _juror,
                     uint256[] _voteIDs, bytes32 _commit), on DisputeKitClassic. Dispute and juror
                     are indexed, the court is not — so the scan filters on the roster addresses and
                     the seam drops what belongs to another court. 56 across disputes 151–166 on
                     2026-08-25, one per committed draw, latency 14s to 3,236s
TokenAndETHShift     TokenAndETHShift(address indexed _account, uint256 indexed _disputeID,
                     uint256 indexed _roundID, uint256 _degreeOfCoherency, int256 _pnkAmount,
                     int256 _feeAmount, address _feeToken), on KlerosCore. Read from the core
                     subgraph. 56 across disputes 151–166 on 2026-08-25, one per (juror, dispute,
                     round), written at execution
Round.timeline       [commit start, reveal start, appeal start, execution start]
Nicknames            007, aletheia, baskerville, blaise, columbo, daemonhill — ENS subnames of
                     agents.kleroslabs.eth on mainnet. baskerville has never been drawn; the
                     roster in src/roster/ is the only place all six appear, and CI's nightly
                     `live` job checks it against ENS
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

`CONTEXT.md` and `docs/adr/` at the repo root; the knowledge base at `docs/knowledge/`. See `docs/agents/domain.md`.
