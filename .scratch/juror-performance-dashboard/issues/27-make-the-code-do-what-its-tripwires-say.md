# 27: Make the code do what its own tripwires say

**What to build:** Four places where this repo states a rule and then does the other thing. Each
was found by auditing the tripwires rather than by using the dashboard, which is the point: every
one of them passes lint, types and 863 tests today, and two of them are asserted to be fixed in
prose that a reader would believe.

The first two are live accessibility defects. They are also the reason two entries are still in
`CLAUDE.md` after the September cut that moved fifty-nine others to the code sites they guard: a
tripwire whose mistake is currently in the tree is not redundant, so those two lines cannot leave
until this ticket lands. Finishing this ticket therefore removes them, and the acceptance criteria
say so.

## 1. The matrix uses the caption shape its own tripwire forbids

`Matrix.tsx` renders `<VisuallyHidden as="caption">`. `VisuallyHidden` is `position: absolute`,
which computes the element away from `display: table-caption`, and several browser and
screen-reader pairs then drop it from the table's accessible name — so the element added to name
the grid stops naming it. `AgentJurorDraws.tsx` has the correct shape: a real `<caption>` with a
`VisuallyHidden` *inside* it.

Three things currently assert this is already fixed, and all three are wrong:

- `AgentJurorDraws.tsx`'s own comment, sitting on the correct implementation, ends "Ticket 18; the
  matrix carries the same." It does not.
- `docs/accessibility.md:221` says "Both tables now hide from inside a real caption."
- `Matrix.test.tsx`'s "gives the grid a name of its own" passes, because `dom-accessibility-api`
  computes the name either way. That the test cannot see this is exactly what the tripwire says.

Git shows this as a half-finished sweep rather than a stale doc: `64e3906` introduced `as="caption"`
on both tables, `1904247` fixed only `AgentJurorDraws`.

Fixing the markup is small. The work is that **jsdom cannot confirm the fix**, so it needs a
browser and a screen reader, and the two prose claims above have to be corrected in the same pass
rather than left to describe the old state.

## 2. `DisputeCards` suppresses an outline that was never the ring

The design system's focus ring is `outline: none` **plus** a `--ring-focus` box-shadow
(`kleros-ai` `base.css`). `DisputeCards.tsx` writes `&:focus-visible { outline: none; }` on its own
and then draws its intended ring with `:focus-visible::after`, so the system's box-shadow is still
painted on the link text inside the card: two rings, one focus. `DisputeList.tsx` and `View.tsx`
both document and avoid this; `DisputeCards` is the site that did not get the note.

No test asserts `boxShadow` anywhere, and jsdom would not show it. Confirm in a browser before and
after — this is the one item here whose severity should be checked rather than assumed.

## 3. Three comments count shifts and say the draw count

The captured court holds **56 draws** and **44 executed shifts** — thirteen of sixteen disputes
executed, the other twelve draws sitting in disputes 164–166 which were still in `appeal`.
`totals.test.ts` states the reconciliation and asserts `paidDraws` is 44;
`court-34-rewards.fixture.json` holds 44 entries.

Three places say 56 where they mean the shift count:

- `src/performance/rewards-subgraph.ts:20` — "The court had produced 56 on 2026-08-25"
- `src/performance/rewards-subgraph.ts:36` — "all 56 shifts this court has produced"
- `docs/knowledge/chain-and-subgraph.md:49` — "All 56 of court 34's payouts carry it"

**Do not sweep every "56" in the repo.** `cell.ts`, `MatrixPage.tsx` and
`react-query-and-persistence.md` also say 56 and are *correct*, because they count cells and draws.
The distinction between the two numbers is the thing being repaired; a search-and-replace would
destroy it.

The page rendering is unaffected — `rewards-subgraph.ts:20` is a page-size comment on a query that
pages correctly regardless — so this is a comment correction, not a behaviour change. It earns its
place here because the wrong number sits in the file an agent opens first when reading about
rewards, and one of the two sites is the reasoning for a guard.

## 4. The repo's own `preview` script trips a tripwire in `CLAUDE.md`

`package.json` has `"preview": "vite preview"` with no `--strictPort`, and `README.md` documents it
without qualification. Vite silently moves port when one is in use, so an agent following the
README's own script table gets the silent port move the tripwire warns about — and may then read a
different worktree's branch and believe it is this one. Add `--strictPort` to the script.

Note this does not let the tripwire leave `CLAUDE.md`: `package.json` admits no comments, so the
warning still has nowhere to live. Fixing the script removes the trap from the happy path; the line
stays for the person who types `vite preview` by hand.

**Blocked by:** none

**Design:** No artboard. Items 1 and 2 are conformance against WCAG and against the vendored design
system's own focus ring (`--ring-focus` in `kleros-ai` `base.css`), not against a drawing; items 3
and 4 are a comment and a script.

**Status:** ready-for-agent

- [ ] `Matrix.tsx` uses a real `<caption>` with a `VisuallyHidden` inside it, matching
      `AgentJurorDraws.tsx`
- [ ] The matrix's accessible name is confirmed in a browser with a screen reader, at both
      densities — not by `Matrix.test.tsx`, which passes either way
- [ ] `AgentJurorDraws.tsx`'s comment no longer claims the matrix carries the same shape, or is
      true when it says so
- [ ] `docs/accessibility.md:221` states what is actually true of both tables
- [ ] `DisputeCards.tsx` suppresses `box-shadow` as well as `outline` on `:focus-visible`, or the
      double ring is shown in a browser not to occur and the ticket records why
- [ ] A card's focus appearance is checked in a browser at phone width, keyboard-only
- [ ] The three shift-count comments say 44, and the sentence still distinguishes shifts from the
      56 draws rather than just swapping a number
- [ ] No "56" that refers to draws or cells has been changed — `cell.ts`, `MatrixPage.tsx` and
      `react-query-and-persistence.md` are untouched
- [ ] `yarn preview` uses `--strictPort`, and `README.md`'s script table says what that buys
- [ ] The `<caption>` and `outline: none` entries are removed from `CLAUDE.md` § Tripwires — they
      are there only because these two defects are live, and the file is budgeted at 155 lines
- [ ] `yarn verify` is green, and the browser checks above are reported with what was seen, not
      with "no change observed"
