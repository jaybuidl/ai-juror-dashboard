# 23: Measure the comparison instead of illustrating it

**What to build:** The latency strip's comparison band stops being an assertion and becomes a
reading. Instead of a boundary this dashboard states, the band is drawn from what ordinary
Kleros courts actually did — a median time to ruling over single-round disputes in a named
court, read from the same core subgraph every other figure here comes from, with the count it
was measured over stated beside it.

This is the difference between an argument and a claim. "Ordinary arbitration takes five days"
is something a sceptical reader can decline to believe, and this dashboard hands them the reason
to: the caption says the band measures no court, and the provenance footer says it is the only
thing on the page that did not come from a read. Every other number here is defended and that
one is not, on the page whose entire subject is a speed comparison. A measured band closes the
gap, and it retires the caveat that admits it.

The read is available and cheap in principle. A dispute id is global across every court on the
core subgraph — `CLAUDE.md` § Traps records that as a hazard for `/disputes/:id`, and here it is
the opposite, an affordance: the deployment holds every dispute in every court, with the same
`Round.timeline` this dashboard already parses. What it costs is discipline, because a fifth read
is a fifth thing that can fail, come back short, or drift out of step with the other four.

**The comparison has to be like-for-like or it is worth less than the illustration it replaces.**
Court 34's disputes have been single-round throughout, so the reference must be single-round
disputes too — an appealed dispute in an ordinary court takes far longer, and folding those in
would flatter this experiment with a comparison it did not earn. This dashboard's whole posture
is that partial data must never render as complete, and a comparison quietly stacked in the
experiment's favour is the same sin in a costlier place. State the court, the period the reading
covers, the number of disputes it is over, and whether appealed disputes were excluded.

Three things this inherits from every read before it, none of which are optional:

- **A short read is not a small court.** A subgraph that comes back short answers HTTP 200 with
  fewer disputes and no error, and the band would simply sit somewhere else. Whatever guard this
  read gets, it is arithmetic or a count compared against something asked for — not a
  `response.ok` check.
- **A failure costs a figure, so it is loud.** The band is a figure now. It belongs in ticket
  13's tiering, on the same shared-source collapsing as the other core-subgraph reads, and the
  page needs a state for "the comparison was not read" that is not an invisible band or a band
  drawn at a default.
- **The sentences change with the figure.** `MatrixPage.tsx`'s caveat says the band is
  illustrative and is the only thing above that did not come from a read. Both halves become
  false. `/method` gains an account of where the comparison comes from, since it is now provenance
  rather than illustration, and the `!narrow` gate still applies because the strip is still
  absent below the breakpoint.

Nothing here divides a latency by anything (ADR-0005). The band is a position on an absolute time
axis exactly as it is today; only where the position comes from changes.

If the read turns out to be more than it is worth — the subgraph will not answer it in one query,
or no ordinary court has enough single-round disputes to be a fair reference — say so in
`## Comments` and close it `wontfix`. Ticket 22's corrected illustration is an honest page on its
own, and this ticket exists to make it a stronger one, not to rescue it.

**Blocked by:** 22

**Design:** `../canvas/Main.dc.html:85-100` (the band, as ticket 22 leaves it) and
`../canvas/README.md` for which figures on the artboards are real. No artboard draws a *measured*
band; this ticket changes the band's provenance, not its shape.

**Status:** ready-for-agent

- [ ] The band's boundary is derived from disputes read from the core subgraph, not from a
      constant this repo chose
- [ ] The reference is single-round disputes only, so the comparison is like-for-like with court
      34, and the exclusion is stated on the page rather than only in the source
- [ ] The page states which court the comparison is over, how many disputes it is over, and what
      period they span
- [ ] A read that comes back short is detectable — the guard is a count or an arithmetic identity,
      not a `response.ok` check — and a shortfall is reported as a number rather than as an error
- [ ] A failed read raises one banner line, collapsed with the other core-subgraph reads, and the
      band's own place says what is missing rather than drawing a default
- [ ] `MatrixPage.tsx`'s caveat no longer calls the band illustrative or the only thing on the
      page that did not come from a read, and the sentence that replaces it is still gated to the
      layouts that show the strip, tested in both directions
- [ ] `/method` accounts for the comparison's provenance the way it accounts for every other read
- [ ] The persisted-query decision is made explicitly: whether this payload joins the allowlist in
      `src/persistence.ts`, having answered whether its value survives a JSON round trip and
      whether a *failed* read of it restores safely
- [ ] No latency is drawn as a fraction of the band or of any window (ADR-0005)
- [ ] Verified in a browser: the measured band lands somewhere the axis can show, and ticket 22's
      label placement still holds wherever the boundary lands
