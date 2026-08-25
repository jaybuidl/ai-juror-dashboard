import type { AgentJuror } from "../roster/agent-jurors";
import type { MatrixRow } from "./performance";

/**
 * The court-wide aggregates: what the four stat tiles and the latency strip are figures of.
 *
 * These live below the seam, computed once by `buildCourtPerformance`, for the same reason every
 * other derivation does: a tile that reduced the rows while rendering would be a second
 * definition of "how many draws" sitting beside this one, free to drift from the matrix it is
 * printed above. Ticket 06's per-agent-juror marginals are these same aggregates sliced by
 * column, and belong here too when they land.
 *
 * Nothing here reads a clock or a window. Every count is a count of what was read.
 */

/**
 * Every reveal latency measured, and the three durations quoted from it.
 *
 * `seconds` is the whole distribution, ascending — the strip plots one mark per entry, and the
 * median line and the three summary figures are read from this same array, so the plot and the
 * numbers beside it can never become two separately derived accounts of one set of draws.
 */
export type LatencySummary = {
  /** Ascending. One entry per draw that has revealed; a draw with no reveal has no latency. */
  seconds: readonly number[];
  fastest: number;
  /** The lower of the two middle values on an even count — see `medianOf`. */
  median: number;
  slowest: number;
};

export type CourtTotals = {
  /** Disputes read. Never a claim about how many the court has held. */
  disputes: number;
  /** Draws: one per agent juror per dispute, which is the unit (`CONTEXT.md`). */
  draws: number;
  /** The vote IDs those draws hold. Larger than `draws`, which is why both are printed. */
  votes: number;
  /** How many of the roster have ever been drawn. */
  agentJurorsDrawn: number;
  /** The roster's size, so the drawn count reads as a count against it. */
  agentJurors: number;
  /**
   * Reveal latency across every draw that has revealed, or `null` when none has.
   *
   * `null` rather than zeros: a `0` here would be a claim about the court that nobody measured.
   */
  revealLatency: LatencySummary | null;
  /**
   * Disputes decided by a panel of one, by id.
   *
   * Carried on the totals because any aggregate over coherence has to disclose them — a lone
   * agent juror is automatically the majority, so coherence there is tautological
   * (`CONTEXT.md`). None of today's four tiles is a coherence figure, which is why none of them
   * carries the marker; ticket 06's marginals are the first figures this qualifies.
   */
  lonePanelDisputes: readonly number[];
  /**
   * Disputes whose draws were never read, by id — see `MatrixRow.read`.
   *
   * Every count above is missing theirs, and none of them is zero as a result: an unread
   * dispute contributes no draws, no votes and no latency, so a total computed over them
   * understates the court by an amount nobody measured. Ticket 13's rule is that what could not
   * be read counts as unknown and never as zero, and a figure cannot say "unknown" — so the
   * figure stays what was actually counted and carries this list, which is what lets every
   * place that prints it label itself partial.
   */
  unreadDisputes: readonly number[];
};

/**
 * The median, taken as the lower of the two middle values rather than their mean.
 *
 * An even count has no middle, and averaging the two invents a latency no draw recorded — half
 * a second that never happened, on a page that may be cited. The lower middle keeps the figure
 * a duration something actually took. It is also what the canvas quotes: 44 draws whose middles
 * are 85s and 86s are labelled 85s there (`canvas/Main.dc.html:73`).
 */
function medianOf(ascending: readonly number[]): number {
  const middle = ascending[Math.ceil(ascending.length / 2) - 1];
  if (middle === undefined) throw new Error("Median of an empty distribution");
  return middle;
}

/** Everything the rows amount to, in one pass. */
export function courtTotalsOf(
  rows: readonly MatrixRow[],
  agentJurors: readonly AgentJuror[],
): CourtTotals {
  let draws = 0;
  let votes = 0;
  const seconds: number[] = [];
  const drawn = new Set<string>();

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell === null) continue;
      draws += 1;
      votes += cell.voteCount;
      drawn.add(cell.agentJuror.address);
      if (cell.revealLatencySeconds !== null) seconds.push(cell.revealLatencySeconds);
    }
  }

  seconds.sort((a, b) => a - b);
  const fastest = seconds[0];
  const slowest = seconds[seconds.length - 1];

  return {
    disputes: rows.length,
    draws,
    votes,
    agentJurorsDrawn: drawn.size,
    agentJurors: agentJurors.length,
    revealLatency:
      fastest === undefined || slowest === undefined
        ? null
        : { seconds, fastest, median: medianOf(seconds), slowest },
    // A panel of one is a fact about a dispute that *was* read, so an unread row is not counted
    // among them — its panel size is 0 because nobody asked, not because the court drew one
    // juror. Filtering on `read` first is what keeps a gap out of a coherence caveat.
    lonePanelDisputes: rows
      .filter((row) => row.read && row.panelSize === 1)
      .map((row) => row.dispute.id),
    unreadDisputes: rows.filter((row) => !row.read).map((row) => row.dispute.id),
  };
}
