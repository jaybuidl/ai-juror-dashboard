import { type Dispute, type RawDispute, rulingOf } from "./disputes";

/**
 * What "still happening" means, in one place.
 *
 * Liveness is asked three separate questions by three separate layers — how often to re-read
 * the court, what may be cached across a reload, and which rows wear the live treatment — and
 * they have to agree. A row marked live whose data had been frozen as finalised would be a page
 * announcing that something is unfolding while quietly refusing to look at it.
 *
 * A new module rather than a section of `disputes.ts` because the predicate is a fact about a
 * dispute and the interval is a policy about reading one, and only the first belongs in the
 * model. Everything here is pure; the clock arrives as an argument.
 */

/**
 * How often the court is re-read while anything in it is still being decided.
 *
 * From the spec. It is fast enough to watch a commit period unfold — the shortest measured
 * commit latency in this court is 14 seconds — and it is the reason the commit log scan is
 * deliberately *not* put on an interval: that read costs one RPC call per commitment against
 * an endpoint that rate-limits per call, and five-second polling of it returns HTTP 429.
 * See `useCourtPerformance`.
 */
export const LIVE_REFETCH_MS = 5_000;

/**
 * Whether the court has finished with this dispute.
 *
 * **Keyed on the ruling, not on the period**, and the acceptance criterion this ticket was
 * written with says the opposite — "a dispute is treated as finalised once its period is
 * execution". That was written before disputes 164–166 were observed sitting in `appeal` with
 * every draw revealed and `ruled: false`, and it is wrong in both directions this ticket cares
 * about:
 *
 * - **As a display predicate** it disagrees with the page already shipped. The matrix caption
 *   counts finalised rows as `ruling.state !== "pending"`, and the seam gives every draw in an
 *   unruled dispute a `live` state. A caption calling a dispute finished while its own cells
 *   read `Revealed` would be the page contradicting itself a column apart.
 * - **As a caching predicate** it is unsafe. Entering `execution` is not the last thing that
 *   happens to a dispute: `ruled` and `currentRuling` are still written when someone executes
 *   it. Freezing a dispute at that point caches a ruling the court has not reached, which is
 *   the one thing a page that may be cited must never do.
 *
 * The cost of the stricter predicate is that a dispute nobody ever executes stays live for
 * ever, and is polled for as long as the tab is open and focused. That is a real cost and it
 * is the right way round: it spends requests rather than stating a result.
 */
export function isFinalised(dispute: Dispute): boolean {
  return dispute.ruling.state !== "pending";
}

/**
 * The same question of the payload, before it has been modelled.
 *
 * Expressed through `rulingOf` rather than by reading `ruled` directly, so that the two
 * predicates cannot drift: there is one definition of what the court has decided, and both of
 * these are readings of it.
 */
export function isRawFinalised(raw: RawDispute): boolean {
  return rulingOf(raw).state !== "pending";
}

/**
 * How often to re-read a court, given what the last read of it returned.
 *
 * `false` is react-query's "do not poll", and it is the answer for a court that has nothing
 * unfinished in it — the historical record does not change, and a dashboard that polled it
 * every five seconds for ever would be spending a public endpoint's budget on a fixed answer.
 *
 * A court that has not been read yet also gets `false`, deliberately. Nothing is known to be
 * live, so nothing justifies the interval, and a first read that failed is recovered by the
 * query's own retry rather than by polling on the chance that something is happening.
 */
export function refetchIntervalFor(disputes: readonly RawDispute[] | undefined): number | false {
  if (disputes === undefined) return false;
  return disputes.some((dispute) => !isRawFinalised(dispute)) ? LIVE_REFETCH_MS : false;
}

/**
 * How long the dispute's current period has been open, in seconds — or `null` if it cannot
 * be said.
 *
 * Above the seam by necessity: it is the one figure on the matrix that needs the present
 * moment, and `buildCourtPerformance` reads no clock. `now` is passed in rather than read here
 * so this stays pure and a test can pin it.
 *
 * Two guards, and they are guarding different things. The epoch check is `CLAUDE.md`'s trap —
 * `0` is a real instant in 1970, and `lastPeriodChange` is parsed by the plain number reader
 * rather than by the timeline's null-at-zero one, so an absent moment would render as a period
 * that has been open for fifty-six years. The clamp is about whose clock is wrong: below the
 * seam a negative interval is a payload to reject, because both of its moments came from the
 * chain, but one of these comes from the reader's own machine, and a browser thirty seconds
 * behind the sequencer is not evidence about the court.
 */
export function periodOpenSeconds(dispute: Dispute, now: number): number | null {
  if (dispute.lastPeriodChange === 0) return null;
  return Math.max(0, Math.floor(now / 1000) - dispute.lastPeriodChange);
}
