import type { Dispute } from "../disputes/disputes";

/**
 * What the court configured, and which dispute ran under which configuration.
 *
 * The trap this module exists for is the first one `CLAUDE.md` names: court 34's period
 * durations changed between dispute 151 and dispute 152, so the court's *current*
 * `timesPerPeriod` is not a historical fact about anything. A denominator taken from it would
 * be wrong for dispute 151 by a factor of ten, and wrong silently.
 *
 * Pure, like every other module below the seam: it takes the parameter history as the chain
 * reported it and answers questions about moments. No latency is ever divided by anything it
 * returns — ADR-0005 — and nothing here computes a fraction. A window is shown beside a
 * duration, never underneath one.
 */

/**
 * One `CourtCreated` or `CourtModified` event, reduced to the two things a window needs.
 *
 * Defined here rather than beside the other raw shapes in `performance.ts` because this model
 * is what gives it meaning, exactly as `RawDispute` sits beside `toDisputes`. Strings, like
 * every other raw shape, so the model validates them itself and a captured payload stays plain
 * JSON.
 */
export type RawCourtParameters = {
  /**
   * Unix seconds of the block the change was mined in.
   *
   * TRAP: not the `blockTimestamp` on the log. `eth_getLogs` on arb1 returns that field on
   * every log and it is always zero — see `court-parameters.ts`, which reads the block.
   */
  at: string;
  /** `[evidence, commit, vote, appeal]` in seconds, as `timesPerPeriod` is indexed on chain. */
  timesPerPeriod: readonly string[];
};

/**
 * A period's configured duration, per period, in seconds.
 *
 * A *window* in `CONTEXT.md`'s vocabulary: what the court allowed, not how long the period in
 * fact ran. The two are different quantities and the design shows them side by side as two
 * absolute durations; only one of them is here.
 */
export type PeriodWindows = {
  evidenceSeconds: number;
  commitSeconds: number;
  voteSeconds: number;
  appealSeconds: number;
};

/** One configuration, and the moment it came into force. */
export type ParameterRegime = {
  /** Unix seconds. The court held these windows from this moment until the next regime. */
  from: number;
  windows: PeriodWindows;
};

/** Same canonical-decimal guard as the rest of the model, and for the same reason. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

function toSeconds(value: string | undefined, what: string): number {
  if (value === undefined || !CANONICAL_DECIMAL.test(value)) {
    throw new Error(`Court parameters carry an unreadable ${what}: ${JSON.stringify(value)}`);
  }
  return Number(value);
}

/**
 * The court's configurations, oldest first.
 *
 * Sorted here rather than trusted from the reader: the order is what decides which window
 * dispute 151 is measured beside, and a history that arrived newest-first would hand it the
 * court's current 45 minutes without failing anywhere.
 */
export function toRegimes(raw: readonly RawCourtParameters[]): ParameterRegime[] {
  return raw
    .map((change) => ({
      from: toSeconds(change.at, "moment it took effect"),
      windows: {
        evidenceSeconds: toSeconds(change.timesPerPeriod[0], "evidence window"),
        commitSeconds: toSeconds(change.timesPerPeriod[1], "commit window"),
        voteSeconds: toSeconds(change.timesPerPeriod[2], "vote window"),
        appealSeconds: toSeconds(change.timesPerPeriod[3], "appeal window"),
      },
    }))
    .sort((a, b) => a.from - b.from);
}

/**
 * What the court held at one moment, or `null` if it held nothing yet.
 *
 * `null` for a moment before the court was created, rather than the earliest configuration:
 * the court did not hold that configuration then, and answering with it would be an invention.
 * It is also what an unread history returns, which is why every caller treats the two the same.
 *
 * A `null` moment is a period that has not opened. It will run under whatever the court holds
 * when it does, and the closest available reading of that is the latest configuration — quoting
 * the one in force at the dispute's creation would name a window the court may already have
 * replaced.
 */
export function windowsAt(
  regimes: readonly ParameterRegime[],
  moment: number | null,
): PeriodWindows | null {
  if (moment === null) return regimes[regimes.length - 1]?.windows ?? null;

  let held: PeriodWindows | null = null;
  for (const regime of regimes) {
    if (regime.from > moment) break;
    held = regime.windows;
  }
  return held;
}

/**
 * The windows one dispute ran under, resolved period by period.
 *
 * Period by period, and not once per dispute, because that is how the court itself works:
 * `passPeriod` reads `timesPerPeriod` at the moment it is called, so a dispute created under
 * one configuration and passed into its commit period under the next ran a commit window the
 * dispute's own creation moment knows nothing about. No *measured* period straddles court 34's
 * one change — dispute 151's commit and vote periods both closed before it, and dispute 152 was
 * created 48 minutes after — which is exactly why a per-dispute lookup would have looked
 * correct here and been wrong at the first dispute that did.
 *
 * One period does straddle it: dispute 151's appeal period opened before the change and ran
 * past it. That costs nothing, because the appeal window was 36 hours in both configurations
 * and no figure on this dashboard is measured from the appeal period at all. It is also the
 * limit of this resolution, and worth stating rather than discovering: for a period that
 * straddles a change, the window resolved here is the one in force when the period *opened*,
 * while the court enforced whatever it held when `passPeriod` was finally called. The two agree
 * except across a change, and there is no reading of a single window that is true of a period
 * governed by two.
 *
 * The round is the latest one, matching the round the matrix's cells are measured against. A
 * dispute whose rounds straddled a change would need a window per round; none has, and the
 * matrix has one cell per agent juror per dispute to put them in.
 */
export function windowsFor(
  regimes: readonly ParameterRegime[],
  dispute: Dispute,
): PeriodWindows | null {
  const current = dispute.rounds.reduce<Dispute["rounds"][number] | undefined>(
    (latest, round) => (latest === undefined || round.index > latest.index ? round : latest),
    undefined,
  );

  // The evidence period opens when the dispute is created, and there is no timeline entry for
  // it — the round's first moment is when the *commit* period opened.
  const evidence = windowsAt(regimes, dispute.createdAt);
  const commit = windowsAt(regimes, current?.commitOpenedAt ?? null);
  const vote = windowsAt(regimes, current?.voteOpenedAt ?? null);
  const appeal = windowsAt(regimes, current?.appealOpenedAt ?? null);

  // All four or none: a dispute older than every configuration this dashboard read is one it
  // cannot place, and half-placing it would print one window beside three inventions.
  if (evidence === null || commit === null || vote === null || appeal === null) return null;

  return {
    evidenceSeconds: evidence.evidenceSeconds,
    commitSeconds: commit.commitSeconds,
    voteSeconds: vote.voteSeconds,
    appealSeconds: appeal.appealSeconds,
  };
}

/**
 * Whether two configurations agree about the windows this dashboard's figures are measured in.
 *
 * The commit and vote windows and nothing else: they are the periods reveal and commit latency
 * are measured from, so they are the only ones whose change makes two figures incomparable. A
 * court that reconfigured only its evidence or appeal period would otherwise mark every older
 * dispute for a difference no figure on the page reflects, and a marker with no visible cause
 * teaches a reader to ignore markers.
 */
export function sameMeasuredWindows(a: PeriodWindows, b: PeriodWindows): boolean {
  return a.commitSeconds === b.commitSeconds && a.voteSeconds === b.voteSeconds;
}
