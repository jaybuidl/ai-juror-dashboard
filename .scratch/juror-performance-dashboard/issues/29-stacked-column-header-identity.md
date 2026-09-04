# 29: Stack the column header's identity block

**What to build:** The matrix's column header puts each agent juror's avatar **above** the nickname
rather than beside it, so the nickname gets the whole column and stops being clipped.

The header draws a 26px avatar, an 8px gap, then the nickname with `text-overflow: ellipsis` on
whatever is left. At the compact density — which is what production has served since the court's
fortieth dispute — a column is about 107px and its content box about 83px, so the nickname is left
roughly 46px. `daemonhill` renders as "daemon…" and `baskerville` as "baskerv…": two of the seven
agent jurors cannot be identified from the header of their own column, on the one row of the grid
whose whole job is to say which column belongs to whom.

Stacking recovers the 34px the avatar and its gap take. Every nickname the roster holds today fits
in 83px, so the clipping goes without buying a single pixel of width — which is the point, because
ticket 25 forbids taking width from the 440px row header and no artboard draws a column wider than
148px. The nickname keeps `white-space: nowrap` and its ellipsis: a nickname that wraps to two lines
would put the six figures below it on two different baselines across the header, which is the one
comparison a block of marginals exists to allow, and it is the failure ticket 06 met and `AgentStack`
still reserves two lines against.

The avatar goes to **44px at `radiusTile`**, which is what `Roster.tsx:54-62` already declares for
the roster card. That is not a coincidence to be tidied away later — see the note on extraction
below.

Both densities, one identity block. `Matrix.tsx` has never drawn two, and a second would be a second
description of one element, which is what `docs/knowledge/layout-and-css.md` § "one element sized two
ways" is about.

**Three things that will bite.**

*`align-items: center` in a column flex defeats `text-overflow`.* A centred flex item is sized
`fit-content`, and `white-space: nowrap` makes its min-content the whole string — so the nickname box
grows past the column and spills rather than ellipsising. `max-width: 100%` on the nickname is
load-bearing. This is the repo's declared-versus-given trap in miniature: `getComputedStyle` reports
the width that was asked for either way, and only a rect read in a browser sees the overflow. It is a
new instance of a trap this repo already records for `1fr` grid tracks, and belongs in
`docs/knowledge/layout-and-css.md` beside it.

*The centring stops at the identity block.* `text-align: center` on `AgentColumn` would be inherited
by the `Marginals` block under the hairline, whose lines are keyed left and valued right. Centre on
`AgentIdentity` and `AgentNames`; `AgentColumn` keeps `text-align: left` and `vertical-align: top`,
and the reason it is top-aligned (`Matrix.tsx:192-195`) is unchanged.

*The frozen header grows, and its height is a budget.* Ticket 17 measured the sticky header at 295px
of a 900px viewport and treated that as the cost to watch. This takes the identity block from about
40px to about 90px. Measure it and report the number rather than assuming it is fine. If it is too
tall, the lever is `AgentStack`'s two-line reservation (`Matrix.tsx:300-310`): that reservation exists
because "Never drawn" wrapped at 46px of nickname width and the stack labels did not, and at the full
column width it may no longer need to. Check whether it wraps before keeping or dropping it — the
reservation was measured, and undoing it on a guess reintroduces a 13px baseline split.

**Name the size once.** `Avatar` and `AvatarFallback` carry the 26px literal twice today and must
never disagree; the fallback is what a reader sees whenever ENS is unreachable, so a drift shows up
only in the degraded state. One `HEADER_AVATAR_PX` beside them, used by both, in the pattern
`DisputeCards.tsx:109` already sets with `SLOT_AVATAR`.

**Do not extract a shared avatar component**, this time. The header avatar becomes byte-identical to
`Roster.tsx:54-62` and the instinct is to lift one out; ticket 26 is open and edits `Roster.tsx`, and
`docs/knowledge/merging-and-branches.md` is a long entry on what parallel branches over shared files
produce. Leave a comment saying the two now match and that extraction is the follow-up, so the next
reader knows the duplication was seen rather than missed.

**Not in scope, and deliberately.** The avatar does not become part of the nickname link. A 44px
avatar inside it would clear WCAG 2.5.8's 24px floor, which the column header's link has never been
measured against — `docs/accessibility.md` records that the target-size fix landed on the row header
only — but it changes the tab stop's target and the hover affordance, and that is a design decision
nobody has made. Nor does this unblock the text-size criterion: that needs the `--type-*` tokens and
the fixed-px boxes to move together, and the 148px column is still fixed.

**Blocked by:** nothing. 24 is done. 25 is the width ticket and this one is deliberately
width-neutral, but both edit `Matrix.tsx` and should not run as parallel worktrees.

**Design:** `Main.dc.html:138-144` and `MatrixDense.dc.html:69-75` draw this element, at 26px and
24px respectively, and both draw the avatar **beside** the name with the nickname ellipsised. This
ticket **amends the artboards** rather than following them.

That inverts this repo's standing rule that the canvas wins where a ticket and an artboard disagree,
and it does so outside the exception `docs/knowledge/architecture.md` records — ticket 22's inversion
was invoked for the canvas's *data*, and this is a disagreement about how an element is drawn, which
is precisely what the rule reserves to the artboard. The override is the maintainer's, made against
the rendered page on 2026-09-04. The rule settles a *ticket* against an artboard; it is not a bar on
the maintainer changing the design. But the change is only safe once the drawing is amended, because
a rule saying the canvas wins, read against a codebase that has quietly diverged from it, is a rule
that will be used to undo this work. **The artboard edit is half of this ticket, not paperwork after
it.**

A side effect worth having: the two artboards currently draw this one element at two sizes, 26px and
24px, for no stated reason. After this they draw it at one.

**Status:** ready-for-human

- [x] The column header's avatar sits above the nickname, centred, at both densities
- [x] The avatar is 44px at `radiusTile`, and the size is written once and read by both the image
      and the initials fallback
- [x] The initials fallback is unchanged in every respect but size, radius and its own type token —
      still `aria-hidden`, still dashed and amber when ENS was reached and failed
- [x] The nickname keeps one line, its ellipsis and its `nowrap`, and gains `max-width: 100%`
- [x] `AgentColumn` is not centred, and the `Marginals` lines below the hairline stay keyed left and
      valued right
- [x] No nickname in the roster is clipped at 1264pt, the compact grid's floor, measured as the
      child's rect against its parent's
- [x] The accessible name of every `columnheader` is unchanged, and the nickname link still carries
      no `aria-label`
- [x] `AgentStack`'s two-line reservation is kept or dropped on a measurement of whether "Never
      drawn" still wraps, and the comment says which was observed
- [x] The frozen header's height is measured at 1440x900 and reported against ticket 17's 295px
- [x] No width, breakpoint, density threshold or `@media` literal moves; the existing width,
      share-sum and sticky tests pass untouched
- [ ] Both artboards are amended to the new arrangement at one avatar size, re-seeded, and
      republished to the canvas URL — **amended only; see Comments**
- [x] `docs/knowledge/architecture.md` records the second inversion and why it does not license
      reverting this
- [x] `docs/knowledge/layout-and-css.md` records that a centred column-flex item defeats
      `text-overflow` without `max-width: 100%`
- [x] Every sentence in the repo that describes this avatar as beside the nickname, or enumerates
      the repo's avatar sizes, is found and corrected — `docs/contrast.md:217` is the known one
- [x] Checked in a browser in **both** themes, with ENS reachable and unreachable, since jsdom lays
      nothing out


## Comments

Built and verified 2026-09-04. Offline: `yarn check-types`, `yarn lint`, `yarn test` (872 tests,
43 files, ~17s — fast enough that nothing was masked by contention). Browser readings in system
Chrome against the dev server, at 1440x900, 1264x900, 1200x900 and 390x844.

**The change did not do what this ticket claimed until the padding moved.** Stacking cleared the
nickname at 1440 — `daemonhill` 82px in a 102.66px slot — and left it *3px short at the compact
floor*, where the slot is 78.98px. 1264, 1200 and every width down to 720 sit at that floor, which
is most laptops, so the two names this ticket exists for went on clipping across the majority of
desktop viewports. The ticket's own estimate of "83px" was wrong by four. The cell's side padding
went 12px to 8px, the slot became 86.98px, and `scrollWidth == clientWidth` on all seven nicknames
at all three widths. Nothing spills: `max-width: 100%` holds the link inside its parent everywhere.

**A WCAG 2.4.11 failure came with the taller header, and is fixed here.**
`DisputeList.tsx`'s `scroll-margin-top` was 8rem against a header that is now 197.84px. Walking
sixteen links up the dispute column with Shift+Tab, every focused link parked at exactly 128px in a
21px box — the whole row and its entire focus ring behind the frozen header. It is 13rem now. Two
things about finding it are recorded in `docs/accessibility.md` because both would hide it again: a
programmatic `.focus()` does not reproduce it (Chrome centres the element for that; only sequential
focus navigation parks against the margin), and axe does not test 2.4.11 at all. Note the clearance
was *already* about 18px short before this ticket; this widened it to 70.

**The stack slot keeps its two lines, on a measurement rather than an assumption.** "Never drawn"
is 87.13px in that font against a 78.98px slot at the floor and 94.66px at 1440, so it still wraps
below about 1298 and the reservation still earns itself. Every real stack name is one line at both.
One trap found while checking: the slot's own `min-height` makes `scrollHeight` report two lines
whether or not the text takes two, so a wrap test that reads `scrollHeight` measures the
declaration and not the string. Measure the string against the slot's width.

**The frozen header is 197.84px at 1440x900**, 22% of the viewport — against ticket 17's 295px
reading, 97px under it, because the reason lines that made up that figure were removed since.

**The artboards were amended without changing their line count, deliberately.** The first attempt
added an explanatory HTML comment above each identity block, which moved every `Main.dc.html:NN`
citation below it by seven lines and every `MatrixDense.dc.html:NN` one by five — around thirty
references across `src/`, `docs/` and the tickets, none of them checked by anything, and a citation
that has slid seven lines still resolves to something, which is worse than one that breaks. The
comments were dropped, the rationale kept in `canvas/README.md`, and both files are byte-length
identical to their previous revision. The trap is written up under that README's "Changing a
design".

**Not fixed, and not this ticket's:** at the compact floor `columbo`'s marginal values overflow
their row and cross the cell's right border by about 6px, leaving ~2.4px to `daemonhill`'s key —
visible as the dagger sitting on the column rule. It is the footnote-marker columns meeting the
grid's floor, it predates this ticket, and this ticket halved it (it was ~10px at 12px padding).
Noted on ticket 25, which owns the compact column's width.

**Left unticked:** the artboards are amended but not re-seeded or republished. Re-seeding runs the
`/design` helper and republishing writes to the shared canvas URL, which is the maintainer's to
drive — and the README's own instruction is to read the published version back first, since a
browser edit since the last seed is the source of truth rather than these files. Until that
happens the published canvas still draws the avatar beside the name.

**Not verified:** the initials-tile fallback at 44px. ENS resolved on every run, so all seven slots
rendered as portraits and the fallback branch was never on screen. Its size and radius are pinned
by test against the same constant the portrait uses, but its legibility at 44px and the dashed
amber border's reading are unchecked in a browser. Also noted in passing: the app ships no theme
toggle and `themes.css` has no `prefers-color-scheme` block, so the light reading was taken by
setting `data-theme` by hand — light is not a user-reachable state in this build, which is worth
knowing against `docs/contrast.md` measuring both themes as though it is.
