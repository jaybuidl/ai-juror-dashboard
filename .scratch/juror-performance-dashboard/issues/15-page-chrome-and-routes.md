---
status: done
blocked_by: ["05", "14"]
---

# 15: Wrap every view in chrome that says what this is and what was read

**What to build:** A visitor arriving from a pasted link lands on a page that names itself, says in
one sentence what it measures and what it will never do, offers the destinations the design gives
it, and ends with a footer stating the provenance of everything above. Every view sits inside that
same shell, so a dispute or an agent juror opened on its own is recognisably part of one dashboard.

The chrome appears on five of the eight artboards and is owned by no ticket. It is not decoration:
the nav's read-only pill, the hero's deck and the footer's opening line are the read-only-forever
invariant restated where a reader actually meets it, and the footer is where a citing reader looks
to find out what the figures above it are. `CLAUDE.md` requires caveats to be visible in the UI
rather than merely handled correctly in code, and this ticket builds most of that surface.

This ticket owns the shell and none of the figures inside it. It builds the nav, the hero, the stat
tiles, the latency strip, the breadcrumb, the method page and the footer, and renders them from the
model tickets 05, 06 and 08 produce. Where a boundary is easy to trip over it is written into a
criterion below: the method page, its route and its anchors are this ticket's while the window
section's content is ticket 08's, and the breadcrumb is this ticket's while the views sitting under
it are tickets 09's and 11's.

`src/Dashboard.tsx` today holds a placeholder header, a title, a tagline and a footer, plus a
"Nothing measured yet" panel stating that the page carries identity only and no measurement. That
chrome is what this ticket replaces. The panel is not chrome — it is the page being honest about
having no metrics — and while that is still true it must survive the replacement rather than be
swept away with the header around it.

This ticket adds no host to `netlify.toml`: the lockup is an inline SVG, and the SPA fallback
already returns the app shell for the new routes. Whether the visual system's fonts cost the CSP
anything at all is ticket 14's question to settle, not this one's.

**Design:** `../canvas/Main.dc.html` (the nav at `:41-50`, the hero, deck and stat tiles at
`:53-76`, the latency strip at `:79-109`, the provenance footer at `:225-227`),
`../canvas/_logo.html` (the Kleros ×AI lockup, inlined into every artboard's nav),
`../canvas/Juror.dc.html:47-51` (the breadcrumb, in the same shape on `Dispute.dc.html:52-56` and
`JurorEmpty.dc.html:37-41`), `../canvas/README.md` for provenance

- [x] Every view renders inside one shell — the same nav, the same read-only pill and the same
      footer — so a view reached from a pasted link is recognisably part of the same dashboard
- [x] The nav opens with the Kleros ×AI lockup, linking to the matrix, taken from the canvas lockup as
      an inline SVG rather than redrawn or fetched from anywhere
- [x] The nav offers the matrix, agent jurors and the method page, plus a disputes destination if and
      only if the criterion below gives it somewhere to go. The one matching the current route is
      visibly active, marked by more than colour alone
- [x] No nav destination is inert: each navigates somewhere real, and none links to the page it is
      already on. Two have nowhere to go today — the tracker builds neither a dispute index nor an
      agent-juror index, since ticket 11 builds only a route per agent juror — so each of those two
      either gains an index here or is not shown at all
- [x] The nav is a landmark containing real links, so a keyboard or screen-reader visitor reaches the
      same destinations in the same order a pointer does
- [x] The read-only pill sits at the end of the nav on every view, bordered rather than filled, and is
      a statement of what this dashboard is — nothing about it is clickable, toggleable or a control
- [x] The chrome reduces below a narrow width rather than wrapping or overflowing, and it declares the
      breakpoint it reduces at in one place. What that reduction is — the wordmark, the folded nav,
      which tiles survive and in what order — is ticket 16's, and this ticket neither picks nor builds
      it. Until 16 lands the reduced form need only be legible, not final
- [x] The nav's destinations are real routes: each is reachable by URL, survives a reload, and the
      browser's back and forward buttons move between them
- [x] A path matching no route renders the shell around a 404 view saying the page does not exist. The
      SPA fallback in `netlify.toml` returns the app shell at HTTP 200 for every unknown path, so the
      app is the only thing that can tell a visitor the route is wrong
- [x] That 404 view offers a way back to the matrix and never reads as a failed read — a wrong URL is
      not a data-source failure, which is loud and looks nothing like this (ticket 13)
- [x] `/method` is a route of this dashboard, reachable from the nav and by URL, and its page is built
      as sections with stable fragment identifiers so a marker elsewhere can link to the one it needs
- [x] `/method#window` resolves to the window section and brings it into view, because the matrix
      footnote links exactly there
- [x] The method page explains what is measured and how, in `CONTEXT.md` vocabulary: the draw as the
      unit, latency as seconds from the observed moment a period opened, and coherence as having voted
      for the dispute's final ruling
- [x] This ticket owns the method page, its route and its anchors; ticket 08 writes the window
      section's content — the two period regimes as absolute durations — and neither ticket duplicates
      the other's half
- [x] Until ticket 08 lands, the window section exists and says outright that the account is not yet
      written, so the footnote's link never arrives at an empty anchor
- [x] The hero carries an eyebrow naming the court by number and name and the chain it runs on, a
      headline, and a deck below it
- [x] The deck says what this page measures — how fast the agent jurors act, and how often they vote
      with the final ruling — and in the same breath that it does nothing else: it never votes, stakes
      or holds a key. That clause restates the read-only-forever invariant and is not editorial
      decoration to be trimmed
- [x] The headline states the finding rather than naming the product, so a first-time visitor takes the
      point before reading a number — the canvas wording is the reference and needs no rederiving
- [x] Four stat tiles sit under the deck on desktop, each a figure over a label: how many disputes the
      court holds, how many draws those disputes amount to with the vote count beside it, how many of
      the roster's six agent jurors have ever been drawn, and the median reveal latency over every draw
- [x] No tile's figure is hard-coded, in markup or in a constant. Disputes arrive continually, so each
      is derived from what was actually read — a total that was true the day this was written must not
      survive as a literal
- [x] The draws tile carries draws and vote IDs as two distinct numbers, because they differ: the draw
      is the unit and one draw may hold several vote IDs
- [x] The drawn tile reads as a count against the roster's six, so an agent juror that has never been
      drawn is legible there and not only in the matrix
- [ ] A tile whose figure counts a draw carrying a caveat shows that caveat's marker on the figure, on
      the same terms ticket 06 sets for the marginals, with the reason beneath it and the full account
      one click away. On a phone the tiles are the only aggregates left, since the column headers the
      marginals live in are gone, so this is where those caveats reach a phone reader
- [x] Every tile figure comes from the pure function's model rather than being reduced in the view, as
      ticket 06 requires of the marginals — the court-wide median reveal latency is a new aggregate on
      that model, not a reduction performed while rendering
- [x] The strip plots one mark per draw on a logarithmic time axis, so a reveal measured in seconds and
      one measured in minutes are both placed rather than crushed against an edge
- [x] A median line crosses the distribution carrying its own value, and the strip's footer gives the
      fastest, median and slowest draws as three absolute durations
- [x] The strip's heading says how many draws it plots, so the distribution can never be read as
      covering more of the record than it does
- [x] The comparison band standing for an ordinary Kleros court's periods is labelled illustrative in
      the caption on the page, not only in a code comment. It measures no court, and this page may be
      cited, so that word survives any later edit to the caption
- [x] The median line and the three summary durations are computed from the same per-draw seconds the
      matrix cells show, so the strip is a second view of one set of numbers rather than a separately
      derived figure
- [x] One breadcrumb component serves every detail view: a link to the parent destination, a separator,
      and the current item as plain text rather than a link to itself
- [x] The current item is the dispute's own identifier or the agent juror's roster nickname, never the
      nickname ENS resolves — a `name` text record must not change what the trail says about a route
      keyed on the roster
- [ ] This ticket builds and places the breadcrumb; tickets 09 and 11 build the views beneath it and
      pass it the label for the current item, and neither rebuilds the trail
- [x] Every view ends with the same provenance footer, and it opens with the read-only statement: this
      dashboard observes and reports, and never votes, stakes, holds a key or connects a wallet
- [x] The footer then names which values on the view in front of the reader are the measured record. It
      is composed per view rather than one fixed sentence repeated on all of them, so what it names is
      what is actually on screen
- [x] The footer restates provenance; it does not become a third place a failed read is announced.
      Ticket 13 fixes that at two — in the place the figure would have been, and once in a banner —
      and the footer's job is to say what the figures on screen rest on, not to raise the alarm
- [x] Nothing on the live product is sampled, so the mockup's sampled-data disclaimer is not carried
      across. What the footer draws instead is the line between what has been read and what has not —
      the range of disputes read, when that read happened, and anything on screen that came from
      somewhere other than a read — and it never states or implies that the record is complete
- [x] Where something on the view rests on less than a clean read — an ENS lookup that fell back to the
      roster, a source that failed, an aggregate carrying a caveat marker — the footer says so, so the
      provenance of the whole page is findable in one place
- [x] On any view showing an agent juror the footer states how they are identified: by nickname, avatar
      and stack, never by the person who built them
- [x] The footer is rendered text on the page — never a comment, a `title` attribute or something only
      a hover reveals — because a caveat a reader has to uncover is not a visible one
- [x] The violet radial glow and the concentric rings are decoration behind the page: drawn from ticket
      14's tokens, taking no pointer events, and carrying no figure or label that depends on them for
      contrast
- [x] The "Nothing measured yet" panel survives this change while the page still holds no metric — the
      chrome around it is replaced, the panel is not, and it goes only when there is a measurement to
      put in its place
- [x] Until a metric has been read, the stat tiles and the latency strip say they have nothing rather
      than rendering zeros or an empty plot, since a `0` would be a claim about the court that nobody
      measured
- [x] Tests cover the shell's invariant text — the read-only statement in both the nav and the footer —
      and that an unknown path renders the 404 view rather than the matrix

## What landed

Built on branch `worktree-ticket-15`. `src/chrome/` holds the shell — `Shell` (ground, atmosphere,
nav, outlet), `Nav`, `Lockup`, `View` (main plus footer), `Footer`, `Breadcrumb`, `Hero`,
`StatTiles` — and `src/pages/` holds the five views the router mounts inside it. `src/routes.tsx`
is the route table; `App` still owns every hook, so the views take what they render as props and
the whole dashboard is exercised offline.

**Routing is react-router 8.** Approved 2026-08-25 against a hand-rolled history router and wouter:
`kleros-v2/web` already runs react-router, it gives tickets 09 and 11 their path params for free,
and `MemoryRouter` makes the 404 and active-destination tests trivial. `BrowserRouter`, so the URLs
are real ones — the SPA fallback in `netlify.toml` is what makes a pasted link resolve, and its
comment now says so.

**The two indexes were built rather than the destinations hidden**, approved in the same call. The
landing view is now hero, tiles, strip and matrix, exactly as `Main.dc.html` has it; the roster
moved to `/agent-jurors` and the dispute list to `/disputes`, each of which is also the parent
ticket 09's and ticket 11's breadcrumbs point back to. Ticket 02's promise that all six are named
with their stacks and avatars, and that an ENS fallback is said out loud, moved with the roster —
its tests are now `pages/AgentJurorsPage.test.tsx`. The matrix's own fallback, where the model
cannot be built and the dispute list is shown instead with the gap stated, stayed on `/`.

**The stat tiles' figures are a new aggregate on the model**, `CourtTotals` in
`performance/totals.ts`, attached by `buildCourtPerformance`. Disputes, draws, vote IDs, agent
jurors drawn, and the whole reveal-latency distribution with its fastest, median and slowest. The
strip plots that same array, so the marks, the median line and the three durations are one set of
numbers rather than three derivations. The median is the lower of the two middles on an even count,
because averaging invents a latency no draw recorded — and it reproduces the canvas's 85s over the
44 finalised draws.

`Dashboard.tsx` is gone; `pages/MatrixPage.tsx` replaces it. The caveat panel it carried survives
verbatim, both forms.

## Two criteria that did not close

**The caveat marker on a stat tile is built but shown nowhere.** `StatTiles` takes a `TileCaveat` —
mark on the figure, reason beneath, full account one click away — and today no tile passes one. The
only caveat the model carries is the lone panel, which qualifies *coherence*, and none of the four
figures is a coherence figure; `Main.dc.html:57-76` draws all four unmarked, and the canvas wins.
Ticket 06's marginals are the first figures this applies to, and ticket 08's window may be the
second. If that reasoning is wrong the fix is one prop per tile, not a mechanism.

**The breadcrumb is built and placed nowhere**, because there is no detail view to place it on:
tickets 09 and 11 build both. It is tested on its own (`chrome/Breadcrumb.test.tsx`) so that it
arrives before the first view that needs it rather than being built twice, once per view, in two
shapes.

## For whoever integrates this

- `performance/performance.ts` gains two lines — a `totals` field and the call that fills it. Ticket
  07 is in `performance/` too; the aggregate itself lives in a separate file to keep the collision
  to those two lines.
- `disputes/useDisputes.ts` gains `readAt`, from react-query's `dataUpdatedAt`, for the footer.
- `styles/theme.ts` gains eleven keys, all `var()` aliases over tokens the vendored CSS already
  declares: the lockup's two brand colours, the metric type, the orbit line, the violet wash, the
  narrow container, the nav height, and a few scale steps.
- `Matrix.tsx` is untouched. The window footnote that links to `/method#window` sits on the page
  beneath the matrix rather than inside it, which also keeps it out of ticket 07's way.
- Verified: lint, types, 197 offline tests, `yarn build`, and the four routes plus a 404 in system
  Chrome at 1440 and 390 — no console errors, no horizontal overflow, `/method#window` lands on its
  section.
