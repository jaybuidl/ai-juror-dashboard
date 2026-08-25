# A dispute is finalised when the court has ruled, not when its period is `execution`

The spec fixed the line the other way. `spec.md` § Liveness read "A dispute is finalised when its
period is `execution`; finalised results are persisted to `localStorage` and not refetched", and
ticket 12's acceptance criterion repeated it. Both were written before the court was watched
closely enough to show what `execution` does and does not mean. The predicate implemented is
`ruling.state !== "pending"`, in `src/disputes/liveness.ts`, and the spec and the ticket were
amended to it rather than left to disagree with the code.

Three layers ask this question and they have to give one answer: how often to re-read the court,
what may be cached and stopped being read, and which rows wear the live treatment. A page that
marked a row live while refusing to look at it again would be announcing that something is
unfolding and then not watching it.

## Considered Options

- **`period === "execution"`.** What the spec said, and what the reserved flag placeholder in
  `Matrix.tsx` was written against. Wrong in both directions this decision has to cover:
  - *As a display predicate*, it contradicts the page ticket 05 already shipped. The matrix caption
    has counted finalised rows as `ruling.state !== "pending"` since ticket 15, and the seam gives
    every draw in an unruled dispute a `live` state, worded `Revealed`. A caption calling a dispute
    finished while its own cells a column away say it is still acting is the page disagreeing with
    itself, on a public page that may be cited.
  - *As a caching predicate*, it is unsafe. Entering `execution` is not the last thing that happens
    to a dispute: `ruled` and `currentRuling` are written when somebody executes it. Freezing there
    caches a ruling the court has not reached, and this dashboard's whole invariant is that partial
    data must never render as complete.
- **`ruled`, through `rulingOf`.** What is implemented. It is the strictly more conservative of the
  two — every dispute it calls finalised really is finished, and the ones it keeps reading are ones
  that can still change. It agrees with the caption, with the cell states, and with `CONTEXT.md`'s
  definition of coherence, which is undefined until a ruling exists. That is the same boundary seen
  from the measurement side rather than the caching side, which is the strongest argument for it:
  the dashboard already had this line drawn and had drawn it here.
- **Two predicates, one per purpose** — `execution` for display, `ruled` for caching, or the
  reverse. Rejected on sight. The disagreement between them is exactly the state this decision
  exists to name, and holding both would put it in the codebase permanently rather than settling it.

## What made the difference

Disputes 164, 165 and 166 sat in `appeal` on 2026-08-25 with all twelve draws revealed and
`ruled: false` — a real state, not a transient one, since every appeal period in this court has run
about eighteen hours. Neither predicate calls those finalised, so they are not what separates the
options. What separates them is the gap on the *other* side: a dispute that has entered `execution`
and has not been executed. `ruled` is the only one of the two that is a statement about the court
having finished.

## Consequences

**A dispute nobody ever executes is polled for as long as someone is looking at it.** This is the
real cost and it is accepted deliberately. Every dispute in `execution` in this court has been ruled
promptly, but "every dispute so far" is the shape of assertion `CLAUDE.md` records as expiring, and
a permissionless `execute` is not a guarantee. react-query does not poll a hidden tab, so the cost
is bounded by attention rather than by uptime. The trade is that the page spends requests rather
than states a result, which is the right way round here.

**Coherence and finalisation are now the same boundary, stated twice.** `rulingChoiceOf` in the seam
already returned `null` for a pending ruling, which is why an unruled draw renders `Revealed` rather
than coherent or diverged. This decision does not add a rule so much as name the one already there
and stop a second, looser one from being introduced beside it.

**`CONTEXT.md` carries the term**, with `_Avoid_: treating `period === "execution"` as the test`.
Anything that needs the question answered reads `isFinalised` rather than asking it again.

**Nothing here settles what to do about a stalled dispute.** If one is ever observed sitting unruled
in `execution` long enough to matter, the answer is a visible statement about it on the page — a
dispute the court has finished hearing and not yet ruled on is a fact worth showing — and not a
quiet widening of this predicate.
