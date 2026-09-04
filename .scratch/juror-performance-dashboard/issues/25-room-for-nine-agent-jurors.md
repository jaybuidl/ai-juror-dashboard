---
status: done
blocked_by: ["24"]
---

# 25: Make room for nine agent jurors

**What to build:** The matrix stops being sized for exactly six columns.

Ticket 24 puts a seventh agent juror in the roster and fixes the two numbers that break at seven —
the compact grid's `40%`/`10%` shares and `COMPACT_GRID_MIN_PX`. This ticket takes the rest: the
*comfortable* grid, the page that contains it, the switch that chooses between the two densities,
and the one thing the matrix has never been able to say — that a draw in this court belonged to a
juror the roster does not hold.

The width first, because it is the smallest change and the one the code already asks for.
`View.tsx:48` sets the page's max-width for `measure="grid"` to
`COMFORTABLE_GRID_MIN_PX + 2 * gutter`, and the comment above it says that width "is derived from
that measurement rather than chosen — the grid's own minimum plus the gutters either side of it —
so it cannot drift from the grid it exists to fit". It is derived from a **constant**:
`breakpoints.ts:60` holds 1328, which is `440 + 6 × 148`. Derive it from the roster's length and
the comment becomes true — seven columns give 1476 plus gutters, nine give 1772, and past the
viewport the grid box scrolls sideways exactly as it does now.

Do **not** buy columns by shrinking the 440px row header. It is 440 because an auto table once
crushed it to 239px and clipped a dispute title to 180px of its natural 836, so a 1440px desktop
showed a fifth of a question a 390pt phone showed whole. That cost three tickets and a review to
find, and the tell — a clipped title — is exactly what a title is supposed to look like when it
does not fit.

Then the switch. `densityOf(rows)` keys on the row count alone, and it is the **column** count that
decides whether six columns become eight at 1440px: a compact cell needs about 104px against the
comfortable 148. Give it both axes. `COMPACT_FROM_ROWS` is documented as a heuristic about screen
height rather than a fact about this court, and the column threshold gets the same treatment — its
value is arithmetic, the width at which the comfortable grid stops fitting an ordinary desktop, not
a preference. Worth knowing while you are in that file: `COMPACT_FROM_ROWS` is 40 and the court now
holds **46 disputes**, so the compact density is live in production and ticket 24 is the first pass
that will have looked at it with real data rather than with the constant lowered in a dev server.

Then the flag, which is the only new *reading* here. `draws-subgraph.ts:35` scopes its query by
court and not by juror, so every draw in court 34 is already in hand, and `performance.ts:810-816`
already adds every drawn address to the dispute's panel before the roster filter runs — the comment
there says so: "Not every address in a panel is an agent juror … but it was still on the panel,
counted above." So the quantity exists and nothing states it. Today grokleros is the live example:
four vote IDs across three disputes that no cell, no column and no coverage counter can see, which
is how a live agent juror stayed invisible until a human said so.

Derive the count in the seam, not in a component — it is a reduction over a read, and a reduction in
a component is one nobody can test. Render it as the fourth entry in `ROW_FLAGS`, ranked **third**:
after `window`, because a mis-dated latency is worse than an unattributed panel member, and before
`lone-panel` and `live`, because those two describe the court's shape while this one says a figure
on the row is incomplete. `rowFlagOf` returns exactly one flag, so the ranking is the whole of the
decision. Note that the flag has **no subject the moment ticket 24 lands** — grokleros joins the
roster and the count goes to zero. That is the point of building it: it is the tripwire that says
the next agent went live, and there will be two more within the week.

The badge is a string that names a row, so it reaches the phone's card as well as the matrix's row —
`row-flags.ts` is shared for exactly that reason, and this repo's history is five sentences that
were true on the desktop and false on the phone. It also needs decoding wherever the other marks are
decoded.

ADR-0008 lands here too, and it is the reason the rest of this ticket is as small as it is. The
decision — one fixed column position per agent juror, reserved in every dispute on both layouts,
whether or not that agent juror was drawn — is the thing being preserved rather than reopened, and
it currently survives only as a comment in `agent-jurors.ts` and criteria in a closed ticket. Write
down what it costs: the matrix was 43% empty at six columns and would be about 81% at eighteen,
because a panel is roughly five vote IDs drawn from the staked pool and does **not** grow when the
roster does. The next person to meet that number will reopen the question, and they should find the
reasoning rather than infer it.

Two glossary corrections ride along, both of which this ticket makes wrong if it does not.
`CONTEXT.md`'s **Matrix** entry says "Rows grow without bound as disputes arrive; the columns stay at
six, because the roster does", which this ticket exists to falsify. And `DisputePanel.tsx:530-531`
justifies a layout from the roster's size — "The panel is at most six, so all of it fits at once" —
which the **Panel** entry explicitly forbids ("A fact about the court, not about the roster.
_Avoid_: … roster"). Its conclusion survives by luck, because the real panel is about five draws and
does not track the roster; its stated reason becomes false at nine.

**Design:** No artboard draws more than six columns. `Main.dc.html` and `MatrixDense.dc.html` both
draw exactly six on a 1440px page, so neither can be cited for how a seventh or ninth column looks —
this is the `docs/knowledge/architecture.md` rule that the artboard being read has to be the one that draws the element in
that place. The densities, the cell, the row header and the flag styling are all cited as drawn; the
column *count* is not, and is arithmetic instead.

- [x] `COMFORTABLE_GRID_MIN_PX` derives from the roster's length rather than holding 1328, and
      `View.tsx`'s `measure="grid"` follows it without a second literal
- [x] A test pins that adding a roster entry moves both the grid minimum and the page measure, so
      the two cannot drift apart again
- [x] The 440px row header is unchanged, and a comment says why anyone reaching for it should not
- [x] `densityOf` takes the column count as well as the row count, and the new threshold is
      documented as arithmetic — the width at which the comfortable grid stops fitting — in the
      same voice `COMPACT_FROM_ROWS` is documented in
- [x] `breakpoints.ts` gains no `@media` literal: any new width lives beside the existing two and
      answers a question neither of them answers
- [x] The off-roster count is derived below the seam, over draws already in `RawCourtData`, with no
      new network read
- [x] A fourth `ROW_FLAGS` entry renders third, after `window` and before `lone-panel`, with a
      `label` and a `shortLabel` that cannot fork
- [x] The badge renders on the matrix row **and** the phone card, and a test asserts both
- [x] The badge is decoded wherever `†` and `‡` are decoded, on both layouts
- [x] The badge names no address and no identity — a count only, inside the no-personal-data
      invariant
- [x] A test covers the case that has no live example: a court where every draw is on the roster
      renders no badge at all
- [x] `docs/adr/0008-*.md` records one fixed column position per agent juror, what it costs at
      eighteen columns, and that a rendering showing only the drawn agent jurors is the deferred
      alternative
- [x] `CONTEXT.md`'s **Matrix** entry no longer says the columns stay at six, and gains
      **off-roster draw** as a term
- [x] `CLAUDE.md` counts eight ADRs rather than seven, in § Status and in the § Start here row that
      names the range — writing an ADR without moving those two is how that table went stale before
- [x] `DisputePanel.tsx:530-531` justifies its layout from the panel's measured size rather than
      from the roster's
- [x] Checked in a browser at 1440pt and 390pt with the roster temporarily grown to nine — jsdom
      lays nothing out, so no offline test can see any of this


## Comments

**A measurement for the compact column's width, taken while building ticket 29** (2026-09-04, in
Chrome at 1264x900, the floor this grid declares).

At `COMPACT_COLUMN_PX = 104` the header cell has 86.98px of content after its padding, and two
things do not fit in it:

- **`columbo`'s marginal values overflow their row and cross the cell's right border by about
  6px**, leaving roughly 2.4px to `daemonhill`'s key text — the dagger visibly sits on the column
  rule. `Med rev 2m 48s†` and `Coherent 29/29‡` are the two; it is the footnote-marker columns
  meeting the floor, and only that cell reports horizontal overflow. It was about 10px before
  ticket 29 trimmed the header's side padding to 8px, so that ticket halved it and left the rest.
- **"Never drawn" is 87.13px** in the stack label's font, so it wraps at the floor and
  `AgentStack` still has to reserve two lines against it. It stops wrapping at about 1298px
  viewport, which is above the floor.

Both clear at a column of roughly **113px**, which would put `COMPACT_GRID_MIN_PX` at 1231 and
`breakpoints.compactGrid` at 1327 for a roster of seven. That is a real cost — the freeze is lost
on every screen between 1264 and 1327 — so it is a trade for this ticket to make with the column
count in hand, not an obvious win. Recorded here rather than acted on, because 104 is documented as
what a compact *cell* needs and both of these are facts about the *header*, which is a second
question the constant has never been asked.

**Built 2026-09-04.** Every criterion above is met. Four things worth knowing beyond them.

**The column threshold is six, and the shipped roster is seven — so `COMPACT_FROM_COLUMNS` is live
the moment it lands.** `floor((1440 − 96 − 440) / 148) = 6`, so a comfortable grid stops fitting an
ordinary desktop at seven columns and `densityOf` compacts there whatever the row count. Production
saw no change (46 rows already crossed `COMPACT_FROM_ROWS`), but **the offline suites did: 44
assertions went red at once**, because every fixture built its court over `ROSTER` and every one of
them was silently testing the compact grid under a name that said comfortable. The fix is a
`FIXTURE_ROSTER` — `ROSTER.slice(0, COMPACT_FROM_COLUMNS)` — in `src/test/court.tsx` and
`Matrix.test.tsx`, sliced to the threshold rather than to a literal six. It costs no measurement:
`court-34-draws.fixture.json` holds draws for five agent jurors, all inside the slice, so every
latency, coherence count, median and payout total is over the same draws. Only the column count and
the position-derived figures move. Written up in `docs/knowledge/testing.md`.

**The off-roster count went into the provenance footer as well as the footnote**, which the criteria
do not ask for and which review would have. Every other caveat in that footer ends "counted above,
and marked wherever counted"; this one is the opposite — the draw count, the vote count, the median
reveal and every coherence figure on the page are taken over the roster's columns, so a draw with no
column is in none of them. A footer that stated the provenance of those figures without it would let
a short count read as a whole one.

**The § is the third footnote mark and it sits third in `ROW_FLAGS`**, which puts it between the
dagger and the double dagger on the page as well as in the ranking — so the order a reader meets the
marks in is the order the marks come in. `not-read` still outranks everything, so the list is
`not-read`, `window`, `off-roster`, `lone-panel`, `live`.

**Checked in Chrome at 1440x900 and 390x844, on live court 34, in two passes.** With the roster
temporarily grown to nine: ten column headers, the row header held at exactly 440px and every column
at exactly 104px, table 1376px against a `min-width` of 1376, no horizontal scroll on the page
itself, and the grid's own box scrolling with `role="region"`, its name and its tab stop intact —
which is correct at 1440, since `breakpoints.compactGrid` is 1472 at nine columns. At 390 the cards
carry nine slots wrapping 6 + 3, in the same positions on every card, with no horizontal scroll.
Second pass with Grokleros temporarily removed, which reproduces the state the flag was built for:
three rows marked `§ 1 OFF-ROSTER`, the footnote reading "3 draws in disputes 193, 194 and 195",
the three footnotes sitting † § ‡ across the row, and no address anywhere on the page.

**One thing deferred.** The comment above records that both `columbo`'s marginals and "Never drawn"
overflow a 104px compact column at the 1264px floor, and that ~113px clears both at the cost of the
header freeze between 1264 and 1327. Not taken: it is a fact about the *header* where 104 is
documented as what a *cell* needs, and widening the column moves `COMPACT_GRID_MIN_PX` and the
breakpoint derived from it — which is now also an input to `COMPACT_FROM_COLUMNS`, so the trade has
a third consequence it did not have when it was recorded. Worth a ticket of its own with all three
in hand.
