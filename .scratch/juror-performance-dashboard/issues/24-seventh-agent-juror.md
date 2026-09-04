# 24: Be correct about the court — the seventh agent juror

**What to build:** The dashboard measures the court it is actually looking at.

A seventh agent juror has been running in court 34 since before this ticket was written. `grokleros`
— `0x93Aa2f8e5cE8288d57F8785F5a40A60A42fD925e`, stack `Grok Bot`, ENS
`grokleros.agents.kleroslabs.eth` — holds four vote IDs across three disputes today, and the roster
does not know it exists. Because `performance.ts:924` maps a row's cells over `raw.roster`, those
draws have no cell, no column and no entry in the commit-coverage counter: they are dropped before
any figure is computed, with no error and no caveat. The page reports six of seven and says nothing.
Nobody found this from the suite; it was found by asking the chain.

Two further facts about the court came out of the same read and each falsifies something written
down here.

**baskerville has been drawn** — 14 vote IDs across 8 disputes. "The agent juror the court has never
drawn" was load-bearing, not decorative: `agent-jurors.ts:48-49` places baskerville last *because*
"its matrix column is empty end to end, and an empty column mid-grid reads as missing data rather
than as the sparsity random draws produce", and `CONTEXT.md`'s **Matrix** entry says the same. No
roster column is empty end to end now, so the placement is fine and its stated reason is false —
which is the harder half to fix, because a number can be updated and a premise has to be rewritten.

**The court holds 46 disputes, not 31** — ids 151 to 196, 42 ruled, 4 in appeal, 226 draw records.
That matters beyond currency: `COMPACT_FROM_ROWS` is 40, so **the compact density is live in
production**, and `docs/knowledge/testing.md` records it as having been checked only by lowering that constant in a dev
server. This ticket is the first pass that will look at it with real data.

Three things break at seven, and all three break quietly.

The **phone** is the worst of them. `SLOT_WIDTH` is `min(52px, calc((100vw - 40px) / 6))`, a
hard-coded six, and the doc comment above it explains what happens when a slot does not fit: the
card "clips its own overflow to keep its corners" so the slot "simply *vanished* — silently, with
nothing in the console, breaking the one property this file calls non-negotiable". Seven 52px slots
are 364px inside a 350px card. So adding grokleros to the roster **drops an agent juror from every
card on every phone**, and the failure looks like nothing at all. The fix is the wrap: six slots per
line, so seven is 6+1 and nine is 6+3, with fixed slot widths and elastic gaps as now, and position
stable card to card — slot *k* always at line ⌊k/6⌋, position *k* mod 6. Seven would also have fitted
on one line at 50px by changing only the divisor, but the two agent jurors after this one arrive
within the week and reworking the strip twice is churn. Keep the `min()` floor's property: below
about 352pt nothing may vanish.

The **compact grid** is the second. `Matrix.tsx:109-110` sizes it as a `40%` row header plus `10%`
per column — arithmetic that sums to 100% at exactly six and 110% at seven, at which point the
browser silently rescales everything and the declared 440px header becomes about 387px. That is this
repo's own trap: `getComputedStyle` reports what was asked and `getBoundingClientRect` what was
given, and the gap between them is silent. `COMPACT_GRID_MIN_PX` (1064, being `440 + 6 × 104`) has
the same shape. Both derive from the roster's length here. The *comfortable* grid's equivalents and
the density switch belong to ticket 25 — this ticket takes only what is already wrong on a live
page.

The third is **prose**, and it is most of the work. Six rendered strings state the count, including
`index.html`'s `<meta name="description">`, which is what search results and social previews show
and which no compiler or test will ever check. Four read `ROSTER.length` instead; the meta
description and `Hero.tsx`'s deck drop the number rather than maintain it, because a count in a
sentence that has no reason to carry one is a maintenance cost with no reader benefit. Four test
assertions hard-code 6, one of them (`DisputeCards.test.tsx:131`) sitting directly beneath a correct
`ROSTER.length` assertion of the same thing.

Then there are dozens of **doc comments** arguing from six as a design rationale. They change no
behaviour and they are the repo's reasoning, so they get read rather than swept. Three cases must
not be replaced, and a global substitution gets all three wrong:

- There is a **second six** in this codebase — the six *figures* per agent juror: median reveal,
  median commit, coherence, cumulative ETH, net PNK, draws. It stays six at any roster size.
  `Marginals.tsx`, `marginal-figures.ts`, `AgentJurorSummary.tsx` and `StatTiles.tsx` are full of
  it, and `StatTiles.tsx`'s "/6" is illustrative in a comment beside a figure that is already
  dynamic.
- `CONTEXT.md`'s **Panel** entry says "panel size has never exceeded the roster". Still true — a
  panel is about five vote IDs — but the sentence exists to warn against conflating the two
  quantities, and it now needs an example that is not baskerville.
- The spec's user story 21, "an agent juror that has never been drawn to still appear", is a
  live requirement even though no agent juror currently exemplifies it. `AgentJurorEmpty.tsx`
  **stays** for the same reason: it is the state every future agent juror occupies between joining
  the roster and being drawn, which is a window this roster will now be in repeatedly. Say so in
  the file, or someone will delete it as dead code.

This is one ticket and not four because every part of it is the same claim — that the dashboard's
account of the court matches the court — and because splitting it means two branches editing
`agent-jurors.ts`, `CONTEXT.md` and `CLAUDE.md`, which `docs/knowledge/merging-and-branches.md` has a long entry about.

**Blocked by:** None (can start immediately)

**Design:** `Mobile.dc.html` draws the card and its strip at 390pt with six slots; it draws no
seventh and no wrap, so the per-line count and the gap between lines are arithmetic against the
artboard's 52px slot and 36px avatar rather than cited from it. `MatrixDense.dc.html` draws the
compact grid at six columns, so the same applies to the share arithmetic. This is the `docs/knowledge/architecture.md` rule
about finding the artboard that draws the element in that place: for a seventh column and a second
line there is none.

**Status:** done

- [x] `grokleros` is in `ROSTER` with the checksummed address, stack `Grok Bot`, appended to the
      right of the drawn columns
- [x] The live ENS suite passes: `grokleros.agents.kleroslabs.eth` forward-resolves to that address
      and the roster check covers seven
- [x] Nothing in the seam is keyed on a roster length: `yarn test` is green with seven entries
- [x] The phone strip wraps at six slots per line, and a browser at 390pt confirms every one of the
      seven is visible on every card
- [x] A test pins that no slot is dropped when the roster exceeds one line's worth — the failure
      being fixed here is a silent clip, so it needs an assertion of its own
- [x] Below 352pt nothing vanishes, which is the property the existing `min()` floor exists to hold
- [x] The compact grid's row-header and column shares derive from the roster's length and sum to
      100% at seven, and `COMPACT_GRID_MIN_PX` follows
- [x] A browser at 1440pt confirms the compact row header is rendered at the width it declares —
      `getComputedStyle` cannot answer this
- [x] The compact density is read in a browser with the court's real 46 disputes, and anything it
      shows that the dev-server check missed is recorded here
- [x] The four dynamic count strings read `ROSTER.length`; `index.html`'s meta description and
      `Hero.tsx`'s deck carry no number at all
- [x] The four literal-6 test assertions read `ROSTER.length`, and the redundant one beneath a
      correct assertion is removed rather than updated
- [x] `performance.test.ts`'s roster-order literal is updated by hand, and still fails loudly if
      the order changes
- [x] No **live** document, comment or glossary entry claims baskerville has never been drawn, has
      no on-chain presence, or has a column empty end to end — "live" as scoped under Comments
- [x] The nine design-premise sites listed under Comments are rewritten as reasoning, not renumbered
- [x] `density.ts`'s comment no longer says the compact threshold is one "the court has not reached
      yet", and `docs/accessibility.md` no longer says the live court cannot reach it
- [x] `agent-jurors.ts`'s ordering rationale is rewritten as a rule that survives — undrawn columns
      rightmost, append right of the drawn ones, never left of one — rather than as a fact about
      baskerville
- [x] `CONTEXT.md`'s **Roster**, **Matrix** and **Panel** entries are correct, with **Panel**'s
      warning given an example that is not baskerville
- [x] `docs/knowledge/court-34.md` and `docs/knowledge/ens-and-roster.md` record 46 disputes over 151–196, seven agent
      jurors, baskerville's draws, and that the compact density is live rather than unreached
- [x] The spec's remaining design-time counts are either corrected or marked as the design-time
      capture they are; user story 21 survives
- [x] `AgentJurorEmpty.tsx` is kept, with a comment saying which state it serves now that no agent
      juror is undrawn
- [x] Every doc comment arguing from six is read individually, and the six *figures* per agent
      juror are left alone
- [x] Closed issue files, ADR evidence and canvas sample data are **not** edited — see Comments for
      why, and for the two exceptions that are

## Comments

**2026-09-03 — the stale-fact inventory, and what is *not* in scope.** A sweep found roughly a
hundred sites across the repo asserting one of four now-false claims: baskerville never drawn, the
court holding 13 or 31 disputes, the compact density being unreachable, and the roster holding six.
The volume is misleading, because most of it must be left alone. The sweep is scoped as follows.

**In scope** — anything that describes the dashboard or the court *as it is now*:

- `CLAUDE.md` — the never-drawn claims at :33, :387-388, :719, :958; the counts at :342-343, :387,
  :559, :939-940, :950; the compact-density claim at :598-600.
- `CONTEXT.md` — :14, :33-34 (**Roster**), :162-163 (**Matrix**), and **Panel**'s example.
- `README.md` — :3, :19, :54.
- `docs/accessibility.md:231-233` — says the live court cannot reach the compact density.
- `src/**` doc comments describing current behaviour — about twenty-five of them, including
  `density.ts:34-36`, `totals.ts:146/257/285/604`, `marginal-figures.ts:194/238-239`,
  `Matrix.tsx:941/949/955`, `StatTiles.tsx:17-18`, `AgentJurorsPage.tsx:15/19`,
  `AgentJurorPage.tsx:33/536-537`, `agent-juror-detail.ts:42`, `performance.ts:773`,
  `dispute-detail.ts:225`.
- Test doc comments that state the fixture's shape as a fact about the court rather than about the
  fixture — `totals.test.ts:24/28`, `performance.test.ts:21/24/582`, `disputes.test.ts:6`.

**Out of scope, deliberately** — three categories that are records rather than claims, and editing
them destroys the record:

- **Closed issue files.** Tickets 02, 05, 06, 07, 11, 13, 15, 16, 17 and 18 all count disputes or
  name baskerville as never drawn. Each was true when written and is a dated account of why
  something was built. Rewriting a `done` ticket to match today makes the tracker lie about its own
  history.
- **ADR evidence.** `0002` cites "the 61 votes in court 34 collapse to 44 draws" and `0006` cites
  "34 of 78 cells" as the measurements the decision rested on. An ADR is a dated decision; its
  evidence is not a live figure.
- **Canvas sample data.** `CLAUDE.md` already rules that "the canvas wins" does not extend to its
  data, "which is largely sampled". `Main.dc.html:65`, `Cell.dc.html:112/140/166` and the rest are
  mockup values, and `canvas/README.md` is the file that says which figures are real.

**Two exceptions inside those categories**, because they assert permanence rather than record a
measurement, and a future reader would build on them:

- `canvas/DESIGN_PROMPT.md:116-117` — "One agent (`baskerville`) has never been drawn, so its
  **entire column is empty**. This sparsity is permanent." The word is "permanent" and it was wrong.
- `canvas/README.md:112` and `canvas.json:117` list "baskerville never drawn" among the **measured**
  facts, which is the one list on the canvas that claims to be real rather than sampled.

**The design-premise set.** Nine sites do not state a number — they *reason* from exactly one roster
member being permanently undrawn, so a figure swap leaves them incoherent:

1. `src/roster/agent-jurors.ts:47-53` — the entire justification for baskerville's column position.
2. `src/performance/Matrix.tsx:948-949` — frames "the day baskerville is drawn for the first time"
   as a future event this dashboard exists to record. It has happened, eight times.
3. `src/performance/AgentJurorEmpty.tsx:8-9,18,30,35` — the component's premise, including the
   dropped "It is staked" clause, which was dropped *because* baskerville had never staked.
4. `CLAUDE.md:33` and `README.md:54` — an honest empty state for "the agent juror the court has
   never drawn", written as a durable property of one specific agent juror rather than a capability.
5. `spec.md:48` — user story 21, which survives as a requirement; its concrete instance does not.
6. `canvas/DESIGN_PROMPT.md:116-117`, above.
7. `issues/17:114-116` — an acceptance criterion asserting the undrawn column persists as the court
   grows, falsified by the growth it anticipated. Historical: record, do not edit.
8. `issues/06:229-234` — a bug narrative anchored on "the first dispute baskerville is ever drawn
   in". Historical: record, do not edit.
9. `issues/11:368-369` — the reasoning behind dropping a UI clause. Historical, but
   `AgentJurorEmpty.tsx` inherits it and that file is in scope.

The rule the sweep runs on: **a sentence describing the dashboard today gets corrected; a sentence
recording why a decision was made gets left alone.** Where the two are the same sentence, correct
the live copy and leave the record.

**2026-09-04 — shipped, and what the browser reads found that no test could.** Every box above is
ticked; the four acceptance criteria that say "in a browser" were read in Chrome against the live
court at 46 disputes, not inferred.

**The court, re-read on the day of the work.** 46 disputes over ids 151–196 with no gaps, 226 draw
records, seven distinct jurors drawn — and, unlike the day this ticket was written, all 46 ruled and
in `execution` rather than 42 ruled and 4 in appeal. grokleros forward-resolves from
`grokleros.agents.kleroslabs.eth` to the checksummed address above, and the live ENS suite passes at
seven. baskerville: 14 vote IDs across 8 disputes, as stated.

**The phone strip wraps, and the floor was 2px wrong the whole time.** Six tracks fixed at the slot
width, spread by `justify-content`, so slot *k* is at line ⌊k/6⌋ position *k* mod 6 — read at 390pt
as x = 21, 80, 139, 199, 258, 317 with the seventh back at 21 on a second line, identical on all 46
cards. It is a grid rather than a wrapping flex row because `flex-wrap: wrap` with `space-between`
puts an *eighth* slot flush right, at position 5 on a line where it belongs at position 1 — nine
agent jurors would have re-broken the property this ticket restores.

Checking the `min()` floor at 320pt found the sixth slot overhanging its card by **0.94px** and
being clipped by it. The second term subtracted the page's 40px of gutters and not the card's own
1px border either side, so it had always been 2px optimistic — wrong for six slots before it was
wrong for seven, and invisible to `getComputedStyle`, which reported the declared width being
honoured exactly. What was short was the box it was declared against. Now `100vw - 42px`; verified
at 430, 390, 356, 354, 352, 340, 320 and 300pt: seven slots, two lines, one width, nothing clipped,
nothing without a box. The flat-52px threshold moves from ~352pt to ~354pt.

**The compact grid.** Shares are `40%` and `(100 - 40) / ROSTER.length`, read at 1440pt as a 537.63px
row header *asked for and given*, seven columns at 115.19px, 1344px of table accounted for exactly.
322 body cells, none overflowing; the widest rendered run is 56px inside a 100px column at the
narrowest the grid ever gets.

**Two constants the ticket did not name had to follow, and saying so plainly.** `COMPACT_GRID_MIN_PX`
and `breakpoints.compactGrid` are two expressions of one number: held at 1160 while the grid widened
to 1168, there would have been a band of viewports above the breakpoint — so with the scroll box
gone — and still narrower than the grid. Nothing scrolls and nothing warns there; the columns are
simply crushed. Both now derive from `ROSTER.length`, and the handoff was read at 1266/1264/1260:
the box turns into a scroll container at exactly the width the table stops fitting.

`COMFORTABLE_GRID_MIN_PX` is ticket 25's by the split in this ticket, and it is derived here anyway,
for one reason: left at 1328 it would sit *below* the 1476 its own columns declare, which is the
silent rescale this ticket exists to remove, newly introduced by the seventh entry. Nothing else of
the comfortable density is touched — the page container, the density switch and the unknown-juror
caveat are still 25's. `MatrixPage`'s grid measure followed on its own, because it already read the
constant.

**Found while verifying, not fixed here.** `dispute-detail.integration` asks the DRT subgraph for
evidence groups for all 46 disputes and gets 45 — the "reads that come back short" tripwire firing
correctly on live data. Not caused by this ticket (no non-comment change in that path) and not
diagnosed here. The two `court-parameters` failures are ticket 19, and `draws-subgraph` is the
documented Arbitrum per-call rate limit.

**One rendered claim was false in general and is now narrower.** `AgentJurorEmpty` said "an agent
juror with no draws has no on-chain presence at all", which was true of baskerville — it had never
staked either — and is not true of an agent juror that staked and has simply not been drawn. This
dashboard reads no stakes, so it was never in a position to say it. It now says the narrower thing
that was always the point: nothing on the page came back from a query.

**What is still unverified.** Nothing here was read by a screen reader, and the compact density's
frozen header was checked for `position: sticky` and its scroll-container handoff, not for how it
announces. `AgentJurorEmpty` renders for nobody today, so its copy was reasoned about rather than
seen — the next agent juror to join is the first reader of it.

**2026-09-04 — what review found, and the one that mattered.** Six findings; two were real defects
and four were stale words.

**The compact grid was described twice and the two descriptions disagreed.** `breakpoints.ts`
counted pixels — a floor of `440 + n × 104` — and `Matrix.tsx` counted percentages, `40%` and the
remainder over the roster. Both were internally correct and they were not the same grid: at the
floor the row header took 467px of the 440 the floor was built from, leaving each column 100px of
the 104. The first version of the share test asserted the sum came to 100% and the header asked for
40%, and it was green over exactly that. **A sum is not a model.** The shares are now the pixel
model normalised — the same numerators over the same total — so they sum to 1 by construction, the
floor hands out precisely the widths it is the sum of, and there is one description of this grid
instead of two. Read at 1264pt: header asked 440.031px, given 440.03; columns 103.98; no cell
overflowing. The test now applies the rendered shares to the declared floor and requires the pixel
model back, and it was confirmed red against the `40%` version by 27.2px.

The alternative was to keep `40%` and raise the floor to `max(440/0.4, 104n/0.6)` — 1213px, and a
breakpoint at 1309. It was rejected: it costs the frozen header on every 1280-wide screen, and the
browser read says the 104px column is a rounded design allowance rather than a measured minimum —
322 cells at 100px, none overflowing, widest run 56px.

**A sentence on a page this ticket never opened.** `DisputePanel` rendered "The panel is at most
six" under the panel columns on every `/disputes/:id`. The layout was never sized against it
(`repeat(auto-fit, minmax(…))`), so only the sentence was wrong — which is this repo's own tripwire
firing in the widening direction, and the reason `CONTEXT.md`'s Panel entry says what it says. The
claim now rests on what is actually true: a panel is a handful of vote IDs and has never exceeded
the roster.

Four smaller ones, all fixed: `package.json`'s description still said six where `index.html`'s had
been fixed in the same pass; `View.tsx` and `Matrix.tsx` carried comments explaining derived widths
as "six 148px columns" and "the five beside it", which re-seed the literal this ticket removed;
three test titles asserted six over bodies that correctly read `ROSTER.length`; and one new
assertion — `not.toContain("/ 7)")` — would have inverted and failed on correct code the day an
agent juror left, which is the one moment a spurious second failure is least welcome.
