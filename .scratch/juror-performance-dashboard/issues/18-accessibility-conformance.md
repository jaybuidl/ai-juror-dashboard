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

**Blocked by:** 05, 15, 16, 17

**Design:** `../canvas/Main.dc.html:40-50` (the nav), `:112-127` (the legend) and `:128-205` (the
matrix grid, its row headers and its column headers), `../canvas/Cell.dc.html:96-174` (the five
states and the not-drawn dot), `../canvas/Errors.dc.html:42-64` (the banner and its retry),
`../canvas/Dispute.dc.html:110-278` (the justification band and the links inside it),
`../canvas/Mobile.dc.html` (the phone reflow), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] Every colour in the shipped dark palette that carries text clears 4.5:1 against the surface it
      actually sits on — the page, the card, the raised card, and the wash behind a tinted cell — or
      is changed until it does. A measurement that is merely recorded is not a pass
- [ ] The four accents are measured on the tinted fills they pair with and not only on the page: a
      state word sits on its own wash inside the cell, which is not the surface the accent was
      picked against
- [ ] Where a string that carries meaning misses the target it is either raised or given a second
      carrier, and which was chosen is recorded per use. `--text-4` is the trap: it inks the pending
      dash, the rail keys and the vote count, and lightening the ramp wholesale would flatten the
      hierarchy the cell depends on
- [ ] The not-drawn dot is exempt, and recorded as exempt rather than quietly skipped: it is
      `--text-5` on the page precisely because it has to read as nearly nothing, so its meaning
      cannot travel in ink and travels in the text alternative below instead
- [ ] Every measured figure is written down in the repo, both themes. Nothing in the design system
      has been measured before, and not every accent holds the ratio its own light theme claims — so
      whoever changes a colour next, or adopts the light tokens for an embed, needs to know what was
      checked and against what
- [ ] The reachable set is named rather than assumed, and every member of it is operable from the
      keyboard: the nav and whatever ticket 15 puts beside it, the row header and column header, which
      this ticket makes the entry points into a dispute and into an agent juror since tickets 09 and 11
      create those routes without linking to them, the retry on ticket 13's banner, the on-chain
      links, and the links inside a justification
- [ ] Focus order follows reading order — chrome, then legend, then the matrix top to bottom and
      across each row — and nothing is focusable that does nothing: the `Read only` pill is a label,
      not a control
- [ ] The matrix does not spend a tab stop per cell. A cell is not a control, and a reader who wants
      to walk the cells gets one tab stop into the matrix and the arrow keys inside it, rather than
      six stops per dispute
- [ ] Whichever focus ring ticket 14 settles on — `src/styles/global.ts` outlines today, the design
      system ships `--ring-focus` — is visible against every surface it can land on, the tinted cell
      fills included, and survives forced-colors mode, where a `box-shadow` ring disappears and an
      `outline` does not
- [ ] The warning ticket 09 puts in front of a link inside a justification is operable from the
      keyboard and returns focus to the link it interrupted
- [ ] A route change is announced: opening a dispute or an agent juror moves focus into the new view
      and retitles the document, because a client-side route change is silent by default and the
      breadcrumb ticket 15 draws is only read by someone who saw it change
- [ ] The matrix carries its own structure: rows are disputes and columns are agent jurors, and a
      cell is announced with the core dispute ID and the roster nickname it belongs to. A cell
      announcing only `✓ COHERENT` has dropped the two facts that make it a measurement
- [ ] The glyphs are never announced as punctuation: `✓`, `✕`, `∅` and `⋯` are hidden from the
      accessible tree and the word carries the state — beside the glyph in the matrix cell, and in the
      accessible name where the surface has no room for it, as on ticket 16's phone slot. This follows
      from ADR-0006 rather
      than adding to it — the glyph is the visual half of a pair whose other half is already text
- [ ] The state words are uppercased in CSS and not in the DOM, so `COHERENT` is announced as a word
      rather than spelled out a letter at a time
- [ ] A not-drawn cell announces the legend's own words, "not drawn", and nothing else — no latency,
      no coherence state, no glyph. It never announces as blank, as empty, or as silence: silence is
      what ticket 13's Unknown cell and a rendering failure also sound like, and those two words are
      all that keeps not drawn apart from failed to act for a reader who cannot see that one is the
      quietest thing on the page and the other the loudest
- [ ] The rails are decoration and are hidden from the accessible tree. The latency beside each is
      already the accessible content, and it reaches a reader in seconds or minutes rather than as
      the fraction of a window this page refuses to show anyone — see ADR-0005
- [ ] The rail keys reach a reader as the words they stand for rather than as the letters `R` and
      `C`, and a vote count on a cell holding more than one vote ID says what it is counting
- [ ] The `prefers-reduced-motion` block ticket 14 vendors with `tokens/motion.css` is confirmed to
      still bite after adoption: it collapses the duration tokens and its universal rule catches an
      animation written inside a component, not only one driven by a token
- [ ] No state is carried by motion alone. With motion off a live row is still a glyph, a word and a
      flag pill, and a figure that animates on refresh still lands on the value it would have shown
- [ ] The refresh ticket 12 runs while a dispute is unfinalised does not change figures under a
      reader in silence. A polite live region announces the transitions worth hearing — a draw
      committing or revealing, a dispute finalising, ticket 13's banner appearing or clearing — and
      never re-announces the matrix
- [ ] A refresh moves nothing: a keyboard or screen reader user parked on a cell, on a row header or
      on the retry action is still there after the data under them changes
- [ ] The `role="status"` regions already on the page are reviewed against that rule. A live region
      is for content that changes; a block carrying a heading and a paragraph from first render is
      page furniture, and announcing it on load spends the reader's attention on something that is
      not news
- [ ] Zoomed until the viewport is as narrow as the `Mobile.dc.html` artboard, the page reaches the
      phone treatment ticket 16 builds — one card per dispute — rather than clipping the last
      columns or leaving a reader to scroll the whole page sideways. Zoom and a phone have to land
      in the same place: a zoomed desktop reports the same width, so a breakpoint that only answers
      to a device misses half the readers this criterion is for
- [ ] Nothing in the matrix is clipped, overlapped or truncated when the browser's own text size is
      raised, at either density. `DESIGN_PROMPT.md:195` makes the desktop dense matrix the primary context,
      and a number that is scannable is one still whole at the reader's text size — which is where
      ticket 17's compact cell, half the height of the ordinary one, is the case that bites
- [ ] The sweep leaves a record of which surfaces were checked, what was found on each and what
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

**Contrast baseline.** The measured failures in `CLAUDE.md` § Traps are unchanged by ticket 14: the
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
