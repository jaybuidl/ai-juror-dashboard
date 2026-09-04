---
status: done
blocked_by: ["04", "05", "07", "08", "15"]
---

# 09: Read a whole panel's justifications for one dispute, side by side

**What to build:** A visitor clicks a dispute and reads every panel member's justification next to
each other, at its own URL they can paste into a chat. Comparing how different stacks reasoned about
identical evidence is the thing this experiment exists to show.

**Design:** `../canvas/Dispute.dc.html` (the whole view — header and ruling card at `:51-85`, the
timeline strip at `:88-96`, the justification band at `:110-278`, the empty justification at
`:149-177`, the ordering rule at `:276`), `../canvas/README.md` for provenance

- [x] Each dispute has its own route, linkable and reloadable
- [x] The view shows the dispute's title, question and ruling, and every draw in the panel
- [x] The header identifies the dispute beyond its title — category, court, round, panel size and the
      period it is in — and links out to the dispute on chain
- [x] The ruling card names the winning choice by number and in words, and gives the vote count for
      every choice, including choice `0` (refuse to arbitrate) and any choice with no votes
- [x] The ruling card states that coherence on this page is measured against that ruling and nothing
      else
- [x] A timeline strip covers the dispute's evidence, commit, vote and appeal periods. The commit, vote
      and appeal slots each carry their configured window and what actually elapsed, as two absolute
      durations and never as a ratio — see ADR-0005. The evidence slot carries its submission count
      instead, since no window governs it
- [x] Justifications render side by side rather than one at a time, in columns of equal width and in
      roster order, with the whole panel visible at once — a panel is at most six, so there is no
      carousel and no pagination
- [x] Coherence never reorders those columns: a diverged reading keeps its roster position and is never
      sorted last
- [x] Each column's header carries that draw's identity and outcome — avatar, roster nickname, stack
      label, a coherence mark and the choice voted — with its reveal and commit latencies
- [x] Each column's footer carries the justification's length and its format — Markdown, plain text, or
      the language it was written in — and, where the body is clipped to fit the column, a way to read
      it in full
- [x] Justifications render as Markdown with GitHub-flavoured extensions
- [x] Raw HTML is disabled at the parser — deliberately stricter than the Kleros court frontend, which
      enables it and sanitises afterwards
- [x] A link inside a justification warns before navigating away
- [x] A draw with no justification says so in its own column, rather than rendering as empty space, and
      states that the vote is on chain and counts in full and only the prose is absent
- [x] That empty state reads as a field published empty, not as a failure: nothing was lost in transit,
      and it is distinct from both a failed read and a draw that never acted
- [x] Justifications not written in English render correctly
- [x] Long justifications remain readable; the longest in the data is nearly five thousand characters

## From ticket 15: the chrome, the route and the breadcrumb are waiting

Add the route to `src/routes.tsx`, inside the existing layout route so the view cannot lose the
shell. The parent index it sits under already exists, which is what makes the breadcrumb honest.

Three things to reuse rather than rebuild:

- **`View`** (`src/chrome/View.tsx`) wraps the content in the page's measure and renders the
  provenance footer beneath it. Pass it a `Provenance` — what on this view is the measured record,
  the dispute range and moment read, the caveats, and whether the view shows an agent juror (it
  does, so the footer states they are identified by nickname, avatar and stack and never by who
  built them). Compose it in a `provenanceOf` function beside the component, as the other views do.
- **`Breadcrumb`** (`src/chrome/Breadcrumb.tsx`) takes `{ to, parent, current }` and is already
  tested. It renders the current item as text rather than a link to itself. **`current` must be the
  roster nickname or the dispute's own id — never the nickname ENS resolves.** `blaise` carries a
  `name` record reading "Blaise", and the route is keyed on the roster.
- **`isCurrent`** in `chrome/Nav.tsx` already keeps the parent destination marked while you are on a
  child route, so `/disputes/152` leaves "Disputes" active in the nav. There is a test for it; you
  need do nothing.

The 404 catches anything the route table does not match, so a bad id in the path is *not* a 404 —
it is a real route with an id that names nothing, and this view has to say so itself. Ticket 13 owns
what a failed *read* looks like; an id that does not exist is neither that nor a wrong URL.

## From ticket 08: the timeline strip's configured half is already in the model

`canvas/Dispute.dc.html:88-96` renders each period as *the period named, its configured duration,
then how long it in fact ran* — "45m configured · closed in 34m 23s". Ticket 08 supplies the first
of those two durations and nothing else needs fetching for it:

- **`MatrixRow.windows`** is a `PeriodWindows` — `evidenceSeconds`, `commitSeconds`, `voteSeconds`,
  `appealSeconds` — resolved from the court's own parameter history for **that** dispute, not from
  what the court holds now. It is `null` until the history is read, and `null` must render as an
  absent window rather than as the current one.
- **`formatWindowSeconds`** (`performance/latency.ts`) is how a window reads: `"8h"`, `"45m"`,
  `"1h 30m"`. Deliberately coarser than `formatLatencySeconds`, so a window and a measurement never
  look like the same quantity. Use it for the configured half and `formatLatencySeconds` for the
  elapsed half.

How long a period *actually* ran is the difference between two `DisputeRound` moments, which are
already on the model. Never divide one by the other, at any altitude — ADR-0005, and it is what the
whole of ticket 08 exists to keep possible. Two absolute durations, side by side.

One caveat this view inherits: a dispute carrying `underEarlierWindows` needs the `†` and its
account, the same as its matrix row. `/method#window` is written and is where the link goes.

## What landed, and the three things a later ticket needs from it

Built as `/disputes/:disputeId`, nested under the dispute index so the breadcrumb's parent and the
URL's parent are the same thing. Every row of the dispute index now links into it from its ID —
the ID and not the title, because a dispute whose template did not resolve would otherwise be the
one row nobody could open.

**The seam.** `src/performance/dispute-detail.ts` is the pure model: `toDisputeDetail` reads the
payload, `buildDisputeReading` joins it to the `MatrixRow`, the `Dispute` and the `DisputeTemplate`
the court-wide model already holds. It touches no network and reads no clock, exactly as
`buildCourtPerformance` does. `periodsOf` is where the timeline's two durations come from, and it
never divides one by the other.

**One new read, and it is per dispute.** `dispute-detail-subgraph.ts` asks for the ballot, the
evidence group and the draws-with-prose in one document. Per dispute rather than court-wide because
the prose is 124 KB across the court today, grows with every draw, and no other view shows a word
of it — and `courtDraws` is persisted to `localStorage`. `disputeDetail` is deliberately **not** in
the persisted allowlist, and `persistence.ts` records why on the third ground the others did not
raise: size.

Three things a later ticket inherits:

- **`Draw.choices`** is new on the court-wide model — every distinct choice a draw's vote IDs
  revealed, ascending, empty until it reveals. A list rather than a number because the seam has
  always had to reckon with vote IDs that disagree; ticket 11's per-agent-juror view wants the
  same field.
- **`DisputesView.templateFor`** returns the whole `DisputeTemplate`, beside `slotsFor`, which
  stays the row's two fields. The first cut of this view reconstructed a template from `slotsFor`
  and silently dropped the question and the choice names — the two things ticket 09 added.
- **`postSubgraphDocument`** in `disputes/subgraph.ts` returns the whole `data` object;
  `postSubgraphQuery` is now that plus the single-field check. Any read whose document has several
  root fields, or whose root field may legitimately be `null`, wants the first.

## What it cost to find

- **The evidence count has no schema behind it.** The deployed subgraph carries no link from a
  dispute to its evidence. Recorded in `docs/knowledge/chain-and-subgraph.md` in full, with the guard and the two live
  cross-checks that keep it honest.
- **Nothing clipped.** The overflow measurement decided whether to apply a cap and then applied it,
  so the measurement always ran against an unbounded element. Invisible in jsdom, where every
  height is zero, and obvious in a browser on dispute 154's 7,079-character justification.
- **The route 404'd while every test was green**, because the chrome tests run over the 404 too.
  There is now a test asserting something only this view says.

## Left for other tickets

- **16 (phone layout).** The columns are an `auto-fit` grid and wrap to one column, and the header
  and the timeline both collapse at `narrow` — but this view was checked at 1280px and not on a
  phone, and it is the widest thing this dashboard renders.
- **18 (accessibility).** The link in each row of the dispute index is named by its number alone.
  An `aria-label` was tried and reverted: it became the accessible name of the matrix `rowheader`
  around it and renamed 27 rows. The fix is a visually-hidden qualifier, which is that ticket's
  vocabulary rather than this one's.
- **The language label is a heuristic**, measured against this court's own record and set inside a
  gap in it (2.5% against a highest English score of 1.6%). It labels a column and is never
  counted. A court that starts publishing in a sixth language will need a sixth stopword column.
