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

**Blocked by:** 24

**Design:** No artboard draws more than six columns. `Main.dc.html` and `MatrixDense.dc.html` both
draw exactly six on a 1440px page, so neither can be cited for how a seventh or ninth column looks —
this is the § Traps rule that the artboard being read has to be the one that draws the element in
that place. The densities, the cell, the row header and the flag styling are all cited as drawn; the
column *count* is not, and is arithmetic instead.

**Status:** ready-for-agent

- [ ] `COMFORTABLE_GRID_MIN_PX` derives from the roster's length rather than holding 1328, and
      `View.tsx`'s `measure="grid"` follows it without a second literal
- [ ] A test pins that adding a roster entry moves both the grid minimum and the page measure, so
      the two cannot drift apart again
- [ ] The 440px row header is unchanged, and a comment says why anyone reaching for it should not
- [ ] `densityOf` takes the column count as well as the row count, and the new threshold is
      documented as arithmetic — the width at which the comfortable grid stops fitting — in the
      same voice `COMPACT_FROM_ROWS` is documented in
- [ ] `breakpoints.ts` gains no `@media` literal: any new width lives beside the existing two and
      answers a question neither of them answers
- [ ] The off-roster count is derived below the seam, over draws already in `RawCourtData`, with no
      new network read
- [ ] A fourth `ROW_FLAGS` entry renders third, after `window` and before `lone-panel`, with a
      `label` and a `shortLabel` that cannot fork
- [ ] The badge renders on the matrix row **and** the phone card, and a test asserts both
- [ ] The badge is decoded wherever `†` and `‡` are decoded, on both layouts
- [ ] The badge names no address and no identity — a count only, inside the no-personal-data
      invariant
- [ ] A test covers the case that has no live example: a court where every draw is on the roster
      renders no badge at all
- [ ] `docs/adr/0008-*.md` records one fixed column position per agent juror, what it costs at
      eighteen columns, and that a rendering showing only the drawn agent jurors is the deferred
      alternative
- [ ] `CONTEXT.md`'s **Matrix** entry no longer says the columns stay at six, and gains
      **off-roster draw** as a term
- [ ] `CLAUDE.md` counts eight ADRs rather than seven, in § Status and in the § Start here row that
      names the range — writing an ADR without moving those two is how that table went stale before
- [ ] `DisputePanel.tsx:530-531` justifies its layout from the panel's measured size rather than
      from the roster's
- [ ] Checked in a browser at 1440pt and 390pt with the roster temporarily grown to nine — jsdom
      lays nothing out, so no offline test can see any of this
