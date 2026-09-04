---
status: done
blocked_by: ["07", "15"]
---

# 08: Make the court's parameter change visible and correctly handled

**What to build:** A visitor never reads a figure that was computed silently across two different
period regimes. Court 34's period durations changed between dispute 151 and dispute 152, so every
duration this dashboard uses is resolved from the parameters that were actually in force for that
dispute, and the one dispute that ran under the older regime is marked wherever its numbers are
counted. No latency is divided by a window at any altitude: a window appears beside a latency as an
absolute duration, never as a denominator. This dashboard is public and may be cited in research.
See ADR-0005, which closes the question ADR-0001 left open.

**Design:** `../canvas/Errors.dc.html:168-218` (the dispute-151 marker, on the row and on every
aggregate), `../canvas/Dispute.dc.html:88-96` (a configured window beside an elapsed one),
`../canvas/Main.dc.html:208-216` (the footnotes), `../canvas/README.md` for provenance

- [x] The court's parameter history is read from chain events rather than from its current parameters
- [x] Each dispute resolves the period durations that were in force when it ran
- [x] No latency is divided by a window at any altitude — not in a cell, not in a marginal, not on a
      dispute view or an agent juror's own view — and nothing renders as a percentage of a window
- [x] Where window context is shown at all, the configured window and the time actually elapsed appear
      side by side as two absolute durations and never as a ratio, in the shape the dispute timeline
      strip uses: the period named, its configured duration, then how long it in fact ran
- [x] The dispute that ran under the pre-modification parameters is visibly marked in the matrix, with
      an explanation reachable from the marker
- [x] That explanation is the window section of the method page ticket 15 builds, reached at its own
      fragment so the matrix footnote can link straight to it. This ticket writes the section's
      content and 15 owns the page, its route and its anchors
- [x] That explanation names both regimes as absolute durations — the 8-hour commit window dispute 151
      ran under, against the 45 minutes configured from dispute 152 onward — which is what the resolved
      per-dispute durations are for
- [x] The marker travels with every figure the parameter change touches, not with the row alone: a `†`
      on the number, the reason one line below it, the full account one click away. This ticket supplies
      the marker and that rule; ticket 06 applies it to the per-agent-juror marginals
- [x] Tested against fixtures covering both parameter regimes

## What landed

`src/performance/court-parameters.ts` reads `CourtCreated` and `CourtModified` from KlerosCore on
Arbitrum. Both deployed events carry `timesPerPeriod` in full, so the history is two logs and no
archive `eth_call` — but the signatures in `kleros-v2/contracts/src` have since gained an
`_eligibility` argument, and one of those hashes to a topic that matches nothing and returns a court
that was never configured. The deployed ABI is the source; a test pins it.

`src/performance/windows.ts` is the pure half: `toRegimes` orders the history, `windowsFor` resolves
one dispute **period by period** rather than once. That is how the court itself works — `passPeriod`
reads `timesPerPeriod` when it is called — so a dispute created under one configuration and passed
into its commit period under the next ran the later window. Today's data never straddles the change,
which is exactly why a per-dispute lookup would have looked right.

`RawCourtData.parameters` is nullable on the same terms as `commits`, and `MatrixRow` gained
`windows` and `underEarlierWindows`. `CourtTotals.changedWindows` groups the marked disputes by what
they ran under, so the footnote can say what the difference *was* and ticket 06's marginals inherit
the rule. The marker is keyed on the commit and vote windows only: nothing here is measured from the
evidence or appeal periods, and a marker with no visible cause teaches a reader to ignore markers.

Two findings worth carrying forward. The canvas samples the post-change vote window as 45m; it is
**30m** on chain, which is why every duration beside the matrix is read rather than transcribed. And
`/method`'s window section is deliberately **prose**: it is the destination of the marker's own link,
so it has to answer on a cold load rather than waiting on an Arbitrum read. The guard against it
drifting is `court-parameters.integration.test.ts`, which asserts the chain still reports exactly
the configurations the page names — a new one fails nightly in CI before anybody reads a stale
account. **It worked, on 2026-08-26**: see the Comments below.

Also fixed in passing, because this ticket added a second read of the same shape: the commit caveat
on `MatrixPage` was worded for a read in flight and shown for a read that had failed —
`commitCoverage.read` is false in both states. Both Arbitrum caveats now take their wording from the
error as well as the flag.

## What review caught

A review pass found nine things; six were real and are fixed here. The one worth carrying forward:

**A dispute the history cannot place is not a dispute that matched.** `windowsFor` returns `null`
for a dispute older than every configuration read — which is exactly what a provider capping
`eth_getLogs` produces, since the dropped log is the court's *oldest*. That row is unmarked, and the
footnote's "every dispute here ran under the period durations the court holds now" would then have
stated the opposite of the truth with no error anywhere. `CourtTotals.unplacedDisputes` now counts
them, and the footnote and the provenance footer both name them. This is the same shape as ticket
04's title shortfall and ADR-0004's commit shortfall: a read that comes back short renders as a
fact unless something counts it.

The rest: the row flag named the commit window unconditionally (wrong the first time a court changes
only its vote window); `changedWindows` groups came out newest-first because rows do; `WindowChange`
carried a whole `PeriodWindows` when only two of its four fields are agreed across the group; and two
comments asserted that no period straddles the change — dispute 151's appeal period does, harmlessly,
and the limit is now stated rather than denied.

**The live suite is near the endpoint's ceiling.** Adding a fourth chain read to
`draws-subgraph.integration.test.ts` returned HTTP 429 on the whole-suite run — as
`UnknownRpcError: Cannot read properties of undefined`, the shape CLAUDE.md records. It reads
`parameters: null` instead; the live history is exercised by its own suite.

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

## Comments

**2026-09-04 — the tripwire fired, and ticket 19 was the rewrite.** Court 34 took a third
configuration on 2026-08-26: the evidence period 45 minutes to 10, `timesPerPeriod` from
`[2700, 2700, 1800, 129600]` to `[600, 2700, 1800, 129600]`, at 13:14:01 UTC in block 498587731.
Exactly two assertions in `court-parameters.integration.test.ts` went red — the one pinning the
history to what `/method` describes, and the one pinning it to the captured fixture — and nothing
else in the suite moved. That is the arrangement this ticket built working as designed, and it is
worth recording that the account it protected had in fact gone stale for nine days before anyone
looked.

**Two things above are true of the day they were written and no longer of the court.** The
acceptance criterion "names both regimes as absolute durations" is now three regimes, and the
`Pending` block ticket 15 left spoke of "the two period regimes". Neither is edited here: they
record what this ticket delivered. `/method` is the live account, `docs/knowledge/court-34.md` is
the durable one.

**What ticket 19 learned that this ticket could not have.** The count of configurations and the
count of *superseded measured windows* are different numbers, and the design already depended on
their being different without anyone having met a case where they were. `sameMeasuredWindows`
compares the commit and vote windows only — written here as a guard against a hypothetical court —
and the 2026-08-26 change is that court: a real reconfiguration that marks nothing, because no
figure on this dashboard is measured from the evidence period. The marker never moved, and the only
thing that had to change was the prose.
