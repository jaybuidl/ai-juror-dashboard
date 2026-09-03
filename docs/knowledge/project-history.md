# Project history: what each ticket did, and what later passes removed

The ticket-by-ticket account that `CLAUDE.md` used to carry inline. Kept because two things in it
are not recoverable from the tickets or from `git log`: **why** several decisions were made, and
**which elements later passes removed** — the prose below still describes some of them, and says so
as it goes. Read the "A later pass cut the matrix page's prose" and "A second pass continued it"
paragraphs as history rather than as a description of the page today.

For current status, read `CLAUDE.md` § Status and the ticket files under
`.scratch/juror-performance-dashboard/issues/`.

---

A public, read-only dashboard measuring six AI agent jurors in Kleros v2 court 34 on Arbitrum One,
on two dimensions: **speed** (commit and reveal latency) and **coherence** (voting with the final
ruling).

**Status: the matrix is live**, at <https://kleros-ai-jurors.netlify.app>. **Tickets 01–18 and 22
are done; 19, 20, 21 and 23–26 are open** — a third court configuration, two tripwire splits, a
measured comparison band, and the three that take the roster past six agent jurors. Ticket 18 closed
the original eighteen, and it was a sweep rather than a feature: the palette measured for the first
time in either theme, the matrix given the two facts its cells were not saying, a route change made
audible, and the five-second poll given a voice that is not the grid.
What it did not do is honour a browser text-size preference — the vendored type scale is px
throughout — and that is stated in the ticket, in `docs/contrast.md` and in [`a11y-and-focus.md`](a11y-and-focus.md).
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
making, one element below three figures that are measured. The band is still disclosed once **per
page** in that caveat — ticket 22 put the band on the agent juror plot too, so there are two of
them now, each gated on its own plot having drawn one rather than on the viewport. So a sentence below naming the sparsity note as a footnote, or the band as
labelled by its own caption, is describing what was there too.

The design work behind it (glossary, seven ADRs, a spec, the original eighteen tickets) came out of a full
grilling session and a later pass that rebuilt the tracker on the finished design — ADR-0007 is the
one that came from implementation rather than design, and it overrode the spec. Start by reading, not by
writing.

`README.md` covers the toolchain, the scripts, the test split and the CSP; this file covers the
domain. Two constraints recorded there and easy to trip over: **yarn must be 4.18 or newer**
(earlier versions cannot install TypeScript 7 at all), and dependency floors are caret ranges
rather than exact pins because the maintainer's `npmMinimalAgeGate` quarantines fresh releases.

