# The accessibility sweep

Ticket 18, the last of the eighteen. It is a sweep across finished surfaces rather than a design
activity: the matrix, the cell, the error banner, the phone layout and the two detail views were
already drawn, and the work was to find where the design's answers had not survived being built.

The contrast half has its own record, `docs/contrast.md`, because it is all numbers. This is
everything else: what was checked, what was found, what changed, and what did not.

A quarter of what follows is *"already correct"*. That is worth stating rather than trimming —
the point of a sweep is to know that a surface was looked at, and an entry saying nothing was
wrong is a different fact from no entry at all.

## Already correct, confirmed rather than assumed

- **Every glyph is hidden and every state is worded.** `✓ ✕ ∅ ⋯ ?`, the row-flag glyphs and the
  not-drawn dot all carry `aria-hidden`, on every surface, at both densities and on the phone.
  The word is beside the glyph where there is room and in the accessible name where there is not
  — the compact cell and the phone slot both trade the drawn word for a hidden one, which is the
  trade ADR-0006 authorises and bounds.
- **State words are uppercased in CSS, never in the DOM.** `COHERENT` is `"Coherent"` in the
  markup with `text-transform` over it, so it is announced as a word rather than spelled out.
  `VisuallyHidden` resets the transform for itself, deliberately, and says why.
- **A not-drawn cell announces "Not drawn"** — not silence, which is what ticket 13's Unknown
  cell and a rendering failure also sound like.
- **The rails are decoration and are hidden.** The latency beside each is the accessible content,
  in seconds and minutes rather than as a fraction of a window (ADR-0005).
- **The matrix spends no tab stop per cell.** Cells are not focusable and never were; the stops
  are the row header's dispute link and the column header's nickname, which are real
  destinations, plus the caveat marks.
- **Nothing focusable does nothing.** The "Read only" pill is a `span` in both its forms, the
  current nav destination and breadcrumb leaf are `span`s with `aria-current="page"`, and every
  remaining focusable resolves to a route or an external URL.
- **`prefers-reduced-motion` still bites after adoption.** `tokens/motion.css` collapses the
  duration tokens *and* carries a universal `!important` rule that would catch an animation
  written inside a component. Nothing in `src/**/*.tsx` animates at all, so no state is carried
  by motion; the one `transition` in the system is on `a` and is neutralised twice over.
- **Zoom and the phone land in the same place.** The breakpoints are viewport `max-width` queries
  in CSS px, not device features, so zooming a desktop to the width of the `Mobile.dc.html`
  artboard reaches the card layout. Checked in a browser at 390: no horizontal overflow.
- **The banner's ticking figure is already muted.** Ticket 13 shipped `role="alert"` around a
  figure updating every second and review caught it; `aria-live="off"` on that subtree was
  already in place, and the reasoning is written out beside it.
- **`lang` on justification prose** is set from what the text was recognised as and absent where
  nothing was, rather than asserting English over prose nobody identified.
- **`order: -1` on the stat card's value costs no tab order.** Each `Item` holds at most one
  focusable and the items lay out in source order, so the visual/DOM disagreement is confined to
  one pair.

## Found and fixed

### The matrix carried its structure in two dimensions and said neither

A cell announced `"Coherent, reveal latency 46s"`. `scope` associates it with its headers, but a
screen reader announces those on crossing into a new row or column — never in the linear browse
mode most reading happens in. Every cell now leads with a hidden `"{nickname}, dispute {id}. "`,
including the not-drawn and unread ones, which are the states that most need it: both are silence
on the page, and hearing either without knowing whose column it is tells a reader nothing.

The **roster** nickname, not the ENS one. The column header displays what ENS resolved — `blaise`
publishes a name record reading "Blaise" — but the name this dashboard keys, routes and joins on
is the roster's, and a name an operator can change from a wallet is not the thing to identify a
measurement by.

Three more on the same surface:

- **The row header ran on.** `"151x402 escrow dispute"`, and the second line
  `"EscrowRuling 1Panel 2"`. Accessible-name computation concatenates adjacent nodes and
  normalises the whitespace out from between them, and the visible separator is a middot, which
  is spoken as "middle dot" where it is spoken at all. A hidden comma now sits between them. It
  cannot go inside the dispute link — that link's name is the bare id by design, and anything
  added there renames the `rowheader` and every cell that answers to it, which is a mistake
  ticket 09 already made once and recorded.
- **The grid had no name.** A visually hidden `<caption>` now says what it is and what its two
  axes are.
- **The corner cell was `scope="col"` over the row-header column,** so its paragraph was the
  declared column header of every dispute in the grid. It heads nothing, and no longer claims to.

### Focus indicators that drew nothing

- **The failure banner's Retry.** It interpolated the ring *colour* into the `outline`
  shorthand — valid CSS whose `outline-style` then falls back to `none`, so no outline was ever
  drawn. It survived on the design system's box-shadow ring in normal mode and had **no focus
  indicator at all** under forced colours, where the UA drops box-shadows and this rule outranked
  the `CanvasText` restoration in `global.ts`. It is the one control on a page that failed to
  load.
- **Three footnote-mark links** had underline-only focus. A 7px dagger gaining a 7px rule under
  it is not a discernible indicator, and it was the only thing marking where the keyboard was.

### The matrix could not be scrolled without a pointer

The comfortable grid is wider than most viewports and scrolls in a container with nothing
focusable inside it that reaches the far columns. It is now a named `region` with `tabindex="0"`.

Separately, the frozen column header ticket 17 added had no `scroll-margin-top` beneath it, so
tabbing down the dispute column scrolled each link flush to the top of the scrollport and
underneath the header.

**That clearance is a measurement of the column header, and it has already gone stale once.** It
was set at `8rem`, and the header it clears is content-sized — an avatar, a nickname, a stack label
and three figures — so nothing declares its height and nothing can check the two against each
other. Ticket 29 made the header taller and the criterion failed again: at 1440x900 the header
stood at 197.84px against 128px of clearance, and a link reached by Shift+Tab parked at exactly
128px with a 21px box, putting the whole row and its entire focus ring behind the header. It is
`13rem` now.

Two things about how that was found are worth keeping, because both would hide it again. A
programmatic `.focus()` does **not** reproduce it — Chrome centres the element for that, and only
sequential focus navigation parks it against the margin — so a check that calls `.focus()` and
reads a rect comes back clean over a broken page. And axe does not test it: 2.4.11 is about what a
focus indicator is obscured by, which is a question about two elements' rects, and a green run says
nothing about it. **Anything that changes what the column header holds has to re-measure this, by
hand, with the header stuck.**

### A client-side route change was silent

Nothing retitled the document — seven routes reported one static title to the tab strip, the
history menu and any page-change announcement — and nothing moved focus, so a reader was left on
a link inside a document that no longer existed, or on `<body>` once React unmounted it. Both
halves are now done: `useDocumentTitle` per view, and `Shell` moving focus into `<main>` on a real
forward navigation. Not on first render, where the visitor is already where they asked to be and
focus belongs to the browser's chrome, and not on `POP`, where the browser is restoring a
position the reader chose.

### The link interstitial stranded focus in both directions

The panel that stands in front of a link inside a justification renders *after* the whole prose
body. It announced assertively and left focus on the intercepted link, so a keyboard reader had
to tab through the rest of the justification — dispute 154's is 7,079 characters — and every
other link in it to reach the Cancel button of a panel their own keypress had just opened. It now
takes focus when it opens and hands it back to the link when it is dismissed, by Cancel or by
Escape, and it is a `role="alertdialog"` rather than an `alert`, because an alert is a live region
that per ARIA should carry no interactive content and this one carries two controls and requires
an answer.

**Deliberately not modal, and so no focus trap.** Nothing behind it is disabled and a reader may
tab away and leave it standing, because it interrupts one link rather than the page.

Fixing it turned up a bug underneath: `ReactMarkdown`'s `components` map was an inline object
literal, so the `a` component had a new identity on every render and React unmounted and
remounted every anchor in the prose whenever anything changed. Nothing looked wrong — the links
were rebuilt identically — but a ref to one pointed at a detached node a moment later, which is
what stopped focus being handed back, and which would equally have dropped a selection or an
in-progress interaction. Hoisted.

### The folded menu dropped focus on Escape

Ticket 16 added Escape so a keyboard reader would not be stuck inside the disclosure. It unmounted
the panel and whichever of its four links had focus, so the reader landed on `<body>` — the top of
the tab order, silently. Focus now returns to the menu button, on Escape but not on navigation:
navigation is already taking the reader somewhere, and `Shell` moves focus into the new view.

### A standing explanation was registered as news

`MatrixPage`'s caveat card — a hundred and twenty words, rendered unconditionally on every load —
was wrapped in `role="status"`. That means "this is news", and it carries `aria-atomic`, so the
whole paragraph was announced on arrival and again in full whenever any branch inside it flipped:
the first read landing, the viewport crossing the narrow breakpoint, the court crossing into the
compact density. A live region is for content that changes. A reader who meets furniture as an
interruption learns to talk over the regions that are not.

### The five-second poll changed figures under a reader in silence

Ticket 12 re-reads the court every five seconds while anything in it is unruled. On screen that is
a cell picking up a glyph; to a reader using a screen reader it was nothing.

The obvious fix is the wrong one — a live region around the matrix announces a hundred and
sixty-eight cells every five seconds — so what is announced is the *difference*.
`src/performance/transitions.ts` is a pure diff between two reads, below the seam with every other
derivation, and `CourtAnnouncer` only speaks what it returns. Three editorial rules, each with a
test naming it: a ruling is one event rather than one per draw resolved by it; a burst past four
becomes a count; and growth is not motion, so a dispute that arrives between two reads and a row
whose draws were never read are both silent.

Scoped to the matrix, which is the view whose figures the poll moves. The dispute and agent juror
views hold live data and say nothing here yet.

### `title` as the sole carrier of a fact

Three sites reached a pointer and nothing else — no keyboard, no touch, and inconsistent screen
reader handling. `DisputePanel`'s `R` and `C` measure keys, whose phrases existed nowhere else,
and `AgentJurorPage`'s full agent juror address. All now carry the text and hide the abbreviation,
which is the pattern the matrix's own keys already used.

The dispute title's `title` attribute is **not** one of these: it duplicates text that is already
in the DOM and in the row header's accessible name. The clipping there is visual only.

### The phone's slot labels ran together

Same family as the row-header run-on, and found by the same reading. The hidden labels are
siblings with no whitespace between them, so they concatenated into one string and a reader could
not tell where one agent juror's reading ended and the next began. They also disagreed with each
other about punctuation — a drawn slot ended in a comma and a blank one in nothing.

### The footnote marks had no text alternative

`†` and `‡` are hidden because they are announced as "dagger" where they are announced at all —
which left a reader with a paragraph and no handle on it, while the figures upstairs carry links
reading "Why 007's median reveal is marked". Each footnote now names itself.

## Found by review, after the first pass

A `/code-review` over the finished branch raised ten findings; seven were real and are fixed
here. They are listed separately rather than folded in above, because what they have in common is
worth seeing: **every one was a claim that looked verified and was not.**

- **The glow was painted twice**, so the contrast figures the first pass computed from the token
  were not the figures on the screen — 4.10 where the comment said 4.86. `docs/contrast.md` has
  it in full, including the 1.33:1 the failure banner actually shipped with.
- **The contrast test measured inks against washes, and inks against the glow, but never both**,
  which left the one region where they overlap unmeasured and passing. The surface list now
  composes them, and it bites: at the first pass's 0.22 glow it fails on three washes.
- **`Main`'s `outline: none` suppressed nothing.** The design system's focus ring is a
  `box-shadow`, so the rule added to stop a ring being drawn around the whole view on every
  navigation did not stop it — and Chrome matches `:focus-visible` on a scripted focus when the
  last interaction was a keyboard one, which is exactly how a reader arrives.
- **The hash branch returned before the new focus move**, so `/method#window`,
  `/method#caveats` and `/method#partial` — the links a careful reader follows out of a figure's
  caveat — dropped focus on `<body>`: the precise defect the change was written to fix,
  reintroduced on the subset of links most likely to be used. Fixed for same-page anchors too,
  which the first version would also have missed.
- **The scroll region's tab stop was unconditional**, but the compact grid only scrolls below
  1160px — ticket 17 had to drop its overflow box above that width, because a scroll container
  breaks the sticky header inside it. On an ordinary desktop past forty disputes that left a
  focusable, named region that could not scroll. The gate now mirrors the CSS, which needed the
  media-query hook in `breakpoints.ts` generalised from one hard-wired query to any.
- **The announcer would have read history as news.** The dispute and draw payloads are
  persisted, so on a return visit the first diff is restored-against-fresh and everything that
  happened while the reader was away is announced on arrival. It now compares the two reads'
  own timestamps and speaks only across a gap short enough to be one poll following another.
- **Two identical announcements in a row were silent**, because a live region is announced when
  its text changes and "5 draws advanced across 1 dispute." twice running is ordinary.
- **A missed vote transitioned silently** — it fell through the verb map with no comment, which
  is the loudest thing that can happen to a cell.
- **A `<caption>` styled `position: absolute`** computes away from `table-caption` display, and
  several browser and screen-reader pairs then drop it from the table's name — so the element
  added to name the grid may not have named it. `64e3906` put the absolute caption on both
  tables and `1904247` fixed only `AgentJurorDraws`, while this line claimed both — ticket 27
  audited that and fixed the matrix. Both tables now hide from inside a real caption.

The remaining finding is answered rather than fixed: see the "not drawn" dot in
`docs/contrast.md` § Exemptions.

None of the ten was caught by 832 passing tests, lint, types, a build, or an axe audit returning
zero violations on seven routes.

**And it did not stay zero — see ticket 28 below.** This section is a record of what ticket 18
did and is left standing as one; the sentence above it is true of that sweep.

## Checked in a browser, because jsdom lays nothing out

`agent-browser` against system Chrome, on the dev server at a fixed port. An axe audit returned
**zero violations** on all seven routes, at 1280 and at 390, and at the compact density — which the
court had not reached at the time, so `COMPACT_FROM_ROWS` was lowered to open the state and put
back. It has reached it since: the matrix has been compact in production since its fortieth
dispute, so this audit's compact reading was of thirty-odd rows rather than of the page a reader
now gets.
The cell lead-in, the row-header separator, the caption, the scroll region's `tabindex` and the
`scroll-margin-top` were all read back out of the live DOM rather than inferred from the source.

An audit passing is weak evidence and is recorded as such: axe checks what can be checked
mechanically, and most of what this sweep changed — whether a cell says whose it is, whether focus
lands somewhere a reader chose — is not in that set. **It is also weak evidence about things that
*are* mechanical**, because a rule the tool does not implement is silence rather than a pass: axe
does not check target size, and the section below is what that silence was covering.

## Found after the sweep, by a reader rather than by the sweep

**The dispute row's target was one per cent of the row.** Clicking a dispute did nothing, which is
how it was reported. The ID is the only link on the row — deliberately, and for two reasons that
still hold: every dispute has an ID and not every dispute has a title, so a link on the title would
make an untitled row the one row nobody could open; and a second link to the same place gives a
screen-reader user two indistinguishable destinations on every row. What did not follow from those
reasons is that the *pointer* should be given three digits to aim at. It measured 40x21px inside an
1104x80px row, under the 24px floor of WCAG 2.5.8, with the title beside it inert.

Two things let it through this sweep, and both are worth stating because neither was a lapse in
care. Axe returned zero violations because it does not implement target size at all. And no
offline test could see it, because jsdom lays nothing out and a hit area is a layout — the same
reason this document already has a section headed with that sentence.

The third thing is the one that generalises. **The phone's card had the right target the whole
time.** Ticket 16 stretched `CardLink::after` to `inset: 0` over a positioned `Card`, so a tap
anywhere on a card opens its dispute; the desktop row simply never got the same treatment. Ticket
16's rule was that two renderings of one record must not fork in their model or their prose. They
fork in their *affordances* too, and that fork is quieter than the other two: no figure disagrees,
no sentence is false, and each layout is defensible read on its own.

Fixed by giving the row the card's pattern rather than a second link, which keeps the accessible
name, the tab order and the element count exactly as the reasoning above requires. Inside the
matrix it scopes itself: `DisputeRow` renders into `RowHeaderCell`, so the target ends where that
cell does and every measurement cell beside it stays unclickable and keeps its own meaning.

Two notes for anyone extending it. `position: relative` on the row is load-bearing and fails
without a bound — an absolutely positioned box with no positioned ancestor resolves against the
initial containing block, so dropping it spreads one dispute's link across the viewport instead of
shrinking the target back; a test pins the declaration and the area is left to a browser. And
suppressing the system focus ring on the link needs **both** halves — `outline: none` alone leaves
the `--ring-focus` box-shadow drawing a second, smaller ring around the digits inside the one on
the overlay, which is exactly the defect the entry below counts twelve of. The row's ID link is no
longer one of them.

## Not done, and why

**The type scale is px, so a browser text-size preference is ignored.** Page zoom works and the
breakpoints follow it; a text-size-only setting changes nothing. The fix is a two-part change —
the `--type-*` tokens *and* the fixed-px boxes holding that text — and doing the first alone
creates the clipping the criterion forbids. `docs/contrast.md` has the detail.

**The focus ring is drawn twice on eleven components** (twelve at the time of the sweep; the
dispute row's ID link left the set when its target was fixed, see above)**.** The design system sets
`outline: none` plus a `box-shadow` ring; twelve components override the outline and get both.
Both are cyan, both are visible, and forced colours is handled, so this is a consistency question
rather than a barrier. Left alone because ticket 14 chose that ring deliberately and unpicking it
across twelve files risks visual regressions this ticket cannot check cheaply.

**`aria-controls` on the menu button dangles while the panel is closed,** because the panel is
conditionally rendered. Widely tolerated, and unpicking it means keeping a hidden panel in the DOM.

**`∅` carries two meanings** — "drawn and never acted" in the matrix, "no justification published"
on the dispute view. Both are worded, so neither rests on the glyph, but a reader who learnt the
first will meet the second. Flagged rather than changed: it is a vocabulary decision and
`CONTEXT.md` is where it belongs.

## Found after the sweep, by a tool the sweep also ran

**A link in body prose, marked by colour alone.** `Footnotes.tsx`'s window footnote ends
"…never as a fraction of the window it ran in. *What that means for these figures*." — and the
link was `--accent` on `--text-2` with no underline, 1.22:1 where WCAG 1.4.1 wants 3:1 of a
colour-only link. axe names it `link-in-text-block`. Ticket 28; both prose links now carry a
permanent underline, and `docs/contrast.md` records why the ratio itself was not chased.

**Three things about it are worth more than the fix.**

**It was not caused by the prose that moved.** The obvious suspect was `9e69dc8` and its
neighbours, which moved the sparsity note into the footer after this sweep. They did not: the link
sits in exactly the same sentence at `1904247` as it does today. Nor was it the palette — this
sweep raised `--text-3` and `--text-4`, while the body ink is `--text-2`, unchanged since
`f2decbf` adopted the system.

**A rule can be present, evaluated, and still silent.** The same defect exists on
`/agent-jurors/notanagent`, in `AgentJurorPage.tsx`'s not-an-agent-juror paragraph, at the same
two colours. axe reported that route as **zero violations** — because there `link-in-text-block`
landed in `incomplete`, not in `violations`: it could not resolve the background behind the
paragraph, so it declined to judge. A default audit prints violations, and the finding was in the
other list. So "zero violations" was compatible with the defect being present the whole time, and
this is the companion to the target-size lesson above: **`incomplete` is silence, and silence is
not a pass.** Read both lists, on every route.

The inverse also holds and is easier to get wrong in the other direction: `/` reports **187**
`incomplete` colour-contrast nodes, and they are gradients and overlaps axe cannot composite, not
187 defects. Neither number means what it looks like.

**The default is the trap, and it cannot be fixed at the source.** The vendored `base.css` sets
`text-decoration: none` on every `a`, so any link dropped into prose anywhere in this app is
colour-only until its own component says otherwise — and that file is vendored verbatim and must
not be edited. Every other link in the repo is standalone (a dagger, an ID, a nav item) and
legitimately underlines on hover only, so a blanket rule would contradict several documented
decisions. It is per-prose-container, and there are two containers.

Audited after the fix at `wcag2a,wcag2aa`, at 1440 and at 390, on all eight routes — the seven
plus the not-an-agent-juror state: **zero violations everywhere.** On the two routes that carried
this rule, `/` and `/agent-jurors/notanagent`, it no longer appears in `incomplete` either — the
underline settles the question axe could not, so there is nothing left to decline. That pair is
what was checked for the `incomplete` list specifically; the zero-violations figure is all eight,
at both widths. Which is the check, not "it looked fine".
