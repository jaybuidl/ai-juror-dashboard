# 05: The matrix answers the question, from subgraph data alone

**What to build:** A visitor sees the dispute matrix working end to end — one row per dispute, one
column per agent juror, each cell showing that draw's reveal latency and saying in a glyph and a word
whether the draw was coherent, with colour as the second signal and never the only one. This is the
first ticket where the dashboard answers the question it exists to answer, and it does so without
touching an RPC.

This ticket establishes the seam described in the spec: one pure function turning raw fetched data
into the dashboard model, with every subtle derivation inside it and no network or clock anywhere
near it. Respect ADR-0001 (latency in seconds), ADR-0002 (coherence per draw) and ADR-0006
(coherence carried by a glyph and a word before a colour).

**Blocked by:** 02, 03, 14

**Design:** `../canvas/Cell.dc.html:43-174` (the cell's anatomy and all five states),
`../canvas/Main.dc.html:112-223` (the legend, the matrix grid, the row it hangs off and the footnote
cards), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] A pure function converts raw fetched data into the dashboard model, returning agentkit's result
      envelope. It performs no I/O and reads no clock
- [ ] Reveal latency is derived per draw as seconds between the moment the vote period opened and the
      moment the reveal was recorded
- [ ] Latency is held in seconds; values under two minutes display in seconds and longer ones switch
      to minutes
- [ ] Coherence is computed per draw against the dispute's final ruling, never taken from the
      subgraph's global aggregate
- [ ] Several vote IDs held by one agent juror in one dispute collapse to a single draw
- [ ] Coherence is only asserted for disputes that have a final ruling
- [ ] A draw that voted with the ruling renders a `✓` glyph and the word `COHERENT` in cyan, on a cell
      with no fill and no border of its own — the ordinary case is the quiet one, so the exceptions are
      what the eye lands on
- [ ] A draw that voted against the ruling renders a `✕` glyph and the word `DIVERGED` in amber, on an
      amber-tinted cell with an amber border — amber and not rose, because voting in the minority is a
      legitimate outcome that costs PNK, not a malfunction
- [ ] A draw whose period closed with nothing revealed renders a `∅` glyph and the words `NO VOTE` in
      rose, on a rose-tinted cell with a rose border, with the reveal figure reading `Missed` rather
      than a number. Rose is shared with only one other state — the Unknown of ticket 13, for data that
      could not be read — and glyph and word are what keep the two apart, never hue
- [ ] A draw whose period is still open renders a `⋯` glyph in mint on a mint-tinted cell with a
      mint border, worded for the point it has reached — `COMMITTED` once the commit is recorded,
      `AWAITING` before it — and whatever has not happened yet reads as a dash in pending ink, never
      as blank
- [ ] A cell for an agent juror not drawn in that dispute renders as a single 3px dot: no tile, no
      border, no glyph, no word and no latency, so the grid keeps its rhythm and nothing can be read
      as a failure to act
- [ ] `NO VOTE` and not-drawn share no glyph, no weight, no fill and no border — the loudest state on
      the page against the emptiest. This is the one confusion the design exists to prevent, because
      conflating them would attribute a failure to an agent juror that did nothing wrong
- [ ] With hue removed the five states stay distinguishable by glyph, word, weight, fill and border
      alone — five attributes, because not drawn has neither a glyph nor a word and is told apart by
      the other three
- [ ] The two states with no example in the data yet — `NO VOTE` and the live one — are built and
      renderable from a model that says so, not deferred until they occur
- [ ] The live state is built here as a state of the cell driven by the model; ticket 12 wires the
      data that makes it occur, and nothing in this ticket waits on that
- [ ] A draw holding more than one vote ID annotates its cell with the vote count; a draw holding one
      vote ID shows nothing there, since `×1` would be noise on 44 cells
- [ ] Every dispute row shows its panel size — the number of agent jurors drawn — because coherence
      cannot be read without it, and no cell repeats it
- [ ] A dispute whose panel was a single agent juror carries a `‡` glyph and a word on its row flag,
      amber behind them and never instead of them, since a lone juror is automatically the majority
      and its coherence is tautological
- [ ] A legend names the five states by glyph, word and colour and keys the reveal and commit rails,
      so a first-time reader can decode a cell without being told what the glyphs mean. The legend
      names the live state once, as a family; the cell is what words the stage a draw has reached
      inside it, so the two carry different words on purpose
- [ ] The matrix states in place that a blank cell is the normal case — agent jurors are drawn at
      random, so sparsity is what random selection looks like and not missing data — rather than
      leaving a reader to infer it from the emptiness
- [ ] A row carries at most one flag pill. This ticket introduces the lone-panel flag; tickets 08 and
      12 add the window and the live flags to the same slot, so the mechanism is built once with a
      documented precedence — window, then lone panel, then live — rather than one flag hard-coded
- [ ] The pure function is tested against fixtures captured from the real disputes, with no network and
      no mocks, covering: the vote-to-draw collapse, an absent justification, and an agent juror never drawn
- [ ] Rows are disputes and columns are agent jurors, so the matrix grows downward as disputes
      accumulate — the density rules that take over past roughly forty rows are ticket 17, not this one

## Comments

**From ticket 03 (2026-08-25) — two things coherence has to agree with.**

**Ruling 0 is a ruling.** Dispute 154 is genuinely `currentRuling: "0"` with `ruled: true` — refuse
to arbitrate, which `CONTEXT.md` records as always a valid choice. It has real draws in it, and a
juror that voted 0 there is *coherent*. Anything that treats the ruling as falsy, or filters
disputes on a truthy `currentRuling`, will silently mark a whole panel incoherent or drop the
dispute from the matrix. Ticket 03 words it "Refuse to arbitrate" rather than "Ruling 0"; the cell
and any per-dispute view should agree.

**A dispute has a ruling when `ruled` is true, not when its period is `execution`.** The subgraph
reports a `currentRuling` for a dispute still in its appeal period — 164, 165 and 166 all read `1`
while unruled — and `CONTEXT.md` is explicit that a round majority before the appeal period closes
is a prediction, not coherence. Ticket 03's rows key on `ruled` for exactly that reason. The two
tests agree on all 16 disputes today, so a divergence here would not show up in testing; it would
show up as the list saying "Pending" beside a cell claiming coherence.
