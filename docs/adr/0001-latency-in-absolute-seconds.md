# Latency is stored in absolute seconds, not as a fraction of the period

A juror's speed could be expressed as seconds since the period opened, as a fraction of the court's
configured period length, or as a fraction of how long the period actually ran. We store absolute
seconds, and treat any fraction as a display detail computed on top.

## Considered Options

Both fractional forms were measured against the real data and rejected:

- **Fraction of the configured period.** Court 34 was created with `timesPerPeriod`
  `[43200, 28800, 28800, 129600]` and modified to `[2700, 2700, 1800, 129600]` at Arbitrum block
  496518927 — which falls between dispute 151 and dispute 152. columbo's 126-second commit is
  **0.44%** of dispute 151's window and **4.7%** of dispute 152's. Identical behaviour, 10.7x apart,
  with the discontinuity sitting inside the dataset.
- **Fraction of the actual period duration.** The denominator is set by when the *last* juror acted
  plus however long `passPeriod` took to be called. Dispute 160's commit period ran 229 seconds;
  dispute 152's ran 2314. A 200-second commit scores 87% in one and 8.6% in the other. A juror's
  score would move because its peers moved.

Absolute seconds is the only form whose meaning does not depend on court configuration at the time
or on the behaviour of other jurors, which is what makes statistics across disputes possible.

## Consequences

Any "% of window" shown in the UI must resolve its denominator per dispute from the `CourtModified`
event history, not from the court's current parameters. Dispute 151 has to be visibly marked as
running under the pre-modification parameters: this dashboard is public and may be cited in
research, and a median silently computed across two period regimes would be misleading.

Display units are not covered by this decision. Reveal latency has a median of 85 seconds and a
minimum of 7, so the UI formats short latencies in seconds and long ones in minutes.
