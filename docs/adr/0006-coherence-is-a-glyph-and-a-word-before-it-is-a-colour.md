# Coherence is a glyph and a word before it is a colour

`DESIGN_PROMPT.md:202` is a constraint, not a preference: "coherence must never be encoded by colour
alone." The line after it explains why the constraint bites — "Numbers must be scannable in a dense
grid. Typography carries a lot of weight here." Every cell state therefore leads with a glyph and a
word, and takes a colour on top. `canvas/Cell.dc.html:87` is the rule in the design's own words: "A
check with the word COHERENT reads the same in greyscale, at 60% zoom, and to a reader who cannot
separate cyan from amber. The colour is the second signal, never the only one."

Five cell states, in the design's own labels (`canvas/Cell.dc.html:97-169`):

- `✓` **Coherent**, cyan (`--cyan-400`) — voted with the ruling. The ordinary case, and the only
  state with no fill and no border: the common case is the quiet one, so the exceptions are what the
  eye lands on. How common it actually is has not been measured and is not asserted here.
- `✕` **Diverged**, amber (`--amber-400`) — voted against the ruling.
- `∅` **No vote**, rose (`--rose-400`) — drawn and failed to act. The only loud state. No example in
  44 draws.
- `⋯` **Committed** or **Awaiting**, mint (`--mint-400`) — live, still acting: the cell words the
  stage the draw has reached, while a legend names the state once as a family. What has not happened
  yet is dimmed to pending ink and dashed, never blank, because blank means something else here.
- **Not drawn** — no glyph, no word, no colour, no tile and no border: one 3px dot so the matrix
  keeps its rhythm. 34 of 78 cells.

A diverged draw is **amber, not rose**. Voting in the minority is a legitimate outcome that costs
the agent juror PNK; it is not a malfunction and must not look like one. Rose is reserved for two
other things: a draw that never acted, and — per `canvas/Errors.dc.html:100-112` — data that could
not be read, which renders as `?` / **Unknown** / "Not read". Rose therefore carries two meanings,
separated only by glyph and word. The rule earns its keep on this palette before any reader is
considered.

"Not drawn" and "failed to act" share no glyph, no weight, no fill and no border
(`canvas/Cell.dc.html:173`). One is the emptiest thing on the page, the other the loudest. Confusing
them attributes a failure to an agent juror that did nothing wrong.

## Considered Options

Colour alone is the conventional choice, and it is what this project said first: the spec's Solution
paragraph described each cell as "coloured by coherence", and ticket 05 asked for a cell
"coloured by whether the draw was coherent". It is cheaper — one attribute, no glyph vocabulary to
learn, and no width spent on a word in a cell already carrying two latencies and a vote count.

It fails in three ordinary conditions, every one of which this dashboard meets by design. Greyscale,
because the matrix gets screenshotted into Slack and into articles. Small size, because
`MatrixDense.dc.html` exists to make sixty rows readable at once. And a reader who cannot separate
cyan from amber — which is the exact pair carrying coherent against diverged.

The cost lands hardest where the design can least afford it. The two states that must never be
confused sit adjacent in the same matrix, and hue is the weakest available separator for a pair
whose confusion misattributes a failure. Redundant encoding is not a concession made here for
accessibility — it is the only mechanism that makes that pair unmistakable, and the accessibility
follows from it.

## Consequences

Tickets 05, 07, 10, 13, 14, 16, 17 and 18 cite this ADR rather than restating the rule, so the
states have one definition. Ticket 05 builds all five as renderable states of the cell — its two "renders
distinctly" criteria acquire a concrete form — and ticket 12 supplies the data that makes the live
one occur, without owning how it looks. Ticket 07 adds the commit half of the cell. Ticket 11
reuses the same vocabulary on the agent juror view. Ticket 13 owns Unknown, which is rose without
being any agent juror's failure.

At the compact density the word drops and the glyph does not. `MatrixDense.dc.html:97` renders the
glyph and the reveal figure alone, and the legend below it goes on naming all five states by glyph,
word and colour. What this ADR decides still holds: colour is never the only signal, because the
glyph, the fill and the border all survive the reduction. The word is the strongest form of the rule
and is what the cell trades for height once the matrix outgrows the screen. Ticket 17 owns that
trade and states it, so it happens in the open rather than by attrition.

The phone slot makes the same trade for width. `Mobile.dc.html` carries a glyph and one figure, and
ticket 16 keeps the word in the slot's accessible name. Both reductions are bounded the same way:
the glyph never goes, and the word stays reachable on the surface — in a legend beside the matrix,
or in the accessible name of the thing that lost it. A state carried by hue alone is the one outcome
neither reduction is allowed to reach.

Every state must survive greyscale, which is testable rather than aspirational: with hue removed,
the five must stay distinguishable by glyph, word, weight, fill and border alone.

Colour is the second signal, never the only one, and never the only difference between two states.
A sixth state has since arrived and obeys the rule: ticket 13's **Unknown**, for a dispute whose
data could not be read, is `?` and the words "not read" before it is rose. It is the only state this
ADR does not draw from `Cell.dc.html`, because the cell was designed before the failure was.
