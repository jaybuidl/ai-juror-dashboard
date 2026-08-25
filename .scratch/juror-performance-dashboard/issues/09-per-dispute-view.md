# 09: Read a whole panel's justifications for one dispute, side by side

**What to build:** A visitor clicks a dispute and reads every panel member's justification next to
each other, at its own URL they can paste into a chat. Comparing how different stacks reasoned about
identical evidence is the thing this experiment exists to show.

**Blocked by:** 04, 05, 07, 08, 15

**Design:** `../canvas/Dispute.dc.html` (the whole view — header and ruling card at `:51-85`, the
timeline strip at `:88-96`, the justification band at `:110-278`, the empty justification at
`:149-177`, the ordering rule at `:276`), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Each dispute has its own route, linkable and reloadable
- [ ] The view shows the dispute's title, question and ruling, and every draw in the panel
- [ ] The header identifies the dispute beyond its title — category, court, round, panel size and the
      period it is in — and links out to the dispute on chain
- [ ] The ruling card names the winning choice by number and in words, and gives the vote count for
      every choice, including choice `0` (refuse to arbitrate) and any choice with no votes
- [ ] The ruling card states that coherence on this page is measured against that ruling and nothing
      else
- [ ] A timeline strip covers the dispute's evidence, commit, vote and appeal periods. The commit, vote
      and appeal slots each carry their configured window and what actually elapsed, as two absolute
      durations and never as a ratio — see ADR-0005. The evidence slot carries its submission count
      instead, since no window governs it
- [ ] Justifications render side by side rather than one at a time, in columns of equal width and in
      roster order, with the whole panel visible at once — a panel is at most six, so there is no
      carousel and no pagination
- [ ] Coherence never reorders those columns: a diverged reading keeps its roster position and is never
      sorted last
- [ ] Each column's header carries that draw's identity and outcome — avatar, roster nickname, stack
      label, a coherence mark and the choice voted — with its reveal and commit latencies
- [ ] Each column's footer carries the justification's length and its format — Markdown, plain text, or
      the language it was written in — and, where the body is clipped to fit the column, a way to read
      it in full
- [ ] Justifications render as Markdown with GitHub-flavoured extensions
- [ ] Raw HTML is disabled at the parser — deliberately stricter than the Kleros court frontend, which
      enables it and sanitises afterwards
- [ ] A link inside a justification warns before navigating away
- [ ] A draw with no justification says so in its own column, rather than rendering as empty space, and
      states that the vote is on chain and counts in full and only the prose is absent
- [ ] That empty state reads as a field published empty, not as a failure: nothing was lost in transit,
      and it is distinct from both a failed read and a draw that never acted
- [ ] Justifications not written in English render correctly
- [ ] Long justifications remain readable; the longest in the data is nearly five thousand characters

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
