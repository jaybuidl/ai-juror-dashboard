# Design canvas — juror performance dashboard

The answer to `DESIGN_PROMPT.md`. Eight artboards on one pan/zoom canvas:

<https://claude.ai/code/artifact/4faccfc9-cb20-4189-927f-133fce711e0c>

| File | Artboard |
| --- | --- |
| `Main.dc.html` | The matrix at 13 disputes, plus one live row |
| `MatrixDense.dc.html` | The matrix at 60 rows, compact density |
| `Dispute.dc.html` | One dispute, five justifications side by side |
| `Cell.dc.html` | The cell: anatomy and every state |
| `Juror.dc.html` | One agent juror |
| `JurorEmpty.dc.html` | An agent juror the court has not drawn yet |
| `Errors.dc.html` | Partial-read failure, and the dispute-151 marker |
| `Mobile.dc.html` | 390pt phone |
| `canvas.json` | Positions, frame sizes and the sticky notes |
| `_logo.html` | The official Kleros ×AI lockup, inlined into each artboard's nav |

Each `.dc.html` is a **Design Component**: plain HTML with a `<helmet>` block, and
`{{holes}}` / `<sc-for>` / `<sc-if>` resolved by a `DCLogic` class at the bottom. The
`<script src="./support.js">` head line is load-bearing — the editor swaps it for its own
runtime. Leave it.

## Changing a design

Edit the `.dc.html` files here, then re-seed and republish to the same URL. Never edit the
seeded output. `/design` in Claude Code carries the helper:

```
node <design-skill>/seed-canvas.mjs --template <design-skill>/payload.template.html \
  --out ai-juror-dashboard.html --title "AI Juror Dashboard" \
  --artboard Main.dc.html --artboard MatrixDense.dc.html --artboard Dispute.dc.html \
  --artboard Cell.dc.html --artboard Errors.dc.html --artboard Juror.dc.html \
  --artboard JurorEmpty.dc.html --artboard Mobile.dc.html --canvas canvas.json
```

If the canvas has been edited in the browser since, read that version back first — its
saved state is the source of truth, not these files.

**Editing an artboard moves every `Foo.dc.html:NN` citation below the edit**, and there are dozens
of them — in `src/` doc comments, in `docs/`, in the tickets, and in this file. They are how a
reader gets from a component to the drawing it was built against, and nothing checks them: a
citation that has slid seven lines still resolves to *something*, which is worse than a broken one.

So prefer an amendment that replaces lines in place rather than adding them. Ticket 29 restacked
the column header in both artboards and started by adding an explanatory HTML comment above each
block, which moved 30-odd citations by seven lines and five; the comments were dropped and the
rationale kept here instead, leaving both files at exactly their previous length. **Where an
artboard edit does have to change the line count, grep for the artboard's name and fix every
citation past the insertion in the same commit.**

## To preview one artboard without publishing

Copy `support.js` from `kleros-design-system/kleros-ai/design_references/` into this folder
and open the `.dc.html` directly. Both that copy and the seeded output are gitignored.

## The visual system is not this repo's

Colours, type and component anatomy come from
`kleros-design-system/kleros-ai/kleros-ai-design/`. Ticket 14 adopted it: the eight token
files are vendored verbatim under `src/styles/kleros-ai/` and `src/styles/theme.ts` is now
`var(--token)` aliases over them, where it used to hold the Kleros Court dark palette as a
placeholder.

This paragraph used to say the swap would also mean widening `style-src` and `font-src` in
`netlify.toml` for Google Fonts. It did not: ticket 14 self-hosted Manrope and JetBrains
Mono instead, and the policy is unchanged. The artboards still `@import` from Google Fonts
because they render standalone in a browser, under no policy at all — that is a property of
the canvas, not of the dashboard.

## Known defects, unfixed

Found 2026-08-25 while building the tracker on these artboards, confirmed against the record, and
left alone because each needs an edit plus a re-seed. No ticket quotes any of them.

- `Errors.dc.html:195` renders "152 onward · Commit 45m · vote 45m". The modified `timesPerPeriod`
  is `[2700, 2700, 1800, 129600]` — the vote window is **30m**, not 45m. This is on the artboard
  whose whole subject is the parameter change, and it reads as measured rather than sampled.
- `Errors.dc.html:45` uses `∅` for the blocking banner's badge. `Cell.dc.html:153` marks a draw
  that failed to act with that glyph and calls it "the only loud state". The unread *cell*
  correctly uses `?`; only the banner tile clashes.
- `Juror.dc.html:73` shows a median commit stat while `:108` excludes commit latency from the chart
  directly below it as not comparable across dispute 151. The same page both declines to compare
  and compares, and the stat carries no marker.

Lesser, noted in passing: `Dispute.dc.html`'s justification columns are not in roster order despite
its caption saying they are.

## Overruled by an ADR, artboards not yet amended

- **The latency medians and the agent juror latency profile are not built** (ADR-0010,
  2026-11-20). `Main.dc.html:147-148` heads each column with a median reveal and a median commit,
  and `MatrixDense.dc.html:77` did with the median reveal; `Juror.dc.html:72-73` puts both on the stat
  card and `:86-110` plots the reveal latencies against the court's. Per-draw latency does not measure how fast an agent
  juror judges, so none of those is drawn, whatever the artboard shows. This is not the canvas-wins
  rule failing: the artboards decide how a figure looks, and ADR-0010 decides that this figure is
  not shown. Stage 2 of issue #8 amended `MatrixDense.dc.html:77-78` (now the Coherent and Diverged shares) and
  left `Main.dc.html` and `Juror.dc.html` drawing them: do not restore a median or the plot to
  match those two. The `Juror.dc.html:73` defect above is moot for the same reason.
- **The comfortable cell carries no latency** (ADR-0011, 2026-11-20). `Main.dc.html:184-195` still
  draws each cell's `R` and `C` lines and their rail, and `:123-125` keys them in the legend. The
  cell is the state and the vote count only; `Cell.dc.html` is the authority on it, and was
  amended. Do not restore a time to the cell to match `Main.dc.html`. Its legend at `:118` also
  words the three live stages as one `Acting`, where the cell has `Awaiting`, `Committed` and
  `Revealed`.
- **No panel card or cell on the dispute and failure artboards carries a time** (ADR-0011).
  `Dispute.dc.html:125-126`, `:160-161`, `:190-191`, `:220-221` and `:251-252` still draw `R`
  and `C` on every panel card, and `Errors.dc.html:79-131` draws them in its cells, with
  `:101-112` and `:136` printing "R Not read / C Not read" across an unread row. Neither was
  amended. The panel card is the state, the vote share and the justification; the unread cell is
  `?` with the word Unknown, and the row's flag says Not read. Do not restore either to match.

## Fixed, by amending the artboard

- **`Main.dc.html`'s comparison band began at one hour and read "hours to days".** An ordinary
  Kleros court takes **five days at minimum** over a single-round dispute, so the artboard
  understated the distance the whole chart exists to show by about two orders of magnitude — and
  in the direction that weakens the experiment's own case, which is what made it worth a ticket
  rather than a note here. The artboard and the code agreed to the decimal, because `72.4%` is
  exactly `log10(3600)/log10(86400)`: one wrong number expressed twice, not a drawing decision
  and an implementation of it.

  Ticket 22 amended **the artboard**, which inverts this repo's standing rule that the canvas
  wins where a ticket and an artboard disagree. That rule has an exception for the canvas's
  *data* — `CLAUDE.md` records it — and this is the fifth time it has been tested and the first
  time the exception has been invoked. The reading, so nobody re-argues it: the disagreement was
  about a fact the artboard **asserts**, not about how to draw an element, and an artboard is
  authoritative about the second and no more authoritative than anything else about the first.

  What moved with it: `STRIP_MAX` to thirty days (the band is the last eighth of the axis at that
  maximum, where it reads as a region rather than as the right-hand edge), the ticks to nine so
  the axis names `5d` and `30d`, the median line to the position the new scale puts 85s at, and
  the label to the left of the boundary — at 12% of the plot it no longer fits inside the band.

  **Ticket 23 then made the boundary a reading, and the artboard was deliberately not amended
  again.** The band now begins at court 29's median time to ruling over its single-round
  disputes, read on every load: 3d 23h over 87 disputes on 2026-09-23. So the band's *position*
  on `Main.dc.html` and `Juror.dc.html` (five days) is a figure the artboard asserts and the code
  no longer draws, and the `5d` tick is gone from the code for the same reason: it would read as
  a second claim about where the band begins. The band's *shape* is still the artboard's: the
  violet wash, the hairline boundary, and the label right-aligned against it. No artboard draws
  the states a reading adds (being read, not read, nothing to compare). In those states the
  label moves to the plot's right-hand edge and no band is drawn, which is `StripBand.tsx`'s call
  and not the canvas's.

- **`Juror.dc.html:89` still labels its plot "Log scale · 1s to 1h", and is superseded.** It was
  already wrong before ticket 22: ticket 11 had that plot share the court strip's scale, which
  ran to a day. It now runs to thirty days and the code derives the words from the scale itself
  rather than printing them, so the artboard is a record of a range the axis has not had for two
  tickets. Left as it is — the plot's own geometry is unchanged and re-seeding it buys nothing —
  but do not resolve the disagreement by narrowing the code back to the artboard.

- **The matrix column header drew the avatar beside the nickname, and now stacks it above.**
  Ticket 29, amending `Main.dc.html:138-144` and `MatrixDense.dc.html:69-75`. Beside the name the
  avatar and its 8px gap took 34px of a compact column's ~83px content box, so the nickname
  ellipsised at roughly 46px and two of the seven agent jurors — `daemonhill`, `baskerville` —
  could not be read in the header of their own column. Stacking hands the nickname the whole box
  and buys no width, which mattered: ticket 25 has none to give.

  **This is the second time an artboard has lost, and the first time it has lost about how an
  element is drawn.** Ticket 22's amendment was invoked under the exception for the canvas's
  *data*; this one is a drawing decision, overridden by the maintainer against the rendered page on
  2026-09-04. `docs/knowledge/architecture.md` § The design canvas carries the reading, so that the
  standing "the canvas wins" rule is not used to revert it. Amending the artboards is what makes
  that rule safe to keep.

  Both artboards also drew this one element at two sizes — 26px comfortable, 24px compact — for no
  reason either gave. They now draw it at 44px, which is what the roster card has always used.

  The header cell's side padding went with it, 11px to 8px on both. Stacking cleared the nickname
  at 1440 and left it 3px short at the compact floor, which is where every viewport from 720 to
  about 1298 sits — so `daemonhill` and `baskerville` went on clipping across most laptops. The 4px
  a side buys the slot 86.98px against `daemonhill`'s 82. The alternative was a wider column, which
  moves the grid minimum and the breakpoint derived from it and belongs to ticket 25.

## What is measured and what is sampled

Real, and safe to reason from: the 13×6 occupancy grid, panel sizes, 44 draws / 61 votes,
the latency range (reveal 7s–552s, median 85s; commit 126s–3,236s), and the titles of disputes
151 and 152. Everything else — nicknames, stacks, other titles, per-draw latencies, reward
figures, and every row above 163 — is sampled to exercise the layout, and is labelled as such
on the artboards themselves.

`baskerville` never having been drawn was on that measured list, and is the one entry on it that
has since been falsified: the court drew it 14 times across 8 disputes by 2026-09-04, and the
roster has grown past the six columns every artboard draws. The occupancy grid is a true capture
of the fortnight it was seeded in, not a shape to design around — read the empty column as what
sparsity looked like that week, and `docs/knowledge/court-34.md` for the court now.

## Amended for ADR-0011: the cell carries no time

Stage 2 of issue #8, 2026-11-20. `Cell.dc.html`, `MatrixDense.dc.html` and `Mobile.dc.html` were
amended **in place, line for line**, so every `Foo.dc.html:NN` citation into them still lands on
the line it did (the files are 238, 262 and 134 lines, as before). Where a latency line went, the
line now carries what replaced it: on `Cell.dc.html` the 44px form of each state under its 76px
form, the three live stages in the old live tile, and a before-and-after panel where the log rail
explainer was; on `MatrixDense.dc.html` the vote count and the cell's accessible word where the
figure and its rail were, and the Diverged share where the median reveal was; on `Mobile.dc.html`
the glyph and the vote count where the glyph and the figure were. The dense artboard's script keeps
its now-unused `fmt` and `pct` helpers for the same reason. Its live row is in the vote period, so
it shows all three live glyphs, one of them an awaiting draw that is already late.

The two new glyphs, `◐` and `●`, fall back to a system font like every other state glyph; at the
artboards' 11-12px they read smaller than `✓`. The implementation sets them at the same size as the
other glyphs, so if they read too small in a browser, raise them in both places together.


## Amended for ADR-0012: the dispute timeline

Stage 3 of issue #8, 2026-11-20. `Dispute.dc.html:87-96` now draws the period strip as a timeline:
each period keeps its window and how long it ran, and below a hairline lists its moments in the
order they happened, a time column and a line of words. When the period opened and who opened it
(an agent juror by name in heading ink, anyone else as "an off-roster account" in meta ink), each
commitment under `◐` and each reveal under `●`, in the legend's own glyphs at meta ink. Times are
UTC clock readings and nothing between them is a duration. The day is printed on the dispute's
creation and on any moment that falls on a later day, and "All times UTC" sits under the evidence
period's list. The appeal period's list ends with "Closed by", which is the execution period
opening.

Amended **in place, line for line**: the timeline's classes were appended to line 30, the `.mv`
style line, and lines 88-95 were rewritten, so the file is 288 lines as before and every
`Dispute.dc.html:NN` citation still lands where it did. The vertical dividers stretch to the
tallest lane instead of a fixed 34px. The sampled moments agree with the panel cards' sampled
`R` and `C` figures below them (agent007 committed at 6m 36s and revealed at 8s, and so on), and
blaise opens the vote period in the second it committed: an agent juror opening a period itself,
which is the case ADR-0010 cites.

The implementation lays the four lanes out as on the artboard above the breakpoint and stacks them
in one column below it, where two lanes of moments would leave a nickname a few characters a line.
The panel cards' `R` and `C` lines on this artboard are still overruled by ADR-0011, as above.

## Amended for ADR-0012: the agent juror table's time to appeal

The same decision took commit and reveal latency off the agent juror page's table of draws (the
maintainer's call, 2026-11-20): a column of one agent juror's latencies reads as its speed, which
ADR-0010 says it is not. `Juror.dc.html:113-134` now draws one **Time to appeal** column where
`Reveal` and `Commit` were. It holds the *dispute's* time to appeal in whole minutes, the same for
its whole panel, which the implementation's table caption says. Amended in place, line for line:
the grid's track list at `:116` lost a 150px track, the `Commit` header at `:122` and its cell at
`:131` are blank lines, `:121` and `:130` carry the new header and cell, and each sampled row in the
script gained a `t:` in seconds (sampled, like every per-draw figure here). The file is 198 lines as
before. Its median reveal and commit at `:72-73` and the latency plot at `:86-110` are still
overruled by ADR-0010, as above.

`JurorEmpty.dc.html:83-84`, the first item under "What appears here on its first draw", now names
the time to appeal rather than "Commit and reveal latency". Same line count (107). Its two median
tiles at `:67-68` are still overruled by ADR-0010.
