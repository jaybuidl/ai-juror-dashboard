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

**Status:** done

- [x] The eight files in the system's `tokens/` directory are vendored into this repo with their
      declared values unchanged, and are loaded through the system's own `styles.css` — its readme
      names that file the entry point and says to link that one file
- [x] The vendored files are confirmed to need no build step before they are relied on: no nesting,
      no preprocessor syntax and no PostCSS plugin. Five are custom properties only; `base.css` is an
      element reset, `motion.css` carries `@keyframes` and a media query, and `themes.css` is an
      attribute selector, so "tokens" does not mean "declarations only"
- [x] `yarn lint` passes with the vendored files in the tree and their values untouched, so that
      re-copying the system later is a whitespace diff at worst. If Biome's CSS formatter would
      rewrite them, they are excluded from it the way `.scratch` already is
- [x] The overlap between `tokens/base.css` and `src/styles/global.ts` is resolved rule by rule with
      one owner each, rather than left to load order. Both set `box-sizing`, the `body` background,
      colour, font and smoothing, `:focus-visible`, and `code, kbd, samp, pre`; `base.css` also owns
      `h1`–`h4`, `p`, `a`, `button`, `::selection` and the `.ka-mono` label utility, and both set
      `html`. `color-scheme: dark` exists nowhere in the design system, so it stays `global.ts`'s and
      survives the resolution — losing it costs the page its dark scrollbars and form controls
- [x] Nothing survives in `global.ts` that restates a rule `base.css` already owns, and no
      Court-purple value is left winning a rule by import order
- [x] `src/styles/theme.ts` becomes thin aliases over the CSS custom properties — each value a
      `var(--token)` reference, never a copied hex string — so editing a token changes the page and
      the two cannot drift apart
- [x] `src/styled.d.ts` still augments `DefaultTheme` from `Theme`, and `yarn check-types` passes.
      Where a key is renamed its call sites are renamed with it in the same change — `theme.warning`
      in `Roster.tsx` is the only one, so no call site is left pointing at a key that no longer exists
- [x] `theme.ts`'s header comment is corrected rather than carried over. It claims today that a later
      swap is "a rename-free substitution rather than a re-palette", which is false for this system:
      `tokens/colors.css` carries ramps, semantic aliases, washes and glows, `tokens/themes.css` adds
      a light theme, and `theme.ts` has no cyan and no idle grey at all, so several of its keys have
      nothing to be renamed to
- [x] Keys whose court meaning has no Kleros ×AI counterpart are renamed or dropped rather than
      pointed at a token that means something else — `success`, `warning` and `error` above all, since
      the system's `--state-pass` is cyan and its amber reads as prototype or uncertain
- [x] Every surface already rendered repaints, not only the roster: `Dashboard`'s header, its
      "Nothing measured yet" card and its footer all read from the same alias keys and must land in
      the new palette together
- [x] `index.html`'s pre-paint `<style>` block and its inline SVG favicon are updated too. Both carry
      Court-purple hex values today and the block's comment says it mirrors `theme.ts`, so left alone
      the page flashes the old ground colour before the bundle loads, on every visit
- [x] `src/roster/Roster.tsx` is restyled in the system's tokens — surfaces, hairlines, radii, mono
      labels — and no Court-purple value is left anywhere in the rendered page
- [x] Roster cards stay top-aligned rather than centred, and the avatar fallback stays a two-letter
      mark rather than becoming a generated identicon. Both are deliberate, both are recorded in
      comments in the file, and both survive the restyle with their reasons intact
- [x] The ENS-unreachable caveat is restyled without being assigned a cell-state meaning: ADR-0006
      binds amber and rose to specific draw states and ticket 13 owns data that could not be read, so
      this ticket restates that block in the new palette without deciding which of them it is
- [x] The fonts decision is taken and recorded in this ticket's `## Comments` in its own terms —
      which option, and why — so that the next reader does not reopen it
- [x] Manrope and JetBrains Mono both render in the production build, verified in a browser against
      the built output rather than asserted from the CSS
- [x] The production build reports zero CSP violations, of any directive
- [x] Verified by extending the check ticket 02 recorded — an A/B against a local server serving the
      exact policy. In full: `yarn build`, serve `dist` from a local server sending
      the exact `Content-Security-Policy` header from `netlify.toml`, load the page in headless
      Chrome, and assert it collected nothing. Violations are collected by a `securitypolicyviolation`
      listener registered at document start, or by a `report-uri` collector — the browser console does
      not carry them to automation, and `yarn dev` and `yarn preview` send no policy at all
- [x] `netlify.toml`'s shouted guard-rail comment is widened past data sources. It reads today as
      "EVERY TICKET THAT ADDS A DATA SOURCE MUST ADD ITS HOST HERE", scoped to `connect-src`, and must
      also cover a ticket that adds a stylesheet, a font or any other subresource host — whichever way
      the fonts decision goes. `README.md` § Content Security Policy repeats the narrow phrasing and
      is widened with it
- [x] The focus ring is decided here rather than left to load order. `base.css` sets
      `outline: none; box-shadow: var(--ring-focus)`; `global.ts` sets an outline today. A box-shadow
      ring disappears under forced colours and an outline does not, so whichever is kept must stay
      visible there and on every tinted surface it can land on — ticket 18 verifies it, and inherits
      whatever this ticket chooses
- [x] The three comments that go stale are corrected alongside the change: `src/styles/global.ts`'s
      webfont-and-CSP warning, `canvas/README.md`'s repetition of it, and `index.html`'s claim that
      `theme.ts` owns the palette — which stops being true the moment `theme.ts` becomes aliases
- [x] The light theme in `tokens/themes.css` is vendored with the rest and wired to nothing: the
      dashboard stays dark, `color-scheme` stays `dark`, and no theme toggle is built here
- [x] `tokens/motion.css` arrives whole, its `prefers-reduced-motion` block included. Nothing in this
      ticket animates anything, and that block is what keeps the motion language safe when something
      later does
- [x] `yarn verify` and `yarn build` pass, and the offline suite still renders the whole page from
      hand-built data with no network and no mock

## Comments

### Built, 2026-08-25

**Done. The page is in the Kleros ×AI system, verified in a real browser under the shipped CSP with
zero violations of any directive.** The eight token files are vendored byte-identical under
`src/styles/kleros-ai/`, entered through the system's own `styles.css` from `src/main.tsx`, and
`src/styles/theme.ts` holds no value of its own any more — every key is a `var(--token)` reference.

**The fonts decision: self-hosted, and the CSP did not move.** Manrope and JetBrains Mono ship from
`@fontsource/manrope` and `@fontsource/jetbrains-mono` at the weights the system's own `@import`
names, latin subset, wired up in `src/styles/webfonts.ts`. `style-src` and `font-src` stay `'self'`
and `netlify.toml`'s policy is unchanged by this ticket.

Three things decided it. The policy is written to make read-only *structurally* true, and a page
that may be cited in research gains nothing from a third-party request on every load. Widening by
two hosts would have been the first time a directive grew for something that is not data. And the
alternative's supposed advantage — leaving the system's `tokens/fonts.css` byte-for-byte — turned
out not to hold either way, because the `@import` line has to go under one branch and the file is
edited under both.

Two details that are not obvious:

- **Static packages, not `@fontsource-variable/*`.** The variable builds declare the family as
  `"Manrope Variable"`, which `--font-sans: "Manrope", …` would never match — the page would fall
  back to the system stack silently and look almost right. The static packages declare `Manrope` and
  `JetBrains Mono` exactly as the stacks name them, so the stacks are unchanged.
- **JetBrains Mono 800 is self-hosted although the system's `@import` stops at 700.** `--type-metric`
  asks for `800 34px … var(--font-mono)` — the big figures tickets 05 and 07 render. That is an
  inconsistency in the design system; self-hosting is what makes the weight set ours to settle, and
  it is settled toward what the tokens ask for rather than leaving the browser to synthesise it.

**`tokens/base.css` now owns the page, and `global.ts` was cut down to what it does not.** The
system's reset owns `box-sizing`, the `body` background, colour, font and smoothing, `h1`–`h4`, `p`,
`a`, `button`, `code, kbd, samp, pre`, `:focus-visible` and `::selection`. Everything `global.ts`
used to restate is deleted rather than left to win on load order — a duplicate that agrees today
goes on winning silently the day the system changes its mind. Four rules survive: `color-scheme:
dark` (nowhere in the system, and what keeps the scrollbars and form controls dark), `min-height:
100dvh`, the violet ground, and one focus rule below.

**The focus ring is `base.css`'s, plus a forced-colours fallback.** `--ring-focus` is a box-shadow,
which is the system's look and what ticket 18 will measure; forced colours drops box-shadows
entirely, so an outline is restored under `@media (forced-colors: active)` and nowhere else. That is
one ring per mode, not two competing.

**`success`, `warning` and `error` are gone rather than renamed.** The court's traffic-light trio has
no counterpart here: `--state-pass` is cyan because the system reserves cyan for a verified value,
and its amber reads as *prototype*, not *caution*. The five `state*` keys carry the ADR-0006
meanings and mean nothing outside a draw. `theme.warning` had exactly one call site — the ENS
caveat in `Roster.tsx` — and what replaced it is set out under "The one criterion not met as
written" below.

**Two tests were added, and both catch failures that are otherwise silent** (`src/styles/theme.test.ts`):
every theme value is a `var()` reference rather than a copied hex, and every custom property it names
is one the vendored CSS actually declares. A typo there is not a CSS error — `var(--acccent)` computes
to the inherited value, renders, and says nothing. A third test sweeps the rendered sources and
`index.html` for the eleven Kleros court hexes.

**Gotcha worth keeping: Vitest stubs CSS imports to the empty string, by extension.** A `?raw` import
of a stylesheet comes back empty with no error, which made the token test pass vacuously at first.
`vite.config.ts` now sets `test.css = { include: [/kleros-ai/] }`, scoped so nothing else pays for it.

**Biome cannot format the vendored files and is excluded from them**, the way `.scratch` already is.
It rewrites `rgba(18, 10, 47, 0.10)` to `0.1` and explodes the gradients onto five lines each — a
real diff, not whitespace, which would make the next re-copy of the system a merge.

**How the CSP was verified.** Extending ticket 02's A/B: a local server serves `dist` with the exact
`Content-Security-Policy` *parsed out of `netlify.toml`* rather than retyped, plus `report-uri`, and
injects a `securitypolicyviolation` listener as the first element in `<head>`. Both collectors
independently caught nothing across a full load with ENS resolving live. The same load asserts the
fonts from the page rather than from the CSS: `document.fonts.check("400 16px Manrope")` and the
mono equivalent are true, `document.body` computes to `rgb(8, 6, 15)` (`--page`) under the violet
glow, and the `h1` computes to `800 54px Manrope` — `--type-display-2` at its clamp ceiling, against
the `52px` on `Main.dc.html`. Neither `yarn dev` nor `yarn preview` sends a policy at all, so
neither is evidence of anything here.

**Deliberately not built:** the canvas's nav bar, its eyebrow label, its hero stat row and its orbit
rings. "Nothing new appears on the page" is this ticket's own constraint and ticket 15 owns the page
chrome. The one exception taken is the violet ground glow — a background layer using `--glow-violet`,
named in this ticket's first sentence as "its ink-and-violet ground", not an element.

**Traps for later tickets:**

- **`theme.ts` is not the palette any more, and `index.html` is the one place a token value is still
  copied.** The pre-paint `<style>` block and the inline SVG favicon cannot resolve a `var()` —
  nothing has loaded yet — so they hold `#08060f` and `#4ddfd8` literally. A palette change has to
  touch them by hand; the test sweep will not catch it, because it only knows the *old* hexes.
- **`dist` carries a `.woff` beside every `.woff2`**, about 250 kB unfetched. Fontsource's CSS lists
  both and no browser that runs this bundle will ask for the `.woff`. Harmless, and worth a line in
  whatever ticket looks at bundle size before launch.
- **The page's max width moved from `1120px` to `--container` (1200px)** and the roster cards from
  `12px` to `--radius-4`, because restating in the system's scale is what this ticket is. Neither
  figure was load-bearing, but neither is the same as it was.
- **The roster restyle is transitional and was built as such.** The canvas has no roster artboard,
  and at ticket 05 the six agent jurors become the matrix's column headers. Nothing here should be
  defended as a design.

### The one criterion not met as written, 2026-08-25

**The ENS caveat is amber, and the criterion above says it should not be.** That criterion reads
"restyled without being assigned a cell-state meaning … without deciding which of them it is",
and it was built that way first: a hairline on a near-transparent fill, in no state colour at all.
A review pass called it, correctly — the notice came out *quieter* than the prose it interrupts,
and `CLAUDE.md` requires a caveat to be visible in the UI rather than merely handled in code.

Going back to the canvas settled it. `Errors.dc.html:142` **is this exact block**: an amber panel
(`--line-amber`, `--wash-amber`) with a `◇` glyph and the mono label "Degraded, not broken", whose
copy is all but identical to ours — "ENS could not be reached, so nicknames come from the
checked-in roster and avatars show initials. No measurement depends on ENS." The canvas wins over a
ticket where they disagree; that is a `CLAUDE.md` invariant, and this is a clean instance of it.

The criterion's worry was ADR-0006, and it does not in fact bite. ADR-0006 governs colour *inside
the matrix*, where amber means a diverged vote, and its actual rule is that a glyph and a word
carry the meaning before a colour does. The panel obeys that rule: the diamond and the words
"Degraded, not broken" say what happened, and amber only reinforces them. The louder rose banner on
the same artboard is for a read that cost a figure — ticket 13's, and not this.

**Four smaller corrections from the same review:**

- **`index.html`'s `<noscript>` block lost its margins.** `base.css` zeroes `h1` and `p`, and the
  built page links that stylesheet statically, so it applies with JavaScript off — the one path
  where that block is all there is. Explicit margins restored in the inline `<style>`. `yarn dev`
  cannot show this: with JS off it serves no CSS at all.
- **`borderCard` and `borderCardHover` were misleadingly named** — they alias `--border-card`,
  which is a bare rgba colour, next to `borderHairline`/`borderVisible`, which are complete
  shorthands. `border: <colour>` is *valid* CSS whose `border-style` defaults to `none`, so the
  mistake draws nothing and warns nothing. Renamed to `borderCardColor` / `borderCardHoverColor`.
- **`theme.test.ts` was scanning the light theme too.** It collected every `--x:` in the vendored
  CSS, including the thirty-odd declared only under `[data-theme="light"]`, which this page never
  sets — so a key pointing at a light-only token would have passed the very test written to catch
  that. The scan is now scoped to `:root` blocks.
- **`AvatarFallback` held the only hand-copied value left**, `font-size: 13px`, which is
  `--type-mono`'s size. It uses the token.

**And one trap the review surfaced that is worth more than its fix** — recorded in `theme.ts` beside
the `type*` keys, because ticket 05 will walk into it: **the `font` shorthand resets
`font-feature-settings`.** `base.css` sets `font-feature-settings: var(--font-feature-numeric)`
(`"tnum" 1`) on `body` so digits are tabular page-wide, and every element that sets its type through
a `--type-*` token — all of them are `font` shorthands — silently drops that for itself and its
descendants. Nothing on the page holds a figure today, so nothing is wrong now. The moment latency
cells render inside a body-typed subtree, their digits stop lining up in a column and nothing
warns. The canvas never relies on the inheritance: it re-declares `font-feature-settings` on every
numeric element, and so must we.
