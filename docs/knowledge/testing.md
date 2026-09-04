# What the test suites can and cannot prove

Every fixture here is one successful read of a working court, and jsdom lays nothing out. These
are the classes of defect the suites are structurally unable to catch.

**The test counts quoted below are snapshots, and they disagree with each other** — ~450, 619, 736,
809 and 832 appear across these entries, each true at the ticket that wrote it. There are **52 test
files** on disk today (44 offline, 8 integration). Read a count here as "the suite was large and
green", never as a figure to assert against.

Each entry below cost real effort to discover and is easy to get wrong again.
They are facts about this codebase and the live court, verified against chain, subgraph
or a browser at the time noted. `CLAUDE.md` § Tripwires carries a one-line form of each;
this file is the full account.

- **jsdom does resolve styled-components in `getComputedStyle`, so CSS-only facts are testable**
  (2026-09-04, ticket 26). The injected `<style>` participates in the cascade: an element under
  `text-transform: uppercase` reports `uppercase`, and one overriding it reports `none`. That
  opens the class of defect nothing else can reach — a rule that changes what is drawn without
  changing text content, an accessible name or any attribute. Two cautions. Verify the assertion
  is not vacuous by probing a sibling that should report the *other* value, because a rule jsdom
  failed to apply and a rule that says `none` are the same result. And it stays a fact about the
  cascade, never about layout: `getComputedStyle` reports what was asked for, and jsdom lays
  nothing out — see the width entries above.

- **The offline suite goes red under CPU contention, and it looks like a bug you just introduced.**
  `yarn test` is ~450 tests across 27 files, many of them rendering the whole matrix, and vitest
  runs the files in parallel against the default 5s timeout. Run it while something else is
  saturating the machine — a `/code-review` subagent, another worktree session, a dev server — and
  the run stretches several times its normal duration and a handful of tests time out. Measured on
  ticket 06: one run took 40s against a normal 8.6s and failed four tests, and three subsequent
  quiet runs were 449/449 with no other change. The tell is the **duration**, not the failure
  count. So a red offline suite whose run took far longer than usual is worth re-running on a quiet
  machine before believing it — the same advice [`chain-and-subgraph.md`](chain-and-subgraph.md) already gives for a red *live* suite, for a
  completely different reason.
- **A green suite here proves the healthy path and nothing else.** Every fixture in this repo is
  one successful read of a working court, so no test can contain a second read that failed, a
  round that does not exist yet, or a court that is not this one. A review pass over ticket 05
  found seven defects against 105 passing tests, five of them the same shape: a read that failed
  rendering as a read that returned nothing — an empty payload builds a *successful* model with no
  rows, and the page then states that the court has held no disputes. When adding to this seam,
  write the failure case by hand; the fixtures will not hand it to you.
- **jsdom lays nothing out, so a whole class of defect is invisible to `yarn test`.** This is the
  same lesson ticket 09's clipping bug taught in one instance, and ticket 16 hit three more in one
  afternoon — every one of them with 619 green tests. A `ul` carries 40px of UA
  `padding-inline-start` and this repo has no reset that removes it, so the phone card stack was
  indented 40px and pushed the page 40px sideways, which is the single thing that layout must never
  do. `flex: 1 1 380px` on an item that also gets rendered inside a *column* container is a
  **height**, so the sparsity note became a three-line paragraph in a card three hundred pixels
  tall; the fix is to put the basis on the container as `> * { flex: … }`, where the arrangement
  owns it. And a `span` marked with a rule underneath it draws that rule across the whole container
  when the container stretches it, which a flex row never does and the folded nav's column always
  does. None of the three throws, warns, or fails a test. Anything positional in this repo needs a
  browser at the width it is claimed to work at, and `agent-browser` with `--executable-path` is
  how the rest of this ticket was checked. **Ticket 17 found three more the same way, with 736
  green tests**, and two of them are worth knowing as rules rather than as anecdotes.
  A state the live court has not reached *yet* still has to be opened somehow: the compact
  density needs more than forty disputes and court 34 held thirty-one, so it was checked by lowering
  `COMPACT_FROM_ROWS` in the dev server, reading the page, and putting it back. A fixture cannot
  stand in — jsdom lays nothing out, which is the whole reason the browser is being opened.
  **That workaround is spent: the court passed forty disputes and the compact density is live**
  (46 rows on 2026-09-04, `court-34.md`), so it is now read the way every other state is — open the
  page. The technique keeps its general form, which is that a threshold nobody can reach on demand
  is still testable by moving the threshold, and the caveat with it: what a lowered constant opens
  is the density at *thirty* rows, and ticket 24 is the first read of it at the real count.
- **Two ways a browser measurement lies about text, both met in one sweep (ticket 29).**
  Measuring whether a string fits its slot is the check behind every truncation claim here, and the
  obvious two ways to do it are both wrong.

  `getComputedStyle(el).font` returns the **empty string** in Chrome whenever the shorthand cannot
  be serialised, which it usually cannot — so a probe element built by copying that value is
  measured in the page's default 14px sans and reports a width that is nothing to do with the
  element. Set the font longhands individually (`font-family`, `font-size`, `font-weight`,
  `letter-spacing`, `text-transform`) or clone the real node.

  And `scrollHeight` cannot tell you whether text wrapped if the element declares a `min-height`:
  it reports the declaration. `AgentStack` reserves two lines, so every column answered "wraps" —
  including the ones showing one line. Measure the **string** against the slot's width instead of
  asking the box how tall it is.

  The general form, since both failures share it: a reading taken *through* a declaration measures
  the declaration. Measure the thing whose size is in question against the thing that constrains
  it — `scrollWidth` against `clientWidth` for a clip, the child's rect against the parent's for a
  spill.
- **A programmatic `.focus()` does not reproduce a focus-obscured-by-sticky-header defect.** Chrome
  centres an element focused from script within the scrollport reduced by `scroll-margin-top`, so
  every link lands mid-viewport and every reading comes back clean. Only **sequential focus
  navigation** — real Tab or Shift+Tab keys — parks the element against its scroll margin, which is
  where WCAG 2.4.11 fails. Ticket 29 found the matrix's dispute links wholly behind the frozen
  column header this way, after three `.focus()` probes had said the page was fine. Axe does not
  test 2.4.11 either, so a green run and a clean script are two silences, not two confirmations.
- **jsdom resolves styled-components rules but not shorthands, and its own UA sheet can make an
  assertion vacuous.** `getComputedStyle` *does* see a descendant rule from a styled component —
  `color` and `text-underline-offset` come back correctly. But it does not expand
  `text-decoration` into its longhands, so `textDecorationLine` reads `"none"` on an element that
  is visibly underlined, while the `textDecoration` shorthand reads `"underline"`. Worse, jsdom's
  UA stylesheet underlines anchors, and the vendored `base.css` that sets `text-decoration: none`
  is **not** in the jsdom cascade — so `expect(getComputedStyle(a).textDecoration).toContain(
  "underline")` passes whether or not the component declares one. Ticket 28 wrote that assertion
  first and it was green with the declaration deleted. Pin a property with no UA default instead:
  `text-underline-offset` reads `"2px"` from the rule and `"auto"` without it. The general form —
  **before trusting a computed-style assertion, delete the declaration and watch it go red.**
- **jsdom has no `window.matchMedia` at all** — `undefined`, not a stub answering false. So
  `useIsNarrow` in `src/styles/breakpoints.ts` guards the read exactly as `useIsClipped` guards
  `ResizeObserver`, and returns false where there is nothing to ask; every test written before
  ticket 16 therefore keeps rendering the desktop form with no change. A test of the reduced form
  has to say so, through `src/test/viewport.ts`. An unguarded `window.matchMedia(…)` here would
  throw inside the render of most of the chrome, on every test in the suite.
- **A view that renders inside the shell cannot be tested by asserting the shell.**
  `routes.test.tsx` checks the nav and the footer on every path in `ROUTES`, and the 404 renders
  both — so adding `/disputes/156` to that list proved nothing about whether the route matched.
  A route test has to assert something only that view says. This was found by opening the page,
  not by the suite.
- **`yarn preview` silently moves to another port when one is in use, and other worktrees are
  using them.** Three checkouts of this repo can each be serving a `dist`, so `localhost:4173`
  answers HTTP 200 with *a different branch's build* — the new route 404s, the bundle looks stale,
  and it reads exactly like a routing bug. The tell is in the server's own output ("Port 4173 is in
  use, trying another one…"), which is easy to miss when it is backgrounded. Read the port it
  actually chose, and confirm by matching the `assets/index-*.js` hash the page requests against
  the one on disk. The cheap prevention is to pick a port and refuse to move off it —
  `yarn dev --port 5199 --strictPort` fails loudly instead of serving somebody else's branch,
  which is what ticket 17's browser pass ran on.
  **And the far side of that advice: a later session finds the port taken and should look before
  killing or moving.** Ticket 22 did — `lsof -nP -iTCP:5199 -sTCP:LISTEN` named a vite process
  whose argv pointed at *this* checkout's `node_modules`, and a vite **dev** server compiles from
  source, so it was already serving that session's own edits. Reusing it is right and starting a
  second one on another port is the thing that reintroduces the trap above. Confirm rather than
  assume: `agent-browser console` prints a `[vite] hot updated: /src/…` line naming each file as
  you save it, which is proof the server on that port is compiling the tree you are editing. A
  `yarn preview` server is the opposite case and has to be restarted, because it serves a built
  `dist` that no edit reaches.
