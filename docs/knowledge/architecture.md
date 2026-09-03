# Architecture: the seam, the three models, and the design canvas

Where every derivation belongs, and why. The rule this file exists to keep is that **a metric
computed in a component is the mistake the seam exists to prevent** — and its corollary, that a
figure or a ranking reduced inside one of the three renderings is two chances for a desktop and a
phone to disagree about one court.

## The seam


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

## The design canvas

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

## The kleros-v2 court frontend is the behaviour reference

*Migrated from session memory, 2026-09-03.*

When building a Kleros-ecosystem frontend, match `kleros/kleros-v2`'s `web/` rather than inventing
conventions.

- **Markdown rendering of juror justifications**: PR `kleros/kleros-v2#2578` — `react-markdown` +
  `remark-gfm`, an `ExternalLinkWarning` interstitial, and `MarkdownRenderer`/`MarkdownEditor`
  components. Note it enables raw HTML and sanitises it (`rehype-raw` + `rehype-sanitize`); a
  render-only surface such as this one should prefer **disabling raw HTML at the parser** instead.
- **Data fetching**: `web/src/hooks/queries/` — `@tanstack/react-query`, a `useGraphqlBatcher`
  context, typed `graphql()` documents, `REFETCH_INTERVAL = 5000` and `STALE_TIME = 1000` from
  `consts/index`.
- **Scope: this is not the visual reference.** Styling there is `styled-components` over a dark
  purple app with pixel-art juror avatars. For this dashboard the design system is Kleros ×AI
  (`kleros-design-system/kleros-ai`), settled 2026-08-25. Use `kleros-v2/web` for behaviour
  conventions, not for palette or type.
