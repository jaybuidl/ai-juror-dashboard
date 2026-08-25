# 14: Adopt the Kleros ×AI design system

**What to build:** A visitor sees a page in the Kleros ×AI visual system — its ink-and-violet ground,
its cyan accent, its Manrope and mono type, its hairline cards — instead of the Kleros court's purple
placeholder. Nothing new appears on the page: everything already on it is restated in the system's
own tokens, and the tokens become the thing every later view is styled from.

This is the foundation the visual tickets stand on. `src/styles/theme.ts` says of itself that it
holds placeholders, and `README.md` § Conventions says the same; the design system's `tokens/*.css`
is what replaces them, and ADR-0006 already writes the cell states in that system's variable names
(`--cyan-400`, `--amber-400`, `--rose-400`, `--mint-400`) rather than in the court's. Ticket 05
lists `14` among its blockers and tickets 09, 11 and 13 inherit that through 05, while 15, 16 and 18
depend on it directly. The ordering is the point: taken after the matrix is built, this becomes a
restyle of several views instead of styling them once.

**The fonts question is genuinely open, and this ticket has to close it.** `tokens/fonts.css`
`@import`s Manrope and JetBrains Mono from `fonts.googleapis.com`, and the CSP in `netlify.toml`
blocks that twice over — `style-src` does not list `fonts.googleapis.com` for the stylesheet, and
`font-src` does not list `fonts.gstatic.com` for the `woff2` files it goes on to fetch. Two ways out:

- **Recommended: self-host both families** — `@fontsource/manrope` and `@fontsource/jetbrains-mono`,
  or equivalent — and leave `style-src` and `font-src` at `'self'`. `netlify.toml`'s own comment says
  the policy is written to make read-only "structurally true rather than merely intended", and a
  public page that may be cited in research gains nothing from a third-party request on every load.
  The `--font-sans` and `--font-mono` stacks in `tokens/fonts.css` stay exactly as written; only its
  `@import` line goes.
- **Alternative: widen the CSP by two hosts** and leave `tokens/fonts.css` byte-for-byte as the
  system ships it. Closer to adopting the system verbatim, at the price of two hosts on the policy
  and a first render that depends on Google being reachable.

The criteria below hold either way. Both `../canvas/README.md` and the comment in
`src/styles/global.ts` assume the CSP widens, having been written before this was a decision. Under
the recommended branch both go stale; under the alternative only `global.ts`'s "nothing here loads a
webfont" does. Either way they are corrected here rather than left to rot.

**The trap.** Vite's dev server sends no CSP at all, so a missed `netlify.toml` edit looks perfect
under `yarn dev` and `yarn preview` and surfaces only in production, as a silent fall back to the
system font stack. The shouted guard-rail comment that ought to catch it does not: it is scoped to
data sources on `connect-src`, which is why it caught ticket 02's ENS host and would say nothing
about a font or stylesheet host.

**Restyling `src/roster/Roster.tsx` is in scope, and is transitional.** It is the only rendered
surface today and the page is live and public, so a new palette that skips it ships a half-branded
page. It takes everything it renders as props (`README.md` § Conventions), so this is one component
and no data plumbing. The canvas has no roster artboard, and at ticket 05 the six agent jurors become
the matrix's column headers — so restate the roster in the system's vocabulary and expect it to move,
rather than inventing a roster design the canvas will later contradict.

**The tokens are very close, not exact.** The system's readme records that it was rebuilt from
rendered pages and screenshots with no repository access, so its hex and px values are matched by
eye, and JetBrains Mono is a substitute for a monospace that could not be read from source. The
tokens are this repo's authority on the palette; they are not authoritative to the pixel, and nothing
later should be measured against them as though they were.

**Blocked by:** 02

**Design:** `kleros-design-system/kleros-ai/kleros-ai-design/tokens/` — the eight token files, with
`styles.css` beside them as the single entry point its readme says to link. The referent is the
system itself rather than an artboard, and it sits in a sibling checkout
(`../kleros-design-system/...` from this repo's root), not at any path inside this repo.
`../canvas/README.md` § The visual system is not this repo's states how the canvas and the system
relate, and is the canvas's provenance pointer

**Status:** ready-for-agent

- [ ] The eight files in the system's `tokens/` directory are vendored into this repo with their
      declared values unchanged, and are loaded through the system's own `styles.css` — its readme
      names that file the entry point and says to link that one file
- [ ] The vendored files are confirmed to need no build step before they are relied on: no nesting,
      no preprocessor syntax and no PostCSS plugin. Five are custom properties only; `base.css` is an
      element reset, `motion.css` carries `@keyframes` and a media query, and `themes.css` is an
      attribute selector, so "tokens" does not mean "declarations only"
- [ ] `yarn lint` passes with the vendored files in the tree and their values untouched, so that
      re-copying the system later is a whitespace diff at worst. If Biome's CSS formatter would
      rewrite them, they are excluded from it the way `.scratch` already is
- [ ] The overlap between `tokens/base.css` and `src/styles/global.ts` is resolved rule by rule with
      one owner each, rather than left to load order. Both set `box-sizing`, the `body` background,
      colour, font and smoothing, `:focus-visible`, and `code, kbd, samp, pre`; `base.css` also owns
      `h1`–`h4`, `p`, `a`, `button`, `::selection` and the `.ka-mono` label utility, and both set
      `html`. `color-scheme: dark` exists nowhere in the design system, so it stays `global.ts`'s and
      survives the resolution — losing it costs the page its dark scrollbars and form controls
- [ ] Nothing survives in `global.ts` that restates a rule `base.css` already owns, and no
      Court-purple value is left winning a rule by import order
- [ ] `src/styles/theme.ts` becomes thin aliases over the CSS custom properties — each value a
      `var(--token)` reference, never a copied hex string — so editing a token changes the page and
      the two cannot drift apart
- [ ] `src/styled.d.ts` still augments `DefaultTheme` from `Theme`, and `yarn check-types` passes.
      Where a key is renamed its call sites are renamed with it in the same change — `theme.warning`
      in `Roster.tsx` is the only one, so no call site is left pointing at a key that no longer exists
- [ ] `theme.ts`'s header comment is corrected rather than carried over. It claims today that a later
      swap is "a rename-free substitution rather than a re-palette", which is false for this system:
      `tokens/colors.css` carries ramps, semantic aliases, washes and glows, `tokens/themes.css` adds
      a light theme, and `theme.ts` has no cyan and no idle grey at all, so several of its keys have
      nothing to be renamed to
- [ ] Keys whose court meaning has no Kleros ×AI counterpart are renamed or dropped rather than
      pointed at a token that means something else — `success`, `warning` and `error` above all, since
      the system's `--state-pass` is cyan and its amber reads as prototype or uncertain
- [ ] Every surface already rendered repaints, not only the roster: `Dashboard`'s header, its
      "Nothing measured yet" card and its footer all read from the same alias keys and must land in
      the new palette together
- [ ] `index.html`'s pre-paint `<style>` block and its inline SVG favicon are updated too. Both carry
      Court-purple hex values today and the block's comment says it mirrors `theme.ts`, so left alone
      the page flashes the old ground colour before the bundle loads, on every visit
- [ ] `src/roster/Roster.tsx` is restyled in the system's tokens — surfaces, hairlines, radii, mono
      labels — and no Court-purple value is left anywhere in the rendered page
- [ ] Roster cards stay top-aligned rather than centred, and the avatar fallback stays a two-letter
      mark rather than becoming a generated identicon. Both are deliberate, both are recorded in
      comments in the file, and both survive the restyle with their reasons intact
- [ ] The ENS-unreachable caveat is restyled without being assigned a cell-state meaning: ADR-0006
      binds amber and rose to specific draw states and ticket 13 owns data that could not be read, so
      this ticket restates that block in the new palette without deciding which of them it is
- [ ] The fonts decision is taken and recorded in this ticket's `## Comments` in its own terms —
      which option, and why — so that the next reader does not reopen it
- [ ] Manrope and JetBrains Mono both render in the production build, verified in a browser against
      the built output rather than asserted from the CSS
- [ ] The production build reports zero CSP violations, of any directive
- [ ] Verified by extending the check ticket 02 recorded — an A/B against a local server serving the
      exact policy. In full: `yarn build`, serve `dist` from a local server sending
      the exact `Content-Security-Policy` header from `netlify.toml`, load the page in headless
      Chrome, and assert it collected nothing. Violations are collected by a `securitypolicyviolation`
      listener registered at document start, or by a `report-uri` collector — the browser console does
      not carry them to automation, and `yarn dev` and `yarn preview` send no policy at all
- [ ] `netlify.toml`'s shouted guard-rail comment is widened past data sources. It reads today as
      "EVERY TICKET THAT ADDS A DATA SOURCE MUST ADD ITS HOST HERE", scoped to `connect-src`, and must
      also cover a ticket that adds a stylesheet, a font or any other subresource host — whichever way
      the fonts decision goes. `README.md` § Content Security Policy repeats the narrow phrasing and
      is widened with it
- [ ] The focus ring is decided here rather than left to load order. `base.css` sets
      `outline: none; box-shadow: var(--ring-focus)`; `global.ts` sets an outline today. A box-shadow
      ring disappears under forced colours and an outline does not, so whichever is kept must stay
      visible there and on every tinted surface it can land on — ticket 18 verifies it, and inherits
      whatever this ticket chooses
- [ ] The three comments that go stale are corrected alongside the change: `src/styles/global.ts`'s
      webfont-and-CSP warning, `canvas/README.md`'s repetition of it, and `index.html`'s claim that
      `theme.ts` owns the palette — which stops being true the moment `theme.ts` becomes aliases
- [ ] The light theme in `tokens/themes.css` is vendored with the rest and wired to nothing: the
      dashboard stays dark, `color-scheme` stays `dark`, and no theme toggle is built here
- [ ] `tokens/motion.css` arrives whole, its `prefers-reduced-motion` block included. Nothing in this
      ticket animates anything, and that block is what keeps the motion language safe when something
      later does
- [ ] `yarn verify` and `yarn build` pass, and the offline suite still renders the whole page from
      hand-built data with no network and no mock
