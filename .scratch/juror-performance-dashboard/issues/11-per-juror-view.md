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
