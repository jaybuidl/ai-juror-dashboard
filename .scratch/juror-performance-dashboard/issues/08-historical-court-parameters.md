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

### From ticket 12, 2026-08-25 — the row flag list changed shape, and your rail is already wired

**`ROW_FLAGS` in `src/performance/Matrix.tsx` now takes a computed label.** `label` is
`(row: MatrixRow, now: number) => string` rather than a string, because the live flag counts
elapsed time and the seam holds no clock. Yours is static and ignores both arguments:
`label: () => "8h window"`. The slot reserved for it is unchanged — first in the array, above the
lone panel — and the live flag sits below both.

**The left rail now takes the tone of whichever flag the row wears**, per `Main.dc.html:305`, where
`mark` is amber for a window or a lone panel and mint for live. So the window flag gets its amber
rail for free the moment you add the entry; you do not need to touch `BodyRow`. The row *tint* is a
separate question and stays keyed on liveness, which is what the artboard does.

**`isFinalised` is in `src/disputes/liveness.ts`** and ADR-0007 explains why it is the ruling and
not the period. If your window logic needs to know whether a dispute is still moving, read that
rather than testing `period` — nothing else should acquire a second answer to that question.
