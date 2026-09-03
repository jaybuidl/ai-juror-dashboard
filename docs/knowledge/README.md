# Domain knowledge

The durable, versioned account of everything this codebase and the live court have cost someone to
discover. `CLAUDE.md` § Tripwires carries a one-line form of each entry here, phrased to stop the
mistake; **this directory is the full account** — what it cost, how it was found, and what guards it
now.

**Routing:** a new durable domain fact goes in the matching file below, plus a tripwire line in
`CLAUDE.md` only if it prevents a mistake. Session auto-memory is for user, feedback and tooling
facts only — never domain facts, because it is per-user, unversioned, and subagents never see it.

| File | Covers |
| --- | --- |
| [`architecture.md`](architecture.md) | The seam (`src/performance/`), the three models, where every derivation belongs, the design-canvas rule, and the kleros-v2 behaviour reference |
| [`court-34.md`](court-34.md) | The court's parameters, its three reconfigurations, its economics, and why a red parameters suite is usually the court being operated |
| [`chain-and-subgraph.md`](chain-and-subgraph.md) | What the Arbitrum RPC and the two Goldsky subgraphs actually return — including four fields that are present, correctly typed and wrong |
| [`measurement-rules.md`](measurement-rules.md) | The unit of measurement, the dispute states that break an aggregate, and the one ratio this dashboard never shows |
| [`react-query-and-persistence.md`](react-query-and-persistence.md) | Reads that drift apart, flags that lie while a read is in flight, and what may be persisted to `localStorage` |
| [`layout-and-css.md`](layout-and-css.md) | Silent layout failures — none of them throws, warns, or fails a test |
| [`contrast-and-theme.md`](contrast-and-theme.md) | The measured palette, and how a figure computed from a token differs from the ink on the page. Ratio tables are in [`../contrast.md`](../contrast.md) |
| [`a11y-and-focus.md`](a11y-and-focus.md) | What a clean axe run does not cover, how accessible names are computed here, and the two focus-ordering rules. Ticket 18's sweep is in [`../accessibility.md`](../accessibility.md) |
| [`prose-and-caveats.md`](prose-and-caveats.md) | One record, three renderings — the model is shared by construction, the prose by hand, and the prose is where they fork |
| [`testing.md`](testing.md) | What the offline and live suites are structurally unable to prove |
| [`build-deploy-and-tooling.md`](build-deploy-and-tooling.md) | The gaps between a local run and the Netlify deploy; CSP; toolchain errors that surface nowhere near their cause |
| [`merging-and-branches.md`](merging-and-branches.md) | What auto-merge produces from parallel ticket branches, and why it passes lint, types and tests |
| [`ens-and-roster.md`](ens-and-roster.md) | How the agent jurors are named and resolved, and the rule for when one enters the roster |
| [`project-history.md`](project-history.md) | Ticket-by-ticket account, and which elements later passes removed |

## Provenance

Migrated out of `CLAUDE.md` on 2026-09-03, when that file had reached 87 KB and was 70% § Traps.
Every entry moved **verbatim**; the tripwire lines in `CLAUDE.md` were written fresh against them.
Five session memories holding domain facts were folded in at the same time and are marked
*Migrated from session memory* where they landed.
