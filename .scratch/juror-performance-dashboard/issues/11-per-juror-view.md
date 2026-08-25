# 11: Look at one agent juror on its own

**What to build:** A visitor clicks an agent juror and sees its own performance and which stack it
runs, at its own linkable URL.

**Blocked by:** 02, 06, 09, 10, 15

**Design:** `../canvas/Juror.dc.html` (the whole view — identity and stat card at `:53-83`, the
reveal-only latency profile at `:86-110`, the drawn-in table at `:113-134`),
`../canvas/JurorEmpty.dc.html:56-97` (the agent juror never drawn), `../canvas/README.md` for
provenance

**Status:** done

- [x] Each agent juror has its own route, linkable and reloadable, keyed on the roster nickname and not
      on the one ENS resolves, so a `name` text record cannot change the URL
- [x] The view shows nickname, avatar, address and stack, with the one-line description where present
- [x] It shows that agent juror's own metrics: latencies, coherence, draws and cumulative rewards, with
      the vote count beside the draw count, since one draw may hold several vote IDs
- [x] It lists the disputes that agent juror was drawn in, each linking to the dispute view
- [x] Every coherence mark on the view is accompanied by the panel size of the dispute it came from — a
      standing requirement of `spec.md` § Further Notes, because coherence in a panel of one is
      tautological
- [x] That list of disputes carries a `Panel` column alongside its coherence column
- [x] The aggregate coherence figure says whether any panel behind it held a single agent juror, so a
      count that includes a tautological draw cannot be read as if it did not
- [x] The comparison of this agent juror's draws against the whole court plots reveal latency only, and
      says on the chart why: commit latency is not comparable across dispute 151, which ran an 8-hour
      commit window
- [x] Commit latency is excluded from that comparison rather than normalised into it — see
      ADR-0005
- [x] The agent juror that has never been drawn renders an honest empty state rather than an error: it
      says draws are random and weighted by stake, that this agent juror has not come up, and that
      there is nothing here to measure
- [x] On that page every unmeasurable figure is a dash, and the page says a dash means "no draws to
      measure" — never zero, and never a failed read, which is loud and looks nothing like this state
      (ticket 13)
- [x] Its draw and vote counts still render as real zeros there, because zero draws is a measured fact
      rather than an absent measurement
- [x] That page names what will appear on the agent juror's first draw: commit and reveal latency, its
      published justification beside the rest of the panel, and coherence — which stays undefined until the
      appeal period closes and a ruling exists
- [x] The view is structured so deferred telemetry could later join it without rearrangement

## From ticket 15: the chrome, the route and the breadcrumb are waiting

Add the route to `src/routes.tsx`, inside the existing layout route so the view cannot lose the
shell. The parent index it sits under already exists, which is what makes the breadcrumb honest.

Three things to reuse rather than rebuild:

- **`View`** (`src/chrome/View.tsx`) wraps the content in the page's measure and renders the
  provenance footer beneath it. Pass it a `Provenance` — what on this view is the measured record,
  the dispute range and moment read, the caveats, and whether the view shows an agent juror (it
  does, so the footer states they are identified by nickname, avatar and stack and never by who
  built them). Compose it in a `provenanceOf` function beside the component, as the other views do.
- **`Breadcrumb`** (`src/chrome/Breadcrumb.tsx`) takes `{ to, parent, current }` and is already
  tested. It renders the current item as text rather than a link to itself. **`current` must be the
  roster nickname or the dispute's own id — never the nickname ENS resolves.** `blaise` carries a
  `name` record reading "Blaise", and the route is keyed on the roster.
- **`isCurrent`** in `chrome/Nav.tsx` already keeps the parent destination marked while you are on a
  child route, so `/disputes/152` leaves "Disputes" active in the nav. There is a test for it; you
  need do nothing.

The 404 catches anything the route table does not match, so a bad id in the path is *not* a 404 —
it is a real route with an id that names nothing, and this view has to say so itself. Ticket 13 owns
what a failed *read* looks like; an id that does not exist is neither that nor a wrong URL.

### From ticket 13, 2026-08-25 — do not re-derive the ENS fallback

`ensFallbackOf` in `src/roster/ens-fallback.ts` is the one place that decides whether ENS has fallen
back and what to say about it. Call it; do not re-test the flags. It exists because the check is
`!isResolving && !isResolvedFromEns` — both halves, always — and keying on `isResolvedFromEns` alone
announces a failure for the length of every cold load and then retracts it. That bit three call
sites on ticket 15 and a fourth on ticket 13, which is when it became a function.

Your view shows a nickname and an avatar, so it takes the amber panel through `View`'s `failures`
prop and the per-element marks — a dashed avatar border and a "From roster" label — the way
`Roster.tsx` and the matrix's column headers do. It raises no banner: ENS is the one documented
exception, and no measurement depends on it.

## From ticket 06, 2026-08-25 — every figure this view needs is already computed

`CourtPerformance.marginals` is one `AgentJurorMarginals` per agent juror, in roster order, and it
is what the matrix's column headers print. Your view is the same object at more space, so it needs
no reduction of its own — and must not write one. `revealLatency.seconds` and `commitLatency.seconds`
are the whole distributions, ascending, which is what a plot wants; `coherence` is
`{ coherent, resolved, lonePanelDisputes }`; `changedWindows` is already sliced to this agent
juror's own draws, so a column never drawn in dispute 151 carries nothing.

**Two things ticket 06 found that change what this ticket was written expecting.**

- **A commit plot is exactly as markable as a reveal plot.** This ticket and ticket 06's own
  criteria both say "the agent juror view plots reveal latency only", on the premise that the window
  change touched commit latency and nothing else. That premise is false: court 34 changed its commit
  window from 8h to 45m *and* its vote window from 8h to 30m, in one `CourtModified`. Ticket 06
  marks both medians for that reason, and `canvas/README.md` already records the artboard defect the
  old premise produced (`Juror.dc.html:73` prints a median commit while `:108` excludes commit
  latency from the chart below it as incomparable — the same page declining to compare and
  comparing). Plot what you like; mark whichever window governs what you plotted.
- **`JurorEmpty.dc.html`'s three-dashes-and-a-zero is implemented**, in `Marginals.tsx`. An agent
  juror never drawn has `revealLatency` and `commitLatency` null, `coherence.resolved` 0 and `draws`
  0 — dash, dash, dash, and a real zero. Reuse that reading rather than deriving a second one, and
  keep the artboard's sentence: a dash means no draws to measure, never zero and never a failed
  read.

## From ticket 09: the detail-view pattern, built once and ready to copy

Ticket 09 built the first detail view. Four things it settled are yours to reuse rather than
re-decide:

- **A route that reads something of its own splits in two.** `DisputePage` is a thin connected
  wrapper — `useParams`, then the hook — and `DisputeView` is a pure component taking every read
  as a prop. That is what keeps `yarn test` network-free: `App` cannot supply this read because
  the thing being read is named by the URL. `src/test/court.tsx`'s `renderAt` now wraps the route
  table in a `QueryClientProvider` whose queries are `enabled: false`, so rendering a route costs
  no request; anything asserting on what a read *returned* renders the pure view directly.
- **`Draw.choices`** is new and is what a column header prints as "Choice 2". See ticket 06's note.
- **A disabled query is `pending` for ever.** `useDisputeDetail(null)` — for a path segment that is
  not a number — leaves `isPending` true permanently, so a caveat keyed on it says "still being
  read" about a read nobody started. The view flag must be `isPending && fetchStatus !== "idle"`.
  Recorded in `CLAUDE.md` § Traps as the fourth face of the `RosterView.isResolving` trap. Ticket
  11 has exactly the same shape: `/agent-jurors/<not-a-nickname>`.
- **A bad id in the path is not a 404 and not a failed read.** It is a real route with an id that
  names nothing, and the view says so itself. Ticket 09 distinguishes three cases and words each
  differently: the segment is not a number, the subgraph holds no such dispute, and the dispute
  exists but belongs to another court. Ticket 11's equivalent is a nickname that is not on the
  roster — and the roster is local, so that one is decidable without a read at all.

The breadcrumb takes the **roster** nickname and never the one ENS resolves, which is unchanged
from ticket 15's note and is worth repeating because ticket 09's column headers deliberately do the
opposite: they *display* `identity.nickname` ("Blaise") while everything keys on the roster
("blaise").

## From ticket 10, 2026-08-25 — the two reward figures on your stat card are computed too

`AgentJurorMarginals.rewards` is `{ ethWei, pnkWei, paidDraws, feeTokenDraws }` or `null`, and
`Juror.dc.html:70-82` puts the first two on your stat card. Read them; do not sum shifts yourself.
Four things about them that the matrix's column header already had to get right:

- **They are `bigint` and must stay so until the moment they are printed.** A PNK penalty here is
  1.87e20 wei. `formatEthWei` and `formatPnkWei` in `performance/rewards.ts` are the only place wei
  becomes words — four decimal places for ETH, two for PNK — and nothing may divide or re-round one.
- **`null` is three states and you need a fourth flag to separate them.** It means the read has not
  come back, *or* this agent juror has never been drawn, *or* the court has executed nothing it was
  drawn in. `CourtPerformance.rewards.read` and `marginals.draws` are what tell them apart, and the
  order matters: unread → dash, never drawn → dash, drawn and unpaid → a **real zero**. Getting this
  wrong is worse here than for a median, because a missing sum degrades to `0.0000` rather than to
  an em dash — a number, in the ink of a measurement, saying the agent juror earned nothing.
  `rewardFigure` in `Marginals.tsx` is the shape; `rewardsPending` and `rewardsFailed` in
  `test/court.tsx` are fixtures for both halves of the in-flight/failed pair.
- **Neither figure takes the † or the ‡.** Court 34's one reconfiguration left `minStake`, `alpha`
  and `feeForJuror` unchanged and moved only `timesPerPeriod`, so a window change says nothing about
  a reward; and a lone panel makes coherence tautological while the fee it earned is real. Both are
  argued at `AgentJurorMarginals.rewards` in `totals.ts`.
- **The sign is a character, never only a colour.** ADR-0006. Two of the five drawn agent jurors are
  net *down* on this experiment, so a losing figure is the ordinary case rather than the exotic one.
  Amber on top of the sign is what `canvas/Main.dc.html:259` draws; `Marginals.tsx` carries it as a
  `$loss` flag rather than a fifth `Figure` tone, because a loss is not a state a *cell* can be in.

If your view reads nothing of its own — and per ticket 06 it need not — then it raises no banner of
its own either, and inherits `MatrixPage`'s treatment of a failed payout read: one line, ranked last
within the core subgraph's four reads, because it costs the least of them.

## From ticket 16, 2026-08-25 — three shared modules, and a phone form to decide

This view needs no read of its own, which ticket 06 already said. What ticket 16 adds is that it
needs rather less code than it did:

- **`src/performance/row-flags.ts`** is the flag table, lifted whole out of `Matrix.tsx`:
  `rowFlagOf(row, context)` returns the one flag a dispute wears, in the precedence not-read,
  window, lone panel, live. A per-agent-juror view listing that agent juror's disputes wants
  exactly this rather than a fourth ranking of the same four facts.
- **`Legend.tsx`** (`StateLegend`) and **`Footnotes.tsx`** (`WindowFootnote`, `LonePanelFootnote`,
  `SparsityNote`) are the caveats, shared by the matrix and the card list. Any view that shows a
  draw's state owes its reader the first; any view that aggregates latency or coherence owes them
  the other two — this one does both.
- **`cell.ts` gained `slotFigureOf`**: the latency of the most recent thing a draw did, which is
  the reveal wherever one exists and the commit only while a reveal is still ahead. It is the rule
  for anywhere that has room for one figure rather than two.

**This view has a phone form and nobody has decided what it is.** `useIsNarrow()` in
`styles/breakpoints.ts` is how a component asks; `narrow` is the media prelude for the same
number. ADR-0005 and `Juror.dc.html:108` say this view plots reveal latency only — and
`CLAUDE.md` § Traps records that the reason given for that is *false*, because both windows
changed. Whatever this view plots, the marker belongs on the median the window it names actually
governs, and `markedWindows(changes, current, "reveal" | "commit")` in `totals.ts` is what places
it per window rather than per group.

**The two notes above meet on one element.** Ticket 10 puts cumulative ETH and net PNK on this
view's stat card; ticket 16 leaves its phone form undecided — and the card list drops the matrix's
column headers, so this view is the only place those two sums are legible below the breakpoint at
all. Deciding the phone form is therefore deciding where a phone reader reads them, which is a
question no other open ticket answers.

## Comments

### 2026-08-26 — what it reads, what it decides, and the artboard line it refuses

**It reads nothing of its own, exactly as ticket 06 said it need not.** Every figure comes from
`CourtPerformance.marginals`, and the only new pure code is a *join*:
`buildAgentJurorReading` in `src/performance/agent-juror-detail.ts` — the third model in that
directory and the shallowest. It exists for one reason, which is that the join is on an array
index: `marginals` and every row's `cells` are both in roster order, so an off-by-one shows one
agent juror's draws under another's avatar with every figure on the page internally consistent, no
error and nothing in the console. `agent-juror-detail.test.ts` pins that the draws, the marginal
and the identity on one reading are the same agent juror's, and that assertion fails on a
deliberate `column + 1`.

**The six figures were lifted out of `Marginals.tsx` rather than re-read.** They are now
`marginalFiguresOf` in `marginal-figures.ts`, which the matrix's column header and this view's stat
card both render — ticket 16's rule applied one level down. Four of the six are figures with three
or four absences behind them, and each absence is a sentence about what was read; a second
implementation here would have been a second set of those judgements, free to print `0.0000` under
a subgraph that returned nothing on the one page where an agent juror is named at the top. The file
is `marginal-figures.ts` and not `marginals.ts` because `Marginals.tsx` sits beside it (TS1149).

**The plot excludes commit latency and gives a different reason than the artboard does.**
`Juror.dc.html:108` says "commit latency is not comparable across dispute 151, which ran an 8-hour
window". That premise is false — court 34 moved its *vote* window from 8h to 30m in the same
`CourtModified` — and `canvas/README.md` already records the defect it produced, the same artboard
printing a median commit at `:73` while excluding commit from the chart below it as incomparable.
So the exclusion stands (ADR-0005, and the canvas wins on design) and the reason is rewritten: the
two are measured from different periods, so pooling them would compare durations against different
clocks. What the window change actually costs is disclosed as a `†` over the plotted draws that ran
under a superseded *vote* window, placed by `markedWindows(…, "reveal")` rather than by group. This
is the canvas's own recorded defect being honoured, not the canvas being overridden.

**This view is where ticket 16's open question is answered: the phone form is no reduction at
all.** The stat card, the latency profile and the disputes all render at 390pt — the last as one
block per dispute rather than a seven-column table, which cannot fit without pushing the page
sideways. That makes this the only place below the breakpoint where cumulative ETH and net PNK are
legible, since the matrix's card layout drops the column headers whole. Two consequences elsewhere,
both small: `MatrixPage`'s phone caveat now points here instead of saying nothing, and the deferred
question of whether the payout failure banner should be re-tiered on a phone is settled — the tier
stands, because a phone reader now does lose a figure to that failure, one link away.

**Nothing in `provenanceOf` is gated on the width**, and that is a finding rather than an omission:
every sentence this view writes names something both layouts have. The `!narrow` gates on
`MatrixPage` exist because that page drops the strip and the column headers; this one drops
nothing.

**Two defects found by opening the page, neither visible to 731 green tests.**

1. The footer on `/agent-jurors/nope` read "the court has drawn it in none of the disputes read…
   that it has not been drawn is the measured record" — a reading of the court about something the
   court has never heard of. An agent juror never drawn *has* a measured record; an address naming
   nobody has none, and its `read` range is now `null` rather than the court's.
2. The stat card's three values sat on three different baselines at 390pt, because
   `flex-direction: column-reverse` lays a column out from the bottom and "Median reveal" wraps
   where "Coherent" does not. `order: -1` on the value does the same job without moving the
   baseline. The `dd` also preceded its own `dt` until this was fixed.

**The backtick-in-a-CSS-comment trap fired three times** while writing this, each time breaking the
parse hundreds of lines below the comment. It is already in `CLAUDE.md`; this is the confirmation
that it is not a once-off.

**Left alone:** `JurorEmpty.dc.html`'s ◇ glyph tile beside the empty heading, which is decoration
the criteria do not ask for and the card reads without.

### 2026-08-26 — what the two-axis review changed

A standards pass and a spec pass, run in parallel against the working tree. Both found the same
worst defect and it was real.

**The missing-address branch raised the full banner stack.** `failuresOf` was composed before the
`entry === undefined` return and passed into both branches, so `/agent-jurors/nope` under a failing
read was topped by "the draws could not be read, so nothing on this page is a measurement of
**nope**'s" — a banner about an agent juror the address had just failed to name, over a page
carrying no figure to have lost. It is the footer defect from the session above, one layer up, and
the same rule settles it: a page showing no figure cannot have lost one, so that branch now passes
no failures at all, exactly as `NotFoundPage` does. `provenanceOf` lost its `names` flag with it;
`NAMES_NOTHING` is a constant, because none of that function's inputs is about a page that rests on
no read.

**`NeverDrawn` was reachable on a join failure.** The branch was `reading === null ||
draws.length === 0` over a measured court, and `reading === null` there means the seam's roster
does not hold this nickname — two lists of six disagreeing, not a fact about the court's random
selection. It drew "Never drawn. Nothing has gone wrong." over a defect in this dashboard. It now
falls to the rose notice with the other unbuildable-record cases.

**Four smaller things, all fixed:** the empty state re-did the roster→column join by hand instead
of taking the reading; `choiceOf` returned an em dash that both renderings then string-compared to
pick an ink, so it returns a `Figure`; `AgentJurorDraws`'s heading and the plot's scale label both
typed through a `--type-*` token without re-declaring `font-feature-settings`, which is the trap
`CLAUDE.md` records; and `flagContextOf` was a one-line middle man, now inlined.

**Two sentences were false and are rewritten.** The deck said "Panel size sits beside every
coherence mark" — positional, and true of neither layout, since the table puts Panel third and
Coherence seventh and the card puts the state above the figures. It now says "given with". And it
claimed "the footer says it once more for the figures" about a caveat `provenanceOf` never pushed.

**`StateLegend` was owed and missing.** Ticket 16's hand-off: "any view that shows a draw's state
owes its reader the first". This view shows five state words and had no decoder. It is now above
the list, shared, with `unknown={false}` — the sixth state cannot occur here, because an unread row
has no cell for anybody and so contributes no line at all.

**The other three shared caveats are deliberately not used, and here is why.**
`WindowFootnote`, `LonePanelFootnote` and `SparsityNote` all take the court-wide
`CourtPerformance` and state court-wide facts. Every caveat on this view is sliced to one column —
the † counts *this* agent juror's affected draws against *its* median, the ‡ counts *its* lone
panels — and rendering the court-wide versions would name disputes this agent juror was never
drawn in, beside figures measured only from the ones it was. That is the same reason `SparsityNote`
was parameterised rather than copied: a caveat has to be about what is on the page.

**Two canvas deviations, recorded rather than left in code comments.** The plot's key reads "Every
draw in the court" where `Juror.dc.html:107` says "All other draws" — the artboard's label would
need this column subtracted out of the court's distribution, a second reduction that would leave
the plot and the court median beside it counting different draws. And the empty state drops
`JurorEmpty.dc.html:60`'s "It is staked" clause: baskerville has never staked, which is precisely
why it has no on-chain presence at all. Both are the canvas's *data* rather than its design, which
the canvas-wins rule does not cover.

**On "structured so deferred telemetry could later join it without rearrangement":** what carries
that is `marginalFiguresOf` returning a list rather than six hard-coded blocks — a seventh measure
is an entry, and both the card and the matrix's column header pick it up — and `DrawLine`, which is
one record per dispute read once and drawn twice. The seven columns of the table itself are
hard-coded in both renderings, so a *new column* is a real edit in two places. Ticked on the first
half and stated here rather than left to look like more than it is.

**The page was split.** `AgentJurorSummary.tsx` and `AgentJurorEmpty.tsx` now sit beside the model
in `src/performance/`, the way `DisputePanel` sits beside `DisputePage`; the page composes and no
longer runs to 1,100 lines.

Three tests were added for the three defects above, and each was verified to fail with its fix
removed. 735 offline tests, lint, types and `vite build` green; re-checked in system Chrome at 1280
and 390 afterwards.
