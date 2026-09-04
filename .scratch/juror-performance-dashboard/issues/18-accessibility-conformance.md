---
status: done
blocked_by: ["05", "15", "16", "17"]
---

# 18: Sweep the built surfaces for the accessibility nobody specified

**What to build:** A visitor who reads this dashboard with a screen reader, drives it from a
keyboard, or opens it zoomed in gets the same measurements as everyone else — and the redundant
encoding the design already committed to is confirmed to have survived being built.

This ticket is the residue, and says so. The spec and the first thirteen tickets name exactly one
accessibility constraint, `DESIGN_PROMPT.md:202`: coherence must never be encoded by colour alone.
That one is answered, and answered better than an audit would have asked for — ADR-0006 governs it,
ticket 05 builds the five states as a glyph and a word before a colour, and ticket 05's greyscale
criterion is what tests it. This ticket does not re-specify any of that and carries no criterion
about colour-independence. It verifies that the answer holds on every surface once every surface
exists. Everything below is what nobody wrote down.

It is also a sweep across finished surfaces rather than a design activity. The matrix, the cell, the
error banner and the phone layout are already drawn; the work here is to confirm the design's
answers survived implementation and to fix the ones that did not. Where an answer is genuinely
missing — the live region question, which no ticket owns — the criterion says what is required
rather than inventing a new visual language mid-sweep. No criterion here reads "conforms to WCAG
AA": a criterion an implementer cannot act on is worse than none, so each one names a thing on this
page. It blocks on 05 and 15 because the matrix and the chrome are the surfaces without which there
is nothing to sweep; a criterion naming a surface from 09, 11, 12 or 13 applies when that ticket
lands,
and does not hold this one back.

The contrast half has a specific reason to exist. The 4.5:1 target is WCAG AA for body text, and
the design system quotes it too, in `tokens/themes.css`'s light-theme comment — accents darkened to
hold 4.5:1 on white. That comment is a claim about light accents on paper, not about the dark
palette this dashboard ships, so it is corroboration rather than provenance. But
`kleros-ai-design/readme.md` says the whole system was rebuilt from rendered pages and screenshots,
and that its values are matched by eye. No ratio in it has ever been measured, in either theme,
including the one that comment claims. The palette is adopted verbatim by ticket 14 and is the one
this dashboard ships, so this sweep is the first time anything about it is checked rather than
eyeballed.

**Design:** `../canvas/Main.dc.html:40-50` (the nav), `:112-127` (the legend) and `:128-205` (the
matrix grid, its row headers and its column headers), `../canvas/Cell.dc.html:96-174` (the five
states and the not-drawn dot), `../canvas/Errors.dc.html:42-64` (the banner and its retry),
`../canvas/Dispute.dc.html:110-278` (the justification band and the links inside it),
`../canvas/Mobile.dc.html` (the phone reflow), `../canvas/README.md` for provenance

- [x] Every colour in the shipped dark palette that carries text clears 4.5:1 against the surface it
      actually sits on — the page, the card, the raised card, and the wash behind a tinted cell — or
      is changed until it does. A measurement that is merely recorded is not a pass
- [x] The four accents are measured on the tinted fills they pair with and not only on the page: a
      state word sits on its own wash inside the cell, which is not the surface the accent was
      picked against
- [x] Where a string that carries meaning misses the target it is either raised or given a second
      carrier, and which was chosen is recorded per use. `--text-4` is the trap: it inks the pending
      dash, the rail keys and the vote count, and lightening the ramp wholesale would flatten the
      hierarchy the cell depends on
- [x] The not-drawn dot is exempt, and recorded as exempt rather than quietly skipped: it is
      `--text-5` on the page precisely because it has to read as nearly nothing, so its meaning
      cannot travel in ink and travels in the text alternative below instead
- [x] Every measured figure is written down in the repo, both themes. Nothing in the design system
      has been measured before, and not every accent holds the ratio its own light theme claims — so
      whoever changes a colour next, or adopts the light tokens for an embed, needs to know what was
      checked and against what
- [x] The reachable set is named rather than assumed, and every member of it is operable from the
      keyboard: the nav and whatever ticket 15 puts beside it, the row header and column header, which
      this ticket makes the entry points into a dispute and into an agent juror since tickets 09 and 11
      create those routes without linking to them, the retry on ticket 13's banner, the on-chain
      links, and the links inside a justification
- [x] Focus order follows reading order — chrome, then legend, then the matrix top to bottom and
      across each row — and nothing is focusable that does nothing: the `Read only` pill is a label,
      not a control
- [x] The matrix does not spend a tab stop per cell. A cell is not a control, and a reader who wants
      to walk the cells gets one tab stop into the matrix and the arrow keys inside it, rather than
      six stops per dispute
- [x] Whichever focus ring ticket 14 settles on — `src/styles/global.ts` outlines today, the design
      system ships `--ring-focus` — is visible against every surface it can land on, the tinted cell
      fills included, and survives forced-colors mode, where a `box-shadow` ring disappears and an
      `outline` does not
- [x] The warning ticket 09 puts in front of a link inside a justification is operable from the
      keyboard and returns focus to the link it interrupted
- [x] A route change is announced: opening a dispute or an agent juror moves focus into the new view
      and retitles the document, because a client-side route change is silent by default and the
      breadcrumb ticket 15 draws is only read by someone who saw it change
- [x] The matrix carries its own structure: rows are disputes and columns are agent jurors, and a
      cell is announced with the core dispute ID and the roster nickname it belongs to. A cell
      announcing only `✓ COHERENT` has dropped the two facts that make it a measurement
- [x] The glyphs are never announced as punctuation: `✓`, `✕`, `∅` and `⋯` are hidden from the
      accessible tree and the word carries the state — beside the glyph in the matrix cell, and in the
      accessible name where the surface has no room for it, as on ticket 16's phone slot. This follows
      from ADR-0006 rather
      than adding to it — the glyph is the visual half of a pair whose other half is already text
- [x] The state words are uppercased in CSS and not in the DOM, so `COHERENT` is announced as a word
      rather than spelled out a letter at a time
- [x] A not-drawn cell announces the legend's own words, "not drawn", and nothing else — no latency,
      no coherence state, no glyph. It never announces as blank, as empty, or as silence: silence is
      what ticket 13's Unknown cell and a rendering failure also sound like, and those two words are
      all that keeps not drawn apart from failed to act for a reader who cannot see that one is the
      quietest thing on the page and the other the loudest
- [x] The rails are decoration and are hidden from the accessible tree. The latency beside each is
      already the accessible content, and it reaches a reader in seconds or minutes rather than as
      the fraction of a window this page refuses to show anyone — see ADR-0005
- [x] The rail keys reach a reader as the words they stand for rather than as the letters `R` and
      `C`, and a vote count on a cell holding more than one vote ID says what it is counting
- [x] The `prefers-reduced-motion` block ticket 14 vendors with `tokens/motion.css` is confirmed to
      still bite after adoption: it collapses the duration tokens and its universal rule catches an
      animation written inside a component, not only one driven by a token
- [x] No state is carried by motion alone. With motion off a live row is still a glyph, a word and a
      flag pill, and a figure that animates on refresh still lands on the value it would have shown
- [x] The refresh ticket 12 runs while a dispute is unfinalised does not change figures under a
      reader in silence. A polite live region announces the transitions worth hearing — a draw
      committing or revealing, a dispute finalising, ticket 13's banner appearing or clearing — and
      never re-announces the matrix
- [x] A refresh moves nothing: a keyboard or screen reader user parked on a cell, on a row header or
      on the retry action is still there after the data under them changes
- [x] The `role="status"` regions already on the page are reviewed against that rule. A live region
      is for content that changes; a block carrying a heading and a paragraph from first render is
      page furniture, and announcing it on load spends the reader's attention on something that is
      not news
- [x] Zoomed until the viewport is as narrow as the `Mobile.dc.html` artboard, the page reaches the
      phone treatment ticket 16 builds — one card per dispute — rather than clipping the last
      columns or leaving a reader to scroll the whole page sideways. Zoom and a phone have to land
      in the same place: a zoomed desktop reports the same width, so a breakpoint that only answers
      to a device misses half the readers this criterion is for
- [ ] Nothing in the matrix is clipped, overlapped or truncated when the browser's own text size is
      raised, at either density. `DESIGN_PROMPT.md:195` makes the desktop dense matrix the primary context,
      and a number that is scannable is one still whole at the reader's text size — which is where
      ticket 17's compact cell, half the height of the ordinary one, is the case that bites
- [x] The sweep leaves a record of which surfaces were checked, what was found on each and what
      changed. Where a check can become a test in the existing Vitest and Testing Library suite — a
      cell's accessible name, the not-drawn wording, focus surviving a refresh — it is written as
      one, so it stays true rather than having been true once

## Comments

### From ticket 14, 2026-08-25 — the focus ring this ticket inherits

**The ring is `tokens/base.css`'s and was kept deliberately**: `outline: none` plus
`box-shadow: var(--ring-focus)`, which is `0 0 0 2px var(--page), 0 0 0 4px var(--focus-ring)` —
a page-coloured gap and a cyan halo. Ticket 14 chose it over replacing it with an outline because it
is the system's look, and added one thing beside it in `src/styles/global.ts`: an
`@media (forced-colors: active)` block restoring `outline: 2px solid CanvasText`, because forced
colours drops box-shadows entirely and a ring that is only a shadow disappears there. That is one
ring per mode, not two competing.

Two things to measure that ticket 14 could not:

- **The 2px gap is `--page`, not the surface the focused element sits on.** On `--surface-card`
  (`--ink-850`) or `--surface-raised` (`--ink-800`) the gap is a slightly *darker* ring against a
  lighter card rather than a true gap. It is visible; whether it is 3:1 against both neighbours is
  this ticket's call.
- **Nothing on the page is focusable yet** — no links, no controls — so the ring has never rendered
  in anger. The first focusable element arrives with ticket 15's routes.

**Contrast baseline.** The measured failures in `docs/knowledge/contrast-and-theme.md` are unchanged by ticket 14: the
tokens were vendored with their declared values, deliberately, so this ticket has a clean before.
The light theme in `tokens/themes.css` is vendored and wired to nothing — `color-scheme` stays
`dark`, there is no `data-theme` attribute anywhere, and `theme.test.ts` scopes its token scan to
`:root` for exactly that reason. Fixing light-theme contrast is not in scope unless this ticket
decides to ship the theme.

**From ticket 04 (2026-08-25).** Dispute titles are clipped to one line with `text-overflow:
ellipsis`, and the full text is reachable only through a `title` attribute. That is a weak affordance
— no keyboard access, inconsistent screen-reader handling, no touch equivalent — and it was left
deliberately for this ticket rather than guessed at. The clipping itself is a fixed requirement from
`Main.dc.html:162`, so the fix is a better disclosure, not unclipping the title.

### From the ticket 04 + 05 integration, 2026-08-25 — the row header announces one run-on string

In the matrix, a dispute's row header is a `rowheader` cell whose accessible name is the
concatenation of its own contents, and nothing separates the dispute ID from the title that follows
it: dispute 151 announces as **"151x402 escrow dispute Escrow · Ruling 1 · Panel 2"**. Visually the
two sit in separate grid tracks with a `column-gap`, so the defect is invisible on the page and
appears only in the accessibility tree.

It exists only now that both tickets are on one branch — ticket 05 built the row header, ticket 04
fills the title slot, and on either branch alone the slot was empty. `Matrix.test.tsx` had to locate
rows by their title rather than by `^151\b` because of it, which is the tell left in the code.

The fix is a decision this ticket owns, not a separator character: whether the row header carries an
explicit `aria-label` reading as a sentence, or the ID and title are separated in the accessibility
tree some other way. The same run-on affects `DisputeList`'s `li` rows, where it matters less
because a list item is not announced as a header.

### From ticket 13, 2026-08-25 — one live-region trap, and the loudest rose on the page

**A `role="alert"` region containing anything that ticks is an accessibility bug**, and ticket 13
shipped one before review caught it. The failure banner prints how long ago the page was last read
whole, updating every second; `role="alert"` is assertive, so a screen-reader user on a partial page
had that figure interrupt whatever else they were listening to, once a second, for as long as the
banner was up. The fix is `aria-live="off"` on that subtree — the banner is still announced in full
when it appears, and the tick is not. Anything this ticket adds inside an alert region wants the
same check.

**The banner is the largest block of rose on the dashboard**, and rose has never had its contrast
measured — the palette misses its own stated target, which is this ticket's to fix. `--rose-600` at
5.08 is the one accent that clears 4.5:1, so the banner may be fine; nothing has confirmed it. What
is certainly worth measuring: `stateFail` on `washRose` for the "Not read" figures inside an unread
cell, and the `FactKey` labels, which are `textPending` — the token measured at 2.68–2.91:1 in dark
theme and already flagged here as inking the pending dash and the rail keys.

## From ticket 10: a new amber-on-small-text site, and one figure that is exempt by construction

**`stateWork` now inks a figure, not just a marker.** A net PNK loss renders amber in the matrix's
column headers (`Marginals.tsx`, the `$loss` flag on `Value`) at the same 9px mono the other five
figures use. That is a third accent carrying text at small size, beside the `stateFail` and
`textPending` sites listed above, and `CLAUDE.md` measures `--amber-600` at **4.10** against its own
stated 4.5:1 target. Two of the five drawn agent jurors are net negative today, so this is the
ordinary reading of the page rather than an edge case — measure `stateWork` on `surfaceCard`.

**The colour-independence half needs no work here, and it is worth knowing why so you can spend the
audit elsewhere.** The sign is a character in the value itself — `-467.50`, `+436.33` — and the
amber is applied on top of it, never instead. Greyscale, 60% zoom and forced-colors all leave the
figure fully readable, which is ADR-0006 satisfied by construction rather than by a token. The
`Marginals.test.tsx` case that pins it asserts the *character*, not the colour, so it keeps holding
whatever this ticket does to the palette. Zero carries no sign at all, deliberately: it is neither a
gain nor a loss.

## From ticket 09: one link that needs a name, and one that must not be given one

**Each row of the dispute index is now a link into that dispute**, and its accessible name is the
dispute number alone — "156". A screen reader listing the links on `/disputes` reads forty bare
numbers. It wants a visually-hidden qualifier, which is this ticket's vocabulary.

It must **not** be fixed with `aria-label`, and this was tried: `aria-label="Dispute 156"` on that
link becomes the only thing the link contributes to the accessible name of the element *around*
it, which on the matrix is a `rowheader` whose name is designed to begin with the dispute ID. It
renamed 27 matrix rows and failed their tests. `title` carries the tooltip today and does not
affect the name, because text content outranks it.

Three more things ticket 09 leaves here:

- **Every justification column ends in a `<footer>` inside an `<article>`.** HTML-AAM scopes that
  out of the `contentinfo` landmark, so a browser exposes one landmark and `dom-accessibility-api`
  exposes five. The markup is right and the test library is naive; `DisputePage.test.tsx` carries a
  helper that picks the page's own footer. Worth confirming against a real screen reader.
- **The prose carries `lang`** where a language was recognised, so a Spanish justification is
  pronounced as Spanish and hyphenated by the right rules. Where nothing was recognised the
  attribute is absent and the element inherits the page — deliberately, rather than asserting
  English over prose nobody identified. Roughly half this court's justifications are Spanish.
- **The link interstitial** is a `role="alert"` panel that replaces navigation. Keyboard users
  reach it through the link's own focus, and the panel's controls follow in DOM order; nothing
  moves focus into it, which is worth a decision.

## From ticket 16, 2026-08-25 — a second layout, and the smallest type on the dashboard

Everything this ticket audits now has two forms, and the phone form is where the margins are
thinnest. Four specific inheritances:

- **The slot figure is 9.5px**, in `DisputeCards.tsx`. It is the artboard's size and the smallest
  type here by some way — the vote count at 9px that `CLAUDE.md` already flags for you is its only
  rival. Nothing rests on reading it alone: the glyph carries the state and the dispute's own view
  carries both latencies in full. It is still a figure on a public page, and it is one of the
  places the type scale has to be weighed rather than assumed.
- **A slot's state word is *only* in its accessible name.** It does not fit under a 36pt avatar, so
  each slot renders `<VisuallyHidden>{nickname}: {word}</VisuallyHidden>` and the glyph carries it
  on screen. ADR-0006's greyscale test is met by the glyph; whether "007: Coherent, 46s" is what a
  screen-reader user actually wants to hear six times per card is this ticket's call, and the
  answer may be a `role`/`aria-label` structure rather than hidden text.
- **Two dashed borders that must stay apart.** An agent juror drawn and awaiting its commit gets a
  mint dashed avatar; an ENS portrait that could not be fetched gets an amber dashed one. The
  second carrier is the mint `⋯` glyph beneath the first and the initials in the second, but the
  primary distinction is hue, which is the pattern ADR-0006 exists to catch. Where a slot is both,
  the state wins and the ENS dash is lost — documented in `SlotAvatar`, and worth a second opinion.
- **The folded nav is a real disclosure.** `MenuButton` in `Nav.tsx` carries `aria-expanded` and
  `aria-controls`, closes on Escape and on navigation, and its label changes between "Open the
  menu" and "Close the menu". It is untested against a screen reader and has no focus management
  when the panel opens or closes, which is the part most likely to be wrong.

Also: the palette contrast this ticket owns now inks a 9.5px figure in `theme.textPending` on a
card surface, which is `--text-4` again — the token `CLAUDE.md` measures at 2.68–2.91:1.

**Which layout each site lives on, since the two notes above list sites on different ones.** The
amber PNK-loss figure ticket 10 flags is in the matrix's column headers, and the card layout drops
those headers whole — so it is a **desktop-only** site and a 390pt audit will never meet it. The
four sites in this note are the phone's. Nothing here appears on both, which means this ticket's
sweep is two sweeps and a surface checked at one width is not checked at the other.

## From ticket 11, 2026-08-26 — four things on the new view that are yours

`/agent-jurors/:nickname` is the seventh route and it adds a little surface for this ticket.

- **A `dl` whose visual order is not its DOM order.** The stat card's six figures put the value
  above its own key, which the artboard asks for and a description list forbids in markup — a `dd`
  may not precede its `dt`. The markup is therefore `dt` then `dd` and `order: -1` on the value
  moves it, in `Item`/`MetricValue` in `AgentJurorPage.tsx`. Nothing there is focusable, so no tab
  order is reversed, but it is exactly the pattern this ticket should check rather than assume, and
  it is the second place in this repository where what is read and what is seen are ordered
  differently (`VisuallyHidden` in the matrix's column headers is the first).
- **An absent figure at 30px in `textPending`.** `canvas/JurorEmpty.dc.html` inks its em dashes at
  `#3d3952`, which is dimmer than its own labels; ticket 11 used `textPending` instead so that one
  ink means "nothing here to measure" across the matrix's column header and this card both. That
  is a deliberate improvement on the artboard and still very likely short of 4.5:1 — it is on your
  list of sites, and the never-drawn page is where five of them appear at once.
- **A seventh route and a second table.** `AgentJurorDraws` renders a real `<table>` with a
  visually hidden `<caption>` above the breakpoint and a `<ul>` of blocks below it — the same
  two-renderings shape `Matrix`/`DisputeCards` has, so whatever you conclude for one applies here.
  The ‡ beside a coherence mark is a link with its own `aria-label`, and the state itself is a
  glyph plus a word (ADR-0006), never colour alone.
- **The nickname in the matrix's column header is now a link**, deliberately with no `aria-label`:
  the accessible name of a `columnheader` is built from its content, and labelling the link renames
  the column and every cell that answers to it. `DisputeRow` records the same trap for the dispute
  id. Worth a regression check rather than a rewrite.

## From ticket 17, 2026-08-26 — a third rendering to sweep, and four more inks under 12px

The compact density landed: past `COMPACT_FROM_ROWS` (40) the matrix drops the cell's commit line,
halves the cell, reduces the column header to three figures and freezes it. Your sweep was already
two sweeps — desktop and phone — and this makes the desktop half two widths of its own, because
these sites exist only past forty disputes and court 34 holds thirty-one today. `padCourt` in
`src/test/court.tsx` builds a court past the threshold; lowering `COMPACT_FROM_ROWS` temporarily
is how the compact density was checked in a browser.

What is new and small:

- **`PanelLabel` in `DisputeList.tsx`** — the panel, drawn as a plain right-aligned label rather
  than a pill at this density, per `MatrixDense.dc.html:91`. Untoned it is `textPending`
  (`--text-4`), which your own note measures at 2.68–2.91:1 in the dark theme, and unlike the pill
  it has no border to carry the shape. It is the worst of the four.
- **The row's `MED C` key at 9px** and its median at `typeMonoSm`, both in the row header.
- **The compact cell's glyph and duration**, 11px and 11.5px, with the state's *word* moved into
  the accessible name rather than drawn. So at this density the five states are told apart
  visually by glyph, fill and border alone — ADR-0006 still holds, but the greyscale check is now
  load-bearing in a way it was not when the word was beside every glyph.
- **The volume note beside the legend**, `textMeta` at `typeBodySm`.

Two things that are not contrast and are yours:

- **The frozen header is `position: sticky` on six `th`s.** Check that it does not cover the
  element a keyboard focus lands on when tabbing down the grid — a sticky header with no
  `scroll-margin-top` on the focusable rows below it is the usual way that goes wrong.
- **A marked figure's reason line is dropped at this density and its text moves onto the mark's
  `aria-label`** (`Marginals.tsx`). That is deliberate — ticket 06's own hand-off asked for the
  trade — but it means a caveat that a sighted reader gets from the footnote below the grid, a
  screen-reader user gets from the link. Worth confirming it reads well rather than as one long
  unbroken name.

## Outcome, 2026-08-26

Done, with one criterion explicitly not met and one correction to this ticket's own premises.

**Not met: the text-size criterion.** Every `--type-*` token in the vendored system is an
absolute px size, as are the thirteen local `font-size` overrides, so a reader who raises their
browser's default font size gets no change at all — nothing clips because nothing grows. Page
*zoom* works and the breakpoints follow it, so the criterion above it is met. Honouring a
text-size preference is a two-part change: the tokens (safe on their own — at a 16px base the
`rem` conversion renders identically) and the fixed-px boxes holding that text (the phone's 52px
slot with `nowrap` inside a card that clips, the 148px cell, `AgentJurorDraws`' fixed `colgroup`,
the 26px and 36px avatars). Moving the first without the second *creates* the clipping this
criterion forbids, so it was left whole rather than half-done. `docs/contrast.md` § What is still
not honoured carries the detail.

**Three of this ticket's own figures were wrong**, found while inventorying the sites and
corrected in `docs/contrast.md`: the failure banner's `FactKey` is `textPending`, not `stateFail`;
the `$loss` amber in `Marginals` is 11px on the *page*, not 9px on a card; and the absent-figure
em dashes are 20px and 13px in `AgentJurorEmpty`, not 30px in `AgentJurorPage` — there is no 30px
anywhere in `src/`. The compact cell's glyph is 12px and its duration 13px, not 11 and 11.5.

**And the contrast baseline was better than the trap said, in the half that matters.** All four
dark accents clear 4.5:1 everywhere including on their own washes; the numbers `CLAUDE.md` quotes
are the light theme's, and the light theme is wired to nothing. Two things failed that no ticket
had named: `--text-4` everywhere it inks, and the violet glow, which `Shell.tsx` documents as
carrying no contrast anything depends on and which is the actual ground under the top 720px of
every view.

Records: `docs/contrast.md` (the numbers, both themes) and `docs/accessibility.md` (what was
checked on each surface, what changed, and the four things deliberately left).
