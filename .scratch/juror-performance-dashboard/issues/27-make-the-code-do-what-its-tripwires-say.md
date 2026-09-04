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

**Status:** done

- [x] `Matrix.tsx` uses a real `<caption>` with a `VisuallyHidden` inside it, matching
      `AgentJurorDraws.tsx`
- [x] The matrix's accessible name is confirmed in a browser with a screen reader, at both
      densities — not by `Matrix.test.tsx`, which passes either way
- [x] `AgentJurorDraws.tsx`'s comment no longer claims the matrix carries the same shape, or is
      true when it says so
- [x] `docs/accessibility.md:221` states what is actually true of both tables
- [x] `DisputeCards.tsx` suppresses `box-shadow` as well as `outline` on `:focus-visible`, or the
      double ring is shown in a browser not to occur and the ticket records why
- [x] A card's focus appearance is checked in a browser at phone width, keyboard-only
- [x] The three shift-count comments say 44, and the sentence still distinguishes shifts from the
      56 draws rather than just swapping a number
- [x] No "56" that refers to draws or cells has been changed — `cell.ts`, `MatrixPage.tsx` and
      `react-query-and-persistence.md` are untouched
- [x] `yarn preview` uses `--strictPort`, and `README.md`'s script table says what that buys
- [x] The `<caption>` and `outline: none` entries are removed from `CLAUDE.md` § Tripwires — they
      are there only because these two defects are live, and the file is budgeted at 155 lines
- [x] `yarn verify` is green, and the browser checks above are reported with what was seen, not
      with "no change observed"


## Comments

**The caption fix is right, and Chrome could not show it failing.** Measured in system Chrome
against the dev server, reverting `Matrix.tsx` to `HEAD` between reads. The mechanism the tripwire
describes is real and visible in the computed style — before, the caption computed
`position: absolute` and `display: block`, blockified clean away from `table-caption`; after, it is
`position: static`, `display: table-caption`, with the `VisuallyHidden` span inside. But Chrome's
own accessibility tree gave the table **the identical accessible name in both states**, at both
densities. So the defect does not manifest in Chrome/macOS, and the severity claim in this ticket's
body — "several browser and screen-reader pairs then drop it" — is not one this session could
demonstrate. The fix stands on the computed-style evidence and on matching `AgentJurorDraws`; what
is still unverified is VoiceOver and NVDA announcement, which needs a person at a screen reader.
Reported rather than claimed.

Both densities were read because the live court is past `COMPACT_FROM_ROWS` and has no toggle:
`density.ts`'s threshold was raised to 400 for one read and restored, which is the only way to see
the comfortable grid with real data at 46 disputes.

**The double ring was real, and the numbers are these.** At 390×844, keyboard-focused, first
dispute card link. Before, the link carried `rgb(8, 6, 15) 0 0 0 2px, rgba(77, 223, 216, 0.55) 0 0
0 4px` — the system's `--ring-focus`, a page-coloured spacer and a cyan halo drawn tight around the
link text — *while* `::after` drew the intended `rgba(77, 223, 216, 0.55) solid 2px` around the
whole card. Two rings, one focus, exactly as `DisputeList.tsx` predicted. After, the link's
`box-shadow` computes `none` and only the card ring remains. This is the item the ticket said to
measure rather than assume; it measured.

**`--strictPort` demonstrated, not just added.** With 4173 held by another socket, `yarn preview`
now exits 1 with "Port 4173 is already in use" instead of serving a different port in silence.

**One pre-existing axe violation found and deliberately not fixed here.** An audit at
`wcag2a,wcag2aa` returns exactly one violation on `/`: `link-in-text-block` on
`Footnotes.tsx:170`'s "What that means for these figures" link to `/method#window`, at 1.21:1
against its surrounding prose where 3:1 is the minimum, with no non-colour styling to distinguish
it. It is outside this ticket — `Footnotes.tsx` is not in this diff. It is a link sitting at the end
of a sentence of body prose, which is the shape the rule is about, and the footnote's surrounding
prose was reworked in `9e69dc8`, `cf72fea` and `269d49b`, all after ticket 18's sweep at `5e8337b`
reported zero violations on seven routes. Whether that is what turned it into a text-block link is
not established here — only that the violation is live today and the sweep that cleared the page
predates those commits. **Opened as ticket 28**, and recorded in `docs/accessibility.md` — a
finding that lives only in the comments of a closed ticket is invisible to the `grep` that
enumerates open work, which a `/code-review` over this diff pointed out before it became true. The other 187 nodes axe reported are `incomplete`, not violations:
gradient and overlap backgrounds it cannot resolve, which is the reason a green axe run was never
the sweep.

**A regression guard was added, which the ticket did not ask for and the defect argues for.** This
shape regressed silently and stayed wrong through a whole sweep because nothing pinned it: the
existing "gives the grid a name of its own" passes either way, and so does Chrome. But jsdom *can*
see the markup, so `Matrix.test.tsx` now also asserts the caption is the table's first child and
holds its hidden span **inside**. Confirmed discriminating by reverting `Matrix.tsx` to `HEAD` and
watching it go red, then restoring. The load-bearing assertion is the inner span, not the tag name:
`VisuallyHidden as="caption"` renders a real `<caption>` element too, so the tag was true of the
broken shape all along — which is most of why no test caught this. That is written on the
assertion, so nobody prunes it as a duplicate of the line above it.

**One stale citation fixed in passing, and more left.** `rewards-subgraph.ts` pointed at
`CLAUDE.md` for the `blockTimestamp: "0x0"` trap, which the September cut moved to
`docs/knowledge/chain-and-subgraph.md:15`; it is repointed, since it sits in the same comment this
ticket was already correcting. Nine other bare `CLAUDE.md` citations remain in `src/` and they are
**not** uniformly stale — `read-failure.ts:87` still resolves, because the rate-limit tripwire is
one of the sixteen that stayed — while `liveness.ts:88` does not, because the epoch-zero trap left.
Telling them apart is a file-by-file read and wants its own ticket, not a sweep here.

**What the review changed.** A `/code-review` over this diff raised two, both real. The regression
guard's last assertion was `querySelector("span") !== null`, which pins that *a* span exists rather
than that it hides — a plain unstyled span would have passed while drawing the caption's sentence
as visible text above the grid, the opposite defect. It now identifies the hider by
`VisuallyHidden.styledComponentId` and separately asserts the caption itself is not positioned,
and both were confirmed to fail against both broken shapes. The second was the invisible finding
above, now ticket 28.
