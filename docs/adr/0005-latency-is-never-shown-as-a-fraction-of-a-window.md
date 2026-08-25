# Latency is never shown as a fraction of a window

ADR-0001 chose absolute seconds as the stored form and deliberately left the display question open:
it treats "any fraction as a display detail computed on top" (`:4-5`) and closes with "Display units
are not covered by this decision." (`:32`). The design canvas closed it. No latency is divided by a
window at any altitude — not in a cell, not in a per-agent-juror aggregate, not on a dispute or an
agent juror view. Where the window matters, the configured window and the time actually elapsed
appear side by side as two absolute durations. `canvas/Errors.dc.html:197` states it as a page-level
rule: "This page never divides a latency by a window, and never shows one as a percentage."

This resolves the question ADR-0001 deferred rather than overturning it. Storage was never in doubt;
what was open was whether a ratio could be layered on top for display. It cannot.

## Considered Options

Both fractional forms were measured against the real data in ADR-0001 and rejected as a stored form.
The same two measurements decide the display question:

- **Fraction of the window.** columbo's 126-second commit is **0.44%** of dispute 151's window and
  **4.7%** of dispute 152's — identical behaviour, 10.7x apart, with the discontinuity sitting
  inside the dataset. Resolving the denominator per dispute from the `CourtModified` history, which
  is what ticket 08 was written to do, makes each figure *correct* and leaves the column
  *incomparable*: a reader scanning down it sees a 10x change where no behaviour changed.
- **Fraction of how long the period actually ran.** The denominator is set by when the last juror
  acted plus however long `passPeriod` took to be called. A 200-second commit scores **87%** in
  dispute 160 and **8.6%** in dispute 152. An agent juror's figure moves because its peers moved.

The decisive argument is not accuracy, it is quotation. This dashboard is public and may be cited in
research. An absolute latency is a fact about what happened, and it survives a screenshot, a Slack
paste and an article. A ratio is a fact about a relationship whose second term changed mid-dataset —
it is false the moment it leaves the page, and it cannot carry its own caveat into a screenshot.

Absolute seconds are not comparable across the regime change either; that is exactly what the †
marker exists for, and this decision does not pretend otherwise. The difference is which failure is
safe when quoted. A duration quoted without its † is a true fact missing its context. A percentage
quoted without its † is a number whose denominator silently changed, and nothing on its face admits
it.

## Consequences

The window stays visible where it matters, as two absolute durations. `canvas/Dispute.dc.html:88-96`
renders the period strip in that shape — the period named, then its configured duration, then how
long it in fact ran — and the same for the vote and appeal periods. The reader is free to form the ratio; the page does not form it for
them.

Relative magnitude is carried by the shared logarithmic rail instead (`canvas/Cell.dc.html:91`): 1s
to 1h, shared by both latencies so they can be compared by eye, decoration only, with the number
always present. On a linear rail the fastest three quarters of the record would be indistinguishable
from zero.

Where a comparison would be dishonest, the design declines to compare rather than normalising.
`canvas/Juror.dc.html:108` excludes commit latency from the agent juror's latency profile entirely —
"Reveal latency only. Commit latency is not comparable across dispute 151, which ran an 8-hour
window." Dropping a series is available; rescaling one is not.

Ticket 08 loses two acceptance criteria — the per-cell "how much of that dispute's window was used",
and the note that a percentage may legitimately exceed one hundred — along with the framing sentence
that presupposed them. It keeps its `CourtModified` parameter-history work: the † marker's
explanation sets dispute 151's 8-hour window beside 45 minutes from 152 onward
(`canvas/Errors.dc.html:190-197`), and that needs the durations that were in force per dispute.

The spec's Latency paragraph and ADR-0001's own consequences both stated how to compute a figure
this product does not show. Both are rewritten to keep the dispute-151 marking, which is still
required and still correct, without presupposing that a percentage exists.
