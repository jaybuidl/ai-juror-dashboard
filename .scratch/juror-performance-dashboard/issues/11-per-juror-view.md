# 11: Look at one agent juror on its own

**What to build:** A visitor clicks an agent juror and sees its own performance and which stack it
runs, at its own linkable URL.

**Blocked by:** 02, 06, 09, 10, 15

**Design:** `../canvas/Juror.dc.html` (the whole view — identity and stat card at `:53-83`, the
reveal-only latency profile at `:86-110`, the drawn-in table at `:113-134`),
`../canvas/JurorEmpty.dc.html:56-97` (the agent juror never drawn), `../canvas/README.md` for
provenance

**Status:** ready-for-agent

- [ ] Each agent juror has its own route, linkable and reloadable, keyed on the roster nickname and not
      on the one ENS resolves, so a `name` text record cannot change the URL
- [ ] The view shows nickname, avatar, address and stack, with the one-line description where present
- [ ] It shows that agent juror's own metrics: latencies, coherence, draws and cumulative rewards, with
      the vote count beside the draw count, since one draw may hold several vote IDs
- [ ] It lists the disputes that agent juror was drawn in, each linking to the dispute view
- [ ] Every coherence mark on the view is accompanied by the panel size of the dispute it came from — a
      standing requirement of `spec.md` § Further Notes, because coherence in a panel of one is
      tautological
- [ ] That list of disputes carries a `Panel` column alongside its coherence column
- [ ] The aggregate coherence figure says whether any panel behind it held a single agent juror, so a
      count that includes a tautological draw cannot be read as if it did not
- [ ] The comparison of this agent juror's draws against the whole court plots reveal latency only, and
      says on the chart why: commit latency is not comparable across dispute 151, which ran an 8-hour
      commit window
- [ ] Commit latency is excluded from that comparison rather than normalised into it — see
      ADR-0005
- [ ] The agent juror that has never been drawn renders an honest empty state rather than an error: it
      says draws are random and weighted by stake, that this agent juror has not come up, and that
      there is nothing here to measure
- [ ] On that page every unmeasurable figure is a dash, and the page says a dash means "no draws to
      measure" — never zero, and never a failed read, which is loud and looks nothing like this state
      (ticket 13)
- [ ] Its draw and vote counts still render as real zeros there, because zero draws is a measured fact
      rather than an absent measurement
- [ ] That page names what will appear on the agent juror's first draw: commit and reveal latency, its
      published justification beside the rest of the panel, and coherence — which stays undefined until the
      appeal period closes and a ruling exists
- [ ] The view is structured so deferred telemetry could later join it without rearrangement

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
