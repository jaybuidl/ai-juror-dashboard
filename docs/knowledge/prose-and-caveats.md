# Prose, caveats and the layout fork

This dashboard renders one record three ways. The model is shared by construction; the prose is
shared by hand, and the prose is where they drift. Rules for any sentence that names a figure.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **Two layouts share their model by construction and their *prose* by hand, and the prose is
  where they drift.** Ticket 16 gave the matrix a second rendering; `cell.ts`, `row-flags.ts`,
  `Legend.tsx` and `Footnotes.tsx` are shared so the states, the flag precedence and the caveats
  cannot fork. **The caveat card this entry is worked through no longer exists** (§ Status) — the
  rule outlived it, and the shape to look for is any sentence naming a cell, a column, a row or an
  element of the chrome — and review then found five sentences copied from the desktop that were false on
  the phone. The provenance footer named the latency strip's comparison band on a page with no
  strip (and the comment beside the strip's removal claimed otherwise); the caveat card said "each
  column header" and "a blank cell" on a layout with neither, two hundred lines from a
  `SparsityNote` carefully parameterised to say "slot"; the commit-shortfall notice told a reader
  that N slots read "Not read" when a card slot shows the commit only while a reveal is still
  ahead, so almost none of them do. Every one passed lint, types and 619 tests. **Any string in a
  view that names a cell, a column, a row, a grid or an element of the chrome is a claim about
  which layout the reader is looking at**, and gets the same treatment `SparsityNote`'s noun does.
  **The 10 + 16 merge produced four more of them, and no branch could have caught one.** Ticket 10
  put two figures in the matrix's column headers and gave the footer three sentences about them;
  ticket 16 drops the column headers whole. Merged, all three described figures a phone reader
  cannot see — one promising a figure "is shown yet" on the one layout where none is coming — and
  a fourth, the payout failure banner, named the column headers outright. Both parents were
  correct alone. So the rule has a second half for anyone merging a branch into this one: **a
  ticket that adds a figure to a desktop-only element adds every sentence about that figure to the
  phone's list of things to gate**, and the gate is `!narrow` in `provenanceOf`, tested in both
  directions because a caveat that is absent for the wrong reason tests nothing. `MatrixPage`'s
  phone describe block carries those four. **Ticket 17 made it three renderings rather than two**,
  and the third is not a width: past `COMPACT_FROM_ROWS` the column header keeps three of its six
  figures, so the same sentences that were false on a phone are false on a long matrix. The gate is
  now `provenanceOf(props, narrow, dense)` with `payoutsShown = !narrow && !dense` — one predicate
  named for what it actually asks — and the caveat card has a third branch. The next reduction adds
  a fourth: the question to ask of any sentence here is not "which layout" but "is the figure this
  names on the screen the reader has".
  **Ticket 22 added that fourth, and it is not a reduction at all** — which is why stating the
  rule was not enough to follow it. The matrix's comparison-band caveat was gated on `!narrow`,
  because the strip is the element the phone drops; but `LatencyStrip` has an empty branch of its
  own and draws a *sentence* instead of a plot wherever nothing has revealed. So on a cold load,
  or a subgraph that is down, a desktop reader was told about a band on the one page where nothing
  above came from a read either. The gate a caveat needs is on the **element**, not on the
  condition that usually removes it: `!narrow && measured?.totals.revealLatency != null`. The
  sibling page got this right in the same diff (`AgentJurorPage` gates on
  `marginals.revealLatency`), which is the tell that the rule was known and the *width* was still
  the thing that came to mind. `/code-review` found it; no test did, because every test asserting
  the caveat rendered a court that had reveals.
- **Narrowing a set is a change to every sentence quantified over it, and gating the figure does
  not gate the prose.** The reverse direction of the trap above, found by the 11 + 17 merge and
  the one no gate on either branch could have caught. Ticket 17 split `Sparsity.undrawnDisputes`
  out of the read disputes, because a dispute the court has not drawn a panel for has no draw in
  *any* column — and it held those rows out of `Sparsity.emptyColumns`, whose own comment calls
  that "the one figure not gated on it". It was not: ticket 11 had built a page that states the
  same quantity **in words** — "across the N disputes whose draws have been read, this agent
  juror has not come up" — on the one view whose entire subject is a column being empty. Merged,
  a court in its opening hours would tell a reader that every agent juror had been passed over
  on the strength of a draw that has not happened, which is exactly the misreading `undrawnDisputes`
  exists to close. Both parents were correct alone, 809 tests were green, and nothing but reading
  found it. So when a ticket narrows a set, the sweep is not "which figures are computed from it"
  — the compiler finds those — but **which sentences anywhere are quantified over it**, including
  on views that ticket never opened. The tell is a number in prose with a noun after it.
- **A page can say something true of every figure on it and false about the thing it is naming.**
  Ticket 11's footer told a reader of `/agent-jurors/nope` that "the court has drawn it in none of
  the disputes read" and that "not being drawn is the measured record" — sentences written for
  baskerville, which was then a real agent juror the court had never drawn — the state every new
  roster entry passes through — reaching a path segment that names nobody at all. Both states show
  no figures and only one of them is a reading of the court; the other has nothing for the court
  to have failed to do. It is the "not drawn" versus "not read"
  distinction one level up, and the same rule applies: **an empty page has as many empty states as
  it has reasons to be empty, and each needs its own words.** Nothing caught it — 731 tests, lint,
  types and a green build — because every test asserted what the page *shows*, and what was wrong
  was a sentence about something it does not.
  **The banner half is the same defect and is easier to miss**, because it is composed somewhere
  else. `failuresOf` runs before a view's not-found branch returns, so an address that names
  nothing gets the whole stack — and on ticket 11 every one of those sentences named the agent
  juror the address had just failed to name ("no cumulative ETH figure below is a measurement" over
  a page with no figures at all). The rule that settles it is ticket 13's own tiering read
  literally: **a failure is loud because it costs a figure, so a page carrying no figure raises no
  banner**, which is why `NotFoundPage` passes none. Compose the failures *after* the branch that
  can return early. `DisputePage` still does it the other way round and is the milder version of
  the same thing — its wording is generic, so it banners a page showing nothing rather than
  banners it about the wrong dispute. Worth fixing the day that view is touched; recorded here
  rather than changed inside ticket 11's branch.
- **One failed source gets one banner line, and the provenance footer never carries the failed
  half.** Ticket 13's rule, made concrete by the merge that first tested it. A read that fails is
  said exactly twice — in the banner at the top, and in the place where the figure would have been
  — so the footer stating it too makes one outage three voices, and a reader who meets the same
  sentence three times stops reading any of them. The half the footer keeps is the read still *in
  flight*, which is provenance for what is on screen rather than a failure. Two consequences that
  are easy to get wrong: when one endpoint serves two reads (Arbitrum serves the commit scan and
  the parameter history) an outage takes both, so `arbitrumFailureOf` returns the **worst one**
  rather than listing the source twice — and a caveat that goes quiet under a banner is correct,
  where one that says "still being read" about a read that gave up is the `RosterView` trap again.
  Tickets 06, 09 and 10 each added a read or a view and each met this; ticket 11 still will.
  Ticket 10 is the one that tested the rule on a **shared** endpoint from the subgraph side: its
  payouts come from the same Goldsky deployment as the disputes and the draws, so `coreFailureOf`
  now collapses four reads into one line the way `arbitrumFailureOf` collapses two, and it ranks
  last because it costs the least — two of six figures in a column header, against the matrix.

