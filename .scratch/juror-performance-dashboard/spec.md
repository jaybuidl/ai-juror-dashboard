# Spec: AI Juror Performance Dashboard

**Status:** ready-for-agent

## Problem Statement

Kleros is running an experiment in which six AI agent jurors, each an independent build on a
different stack, vote in a single court (court 34, "Agentic Commerce Court", on Arbitrum One). The
team has no way to see how they are performing. The interesting facts — how fast each agent juror
acted once a period opened, whether it voted with the final ruling, and what reasoning it published
— are spread across a subgraph, event logs, and ENS, and are visible today only by hand-querying.

The comparison that makes the experiment meaningful is also invisible: a normal Kleros court runs
its periods over days, and these agent jurors are acting in seconds. Nothing surfaces that.

## Solution

A public dashboard, scoped to court 34, built around a **dispute matrix**: one row per dispute, one
column per agent juror. Each cell shows a draw's commit latency and reveal latency, coloured by
coherence. Clicking a dispute opens the panel's justifications side by side; clicking an agent juror
opens its own metrics and stack.

It reads directly from public endpoints in the browser. There is no backend and no secret.

## User Stories

1. As a Kleros team member, I want to see every court 34 dispute in one matrix, so that I can judge the experiment as a whole rather than dispute by dispute.
2. As a Kleros team member, I want each dispute row labelled with its real title, so that I can find the dispute I care about without memorising IDs.
3. As a Kleros team member, I want to see how long after the commit period opened each agent juror committed, so that I can compare their responsiveness.
4. As a Kleros team member, I want the same for the reveal, so that I can tell whether an agent is fast at one step and slow at the other.
5. As a Kleros team member, I want latencies shown in seconds when they are short and minutes when they are long, so that a 7-second reveal and a 54-minute commit are both readable.
6. As a Kleros team member, I want to see whether each draw was coherent with the final ruling, so that I can weigh speed against correctness.
7. As a Kleros team member, I want a draw where the agent juror was not drawn to render blank, so that I never mistake absence for slowness.
8. As a Kleros team member, I want a draw where the agent juror failed to commit or reveal to render distinctly, so that a real failure is visible and is not confused with absence.
9. As a Kleros team member, I want a summary per agent juror — typical latency, coherence as a count, number of draws — so that I can see a pattern without ranking anyone.
10. As a Kleros team member, I want the summary latency to be a median, so that one unusual dispute cannot distort it.
11. As a Kleros team member, I want cumulative ETH and PNK rewards per agent juror, so that I have participation and correctness in economic terms.
12. As a Kleros team member, I want to open a dispute and read every panel member's justification side by side, so that I can compare how different stacks reasoned about identical evidence.
13. As a Kleros team member, I want justifications rendered as Markdown, so that the ones with headings and structure are readable as written.
14. As a Kleros team member, I want a justification that is absent to say so, so that I do not read an empty panel as a rendering bug.
15. As a Kleros team member, I want justifications in other languages to render correctly, so that a Spanish-language justification is as readable as an English one.
16. As a Kleros team member, I want to open an agent juror and see its own metrics and which stack it runs, so that I can connect performance to the build behind it.
17. As a Kleros team member, I want each view to have its own URL, so that I can paste a link to a specific dispute into Slack.
18. As a Kleros team member, I want agent jurors shown by nickname and avatar rather than address, so that the matrix is readable at a glance.
19. As a Kleros team member, I want a nickname to still show if ENS resolution fails, so that a mainnet RPC outage degrades the dashboard rather than breaking it.
20. As a Kleros team member, I want an agent juror that has never been drawn to still appear, so that I can see the full roster including the ones yet to participate.
21. As a Kleros team member monitoring a live dispute, I want the view to refresh while a dispute is unfinalised, so that I can watch a commit period unfold.
22. As a Kleros team member, I want finalised disputes not to be refetched, so that watching a live dispute does not re-request the whole history.
23. As a Kleros team member returning to the dashboard, I want previously finalised results to load without refetching, so that a page reload is fast.
24. As a Kleros team member, I want a very visible error when the subgraph or RPC cannot be reached, so that I never read a partly-loaded dashboard as fact.
25. As a Kleros team member, I want a visible error when the subgraph says an agent juror committed but no matching log was found, so that a truncating RPC surfaces as a fault rather than as a false "missed commit".
26. As a member of the Kleros community, I want to reach the dashboard at a public URL, so that I can follow the experiment without internal access.
27. As the author of a research article, I want dispute 151 marked as having run under different court parameters, so that I do not cite a figure computed across two different period regimes.
28. As a developer maintaining this, I want the metric logic to be pure and testable without a network, so that I can change a definition with confidence.
29. As a developer, I want the metric logic shaped so it can move into agentkit later, so that the CLI can eventually answer the same questions.

## Implementation Decisions

**Scope.** Court 34 on Arbitrum One only. See ADR-0002 for why coherence is not taken from the
subgraph's global aggregate.

**The seam.** One pure function, `buildCourtPerformance(RawCourtData) → KlerosResult<CourtPerformance>`,
divides the system. Above it: React, routing, ENS, Markdown. Below it: every fetch. It touches no
network and reads no clock. `RawCourtData` carries disputes with round timelines, draws with votes
and justifications, `CommitCast` logs with block timestamps, the `CourtModified` parameter history,
and the roster. `CourtPerformance` carries per-draw latencies and coherence, per-juror marginals,
dispute titles, and any consistency-check failures. Returns agentkit's `KlerosResult<T>` envelope.
See ADR-0003.

**Latency.** Held in seconds, measured from the observed moment a period opened — the round
timeline, not a scheduled deadline. See ADR-0001. Display switches from seconds to minutes at
roughly ninety seconds. Any "% of window" figure resolves its denominator per dispute from the
`CourtModified` history; court 34's parameters changed between dispute 151 and dispute 152, so
dispute 151 must be visibly marked.

**Coherence.** Per draw, against the dispute's final ruling, recomputed from vote choices. See
ADR-0002.

**Commit timestamps.** From `CommitCast` logs plus block timestamps; unchunked scans. Reveal
timestamps come free from the justification entity. Every draw the subgraph reports as committed is
cross-checked against a matching log; a discrepancy is surfaced, never absorbed. See ADR-0004.

**Data sources**, all public and keyless by default, overridable by `VITE_`-prefixed variables that
are baked into the bundle and therefore public by construction: the Kleros v2 core subgraph
(disputes, rounds, draws, votes, justifications, reward shifts), the DRT subgraph (dispute titles
and categories, as plain JSON needing no IPFS or SDK), an Arbitrum RPC (`CommitCast` logs, block
timestamps, `CourtModified` history), and an Ethereum mainnet RPC (ENS names and avatars).

**Roster.** A checked-in file: nickname, address, stack label, optional one-line description. It is
the only source for stack and the only place all six agent jurors appear. No operator names. ENS
resolution happens above the seam; the pure core is keyed by address.

**Views and routing.** Real routes: the matrix, a per-dispute view, a per-juror view.

**Liveness.** `@tanstack/react-query` with a 5000ms refetch interval. A dispute is finalised when its
period is `execution`; finalised results are persisted to `localStorage` and not refetched.

**Stack.** Vite, React, TypeScript, yarn v4 with `nodeLinker: node-modules`, Biome, deployed on
Netlify. `react-markdown` with `remark-gfm` and **raw HTML disabled** — deliberately stricter than
the Kleros court frontend, which enables raw HTML and sanitises it. External links in justifications
get a warning interstitial, following the court frontend's behaviour.

## Testing Decisions

A good test here asserts external behaviour: given raw fetched data, what does the dashboard model
say? It never reaches into how a latency was computed or which helper produced it.

**The pure core is the primary test target.** `buildCourtPerformance` is tested against fixtures
captured from the real thirteen disputes, with no network and no mocks. Cases that must be covered:
the collapse of 61 votes into 44 draws; coherence against `currentRuling`; dispute 151's different
period parameters; a median that is not distorted by dispute 151; a draw with no justification; an
agent juror never drawn; and the committed-but-no-log cross-check.

**The I/O readers are tested live against Goldsky and a public RPC**, asserting that what comes back
is well-formed `RawCourtData`. This is deliberate: it keeps mocks out of the codebase entirely. The
pure core gets fixtures, the fetchers get the real endpoint, nothing in between is stubbed.

There is no prior art in this repo; it is new. The closest reference for query conventions is the
Kleros court frontend's `web/src/hooks/queries/`.

## Out of Scope

- **Appeal rounds.** Every dispute so far has exactly one round. The data layer should not actively
  prevent supporting them, but no round dimension is modelled or rendered. Deferred by decision.
- **Gen-AI telemetry** — token usage, model, thinking effort. There is no consistent way to collect
  this across the six stacks yet; it awaits a shared OTEL approach.
- **Any cross-court view.** Coherence scoping and the historical-denominator logic both assume a
  single court.
- **A ranked leaderboard.** Marginals are shown; nobody is ranked.
- **Writing to chain.** This dashboard never votes, holds a key, or submits a transaction.
- **A backend or proxy.** Every endpoint is reachable from the browser.

## Further Notes

Facts established during design, worth not rediscovering:

- Court 34 was created with `timesPerPeriod` `[43200, 28800, 28800, 129600]` and modified to
  `[2700, 2700, 1800, 129600]` at Arbitrum block 496518927, between dispute 151 and dispute 152.
- Thirteen disputes (151–163), 61 votes, 44 draws, five participating agent jurors. The sixth,
  `baskerville`, has no on-chain presence at all.
- Zero anomalies in the data so far: every vote committed, every vote revealed, every reveal but one
  carries a justification. The failure states still need designing; they just have no examples yet.
- Every appeal period ran about 18 hours despite a 36-hour configured value. Unexplained, and it does
  not affect any metric here, but do not treat the appeal duration as understood.
- Reveal latency across all 44 draws: minimum 7s, median 85s, maximum 552s.
- Panels are small and uneven: 1 to 5 agent jurors out of 6. The matrix is 44 draws in 78 possible
  cells, so 34 cells are blank and one agent juror's entire column is empty.
- **Dispute 155's panel was a single agent juror** holding all three votes. Coherence there is
  tautological: a lone juror is the majority and cannot be incoherent. Panel size must be visible
  wherever coherence is shown, and any aggregate coherence figure carries this caveat.
- Thirteen draws held more than one vote ID (nine held two, four held three), which is why the draw
  rather than the vote is the unit.
- All 44 justifications are inline text — no IPFS CIDs, no URLs. Longest is 4,869 characters. Four
  use Markdown structure, one is empty, one is in Spanish.
