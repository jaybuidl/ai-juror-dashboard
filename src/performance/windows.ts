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
 * One `CourtCreated` or `CourtModified` event, reduced to what this dashboard reads off it.
 *
 * More than a window, since ticket 21: the same two events carry what a coherent draw earns and
 * what a wrong one risks, and a claim on this page rests on those never having moved. They are
 * kept because reading them is free — they arrive already decoded on the logs the window scan
 * fetches anyway — and because the alternative to keeping them is a claim nothing checks.
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
  /**
   * The stake a juror must hold to be drawn, in wei of PNK.
   *
   * TRAP: 11000e18 today, which is 1.1e22 — a million times `Number.MAX_SAFE_INTEGER`. It stays
   * a string the whole way through this module and is compared as one; see `RewardParameters`
   * for what parsing it would cost.
   */
  minStake: string;
  /** The share of `minStake` a vote ID puts at risk, per ten thousand. 170 today, so 1.7%. */
  alpha: string;
  /** What one coherent vote ID earns, in wei of ETH. */
  feeForJuror: string;
  /** The panel size beyond which an appeal moves the dispute up to the parent court. */
  jurorsForCourtJump: string;
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

/**
 * What one configuration paid and put at risk — the half of a court's parameters no window
 * describes.
 *
 * Named exactly as `CourtCreated` and `CourtModified` name them, minus the leading underscore.
 * The only thing ever done with these four is to *report* which of them changed, and the reader
 * of that report goes to the chain to see it; a tidier `minStakeWei` would be a name Arbitrum
 * does not answer to.
 *
 * TRAP: strings, compared as strings, never parsed. `minStake` is 1.1e22, and `Number` rounds
 * that to a multiple of about two million wei — so two genuinely different stakes would compare
 * equal and this module would report a court that had not changed, which is the exact failure
 * it exists to catch. What makes string equality mean numeric equality is the canonical-decimal
 * guard in `toRegimes`: "0170" never survives to be told apart from "170".
 *
 * No arithmetic is done on them anywhere, and none should be. The one question asked of these
 * four is whether two configurations agree.
 */
export type RewardParameters = {
  minStake: string;
  alpha: string;
  feeForJuror: string;
  jurorsForCourtJump: string;
};

/** One configuration, and the moment it came into force. */
export type ParameterRegime = {
  /** Unix seconds. The court held these windows from this moment until the next regime. */
  from: number;
  windows: PeriodWindows;
  /**
   * What a draw earned and risked under it.
   *
   * Beside the windows rather than modelled apart from them because the chain emits the two in
   * one event: a configuration is one thing. Splitting them would also mean ordering the court's
   * history twice, and the ordering this module establishes once — in `toRegimes` — is what
   * every answer here depends on.
   */
  rewards: RewardParameters;
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
 * A reward parameter, kept as the decimal string it arrived as.
 *
 * Validated and deliberately not converted. The guard is the whole of it: it is what lets
 * `rewardParameterChanges` compare with `===` and have that mean what a reader thinks it means.
 * See `RewardParameters` for what `Number` would cost on a stake of 1.1e22.
 */
function toAmount(value: string | undefined, what: string): string {
  if (value === undefined || !CANONICAL_DECIMAL.test(value)) {
    throw new Error(`Court parameters carry an unreadable ${what}: ${JSON.stringify(value)}`);
  }
  return value;
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
      rewards: {
        minStake: toAmount(change.minStake, "minimum stake"),
        alpha: toAmount(change.alpha, "alpha"),
        feeForJuror: toAmount(change.feeForJuror, "fee for juror"),
        jurorsForCourtJump: toAmount(change.jurorsForCourtJump, "jurors for court jump"),
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
 * dispute's own creation moment knows nothing about. Court 34 has been reconfigured twice and
 * no evidence, commit or vote period has straddled either change — read off chain over all 46
 * disputes on 2026-09-04: dispute 151's commit and vote periods both closed before the
 * 2026-08-20 change, and dispute 152 was created 48 minutes after it — which is exactly why a
 * per-dispute lookup would have looked correct here and been wrong at the first dispute that
 * did.
 *
 * One period does straddle the 2026-08-20 change: dispute 151's appeal period opened before it
 * and ran past it. That costs nothing, because the appeal window has been 36 hours under every
 * configuration the court has held and no figure on this dashboard is measured from the appeal
 * period at all. It is also the limit of this resolution, and worth stating rather than
 * discovering: for a period that straddles a change, the window resolved here is the one in
 * force when the period *opened*, while the court enforced whatever it held when `passPeriod`
 * was finally called. The two agree except across a change, and there is no reading of a single
 * window that is true of a period governed by two.
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
 * "Two configurations" means any two, and is not a count of how many court 34 has had — it has
 * had three. This is a comparison, and it stays a comparison however long the history gets.
 *
 * The commit and vote windows and nothing else: they are the periods reveal and commit latency
 * are measured from, so they are the only ones whose change makes two figures incomparable. A
 * court that reconfigured only its evidence or appeal period would otherwise mark every older
 * dispute for a difference no figure on the page reflects, and a marker with no visible cause
 * teaches a reader to ignore markers.
 *
 * **That court is this one.** On 2026-08-26 court 34 moved its evidence period from 45 minutes
 * to 10 and left everything else alone, so its second and third configurations differ and this
 * returns true across them — which is what keeps dispute 152 unmarked while being older than a
 * change the court has since made. `MethodPage`'s window section owes a reader that sentence,
 * because the marker cannot say it.
 */
export function sameMeasuredWindows(a: PeriodWindows, b: PeriodWindows): boolean {
  return a.commitSeconds === b.commitSeconds && a.voteSeconds === b.voteSeconds;
}

/**
 * One stretch of the court's life, and the two windows every figure in it was measured from.
 *
 * A `ParameterRegime` is what the court configured; this is what that configuration *changed
 * about measurement*, which is a coarser thing and is often nothing. Court 34 has held three
 * configurations and two of these: the 2026-08-26 change moved the evidence period alone, so
 * the disputes either side of it are measured from the same commit and vote windows and their
 * latencies may be read against each other.
 *
 * Only the two windows, and no evidence or appeal duration, because a shape carrying those
 * would have to answer which of the folded configurations they came from — and there is no
 * true answer, only the first one's, which reads as current and is not.
 *
 * TRAP: these two fields have to stay the same two `sameMeasuredWindows` compares. The fold
 * asks that function what "measured" means, but the fields below are written out by hand, and
 * a third window added there and not here would split a regime correctly while printing two
 * entries identical in everything but `from` — a live failure whose diff shows no cause.
 */
export type MeasuredRegime = {
  /**
   * Unix seconds: the moment these windows came into force.
   *
   * The moment they last *moved*, never the moment they were last restated. That is the line
   * either side of which two latencies stop being comparable, which is the only thing this
   * shape is asked about.
   */
  from: number;
  commitSeconds: number;
  voteSeconds: number;
};

/**
 * The court's configurations, reduced to the times its measured windows changed.
 *
 * Consecutive configurations that agree about the commit and vote windows are one regime, and
 * that fold is the whole content of this function: it is what lets a caller tell a
 * reconfiguration that moved a figure from one that only made an account of the court stale.
 * `court-parameters.integration.test.ts` is split along exactly that line, so that a nightly
 * failure says which kind it is in its own name rather than in a diff a maintainer has to
 * read. Court 34 is reconfigured to suit demonstrations and the second kind is the common one
 * (`docs/knowledge/court-34.md`); a job that is habitually red for it is a job nobody reads.
 *
 * Consecutive and not equal-valued: a court that restored a window it had abandoned opens a
 * third regime rather than resuming the first, because the disputes that ran between are
 * comparable with neither side.
 *
 * Takes regimes in the order `toRegimes` establishes, oldest first. Unsorted input would fold
 * whichever pairs happened to be adjacent, which is why the sort is not repeated here — one
 * ordering, in one place, that every caller of this module already depends on.
 *
 * **Not the marker's rule, and not a replacement for it.** `buildCourtPerformance` marks a
 * dispute by comparing the windows it ran under against the ones the court holds *now*, by
 * value; this folds *consecutive* regimes only. The two agree today and would disagree the
 * moment the court restored a window it had abandoned — every dispute under the first regime
 * would go unmarked, correctly, while this still reports three stretches. Both are right about
 * their own question. Wiring one to the other would lose one of the two.
 */
export function measuredRegimes(regimes: readonly ParameterRegime[]): MeasuredRegime[] {
  const measured: MeasuredRegime[] = [];

  // The windows that opened the stretch, not the latest ones folded into it. They differ only
  // in the evidence and appeal durations, which `sameMeasuredWindows` does not read — so this
  // holds the configuration whose moment is the one being reported, and compares on the halves
  // where the two are equal by construction.
  let opened: PeriodWindows | null = null;

  for (const regime of regimes) {
    if (opened !== null && sameMeasuredWindows(opened, regime.windows)) continue;
    opened = regime.windows;
    measured.push({
      from: regime.from,
      commitSeconds: regime.windows.commitSeconds,
      voteSeconds: regime.windows.voteSeconds,
    });
  }

  return measured;
}

/**
 * Every field of `RewardParameters`, as a value rather than a type.
 *
 * The `satisfies` is the point: a fifth reward parameter added to the type and not here is a
 * compile error, rather than a parameter that silently stops being compared. That is the shape
 * of failure this whole module is about — present, correctly typed, and unchecked — and the
 * hand-written pair on `MeasuredRegime` is the same risk carried without this guard because
 * there its two fields are a *choice* about what "measured" means. These four are not a choice:
 * they are every reward parameter the events carry.
 */
const REWARD_PARAMETERS = Object.keys({
  minStake: true,
  alpha: true,
  feeForJuror: true,
  jurorsForCourtJump: true,
} satisfies Record<keyof RewardParameters, true>) as readonly (keyof RewardParameters)[];

/** One reward parameter moving, dated, with both values so the report can be read on its own. */
export type RewardParameterChange = {
  /** Unix seconds: the moment the configuration that moved it came into force. */
  at: number;
  /** The on-chain field name, so a maintainer can grep the log that carries it. */
  parameter: keyof RewardParameters;
  before: string;
  after: string;
};

/**
 * Every time the court changed what a draw earns or risks — empty when it never has.
 *
 * `[]` is the answer for court 34 and has been for its whole life: `minStake`, `alpha`,
 * `feeForJuror` and `jurorsForCourtJump` are byte-identical across all three configurations and
 * only `timesPerPeriod` has ever moved. That claim is load-bearing rather
 * than incidental. `CourtTotals` sums cumulative ETH and net PNK across the court's whole life
 * and the † window marker deliberately does **not** ride either of them, on the grounds that a
 * reward depends on no window — which is only true while one fee has been in force throughout.
 * `totals.test.ts` pins the arithmetic that follows: total ETH equals `feeForJuror` times the
 * vote-ID count over the executed disputes, exact only under a single fee.
 *
 * So this exists to make that claim *checked* rather than inspected. It was verified by hand on
 * 2026-08-20 and again on 2026-08-26 and it held both times, which is precisely the state worth
 * worrying about: a changed `feeForJuror` would not throw, would not warn and would not blank a
 * figure. Every cumulative sum would quietly span two fee regimes and the page would report six
 * agent jurors' earnings as one comparable quantity when they were two.
 *
 * **Four parameters, and `hiddenVotes` is not one of them.** It rides the same two events and
 * has been `true` throughout, but nothing here reads it — so an `[]` from this function is not a
 * statement about it, and a reader who takes it as one is the reason this paragraph exists. It
 * stayed out because it is not a reward parameter and this type is named for what it holds; the
 * gap wants a ticket on its own terms, because a court that turned hidden votes off would have
 * no commit period at all, and commit latency — half of what this dashboard measures — would be
 * the duration of something that no longer happens. Nothing named catches that today. The live
 * suite's full-history assertion would go red for it, but as case 3 upkeep, which is the wrong
 * name for it.
 *
 * Consecutive pairs, like `measuredRegimes` and for the same reason: a fee lowered and later
 * restored is reported twice, because the draws that ran between earned something the draws
 * either side did not. Reporting it as "the history agrees" would be true of the endpoints and
 * false of every figure summed across them.
 *
 * A change is reported per *parameter*, so a configuration that moved two of them arrives as two
 * entries at the same moment. That is what a caller wants: the question a red assertion has to
 * answer first is which quantity stopped being comparable, and an entry saying only "the rewards
 * changed" sends a maintainer to a diff.
 *
 * Takes regimes oldest first, as `toRegimes` returns them. Nothing here re-sorts: unsorted input
 * would compare whichever pairs happened to be adjacent and date the change from the wrong one.
 *
 * **No view reads this, deliberately.** Nothing is rendered while it is empty, and it has never
 * been anything else — the display question is open, recorded on ticket 21. The floor it stands
 * on instead is a pair of assertions: `windows.test.ts` fails the build the moment a recaptured
 * fixture carries a moved parameter, and `court-parameters.integration.test.ts` fails nightly
 * against the chain before any fixture is recaptured at all.
 */
export function rewardParameterChanges(
  regimes: readonly ParameterRegime[],
): RewardParameterChange[] {
  const changes: RewardParameterChange[] = [];
  let held: RewardParameters | null = null;

  for (const regime of regimes) {
    if (held !== null) {
      for (const parameter of REWARD_PARAMETERS) {
        const before = held[parameter];
        const after = regime.rewards[parameter];
        if (before !== after) changes.push({ at: regime.from, parameter, before, after });
      }
    }
    held = regime.rewards;
  }

  return changes;
}
