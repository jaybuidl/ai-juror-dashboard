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
