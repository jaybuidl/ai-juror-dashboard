# 22: Put the comparison band where an ordinary court actually sits

**What to build:** A reader sees the real distance between these agent jurors and ordinary
arbitration. The latency strip's comparison band currently begins at **one hour** and is labelled
"hours to days". That understates an ordinary Kleros court by a factor of about 120: a
single-round dispute there takes **five days at minimum**. The band moves to five days, the axis
extends far enough for it to read as a region rather than a wall at the right edge, and the label
and caption say what the five days is a measure of.

The correction is the argument. The whole point of this dashboard is that court 34's agent jurors
reveal in seconds where arbitration normally takes days, and the strip is the one element that
shows it — drawn at one hour, it renders the gap as roughly two decades when it is closer to
four. The chart is currently making the experiment's case weakly by being wrong in the
experiment's own favour's opposite direction.

**This is not a label edit.** `STRIP_MAX_SECONDS` is one day, so five days is off the end of the
axis entirely. The scale itself has to change, and every mark on the plot moves.

Four places carry the claim and the fourth moves silently:

- `strip.ts` holds the boundary, the axis maximum, the ticks and `stripFraction`. It is the seam
  for this, and the arithmetic belongs here rather than in either component.
- `LatencyStrip.tsx` draws the band, its label and the caption beneath the plot.
- `MatrixPage.tsx`'s provenance caveat names the band, gated on `!narrow` because the strip is
  absent below the breakpoint. That gate must survive, and it is tested in both directions.
- `AgentJurorLatency.tsx` shares `stripFraction` and `STRIP_TICKS` and draws **no band at all**.
  Extending the axis therefore shifts every mark on ticket 11's agent juror view too, with
  nothing on that page to explain why its axis now runs to weeks. It is also the one place the
  axis range is written down as **text** — it prints "Log scale · 1s to 1d" — so it will state a
  range it no longer has the moment the maximum moves, which is a page saying something false
  about the picture directly beneath the sentence. Decide the rest and say it: either that view
  gets the band as well, or it keeps a tighter scale of its own, or it inherits the wider one and
  its caption accounts for the empty right-hand third. What must not happen is that the change
  lands there by accident.

  Note before touching it that the artboard and the code **already** disagree here, and the code
  is right: `Juror.dc.html:89` labels that plot "Log scale · 1s to 1h" while the shared scale has
  run to a day since ticket 11 adopted it. Do not resolve that by narrowing the code back to the
  artboard.

**Choosing the axis.** The band begins at a fixed point, so the only free choice is where the
axis ends, and it trades the band's width against the distribution's. The arithmetic, so nobody
re-derives it — band start, then how much of the current width court 34's marks keep:

```
axis max     band begins at     court 34's marks keep
  7 days         97.5%                  85%
 14 days         92.6%                  81%
 30 days         87.9%                  77%
 90 days         81.8%                  72%
```

Thirty days is the recommended starting point: the band is a visible region rather than a sliver,
and the distribution keeps three quarters of its width. Seven days is too tight — the band becomes
the right-hand edge, which is the wall this ticket exists to avoid. Confirm the choice in a
browser: compressing the axis is the point here, but compress too far and the distribution becomes
the blob at the left that `strip.ts` says the log scale exists to prevent.

**A layout consequence that will not show up in a test.** The canvas places the band's label at
`left: calc(72.4% + 10px)`, with 27% of the plot's width to lay out two lines in. At 87.9% there
is 12%. The label will overflow the plot or wrap to a column of single words, and jsdom lays
nothing out, so no offline test can see it. The label needs placing deliberately — right-aligned
into the band, or set to the left of the boundary — and checked at the width it is claimed to work
at.

**The band stays illustrative.** It measures no court today and it still measures none after this
ticket; only the boundary is corrected. The caption keeps saying so, and `MatrixPage.tsx`'s caveat
keeps saying the band is the only thing on that page that did not come from a read. Ticket 23 is
where that changes, if it is taken.

**The canvas asserts the same wrong fact**, at `Main.dc.html:87`, and it is where this originated:
`72.4%` is exactly `log10(3600)/log10(86400)`, so the artboard and the code agree to the decimal.
The artboard is amended in this ticket. That invokes the **data exception** to "where the canvas
and a ticket disagree, the canvas wins" — the disagreement is about a fact the artboard asserts,
not about how to draw it, and `CLAUDE.md` records that the rule does not extend to the canvas's
data. It is the fifth time that rule has been tested, so the ticket records the reading rather
than leaving the next reader to re-argue it.

**Blocked by:** None (can start immediately)

**Design:** `../canvas/Main.dc.html:85-100` (the latency strip, its band, its label and its axis),
which this ticket **amends** rather than builds against — see the data exception above.
`../canvas/Juror.dc.html:89-109` for the agent juror view's plot, which shares the scale and
whose own axis label is already superseded by the code.

**Status:** ready-for-agent

- [ ] The comparison band begins at five days, and the figure lives in `strip.ts` beside the scale
      rather than in either component
- [ ] The axis reaches far enough that the band reads as a region and not as the right-hand edge
- [ ] The ticks name the marks a reader thinks in past a day, and every tick is legible at the
      width the strip is drawn at
- [ ] The label and the caption say the five days is an ordinary Kleros court's **single-round**
      dispute — court 34 is single-round throughout, so the comparison is like-for-like, and a
      reader learns that an appeal makes it longer still
- [ ] No latency anywhere is drawn as a fraction of the band or of anything else (ADR-0005)
- [ ] The band is still described as illustrative, on the page and not only in the source
- [ ] `MatrixPage.tsx`'s provenance caveat still names the band, is still absent below the
      breakpoint, and is still tested in both directions
- [ ] The agent juror view's plot is dealt with deliberately: its scale, its band or its absence
      of one is a decision recorded in the code, not a side effect
- [ ] No element anywhere states an axis range the axis does not have — the agent juror view's
      "1s to 1d" is the one that exists today, and a test pins whatever replaces it against the
      constant rather than against a copied string
- [ ] Verified in a browser at the widths both plots are claimed to work at — the band label fits,
      the distribution is still readable, and the median marker still has room for its value
- [ ] `Main.dc.html`'s band is amended to five days so nothing built against it reintroduces one
      hour, and `../canvas/README.md` § Known defects records what was wrong and why the artboard
      was changed rather than the code
