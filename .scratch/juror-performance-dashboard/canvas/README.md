# Design canvas — juror performance dashboard

The answer to `DESIGN_PROMPT.md`. Eight artboards on one pan/zoom canvas:

<https://claude.ai/code/artifact/4faccfc9-cb20-4189-927f-133fce711e0c>

| File | Artboard |
| --- | --- |
| `Main.dc.html` | The matrix at 13 disputes, plus one live row |
| `MatrixDense.dc.html` | The matrix at 60 rows, compact density |
| `Dispute.dc.html` | One dispute, five justifications side by side |
| `Cell.dc.html` | The cell: anatomy and all five states |
| `Juror.dc.html` | One agent juror |
| `JurorEmpty.dc.html` | The agent juror that has never been drawn |
| `Errors.dc.html` | Partial-read failure, and the dispute-151 marker |
| `Mobile.dc.html` | 390pt phone |
| `canvas.json` | Positions, frame sizes and the sticky notes |
| `_logo.html` | The official Kleros ×AI lockup, inlined into each artboard's nav |

Each `.dc.html` is a **Design Component**: plain HTML with a `<helmet>` block, and
`{{holes}}` / `<sc-for>` / `<sc-if>` resolved by a `DCLogic` class at the bottom. The
`<script src="./support.js">` head line is load-bearing — the editor swaps it for its own
runtime. Leave it.

## Changing a design

Edit the `.dc.html` files here, then re-seed and republish to the same URL. Never edit the
seeded output. `/design` in Claude Code carries the helper:

```
node <design-skill>/seed-canvas.mjs --template <design-skill>/payload.template.html \
  --out ai-juror-dashboard.html --title "AI Juror Dashboard" \
  --artboard Main.dc.html --artboard MatrixDense.dc.html --artboard Dispute.dc.html \
  --artboard Cell.dc.html --artboard Errors.dc.html --artboard Juror.dc.html \
  --artboard JurorEmpty.dc.html --artboard Mobile.dc.html --canvas canvas.json
```

If the canvas has been edited in the browser since, read that version back first — its
saved state is the source of truth, not these files.

## To preview one artboard without publishing

Copy `support.js` from `kleros-design-system/kleros-ai/design_references/` into this folder
and open the `.dc.html` directly. Both that copy and the seeded output are gitignored.

## The visual system is not this repo's

Colours, type and component anatomy come from
`kleros-design-system/kleros-ai/kleros-ai-design/`. Ticket 14 adopted it: the eight token
files are vendored verbatim under `src/styles/kleros-ai/` and `src/styles/theme.ts` is now
`var(--token)` aliases over them, where it used to hold the Kleros Court dark palette as a
placeholder.

This paragraph used to say the swap would also mean widening `style-src` and `font-src` in
`netlify.toml` for Google Fonts. It did not: ticket 14 self-hosted Manrope and JetBrains
Mono instead, and the policy is unchanged. The artboards still `@import` from Google Fonts
because they render standalone in a browser, under no policy at all — that is a property of
the canvas, not of the dashboard.

## Known defects, unfixed

Found 2026-08-25 while building the tracker on these artboards, confirmed against the record, and
left alone because each needs an edit plus a re-seed. No ticket quotes any of them.

- `Errors.dc.html:195` renders "152 onward · Commit 45m · vote 45m". The modified `timesPerPeriod`
  is `[2700, 2700, 1800, 129600]` — the vote window is **30m**, not 45m. This is on the artboard
  whose whole subject is the parameter change, and it reads as measured rather than sampled.
- `Errors.dc.html:45` uses `∅` for the blocking banner's badge. `Cell.dc.html:140` reserves that
  glyph for a draw that failed to act and says it is "used nowhere else". The unread *cell*
  correctly uses `?`; only the banner tile clashes.
- `Juror.dc.html:73` shows a median commit stat while `:108` excludes commit latency from the chart
  directly below it as not comparable across dispute 151. The same page both declines to compare
  and compares, and the stat carries no marker.

Lesser, noted in passing: `Main.dc.html:118`'s legend words the live state `Acting` where the cell
words it `Committed`/`Awaiting`, and `Dispute.dc.html`'s justification columns are not in roster
order despite its caption saying they are.

## Fixed, by amending the artboard

- **`Main.dc.html`'s comparison band began at one hour and read "hours to days".** An ordinary
  Kleros court takes **five days at minimum** over a single-round dispute, so the artboard
  understated the distance the whole chart exists to show by about two orders of magnitude — and
  in the direction that weakens the experiment's own case, which is what made it worth a ticket
  rather than a note here. The artboard and the code agreed to the decimal, because `72.4%` is
  exactly `log10(3600)/log10(86400)`: one wrong number expressed twice, not a drawing decision
  and an implementation of it.

  Ticket 22 amended **the artboard**, which inverts this repo's standing rule that the canvas
  wins where a ticket and an artboard disagree. That rule has an exception for the canvas's
  *data* — `CLAUDE.md` records it — and this is the fifth time it has been tested and the first
  time the exception has been invoked. The reading, so nobody re-argues it: the disagreement was
  about a fact the artboard **asserts**, not about how to draw an element, and an artboard is
  authoritative about the second and no more authoritative than anything else about the first.

  What moved with it: `STRIP_MAX` to thirty days (the band is the last eighth of the axis at that
  maximum, where it reads as a region rather than as the right-hand edge), the ticks to nine so
  the axis names `5d` and `30d`, the median line to the position the new scale puts 85s at, and
  the label to the left of the boundary — at 12% of the plot it no longer fits inside the band.

- **`Juror.dc.html:89` still labels its plot "Log scale · 1s to 1h", and is superseded.** It was
  already wrong before ticket 22: ticket 11 had that plot share the court strip's scale, which
  ran to a day. It now runs to thirty days and the code derives the words from the scale itself
  rather than printing them, so the artboard is a record of a range the axis has not had for two
  tickets. Left as it is — the plot's own geometry is unchanged and re-seeding it buys nothing —
  but do not resolve the disagreement by narrowing the code back to the artboard.

## What is measured and what is sampled

Real, and safe to reason from: the 13×6 occupancy grid, panel sizes, 44 draws / 61 votes,
the latency range (reveal 7s–552s, median 85s; commit 126s–3,236s), the titles of disputes
151 and 152, and `baskerville` never having been drawn. Everything else — nicknames,
stacks, other titles, per-draw latencies, reward figures, and every row above 163 — is
sampled to exercise the layout, and is labelled as such on the artboards themselves.
