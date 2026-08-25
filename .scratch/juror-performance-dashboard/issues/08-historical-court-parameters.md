# 08: Make the court's parameter change visible and correctly handled

**What to build:** A visitor never reads a figure that was computed silently across two different
period regimes. Court 34's period durations changed between dispute 151 and dispute 152, so every
duration this dashboard uses is resolved from the parameters that were actually in force for that
dispute, and the one dispute that ran under the older regime is marked wherever its numbers are
counted. No latency is divided by a window at any altitude: a window appears beside a latency as an
absolute duration, never as a denominator. This dashboard is public and may be cited in research.
See ADR-0005, which closes the question ADR-0001 left open.

**Blocked by:** 07, 15

**Design:** `../canvas/Errors.dc.html:168-218` (the dispute-151 marker, on the row and on every
aggregate), `../canvas/Dispute.dc.html:88-96` (a configured window beside an elapsed one),
`../canvas/Main.dc.html:208-216` (the footnotes), `../canvas/README.md` for provenance

**Status:** ready-for-agent

- [ ] The court's parameter history is read from chain events rather than from its current parameters
- [ ] Each dispute resolves the period durations that were in force when it ran
- [ ] No latency is divided by a window at any altitude — not in a cell, not in a marginal, not on a
      dispute view or an agent juror's own view — and nothing renders as a percentage of a window
- [ ] Where window context is shown at all, the configured window and the time actually elapsed appear
      side by side as two absolute durations and never as a ratio, in the shape the dispute timeline
      strip uses: the period named, its configured duration, then how long it in fact ran
- [ ] The dispute that ran under the pre-modification parameters is visibly marked in the matrix, with
      an explanation reachable from the marker
- [ ] That explanation is the window section of the method page ticket 15 builds, reached at its own
      fragment so the matrix footnote can link straight to it. This ticket writes the section's
      content and 15 owns the page, its route and its anchors
- [ ] That explanation names both regimes as absolute durations — the 8-hour commit window dispute 151
      ran under, against the 45 minutes configured from dispute 152 onward — which is what the resolved
      per-dispute durations are for
- [ ] The marker travels with every figure the parameter change touches, not with the row alone: a `†`
      on the number, the reason one line below it, the full account one click away. This ticket supplies
      the marker and that rule; ticket 06 applies it to the per-agent-juror marginals
- [ ] Tested against fixtures covering both parameter regimes

## From ticket 15: your section of the method page is built and empty

`/method` exists, and `src/pages/MethodPage.tsx` carries a `#window` section with a `Pending` block
reading, in full: *"The two period regimes — which disputes ran under which, as absolute durations
read from the court's own parameter history — are not written here yet. That account is ticket 08's,
and until it lands this section says so rather than leaving you to infer what is missing."*

**Replace that block; keep the section, its heading and its `id`.** The prose above it — that court
34's durations changed partway through, and that this is why every figure is an absolute duration
and never a percentage — is ticket 15's half and already written, so do not restate it.

Two links already point here and will keep working:

- The footnote under the matrix on `/` links to `/method#window` and words itself as "what that
  means for these figures". It lives in `pages/MatrixPage.tsx`, not in `Matrix.tsx`.
- `MethodPage.test.tsx` pins every anchor on the page, and asserts that the window account is
  *absent* — `queryByText(/45 minutes/i)` and `/8 hours/i` must not match. **Those two assertions
  are yours to delete** when you write the real durations in; they exist so the two tickets cannot
  both write the same account.

The row flag is separate and unchanged: `Matrix.tsx`'s `ROW_FLAGS` still reserves the first slot for
the changed-window flag, above the lone panel.

### From ticket 13, 2026-08-25 — a new read is three entries, not one

Every read this ticket adds needs somewhere to fail out loud, and the plumbing exists:

- **A name in `SOURCES`** (`src/read-failure.ts`) — the deployment or host a reader could go and
  check, not a description of it. Throw a `ReadFailure` carrying it and the banner gets a status
  line for free; anything else prints "No response", which is the honest answer rather than a gap.
- **A tier in the view's `failuresOf`** — `blocking` if the failure costs a figure, `degraded` if it
  costs only a label. ENS is the only documented exception, so a new read is almost certainly loud.
- **A `what` sentence** saying what the reader loses. It is printed in the banner beside the source,
  and it is the half a reader acts on.

Then two things that are easy to miss. `affects(failures, source)` is what decides whether an
aggregate is labelled partial, and it is **per source**: ask whether the endpoint behind *your*
figure failed, never whether anything on the page did. A page-wide flag was the first cut and it
labelled every stat tile partial over a missing dispute title, contradicting a notice a few hundred
pixels below it. And per `CLAUDE.md`, a new read is another query that can drift out of step with
the ones beside it — check its own error, and where a figure joins two reads, say which half is
stale rather than that "the court" is.
