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
production**, and § Traps records it as having been checked only by lowering that constant in a dev
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
`agent-jurors.ts`, `CONTEXT.md` and `CLAUDE.md`, which § Traps has a long entry about.

**Blocked by:** None (can start immediately)

**Design:** `Mobile.dc.html` draws the card and its strip at 390pt with six slots; it draws no
seventh and no wrap, so the per-line count and the gap between lines are arithmetic against the
artboard's 52px slot and 36px avatar rather than cited from it. `MatrixDense.dc.html` draws the
compact grid at six columns, so the same applies to the share arithmetic. This is the § Traps rule
about finding the artboard that draws the element in that place: for a seventh column and a second
line there is none.

**Status:** ready-for-agent

- [ ] `grokleros` is in `ROSTER` with the checksummed address, stack `Grok Bot`, appended to the
      right of the drawn columns
- [ ] The live ENS suite passes: `grokleros.agents.kleroslabs.eth` forward-resolves to that address
      and the roster check covers seven
- [ ] Nothing in the seam is keyed on a roster length: `yarn test` is green with seven entries
- [ ] The phone strip wraps at six slots per line, and a browser at 390pt confirms every one of the
      seven is visible on every card
- [ ] A test pins that no slot is dropped when the roster exceeds one line's worth — the failure
      being fixed here is a silent clip, so it needs an assertion of its own
- [ ] Below 352pt nothing vanishes, which is the property the existing `min()` floor exists to hold
- [ ] The compact grid's row-header and column shares derive from the roster's length and sum to
      100% at seven, and `COMPACT_GRID_MIN_PX` follows
- [ ] A browser at 1440pt confirms the compact row header is rendered at the width it declares —
      `getComputedStyle` cannot answer this
- [ ] The compact density is read in a browser with the court's real 46 disputes, and anything it
      shows that the dev-server check missed is recorded here
- [ ] The four dynamic count strings read `ROSTER.length`; `index.html`'s meta description and
      `Hero.tsx`'s deck carry no number at all
- [ ] The four literal-6 test assertions read `ROSTER.length`, and the redundant one beneath a
      correct assertion is removed rather than updated
- [ ] `performance.test.ts`'s roster-order literal is updated by hand, and still fails loudly if
      the order changes
- [ ] No **live** document, comment or glossary entry claims baskerville has never been drawn, has
      no on-chain presence, or has a column empty end to end — "live" as scoped under Comments
- [ ] The nine design-premise sites listed under Comments are rewritten as reasoning, not renumbered
- [ ] `density.ts`'s comment no longer says the compact threshold is one "the court has not reached
      yet", and `docs/accessibility.md` no longer says the live court cannot reach it
- [ ] `agent-jurors.ts`'s ordering rationale is rewritten as a rule that survives — undrawn columns
      rightmost, append right of the drawn ones, never left of one — rather than as a fact about
      baskerville
- [ ] `CONTEXT.md`'s **Roster**, **Matrix** and **Panel** entries are correct, with **Panel**'s
      warning given an example that is not baskerville
- [ ] `CLAUDE.md` § Verified constants and § Traps record 46 disputes over 151–196, seven agent
      jurors, baskerville's draws, and that the compact density is live rather than unreached
- [ ] The spec's remaining design-time counts are either corrected or marked as the design-time
      capture they are; user story 21 survives
- [ ] `AgentJurorEmpty.tsx` is kept, with a comment saying which state it serves now that no agent
      juror is undrawn
- [ ] Every doc comment arguing from six is read individually, and the six *figures* per agent
      juror are left alone
- [ ] Closed issue files, ADR evidence and canvas sample data are **not** edited — see Comments for
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
