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
