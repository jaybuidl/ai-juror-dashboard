# The palette, measured

Ticket 18. Every figure here is a WCAG 2.1 contrast ratio, computed from the token files rather
than eyeballed, with translucent surfaces composited the way a browser composites them.
`src/styles/contrast.test.ts` re-derives all of it on every test run, so this page is a record of
*why* the values are what they are; it is not the thing keeping them true.

**Why this exists at all.** The Kleros ×AI system was rebuilt from rendered pages and screenshots,
and its own readme says so: "Values are matched by eye against the screenshots, so treat exact
hex/px as *very close*, not byte-identical." No ratio in it had ever been measured, in either
theme — including the one `tokens/themes.css` asserts in a comment. Ticket 14 vendored the eight
token files verbatim precisely so that this ticket would have a clean before.

**Target.** 4.5:1, WCAG AA for body text, applied to everything. Almost nothing here is large
text: the matrix's figures run 9px to 13px, and the phone slot's figure is 9.5px. Two exemptions,
both stated rather than skipped, are at the bottom.

## What was found

Three things, and only the first was the one `CLAUDE.md` had warned about.

**1. The four dark accents all pass, everywhere — including on the washes they pair with.**
This was the criterion nobody had checked ("a state word sits on its own wash inside the cell,
which is not the surface the accent was picked against"), and it turned out to be the good news.
The worst of the sixteen combinations is rose on its own rose wash at **5.29**. Nothing changed.

The numbers `docs/knowledge/contrast-and-theme.md` quotes — cyan 3.95, mint 3.65, amber 4.10, rose 5.08 — are real,
but they are the **light** theme's accents on white, and the light theme is vendored and wired to
nothing. That trap is accurate about the system and was being read as though it described the
shipped page.

**2. `--text-4` failed on every surface it inks, and it inks about thirty that carry meaning.**
2.91 on the page, 2.78 on a card, 2.38 on a mint wash — at 9px, on figures. The sites include the
rail keys, the vote count, the pending em dash, `PanelLabel`, the marginals' `Key`, the phone
slot's figure, the failure banner's `FactKey`, `AgentJurorDraws`' column headers, and the nav's
own "Read only" statement on a phone. A second carrier is not available to most of them, because
a number's meaning is the number. So it was raised.

**`--text-3` had to move with it.** Lifting `--text-4` far enough to clear its worst surface puts
it *brighter* than `--text-3` — 5.59 against 5.43 on the page — which inverts two steps of the
ramp and would make a pending figure read louder than the caption beside it. That is the
flattening the ticket warns about, reached from the other direction. Both were lifted along their
own hue so the ramp keeps its order and roughly its spacing.

**3. The violet glow is a contrast surface, was documented as not being one, and was painted
twice.** `Shell.tsx` describes the atmosphere layer as decoration carrying "no contrast anything
else depends on". It is 720px tall, spans the full width and sits behind `Content`, so it is the
actual ground under the nav, the hero, the breadcrumb, the stat tiles and the failure banner. A
gradient varies continuously, so its peak is the number that matters.

It was also painted **twice** — as a `body` `background-image` in `global.ts` and again as
`Shell`'s `<Glow>` div, same gradient, same size, same position. Two translucent layers
composite, so a declared peak of `a` renders as `1-(1-a)²`: the token said 0.45 and the page drew
0.70. Nothing looked wrong, because the result was simply a stronger glow — it only mattered once
the layer was measured, at which point the figure computed from the token was not the figure on
the screen. **This was found by review, after a first pass had already "fixed" the glow to 0.22
and measured 4.86 for `--text-4` when the page was really drawing 4.10.**

And the binding surface is not the bare page. The failure banner is a rose wash and is the first
thing inside `<main>`, so its labels are three layers deep — ink on wash on glow on page. The
first pass measured inks against washes, and inks against the glow, but never against the two
together, which left the one region where both apply unmeasured and passing.

The duplicate is gone and the peak is **0.10**, which is where the dimmest ink clears 4.5:1 on a
wash over the glow. That is a large reduction from what the system declared and it is recorded as
one rather than presented as a tidy-up: the atmosphere is fainter than the design intended. The
way to get it back is geometry rather than opacity, and the artboard already shows it —
`Main.dc.html:35` puts the gradient's origin at `20% -14%`, off the top-left, so its peak falls
outside the canvas and only the tail lands on text. Ours is at `50% 0%`, which parks the maximum
directly on the nav.

## What changed

| Token | Was | Now | On the page, before → after |
| --- | --- | --- | --- |
| `--text-3` | `#8681a0` | `#9e98bc` | 5.43 → 7.35 |
| `--text-4` | `#5b5675` | `#8981b0` | 2.91 → 5.59 |
| `--glow-violet` peak | `0.45`, painted twice (0.70 effective) | `0.10`, painted once | `--text-4` on a rose wash over it **1.33 → 4.79** |

That last row is the worst pairing this dashboard actually shipped, and it is worth stating on
its own: **1.33:1**, for the labels inside the failure banner — the block that appears when a read
has failed and the page is incomplete, which is the one moment a reader most needs to read it.
Three of the four numbers in it come from surfaces nobody had thought to compose: a wash, over a
glow, over the page, with the glow itself painted twice.

In `src/styles/contrast.css`, which is a layer over the vendored tokens rather than an edit to
them: the copy under `kleros-ai/` stays a faithful record of the system as published.

One component change came with it. Both "not drawn" dots — `Legend`'s `Dot` and `DisputeCards`'
`SlotDot` — were inking themselves with `textPending` and would have brightened along with it.
They now use `theme.textDisabled` (`--text-5`), which is what the artboard specifies and what
that mark needs to be.

## Dark theme, after

The shipped theme. Every figure ≥ 4.5 except the two exemptions.

Text ramp, on the three solid surfaces:

| Ink | Hex | page | card | raised |
| --- | --- | --- | --- | --- |
| `--text-1` | `#f2f0f7` | 17.81 | 17.05 | 16.42 |
| `--text-2` | `#b9b5cc` | 10.11 | 9.68 | 9.32 |
| `--text-3` | `#9e98bc` | 7.35 | 7.04 | 6.78 |
| `--text-4` | `#8981b0` | 5.59 | 5.35 | 5.15 |
| `--text-5` | `#3d3952` | 1.83 | 1.75 | 1.68 — **exempt, see below** |

The two dim steps on each accent wash over a card, which is the worst family of surfaces in the
app and where the phone's live slot puts a pending em dash:

| Ink | cyan | mint | amber | rose |
| --- | --- | --- | --- | --- |
| `--text-3` | 5.94 | 6.01 | 6.11 | 6.38 |
| `--text-4` | 4.52 | 4.57 | 4.64 | 4.85 |

The accents, on the page, on a card, and each on its own wash:

| Accent | Hex | page | card | own wash over card |
| --- | --- | --- | --- | --- |
| `--state-pass` | `#4ddfd8` | 12.33 | 11.80 | 9.97 (no fill — the coherent cell has none) |
| `--state-live` | `#3ee08d` | 11.74 | 11.24 | 9.60 |
| `--state-work` | `#e8a441` | 9.41 | 9.01 | 7.81 |
| `--state-fail` | `#f2557a` | 6.09 | 5.83 | 5.29 |

## Light theme, measured and not fixed

Vendored, wired to nothing: `color-scheme` stays dark, no `data-theme` attribute exists anywhere,
and `theme.test.ts` scopes its token scan to `:root` for that reason. Fixing it was out of scope
unless this ticket shipped the theme, which it does not. It is measured here because the next
person to reach for it — for an embed, for print, for docs — needs to know what they are picking
up, and because **its own comment is wrong**.

`tokens/themes.css` says: *"accents darkened to hold 4.5:1 on white."* Measured on `#ffffff`:

| Accent | Hex | on white | on the light page `#f7f6fa` | clears 4.5? |
| --- | --- | --- | --- | --- |
| `--cyan-600` | `#0f8f8b` | 3.95 | 3.67 | no |
| `--mint-600` | `#12995f` | 3.65 | 3.40 | no |
| `--amber-600` | `#b06f10` | 4.10 | 3.81 | no |
| `--rose-600` | `#d02a52` | 5.08 | 4.72 | yes |

Three of the four miss the target the comment claims for them, and all four miss it on the light
theme's own page colour, which is not white. The light text ramp fails in the same place the dark
one did: `--text-4` (`#9a94ac`) is 2.71 on the page and 2.91 on a card.

## Exemptions

Two, and each is a decision rather than a gap.

**`--text-5`, the "not drawn" dot.** 1.83:1 on the page, and it has to be — including the part
that looks worst, which is that this ticket made it *dimmer*. It was inking itself with
`--text-4` before, at 2.91:1, and moving it to `--text-5` is a reduction. Review flagged exactly
that: an accessibility pass that made a mark less visible, and `#5b5675` offered as the honest
floor.

The design wins, and it is worth saying why rather than citing the ticket. Neither value clears
3:1, so this is not a choice between passing and failing — it is a choice about how faint the
faintest mark on the page should be. ADR-0006 puts "not drawn" and "failed to act" at opposite
ends of the page's loudness, `Cell.dc.html` inks the dot at `#3d3952`, and this ticket's own
criterion names `--text-5` as the value and the exemption as the point. Drifting onto the pending
ink was the accident; following that ink upward as it was raised for figures would have taken the
dot most of the way to a state it must never resemble. It is a 3px dot, not
text, and it is the emptiest mark in the matrix — a dot that cleared 4.5:1 would stop being the
quietest thing on the page and start competing with the loudest, which is exactly the confusion
ADR-0006 exists to prevent ("not drawn" and "failed to act" share no glyph, no weight, no fill and
no border). Its meaning does not travel in ink at all: it travels in the words "Not drawn" in the
cell's accessible name. `contrast.test.ts` asserts it stays **below** 3:1, so a later well-meaning
fix fails a test.

**`--brand-x`, the `×` of the Kleros ×AI lockup.** `#5e5383`, part of a logotype, exempt under
WCAG 1.4.3. It appears in one component and the system marks both brand colours "logo only".

## The one ratio the page does not clear, and does not have to

**A link inside body prose, against the prose around it.** WCAG 1.4.1 asks that a link in a block
of text not be marked by colour alone; if colour *is* the only cue, the link must clear **3:1**
against the surrounding text. This page's accent against its body ink does not, in either theme:

| Link on prose | Ratio | 3:1 |
| --- | --- | --- |
| Dark: `--accent` `#4ddfd8` on `--text-2` `#b9b5cc` | **1.22** | fails |
| Light: `--accent` `#0f8f8b` on `--text-2` `#443e5c` | **2.55** | fails |

(axe reports the dark one as **1.21**, computing it off the composited pixels rather than off the
token as this file does everywhere; the difference is the glow behind the paragraph, not a
disagreement.)

**Neither was raised, and neither should be.** The 3:1 clause is a condition on the colour-only
case, not an independent requirement — the rule is satisfied instead by giving the link a cue that
is not colour. Both prose links carry a permanent underline as of ticket 28: `Footnotes.tsx`'s
window footnote and `AgentJurorPage.tsx`'s not-an-agent-juror paragraph. Chasing the ratio instead
would mean moving the accent — the colour of every figure, focus ring and verified mark on the
page — to satisfy the two places it happens to sit inside a sentence.

**This is not a third exemption.** The two in the section above are ratios the page fails and
accepts with an argument. This is a ratio the page fails and does not owe, because the condition that would make
it owed does not hold. What has to stay true is the underline, and **both** sites are pinned:
`Matrix.test.tsx` over the footnote, `AgentJurorPage.test.tsx` over the not-an-agent-juror
paragraph. Each asserts `text-underline-offset`, which is the only half of it jsdom can see. Both
guards are needed rather than one being belt-and-braces — the vendored `base.css` sets
`text-decoration: none` on every anchor, so a new prose link is colour-only by default and this
failure is one deleted declaration away at all times, and on the `AgentJurorPage` route axe reports
the rule as `incomplete` rather than as a violation, so the tool would not catch its return.

## What is still not honoured

**The type scale is px throughout, so a reader who raises their browser's default font size gets
no change.** Every `--type-*` token in `tokens/typography.css` is an absolute size — `16px`,
`13px`, `11px` — as are the thirteen local `font-size` overrides in components. Page *zoom* works
correctly, and the layout breakpoints respond to it, so a reader who zooms reaches the phone
treatment exactly as the ticket asks. But a text-size-only preference is ignored.

Converting the scale to `rem` is a two-part change and only the first part is cheap. At a 16px
base the conversion renders identically, so the tokens themselves are safe to move. What is not
safe alone is the second part: the boxes holding that text are fixed px too — the phone's 52px
slot with `white-space: nowrap` inside a card that clips its own overflow, the matrix's 148px
cell, `AgentJurorDraws`' fixed `colgroup`, and every avatar — 26px on the dispute panel, 36px on
the phone's slot, 44px on the roster card and, since ticket 29, in the matrix's column header.
This list is meant to be the whole inventory, so it grew when the header's avatar did: ticket 29
enlarged one of these boxes and unblocked none of this, because a bigger box for text that is
still sized in px is the same defect at a different scale. Moving the type without moving those
creates the clipping the criterion forbids. It wants doing together, with a browser
at a raised base size, and it is recorded here rather than half-done.
