/**
 * The dispute model, and the whole of this ticket's computation.
 *
 * Pure: it touches no network and reads no clock, so it is tested against a captured
 * payload with no mock anywhere. Ticket 05 puts the real seam
 * (`buildCourtPerformance`) around work of this kind; this module is deliberately
 * narrower than that and does not squat on its name.
 */

/** The five periods a Kleros v2 dispute moves through, in order. */
export const PERIODS = ["evidence", "commit", "vote", "appeal", "execution"] as const;

export type Period = (typeof PERIODS)[number];

/** One round as the core subgraph returns it. `timeline` is BigInt-as-string, seconds. */
export type RawRound = {
  id: string;
  timeline: readonly string[];
};

/**
 * One dispute as the core subgraph returns it — exactly the selection in
 * `court-subgraph.ts`, no more. Every numeric field arrives as a string.
 */
export type RawDispute = {
  id: string;
  disputeID: string;
  period: Period;
  ruled: boolean;
  currentRuling: string;
  createdAt: string;
  lastPeriodChange: string;
  currentRoundIndex: string;
  /** Nullable on the subgraph's own type: a dispute need not have a template. */
  templateId?: string | null;
  rounds: readonly RawRound[];
};

/**
 * The observed moments each period of one round opened, in unix seconds.
 *
 * Observed, not scheduled: latency is always measured from when a period actually
 * opened, because a period can end early once every juror has acted and can also run
 * past its deadline before anyone closes it (ADR-0001). `null` means the period has not
 * opened yet — the subgraph writes `0` there, which is a real instant in 1970 and must
 * never reach a subtraction.
 */
export type DisputeRound = {
  /** Zero-based index of the round within the dispute. */
  index: number;
  commitOpenedAt: number | null;
  voteOpenedAt: number | null;
  appealOpenedAt: number | null;
  executionOpenedAt: number | null;
};

/**
 * What the court has decided, if anything.
 *
 * `refused` is choice 0 — refuse to arbitrate — which is a decision and not an absence.
 * It is split out from `ruled` because the two read differently on the page and because
 * a truthiness test on the subgraph's `currentRuling` would collapse them.
 */
export type Ruling =
  | { state: "pending" }
  | { state: "refused" }
  | { state: "ruled"; choice: number };

export type Dispute = {
  /** The core dispute ID — the global one in `KlerosCore.disputes[]`. */
  id: number;
  period: Period;
  ruling: Ruling;
  createdAt: number;
  lastPeriodChange: number;
  /**
   * The join to the dispute resolver template subgraph, where the title and category
   * live. `null` when the dispute has no template, and therefore no title to resolve.
   *
   * Not the dispute id, and not a fixed offset from it: dispute 151 resolves through
   * template 161, dispute 152 through 163.
   */
  templateId: number | null;
  /** Ascending by round index. Every dispute in this court has exactly one so far. */
  rounds: readonly DisputeRound[];
};

/**
 * Canonical non-negative decimal, borrowed from agentkit's subgraph readers.
 *
 * Checked before any conversion precisely because `Number()` is far more permissive:
 * it maps `""` and `"   "` to 0, `"1e2"` to 100 and `"1.0"` to 1, each of which turns a
 * missing or garbled field into a confident value — here, an epoch timestamp or a
 * fabricated ruling — rather than a loud failure.
 */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

function toNumber(value: string, field: string): number {
  if (!CANONICAL_DECIMAL.test(value)) {
    throw new Error(`Core subgraph returned a malformed ${field}: ${JSON.stringify(value)}`);
  }
  return Number(value);
}

/**
 * The template id, or null where there is nothing usable to join on.
 *
 * The one field in this module that does not throw when it is malformed, and the reason
 * is what a bad value would become. Every other field here turns into a timestamp or a
 * ruling, where a garbled string would be read as a confident figure; this one turns
 * into a title, so the worst case is a row that renders without one — which the list is
 * built to do anyway.
 */
function toTemplateId(value: string | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  return CANONICAL_DECIMAL.test(value) ? Number(value) : null;
}

/** `0` in a timeline means "not reached yet", not midnight on 1 January 1970. */
function toOpenedAt(value: string | undefined, field: string): number | null {
  if (value === undefined) return null;
  const seconds = toNumber(value, field);
  return seconds === 0 ? null : seconds;
}

/**
 * Round ids are `"<disputeID>-<n>"`. The index is read from the suffix rather than from
 * the array position: The Graph orders `id` lexicographically, so `"151-10"` sorts above
 * `"151-9"` and the arrival order stops matching the round order past index 9.
 */
function toRound(raw: RawRound): DisputeRound {
  const suffix = raw.id.slice(raw.id.lastIndexOf("-") + 1);
  const [commit, vote, appeal, execution] = raw.timeline;

  return {
    index: toNumber(suffix, "round id"),
    commitOpenedAt: toOpenedAt(commit, "commit timeline entry"),
    voteOpenedAt: toOpenedAt(vote, "vote timeline entry"),
    appealOpenedAt: toOpenedAt(appeal, "appeal timeline entry"),
    executionOpenedAt: toOpenedAt(execution, "execution timeline entry"),
  };
}

/**
 * What the court has decided about one dispute.
 *
 * Keyed on `ruled`, not on the period and not on `currentRuling`. The subgraph reports a
 * `currentRuling` for a dispute still in its appeal period — dispute 166 read `1` while
 * unruled — but a round majority before the appeal period closes is a prediction, and
 * showing it as the ruling would state a result the court has not reached.
 */
export function rulingOf(raw: RawDispute): Ruling {
  if (!raw.ruled) return { state: "pending" };

  const choice = toNumber(raw.currentRuling, "currentRuling");
  return choice === 0 ? { state: "refused" } : { state: "ruled", choice };
}

/**
 * The court's disputes, newest core dispute ID first.
 *
 * The order is established here rather than left to the query, so it is a property of
 * the model and cannot shift between loads: a page that reordered its rows because the
 * endpoint returned them differently would be quietly telling a different story each
 * time. Sorted numerically — dispute 100 is newer than dispute 99, though the string
 * comparison the subgraph applies to ids says otherwise.
 */
export function toDisputes(raw: readonly RawDispute[]): Dispute[] {
  return raw
    .map((dispute) => ({
      id: toNumber(dispute.disputeID, "disputeID"),
      period: dispute.period,
      ruling: rulingOf(dispute),
      createdAt: toNumber(dispute.createdAt, "createdAt"),
      lastPeriodChange: toNumber(dispute.lastPeriodChange, "lastPeriodChange"),
      templateId: toTemplateId(dispute.templateId),
      rounds: dispute.rounds.map(toRound).sort((a, b) => a.index - b.index),
    }))
    .sort((a, b) => b.id - a.id);
}
