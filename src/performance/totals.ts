import type { AgentJuror } from "../roster/agent-jurors";
import type { MatrixRow } from "./performance";
import type { PeriodWindows } from "./windows";

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
   * Disputes that ran under period durations the court has since changed, grouped by the
   * durations they ran under.
   *
   * Grouped rather than listed flat because the footnote has to name what the difference *was*
   * — "an 8h commit window against 45m now" — and one list of ids could not say that if the
   * court were ever reconfigured twice. Empty until the parameter history has been read, and
   * empty is not a claim: `CourtParameters.read` is what says whether it was looked for.
   *
   * Carried here for the same reason `lonePanelDisputes` is: any aggregate over latency has to
   * disclose them, and ticket 06's marginals are the first figures that will.
   */
  changedWindows: readonly WindowChange[];
  /**
   * Disputes the court's parameter history could not place, by id.
   *
   * Distinct from `changedWindows` being empty, and the distinction is the whole point: no
   * marked dispute can mean every dispute ran under the current windows, or it can mean the
   * history is too short to say. Only this count tells them apart, and without it a short scan
   * renders as a clean bill of health.
   */
  unplacedDisputes: readonly number[];
};

/**
 * The two windows every figure on this dashboard is measured from.
 *
 * Narrower than `PeriodWindows` on purpose. A group below is keyed on exactly these two, so
 * every dispute in it agrees about them — and about nothing else. Carrying the whole
 * `PeriodWindows` here would report one arbitrary member's evidence and appeal windows as
 * though they applied to the group, which is a wrong figure waiting for a caller.
 */
export type MeasuredWindows = Pick<PeriodWindows, "commitSeconds" | "voteSeconds">;

/** One group of disputes that share a superseded pair of windows. */
export type WindowChange = {
  /** Ascending. The ids the marker sits on. */
  disputes: readonly number[];
  /** What those disputes ran under. Compare against `CourtParameters.current`. */
  windows: MeasuredWindows;
  /**
   * How many of those disputes' draws put a reveal latency into `revealLatency`.
   *
   * The figure the marker's own line needs: "1 of 67 draws ran under a vote window of 8h" is
   * what makes a dagger on a median mean something. Counted here rather than in the tile that
   * prints it, for the reason every count in this file is.
   */
  revealedDraws: number;
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

/**
 * The marked disputes, gathered under the windows they ran under.
 *
 * Keyed on the commit and vote windows and not on all four, because those are the two the
 * marker is about: they are the periods the figures are measured from, and grouping on a
 * difference no figure reflects would split one footnote into two saying the same thing.
 */
function changedWindowsOf(rows: readonly MatrixRow[]): WindowChange[] {
  const groups = new Map<string, WindowChange & { disputes: number[] }>();

  for (const row of rows) {
    if (!row.underEarlierWindows || row.windows === null) continue;

    const revealed = row.cells.filter(
      (cell) => cell !== null && cell.revealLatencySeconds !== null,
    ).length;

    const { commitSeconds, voteSeconds } = row.windows;
    const key = `${commitSeconds}/${voteSeconds}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, {
        disputes: [row.dispute.id],
        windows: { commitSeconds, voteSeconds },
        revealedDraws: revealed,
      });
    } else {
      group.disputes.push(row.dispute.id);
      group.revealedDraws += revealed;
    }
  }

  // Rows arrive newest first, and a footnote naming "disputes 151 and 152" reads forwards — so
  // the ids inside a group are sorted, and so are the groups themselves. Insertion order here
  // is row order, which would print the *newer* superseded configuration first and read as a
  // history running backwards.
  const changes = [...groups.values()];
  for (const group of changes) group.disputes.sort((a, b) => a - b);
  return changes.sort((a, b) => (a.disputes[0] ?? 0) - (b.disputes[0] ?? 0));
}

/**
 * Disputes the parameter history could not place, by id.
 *
 * The absence that would otherwise pass for a finding. A row whose windows are `null` is one
 * the court's history says nothing about — a scan that dropped the oldest `CourtCreated`, say,
 * which is exactly what a provider capping `eth_getLogs` produces (ADR-0004). It is *not*
 * marked, because nothing is known to compare it against, and without this count the page would
 * fold it in with the rows that genuinely ran under the current windows and state as much.
 *
 * Every row is here while the history is unread, which is why the view gates on
 * `CourtParameters.current` before saying anything: an unread history is already announced, and
 * saying it twice in different words is worse than saying it once.
 */
function unplacedDisputesOf(rows: readonly MatrixRow[]): number[] {
  return rows
    .filter((row) => row.windows === null)
    .map((row) => row.dispute.id)
    .sort((a, b) => a - b);
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
    lonePanelDisputes: rows.filter((row) => row.panelSize === 1).map((row) => row.dispute.id),
    changedWindows: changedWindowsOf(rows),
    unplacedDisputes: unplacedDisputesOf(rows),
  };
}
