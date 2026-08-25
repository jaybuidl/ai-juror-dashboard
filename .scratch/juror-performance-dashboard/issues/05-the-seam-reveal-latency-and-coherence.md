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

**Status:** done

- [x] A pure function converts raw fetched data into the dashboard model, returning agentkit's result
      envelope. It performs no I/O and reads no clock
- [x] Reveal latency is derived per draw as seconds between the moment the vote period opened and the
      moment the reveal was recorded
- [x] Latency is held in seconds; values under two minutes display in seconds and longer ones switch
      to minutes
- [x] Coherence is computed per draw against the dispute's final ruling, never taken from the
      subgraph's global aggregate
- [x] Several vote IDs held by one agent juror in one dispute collapse to a single draw
- [x] Coherence is only asserted for disputes that have a final ruling
- [x] A draw that voted with the ruling renders a `✓` glyph and the word `COHERENT` in cyan, on a cell
      with no fill and no border of its own — the ordinary case is the quiet one, so the exceptions are
      what the eye lands on
- [x] A draw that voted against the ruling renders a `✕` glyph and the word `DIVERGED` in amber, on an
      amber-tinted cell with an amber border — amber and not rose, because voting in the minority is a
      legitimate outcome that costs PNK, not a malfunction
- [x] A draw whose period closed with nothing revealed renders a `∅` glyph and the words `NO VOTE` in
      rose, on a rose-tinted cell with a rose border, with the reveal figure reading `Missed` rather
      than a number. Rose is shared with only one other state — the Unknown of ticket 13, for data that
      could not be read — and glyph and word are what keep the two apart, never hue
- [x] A draw whose period is still open renders a `⋯` glyph in mint on a mint-tinted cell with a
      mint border, worded for the point it has reached — `COMMITTED` once the commit is recorded,
      `AWAITING` before it — and whatever has not happened yet reads as a dash in pending ink, never
      as blank
- [x] A cell for an agent juror not drawn in that dispute renders as a single 3px dot: no tile, no
      border, no glyph, no word and no latency, so the grid keeps its rhythm and nothing can be read
      as a failure to act
- [x] `NO VOTE` and not-drawn share no glyph, no weight, no fill and no border — the loudest state on
      the page against the emptiest. This is the one confusion the design exists to prevent, because
      conflating them would attribute a failure to an agent juror that did nothing wrong
- [x] With hue removed the five states stay distinguishable by glyph, word, weight, fill and border
      alone — five attributes, because not drawn has neither a glyph nor a word and is told apart by
      the other three
- [x] The two states with no example in the data yet — `NO VOTE` and the live one — are built and
      renderable from a model that says so, not deferred until they occur
- [x] The live state is built here as a state of the cell driven by the model; ticket 12 wires the
      data that makes it occur, and nothing in this ticket waits on that
- [x] A draw holding more than one vote ID annotates its cell with the vote count; a draw holding one
      vote ID shows nothing there, since `×1` would be noise on 44 cells
- [x] Every dispute row shows its panel size — the number of agent jurors drawn — because coherence
      cannot be read without it, and no cell repeats it
- [x] A dispute whose panel was a single agent juror carries a `‡` glyph and a word on its row flag,
      amber behind them and never instead of them, since a lone juror is automatically the majority
      and its coherence is tautological
- [~] A legend names the five states by glyph, word and colour and keys the reveal and commit rails,
      so a first-time reader can decode a cell without being told what the glyphs mean. The legend
      names the live state once, as a family; the cell is what words the stage a draw has reached
      inside it, so the two carry different words on purpose — *the reveal rail is keyed; the commit
      key lands with ticket 07, which is what builds the commit rail. See the comment below.*
- [x] The matrix states in place that a blank cell is the normal case — agent jurors are drawn at
      random, so sparsity is what random selection looks like and not missing data — rather than
      leaving a reader to infer it from the emptiness
- [x] A row carries at most one flag pill. This ticket introduces the lone-panel flag; tickets 08 and
      12 add the window and the live flags to the same slot, so the mechanism is built once with a
      documented precedence — window, then lone panel, then live — rather than one flag hard-coded
- [x] The pure function is tested against fixtures captured from the real disputes, with no network and
      no mocks, covering: the vote-to-draw collapse, an absent justification, and an agent juror never drawn
- [x] Rows are disputes and columns are agent jurors, so the matrix grows downward as disputes
      accumulate — the density rules that take over past roughly forty rows are ticket 17, not this one

## Comments

### From ticket 03, 2026-08-25 — two things coherence has to agree with

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

### From ticket 14, 2026-08-25 — read before styling a figure

**The `font` shorthand resets `font-feature-settings`, and every `--type-*` token is one.**
`tokens/base.css` sets `font-feature-settings: var(--font-feature-numeric)` (`"tnum" 1`) on `body`
so digits are tabular page-wide. Any element that sets its type through a `--type-*` token — which
is how everything is typed now — silently drops that for itself and all its descendants. A column
of latency figures inside a body-typed subtree gets proportional digits and stops lining up, with
nothing in the console and nothing failing.

Re-declare `font-feature-settings` immediately after the shorthand on anything holding a figure:
`theme.featureMono` (`"zero" 1, "tnum" 1, "ss01" 1`) for mono values, `theme.featureNumeric` for
sans. The canvas never relies on the inheritance either — every numeric element on every artboard
carries its own `font-feature-settings`, which is the tell.

**`theme.ts` is aliases, not values.** Each key is a `var(--token)` reference into the vendored
design system at `src/styles/kleros-ai/`. Add keys as this ticket needs them; never paste a hex.
`src/styles/theme.test.ts` fails on a copied value and on a `var()` naming a property that is not
declared on `:root` — the second is worth knowing about, because CSS itself treats an undefined
custom property as the inherited value and says nothing.

**`--type-metric` (`800 34px … var(--font-mono)`) is the big-figure token, and its weight is
self-hosted** even though the design system's own font import stops at 700. It will render as drawn.

### Built 2026-08-25

`src/performance/` holds the seam (`performance.ts`), the reader (`draws-subgraph.ts`), the two
presentation tables (`cell.ts`, `latency.ts`), the hook (`useCourtPerformance.ts`) and the view
(`Matrix.tsx`). 47 offline tests, 4 live; 104 offline across the repo. Verified in system Chrome
against the running page: 16 rows, 56 draws, no console violation. No CSP change — the draws come
from `api.goldsky.com`, which `connect-src` already allows.

**The canvas was read back before building.** The published artboards carry the same state words,
glyphs and counts as the committed `.dc.html` files, so there was no browser edit to reconcile.

**The matrix replaces the dispute list on the page, and does not delete it.** The artboard has one
thing, not a list and a matrix: the matrix's left column *is* the dispute row. `DisputeRow` is now
exported from `DisputeList.tsx` and rendered by both, so ticket 04's title and category fill the
matrix row header without knowing the matrix exists. `DisputeList` still renders whole — it is
what the page falls back to when the draws cannot be read, and what ticket 15 gives a route.

**A sixth situation the design does not name: revealed, ruling pending.** Disputes 164–166 sat in
their appeal period with every vote in. That is not coherence (no ruling), not a missed vote (it
voted) and not `COMMITTED` (it revealed). It is worded `REVEALED`, a third stage of the live
family, which is exactly the mechanism this ticket describes — the legend names the family once as
`Acting`, and the cell words the stage. The alternative was to leave twelve real draws with no
honest word.

**Three absences in the reveal slot, not two.** `Missed` for a reveal that will not come, `—` for
one that has not come yet, and `Unknown` for one that came and left no moment behind — the
timestamp lives only on the justification, so a reveal without one cannot be dated. The ticket
names the first two; the third is what the "absent justification" test case renders.

**`NO VOTE` is asserted only once the vote period has closed.** A draw that let the *commit*
period close without committing can no longer reveal either, but it reads as still awaiting until
the vote period closes: until then the record cannot tell it from a commitment the subgraph has
not indexed, and `NO VOTE` attributes a failure to an agent juror.

**Not done here:** the legend keys the reveal rail only. Keying a commit rail that no cell carries
would name a measurement this page has not made; ticket 07 adds the key with the rail. The comment
marking where it goes is in `Matrix.tsx`.

**Verified against the record rather than against itself.** The seam reproduces 61 votes → 44
draws, reveal latency 7s–552s with a median of 85s, and panel sizes 1 (dispute 155) and 5 — all
figures established in `spec.md` before this code existed. Coherence across the finalised range
comes out 41 of 44; the canvas's sampled 38 is not the real figure and never was.

### Review pass, 2026-08-25 — seven findings, all fixed

A `/code-review high` over the finished branch found seven, none of which the 105 passing tests
covered. Recorded because five of them are the same mistake in different places: a read that
failed rendering as a read that returned nothing.

1. **A failed dispute read built a successful, empty matrix.** `raw` is `[]` whether the court is
   empty or the request never arrived, and `buildCourtPerformance([])` succeeds with no rows — so
   the page said "the subgraph returned no disputes for court 34", which is a claim about the
   court. `hasReadableDisputes` in `useCourtPerformance.ts` now separates the two, and keeps
   building from rows already held when a *refetch* fails.
2. **The matrix branch dropped the only renderer of a dispute-read error.** `DisputeList` carries
   that notice and renders only on the fallback path, so a failed refetch left a stale court
   rendering as the complete record. The matrix branch now carries its own notice.
3. **`Panel n` and `‡ Lone panel` asserted something `panelSize` did not measure.** It counted
   roster matches, so one non-agent juror on a panel of two would have produced the sentence
   "decided by a panel of one" on a public page. `panelSize` is now every address the court drew;
   the cells stay roster-only, because the roster is the column set.
4. **Pills nested inside pills.** `DisputeRow` wraps the panel and flag slots in its own `Pill`,
   and the matrix passed a second one in — two borders, two paddings, the tone boxed inside a
   neutral hairline. The row's `Pill` is now the only one and takes a `$tone`; slots carry content.
5. **Merging rounds could label a live draw `NO VOTE`.** Groups were keyed on dispute and juror
   alone. Appealed, a juror committing in round 1 would be judged against round 0's closed vote
   period — and a round-0 reveal dated against round 1's clock is negative by hundreds of seconds,
   which fails the whole matrix. The key now includes the round, and the cell shows the latest.
6. **`{"data": null}` crashed instead of erroring cleanly** — the refactor's `=== undefined`
   guard let null through into a field read.
7. **The caveat described a matrix that might not be on the page.** It now has two forms.

**What the tests did not catch, and why.** Every one of these is a second read failing, a court
that is not this one, or a round that does not exist yet — states the fixtures cannot contain,
because the fixtures are a healthy court read once. Worth knowing before trusting a green suite
on the next ticket in this seam.
