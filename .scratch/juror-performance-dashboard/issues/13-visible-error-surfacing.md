# 13: Fail loudly rather than showing a half-true dashboard

**What to build:** When a data source cannot be reached, a visitor sees a prominent, unmissable
error saying so. Nobody should ever read a partly-loaded dashboard as fact — least of all on a
public deployment whose numbers may be cited.

`Errors.dc.html` is the specification for what "prominent" means here, and it carries one thing this
ticket did not have: **Unknown is its own cell state**, a sixth alongside the five ticket 05 builds. A
dispute whose data could not be read is a gap, and a gap must never be readable as "not drawn" or as
"failed to act" — the two states the cell design already exists to keep apart.

**Blocked by:** 04, 05, 07

**Design:** `../canvas/Errors.dc.html:43-162` (failure states), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] A failure that changes a number is loud and blocking; a failure that changes only a label is
      quiet and local
- [ ] By that rule the core subgraph, the template subgraph and the Arbitrum endpoint are loud; the
      Ethereum mainnet endpoint carries only ENS names and avatars and is the one documented exception
- [ ] Every read that fails says so twice: in the place where the missing figure would have been, and
      once in a banner at the top of the page
- [ ] The banner heading — "Part of this page could not be read. Do not cite these figures." — tells
      the reader what to do, and sits beside an "Incomplete" pill in a banner spanning the full width
- [ ] The banner names the failing source, the status it returned, and how long ago the last complete
      read was, and offers both a retry and an explanation of what a partial read means
- [ ] An aggregate computed while a read has failed is labelled as partial everywhere it appears, and
      what could not be read counts as unknown — never as zero and never as absent
- [ ] A dispute whose data could not be read renders as Unknown across its whole row: a `?` glyph and
      the words "not read" in every slot where a figure belongs
- [ ] The row header of an Unknown dispute carries a not-read badge and says the row is unavailable
- [ ] Unknown shares its rose with "failed to act" and is told apart from it by glyph and word alone —
      `?` against `∅`, "not read" against `NO VOTE` — per ADR-0006, which records rose as carrying
      exactly these two meanings. It shares nothing at all with "not drawn"
- [ ] A reader can name which rows are evidence and which are a gap without consulting a legend, since
      the words are in the cells
- [ ] A failure of ENS resolution alone raises no banner: nicknames fall back to the roster and avatars
      to initials, in a degraded-not-broken card rather than a blocking banner
- [ ] The ENS fallback shows on the elements it affects — a "from roster" label beside the fallen-back
      nickname and a dashed avatar — and says that no measurement depends on ENS, so no figure on the
      page is partial
- [ ] The commit cross-check discrepancy from ticket 07 surfaces through this same channel, and loudly,
      because it changes a number
- [ ] Recovery needs no full page reload: retrying from the banner clears it once the source answers

## Comments

### From ticket 03, 2026-08-25 — the offline visitor never reaches any of the criteria above

react-query's
default `networkMode: "online"` *pauses* a query when the browser reports no connection: the status
stays `pending`, `fetchStatus` becomes `paused`, and no error is ever thrown. Ticket 03's list
therefore shows "Reading the court…" indefinitely with no failure notice, and would do the same for
every reader this ticket touches, because a paused query is indistinguishable from a slow one unless
`fetchStatus` is read explicitly.

`isLoading` was chosen over `isPending` deliberately in `useDisputes.ts` — the alternative falls
through to the empty state instead, which is worse — but neither surfaces the pause. Whatever this
ticket builds should key on `fetchStatus === "paused"` (or `onlineManager`) rather than on the error
channel alone, since a paused query has no error to surface.

### From ticket 14, 2026-08-25 — a degraded panel already exists

The ENS-unreachable notice in `src/roster/Roster.tsx` is now built against
`../canvas/Errors.dc.html:142` — the amber panel (`--line-amber` hairline, `--wash-amber` fill,
`◇` glyph, mono label "Degraded, not broken"). Ticket 14 first built it in no state colour at all,
per its own criterion, and that was wrong twice over: it came out quieter than the prose it
interrupts, which `CLAUDE.md` forbids of a caveat, and the canvas draws that exact block in amber.
The canvas won. Recorded in ticket 14's Comments under "The one criterion not met as written".

Two things this ticket inherits:

- **The two tiers are already distinguished on that artboard, and they are not a colour choice.**
  Amber at `:142` is *degraded, not broken* — something could not be read and no figure depends on
  it. Rose at `:45` is the blocking banner, "Part of this page could not be read. Do not cite these
  figures", for a read that actually cost a figure. This ticket owns the rose tier; the amber one is
  built and can be lifted rather than re-invented.
- **`Errors.dc.html:45` has a known defect** — it badges the blocking banner with `∅`, which
  `Cell.dc.html:140` reserves for a draw that failed to act and says is "used nowhere else". The
  unread *cell* correctly uses `?`. See `../canvas/README.md` § Known defects; do not copy the
  banner's glyph as drawn.

### From ticket 04, 2026-08-25 — the list's second notice counts rather than catches

`DisputeList.tsx` renders **two** notices from the same `Notice` component, not one, and they say
different things on purpose: the disputes could not be read (the list may be partial), and the
disputes' subjects could not be read (the list is whole, only titles are missing). The second
carries a count — "3 of these 16 disputes" — because a lagging subgraph produces the partial case
and "some" and "all" are different claims. Both need the designed failure state; neither should be
collapsed into the other.

### From ticket 05, 2026-08-25 — the placeholder notices to replace, and a word to watch

**Four placeholder notices now exist across two files, and all four are yours to replace.**
`DisputeList.tsx` holds the two ticket 04 describes above. `Dashboard.tsx` holds two more, styled
the same way: one for a court that could not be *re*-read while a matrix is on screen, which must
say the matrix may be stale rather than complete, and one for a matrix that could not be built at
all — in that case the matrix is not rendered and the dispute list is shown in its place, because a
matrix built without draws is a page of blank cells and a blank cell says an agent juror was not
drawn. All four are marked in comments.

**`Notice` is defined twice**, once in each file, because the two tickets that added them never met.
Replacing them with the designed failure state is the moment to have one.

**`buildCourtPerformance` returns a failure envelope, and today it is flattened into an `Error`.**
`useCourtPerformance` turns `{ success: false, code, message, details }` into
`new Error(`${code}: ${message}`)` because nothing above it can yet show more. The code and the
details are the loud partial-read banner's content — `MALFORMED_COURT_DATA` and the draw id it
names — and the flattening is the thing to undo.

**Watch the word `Unknown`.** This ticket owns the rose `?` Unknown *cell state*, for a draw whose
data could not be read. Ticket 05 already uses the bare word `Unknown` in pending ink for a
different thing: a reveal that happened and left no timestamp behind, in a cell whose coherence is
known. `revealFigureOf` in `cell.ts` is where it is worded. Two Unknowns on one page, one rose and
one quiet, is exactly the confusion `Cell.dc.html:140` warns about — decide deliberately which one
keeps the word.

### From ticket 07, 2026-08-25 — the cross-check is built, and it is a count

**Your criterion "the commit cross-check discrepancy from ticket 07 surfaces through this same
channel" now has something concrete to read.** `CourtPerformance.commitCoverage` is
`{read, expected, resolved}`: whether the log scan has come back at all, every draw the subgraph
reports as committed, and how many of those a `CommitCast` log was found for. `read && expected !==
resolved` is a shortfall. It is a count rather than a thrown error deliberately — a truncating
endpoint returns fewer logs and no error, and failing the whole model would blank sixteen rows of
subgraph-read measurements that are unaffected. `Matrix.tsx` states the count in a rose notice
today; raising it to the banner is yours.

**`read` is load-bearing and was found by review, not by design.** The commit read is a separate
query the matrix does not wait on, so between the subgraph answering and the chain answering, every
commitment is unresolved. Without the flag the page announced "none of the 56 commitments could be
read from Arbitrum" on every cold load, for as long as the RPC took — a failure stated before it
happened, on a public page. `null` commits mean *not read*; `[]` means *read and empty*. Whatever
you build on top of this must keep the two apart, and the banner must not fire on `read: false`.

**The commit query is keyed on the draws it explains** (`draws?.length`), for the same reason: the
count compares two reads and is only meaningful when both have seen the same court. A draws refetch
that picks up a new commitment retires the commit read rather than being counted against it.

**`CourtPerformanceView.commitError` is a separate field from `error`,** and nothing renders it yet
— it is yours. `error` is the failure that leaves `performance` null; folding an Arbitrum outage
into it would blank the matrix, which is exactly what the non-blocking design exists to avoid.

**A fifth placeholder notice, and a third `Notice` component.** `Matrix.tsx` now defines
`Shortfall`, rose rather than the amber the other two use, because this changes a figure and the
others change a label. That makes three separately-defined notice components across three files.
The comment on it points here.

**A third `Unknown` now exists, and it is the one that most wants your rose `?`.** `commitFigureOf`
words a draw as `Unknown` when the subgraph says it committed and no log was found — that is
precisely "a thing that could not be read", the meaning this ticket gives the rose `?`. The other
two are ticket 05's dateless reveal and yours. Deciding which keeps the bare word is now a
three-way call, and the commit one is the strongest candidate to convert.

**The Arbitrum endpoint degrades rather than blocks today, on purpose.** Your rule classifies it as
loud, and it will be. Until then `useCourtPerformance` runs the commit read as a separate query
that the matrix does not wait on: reveal latency and coherence come from the subgraph, so an
Arbitrum outage costs the commit line and nothing else. Verified in a browser with the RPC blocked
— every commit slot reads `Unknown`, the notice names all 56, and the rest of the matrix is intact.

**One more thing that would change a number.** The commit read costs one RPC call per commitment
and the public endpoint rate-limits per call: 62 blocks read three times over in a second returns
HTTP 429. One page load is far from that, but the ceiling arrives with roughly 200 more disputes,
and when it does the symptom is a *partial* commit read rather than a failed one — a shortfall
count, which is exactly what this channel is for.

## From ticket 15: where the notices moved, and a fourth surface that is not yours

`Dashboard.tsx` no longer exists. The two notices this ticket's catalogue attributes to it are now
in **`src/pages/MatrixPage.tsx`**, unchanged in wording: the amber "may be incomplete or out of
date" notice above the matrix, and the "could not be built from what was read" notice above the
dispute-list fallback. The two in `DisputeList.tsx` are where they were. Counting ticket 07's rose
`Shortfall` in `Matrix.tsx`, that is five placeholder notices and three separately-defined
components — `MatrixPage.tsx`, `DisputeList.tsx` and `Matrix.tsx` each declare one — waiting to
become one designed failure state. That count is only true of the two branches merged; on either
one alone it read four and two, which is what each of these notes said when it was written.

**The provenance footer is deliberately not another one.** Every view now ends with one
(`src/chrome/Footer.tsx`), and it states what the figures rest on: which values are the measured
record, the dispute range and the moment it was read, and any caveat — an ENS fallback, a title
shortfall, a source that failed. It is *not* where a failed read is announced. Ticket 15's criteria
fix that at two places, yours: where the figure would have been, and once in a banner. A test in
`pages/MatrixPage.test.tsx` pins that the footer does not become a third. When you build the banner,
leave the footer's caveat list alone — the two say different things, and a reader who sees the same
sentence twice stops reading either.

Two smaller things:

- **The 404 view is not a failure state and must never look like one.** `pages/NotFoundPage.tsx`
  says outright that nothing failed to load and no figure is missing, because Netlify answers every
  unknown path with the app shell at HTTP 200. A test asserts the words "could not be read" do not
  appear on it. Whatever rose treatment this ticket builds, it does not reach that view.
- `StatTiles` and `LatencyStrip` already handle the no-model case by saying they have nothing rather
  than rendering zeros. They say it plainly; the designed version is yours if the design has one.

## From ticket 08: a second unrendered error, and a third read-state

`CourtPerformanceView` now carries **`parametersError`** beside `commitError`. Same contract: it is
non-blocking, nothing renders it as a banner, and it is the reason behind a caveat rather than the
caveat itself. An unread parameter history costs the `†` marker and each row's windows and nothing
else, so it must never reach the blocking channel.

Two things ticket 08 learned wording these, both of which the banner has to keep:

- **A flag that is false during a read is not a flag that the read failed.** `commitCoverage.read`
  and `parameters.read` are each false while Arbitrum is being asked *and* after it refused. Ticket
  08 fixed a pre-existing case of this — the commit caveat said "still being read" about a read that
  had given up — by keying the wording on the error as well as the flag. Every notice this ticket
  writes over either read needs both halves. It is the same trap `CLAUDE.md` records against
  `RosterView`.
- **There is a third state under those two: a read that came back empty.** `parameters: []` is
  `read: true` with no configuration in it, from a court that has certainly been configured — a
  short read, not an absent one, and the page says so in different words. `CourtTotals.unplacedDisputes`
  is the matching count for the rows it leaves unplaceable.

`MatrixPage.tsx`'s `provenanceOf` now composes five wordings across these states, and `Matrix.tsx`'s
`WindowFootnote` three. That is the catalogue this ticket folds into one component — one more than
was there when this ticket was written.

### From ticket 12, 2026-08-25 — a row-level marker exists, and "Unknown" is still yours

**`BodyRow` in `src/performance/Matrix.tsx` is a styled `tr`** that carries the row's tint and its
left rail. If the designed failure state wants to mark a whole row — a dispute whose draws could
not be read, say — the mechanism is there rather than needing to be invented, and it takes a `Tone`
so it will match whatever ink you give the state.

**Nothing in ticket 12 claims the word "Unknown."** ADR-0006 reserves it for you. A live latency
that has not happened yet is a dash in pending ink, exactly as ticket 05 built it.

**The five-second poll doubles as a hazard for you.** `CLAUDE.md` already records that the dispute
read and the draw read can fail at different moments and render as one page read at the later one.
That now happens *repeatedly* rather than once per load, so a notice that appears and retracts is a
live risk: a transient failure on one poll will flash your banner and clear it five seconds later.
Whatever you build should probably survive one failed poll before it says anything.
