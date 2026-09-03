# Contrast, palette and theme

The measured palette, and the two ways a contrast figure computed from a token can differ from the
ink actually on the page. Full ratio tables live in `docs/contrast.md`.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **The Kleros ×AI palette is measured now, and the numbers this file used to quote were the
  wrong theme's.** `--cyan-600` at 3.95, `--mint-600` at 3.65 and `--amber-600` at 4.10 are real
  and they disprove `tokens/themes.css`'s claim that its accents "hold 4.5:1 on white" — but they
  are the **light** theme, which is vendored and wired to nothing. The shipped dark accents are
  the `-400`s and all four clear 4.5:1 on every surface including their own washes, worst 5.29.
  Reading those figures as though they described the live page is the trap now.
  What did fail was `--text-4` (2.38–2.91 everywhere it inks, at 9px, on about thirty sites that
  carry meaning) and the **violet glow**, which `Shell.tsx` still describes as decoration carrying
  "no contrast anything else depends on" and which is the actual ground under the top 720px of
  every view — at its old 0.45 peak it took `--text-meta` from 5.43 to 3.71, so the nav's own
  links failed while every measurement taken against `--page` said they passed. Both are fixed in
  `src/styles/contrast.css`, a repo-owned layer *over* the vendored tokens so the copy under
  `kleros-ai/` stays a faithful record of the system as published. `--text-3` moved with
  `--text-4` and only because of it: lifting one far enough to clear its worst surface puts it
  brighter than the other and inverts the ramp. Every figure, both themes, is `docs/contrast.md`;
  `src/styles/contrast.test.ts` re-derives all of it from the token files on every run.
  **Two things about that test are the trap.** Vitest stubs stylesheets to the empty string
  unless `vite.config.ts` names them in `test.css.include`, silently — so a token file nobody
  listed declares nothing, the vendored value stands, and the wrong palette is measured by a
  passing test. And `--text-5` is asserted to stay **below** 3:1, because it inks the 3px "not
  drawn" dot and a well-meant fix that raised it would stop that mark being the quietest thing on
  the page, which is the whole of what it says (ADR-0006).
- **Two translucent layers of the same gradient composite, and the token then lies about the
  page.** `--glow-violet` was painted twice — as a `body` `background-image` in `global.ts` and
  again as `Shell.tsx`'s `<Glow>` div, same gradient, same size, same position. A declared peak
  of `a` renders as `1-(1-a)²`, so 0.45 drew 0.70. Nothing looks wrong, because the result is
  simply a stronger glow; it bites the moment anyone *measures* the layer, because the figure
  computed from the token is not the figure on the screen. Ticket 18 dimmed the glow once
  against the wrong number before review found the second paint. The general form: before
  measuring against a decorative layer, count how many times it is painted.
- **A contrast surface is every layer under the ink, not the nearest one.** The failure banner is
  a rose wash, and it is the first thing inside `<main>`, which is inside the glow's 720px band —
  so its labels sit on ink-over-wash-over-glow-over-page, and the pairing this dashboard actually
  shipped was **1.33:1**. A test that asserts inks × washes and inks × glow but never the two
  together leaves exactly the region where both apply unmeasured, and passing.
  `src/styles/contrast.test.ts` composes them now.
