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
`kleros-design-system/kleros-ai/kleros-ai-design/`. Its `tokens/*.css` is meant to be
adopted verbatim; `src/styles/theme.ts` currently holds the Kleros Court dark palette as a
placeholder instead. Swapping it in also means widening `style-src` and `font-src` in
`netlify.toml` for Google Fonts, as the comment in `src/styles/global.ts` warns.

## What is measured and what is sampled

Real, and safe to reason from: the 13×6 occupancy grid, panel sizes, 44 draws / 61 votes,
the latency range (reveal 7s–552s, median 85s; commit 126s–3,236s), the titles of disputes
151 and 152, and `baskerville` never having been drawn. Everything else — nicknames,
stacks, other titles, per-draw latencies, reward figures, and every row above 163 — is
sampled to exercise the layout, and is labelled as such on the artboards themselves.
