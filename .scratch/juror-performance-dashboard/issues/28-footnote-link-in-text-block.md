---
status: done
blocked_by: []
---

# 28: The footnote link is not distinguishable without colour

**What to build:** One WCAG 1.4.1 violation, live on `/` today, found by an axe audit run while
verifying ticket 27 and deliberately left out of that ticket's diff.

`Footnotes.tsx:170` ends the window footnote with a link:

```tsx
Latency is held and shown as an absolute duration everywhere on this page, and never as a
fraction of the window it ran in.{" "}
<Link to="/method#window">What that means for these figures</Link>.
```

It is a link inside a block of body text, distinguished from the prose around it **only** by
colour: `#4ddfd8` against `#b9b5cc`, which is **1.21:1** where the rule wants 3:1, and it carries
no underline, no weight change and no other non-colour cue. So a reader who does not separate those
two hues has nothing telling them the sentence ends in a link. axe reports it as
`link-in-text-block`, serious, one node.

The fix is small and the choice is the ticket: an underline on the link is the ordinary answer and
the one the rule's own guidance names. Whatever is chosen has to hold in **both** themes, which
means it goes through `docs/contrast.md` rather than being eyeballed — that file records every
ratio in the repo and its two exemptions, and a third exemption is a decision, not an edit.

**Why it is a ticket rather than a line in ticket 27.** Ticket 27 was four tripwire defects with a
scoped diff; `Footnotes.tsx` is not in it. Recording this only in that ticket's comments would have
hidden it, because a closed ticket drops out of the `grep -L` over the status line that is how this
repo enumerates open work — so the finding would have been invisible to the tracker the moment it
was written down. (Do not quote the closed-status string verbatim in a ticket body, incidentally:
that same grep matches it anywhere in the file, and this ticket hid itself once before the sentence
was reworded.) Found by `/code-review`
over ticket 27's diff.

**Worth knowing about the audit that found it.** The same run reports 187 further `color-contrast`
nodes that are **`incomplete`, not violations** — axe could not resolve the background behind them
because of gradients and overlaps. Do not read that number as 187 defects, and do not "fix" them.
The counts on `/` at 1440 were: 1 violation, 1 incomplete rule (187 nodes), 28 passes, 32
inapplicable.

Ticket 18's sweep reported zero violations on seven routes, and `1904247` records that. The link
itself predates that sweep, but the footnote's surrounding prose was reworked afterwards in
`9e69dc8`, `cf72fea` and `269d49b` — the sparsity note moving into the footer. Whether that is what
turned a standalone link into a text-block link is **not** established; it is the first thing to
check, because if it is, the same move may have done it elsewhere.

**Design:** No artboard. This is conformance against WCAG 1.4.1 and against `docs/contrast.md`,
not against a drawing.

- [x] The link is distinguishable from its surrounding prose without relying on colour
- [x] The chosen cue holds in both themes, and `docs/contrast.md` records the ratio or the
      exemption — a third exemption is argued there, not assumed here
- [x] An axe run at `wcag2a,wcag2aa` on `/` returns **zero** violations, reported with the counts
      rather than as "clean"
- [x] Every other route is checked for the same shape — a link ending a sentence of body prose —
      rather than only the one axe happened to name
- [x] Whether `9e69dc8` and its neighbours introduced this is answered either way, and if they did,
      the other prose they moved is checked too
- [x] `docs/accessibility.md` stops reading as though the sweep left nothing behind, and says what
      this was and when it was found
- [x] No `incomplete` axe node is "fixed" — they are gradient and overlap backgrounds, and the
      distinction between incomplete and violation is stated wherever the run is reported

## Comments

**Two sites, not one, and the second was invisible to the tool.** `AgentJurorPage.tsx`'s
not-an-agent-juror paragraph carries the same shape at the same two colours —
`rgb(77, 223, 216)` on `rgb(185, 181, 204)`, measured in Chrome on both pages. axe reported that
route as **zero violations** before the fix. It was not a pass: `link-in-text-block` was sitting in
`incomplete` there, because axe could not resolve the background behind the paragraph and declined
to judge. A default audit prints violations. So the criterion about checking every route for the
shape is what found it, and reading `incomplete` is what explained it — that is now in
`docs/knowledge/a11y-and-focus.md` as a rule, because it generalises past this defect.

**The ratio was not chased, and `docs/contrast.md` says why.** 1.22:1 dark and 2.55:1 light, both
short of 3:1 — so the colour-only route was unavailable in either theme, and the underline is
load-bearing in both rather than belt-and-braces. Raising the accent to clear 3:1 against body ink
would mean moving the colour of every figure, focus ring and verified mark on the page to satisfy
the two places it sits inside a sentence. Recorded as a ratio the page does not owe rather than as
a third exemption: the 3:1 clause is a condition on the colour-only case, and that case no longer
holds.

**The history question, answered: no.** `9e69dc8` and its neighbours did not introduce this. The
link sits in exactly the same sentence at `1904247` as it does today, so the shape predates the
sweep that reported zero. Nor did the palette: ticket 18 raised `--text-3` and `--text-4`, while
the prose ink is `--text-2`, unchanged since `f2decbf` adopted the system. The likeliest reading is
the third one above — the defect was present during ticket 18 and was in the list nobody printed.

**The first test written for this was vacuous, and the second one is why the first was caught.**
`expect(getComputedStyle(link).textDecoration).toContain("underline")` passes with the declaration
deleted: jsdom's UA sheet underlines anchors, and the vendored `base.css` that would have said
otherwise is not in the jsdom cascade at all. It also does not expand the shorthand, so the
`textDecorationLine` longhand reads `"none"` on a visibly underlined link. The assertion that
discriminates is `text-underline-offset`, `"2px"` against `"auto"`, confirmed by deleting the
declaration and watching it go red. In `docs/knowledge/testing.md`, with the general form: delete
the declaration before trusting a computed-style assertion.

**The audit, with counts rather than "clean".** After the fix, `wcag2a,wcag2aa`, at 1440 and at
390, on all eight routes — the seven a reader reaches plus the not-an-agent-juror state:

| Route | Violations | `incomplete` nodes |
| --- | --- | --- |
| `/` | 0 | 187 / 185 |
| `/disputes` | 0 | 35 / 54 |
| `/disputes/151` | 0 | 47 / 35 |
| `/agent-jurors` | 0 | 16 / 20 |
| `/agent-jurors/007` | 0 | 64 / 66 |
| `/agent-jurors/notanagent` | 0 | 12 / 13 |
| `/method` | 0 | 24 / 21 |
| `/no-such-page` | 0 | 12 / 12 |

`link-in-text-block` no longer appears in `incomplete` either, on either of the two routes that
had it. The `incomplete` counts are gradients and overlaps axe cannot composite; none was touched,
and the distinction is stated everywhere this run is reported.

**What the review changed.** A `/code-review` over the diff raised three, all real, all about the
gap between what the docs claimed and what was actually guarded. The `AgentJurorPage` underline
had **no test at all** while `docs/contrast.md` implied both sites were pinned — the worse half
being that this is the site axe reports as `incomplete`, so neither the suite nor the tool would
have caught its deletion. It now has its own `text-underline-offset` assertion, scoped through the
paragraph rather than by link index, and confirmed to go red when the declaration is removed.
`docs/contrast.md` now names both guards, and `docs/knowledge/a11y-and-focus.md` counts **three**
prose containers rather than two — `Justification.tsx` is the third and was already correct, but
that entry is the checklist a later sweep will read.

`CLAUDE.md` gained one line, which its admission test does allow: a prose link in a file that does
not exist yet is colour-only by default, and `base.css` cannot be edited to fix it. 146 to 149,
inside the 155 budget.
