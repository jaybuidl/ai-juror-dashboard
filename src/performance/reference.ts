import { type RawDispute, toDisputes } from "../disputes/disputes";
import { medianOf } from "./totals";

/**
 * What an ordinary Kleros court takes to rule, read rather than asserted (ticket 23).
 *
 * Both plots draw a comparison band: where an ordinary court sits on the same absolute time axis
 * as court 34's times to appeal (the matrix page) and one agent juror's reveal latencies (its own
 * view). The band is a time to ruling in either case and is never relabelled as either of them. Until this ticket it began at a five-day constant this
 * repository chose, and the since-removed footer said so: the only thing on the page that did not come from a
 * read. This module is the reading that replaces it. It is pure, below the seam, and touches no
 * network and no clock, like everything else under `performance/`.
 *
 * **The measure is time to ruling.** For one dispute, it is the seconds from its creation to the
 * moment its execution period opened, which is when the ruling became final. Both moments come
 * from the core subgraph: `createdAt`, and the round's `timeline`, the same array every latency
 * on this dashboard is measured from.
 *
 * Only the execution slot of that timeline is read here, and that matters for this court in
 * particular. Each slot is the moment a period *closed*, which `disputes.ts` names by the period
 * that opens next. That naming assumes court 34's hidden votes. Court 29 has none, so its
 * disputes skip the commit period: the first slot is when voting opened and the second is `0`.
 * The execution slot means the same in every court: the appeal period closed, and on every
 * dispute in the fixture it equals `lastPeriodChange`. A later reading of any other slot from
 * this court has to take this into account.
 *
 * **Over single-round disputes only.** Court 34's disputes are single-round, and an appealed
 * dispute in an ordinary court takes far longer. Folding those in would move the band right and
 * flatter the experiment with a gap it did not earn. The exclusion is counted rather than
 * applied silently, so the page can say how many were left out, including when the answer is
 * none.
 *
 * Nothing here divides a latency by the band or by anything else (ADR-0005). The reading is
 * one absolute duration, and the plot draws it as a position on an absolute axis.
 */

/**
 * The court the comparison is read from: 29, "Corte de Disputas de Consumo y Vecindad".
 *
 * Chosen by a reading, not by preference. On 2026-09-23 the core deployment held disputes in
 * seven courts. Court 34 is the experiment. Of the other six, court 29 had the most by a wide
 * margin: 87, every one single-round and ruled, from November 2024 to September 2026. The
 * next was court 32 with 33. The General Court had 6, too few to be a fair median. Its
 * single-round median was about four days, close to what courts 32 (4.0d) and 31 (6.2d) took,
 * so this is not a court picked for being slow.
 *
 * One court and not a pool of them. The courts are configured differently, and a pooled median
 * would be a figure about no court anyone could go and check, which is the claim this ticket
 * exists to retire.
 */
export const REFERENCE_COURT_ID = "29";

/** The court's own record as the core subgraph returns it: its name and how many disputes it holds. */
export type RawReferenceCourt = {
  id: string;
  name: string | null;
  /** BigInt-as-string, like every count the subgraph serves. */
  numberDisputes: string;
};

/**
 * Everything the reading is taken from, as it was fetched.
 *
 * The disputes are the same `RawDispute` selection court 34's are, read through the same
 * `fetchCourtDisputes`. That means they are parsed by the same `toDisputes`, which throws on a
 * garbled timestamp rather than turning it into a confident duration.
 */
export type RawReference = {
  court: RawReferenceCourt;
  disputes: readonly RawDispute[];
};

/** Which court the reading is over, as the page names it. */
export type ReferenceCourt = {
  id: number;
  /** The court's own name, or `null` where the subgraph has none. */
  name: string | null;
};

/** How many of the court's disputes the reading leaves out, and why. */
export type ReferenceExclusions = {
  /** Disputes with more than one round. Excluded so the comparison is like-for-like. */
  appealed: number;
  /** Single-round disputes with no final ruling yet: nothing to measure a time to ruling from. */
  undecided: number;
};

/**
 * The comparison, in one of three states that must not collapse into one another.
 *
 * - `measured` is the band: a median over a known number of disputes and a stated period.
 * - `short` is a read that answered HTTP 200 with fewer disputes than the court says it holds.
 *   A median over part of a court is not that court's median, and the band would simply sit
 *   somewhere else with nothing to say it had moved. So there is no median on this branch at
 *   all, only the two counts.
 * - `unmeasured` is a whole read of a court that has ruled no single-round dispute. It is a fact
 *   about that court and not a failure, and it has no median either.
 */
export type ReferenceReading =
  | {
      state: "measured";
      court: ReferenceCourt;
      /** How many disputes the median is over. */
      count: number;
      /** The median time to ruling, in seconds. The lower middle on an even count, as every median here is. */
      medianSeconds: number;
      /** When the earliest and the latest of those disputes were created, in unix seconds. */
      firstCreatedAt: number;
      lastCreatedAt: number;
      excluded: ReferenceExclusions;
    }
  | { state: "short"; court: ReferenceCourt; expected: number; returned: number }
  | { state: "unmeasured"; court: ReferenceCourt; excluded: ReferenceExclusions };

/** A reading that has a band to draw. */
export type MeasuredReference = Extract<ReferenceReading, { state: "measured" }>;

const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

function toCount(value: string, field: string): number {
  if (!CANONICAL_DECIMAL.test(value)) {
    throw new Error(`Core subgraph returned a malformed ${field}: ${JSON.stringify(value)}`);
  }
  return Number(value);
}

/**
 * The reading, from the raw payload.
 *
 * **The guard is a count, not a status.** A short subgraph read throws nothing: HTTP 200, fewer
 * rows, no error. So the disputes returned are compared against the court's own
 * `numberDisputes`, which is the known set this read draws from. Fewer is a shortfall and is
 * reported as the two numbers. More is not: `useCourtPerformance` reads the count *before* the
 * disputes, so a dispute created between the two requests arrives in the list and not in the
 * count, and a court only ever gains disputes.
 *
 * One way this can raise a false alarm, and it fails loud rather than in the experiment's
 * favour. An appeal that jumps a dispute to a parent court moves the dispute's `court` field, so
 * the dispute stops coming back for this court while its count may still include it. No
 * dispute on this deployment has ever been appealed (checked 2026-09-23). If one is, and this
 * starts reporting a shortfall that is not one, the fix is to read the court's disputes through
 * their rounds, not to relax this comparison.
 */
export function referenceReadingOf(raw: RawReference): ReferenceReading {
  const court: ReferenceCourt = {
    id: toCount(raw.court.id, "court id"),
    name: raw.court.name === null || raw.court.name === "" ? null : raw.court.name,
  };
  const expected = toCount(raw.court.numberDisputes, "numberDisputes");

  if (raw.disputes.length < expected) {
    return { state: "short", court, expected, returned: raw.disputes.length };
  }

  const excluded: ReferenceExclusions = { appealed: 0, undecided: 0 };
  const measured: { createdAt: number; seconds: number }[] = [];

  for (const dispute of toDisputes(raw.disputes)) {
    const [round, ...appeals] = dispute.rounds;

    if (appeals.length > 0) {
      excluded.appealed += 1;
      continue;
    }

    // Keyed on the execution period having opened, and on the ruling. A dispute can reach
    // execution before anyone calls `executeRuling`. Until the subgraph says it is ruled, the
    // moment is a scheduled step and not yet a ruling this page may date.
    const ruledAt = round?.executionOpenedAt ?? null;
    if (dispute.ruling.state === "pending" || ruledAt === null) {
      excluded.undecided += 1;
      continue;
    }

    measured.push({ createdAt: dispute.createdAt, seconds: ruledAt - dispute.createdAt });
  }

  if (measured.length === 0) return { state: "unmeasured", court, excluded };

  const seconds = measured.map((dispute) => dispute.seconds).sort((a, b) => a - b);
  const created = measured.map((dispute) => dispute.createdAt);

  return {
    state: "measured",
    court,
    count: measured.length,
    medianSeconds: medianOf(seconds),
    firstCreatedAt: Math.min(...created),
    lastCreatedAt: Math.max(...created),
    excluded,
  };
}

/**
 * What the band's place on a plot shows, from the reading and the read's own state.
 *
 * Four states, because the plot must never draw a band at a default. `pending` and `failed`
 * both have no reading. Only the error tells them apart, and a plot that said "not read" for
 * every cold load before the answer arrived would be announcing a failure that has not happened.
 * A read that failed *over* a reading already held keeps drawing that reading. react-query keeps
 * what it had, and the banner says the band comes from an earlier read.
 */
export type Comparison =
  | { state: "measured"; reading: MeasuredReference }
  | { state: "pending" }
  | { state: "missing"; reading: Exclude<ReferenceReading, MeasuredReference> | null };

export function comparisonOf(reading: ReferenceReading | null, error: Error | null): Comparison {
  if (reading?.state === "measured") return { state: "measured", reading };
  if (reading !== null) return { state: "missing", reading };
  return error === null ? { state: "pending" } : { state: "missing", reading: null };
}

/** The court as a sentence names it: `"court 29 (Corte de Disputas de Consumo y Vecindad)"`. */
export function referenceCourtName(court: ReferenceCourt): string {
  return court.name === null ? `court ${court.id}` : `court ${court.id} (${court.name})`;
}
