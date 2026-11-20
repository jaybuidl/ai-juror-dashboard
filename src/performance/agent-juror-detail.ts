import type { AgentJuror } from "../roster/agent-jurors";
import {
  type CommitCoverage,
  commitAt,
  commitKey,
  commitsByDraw,
  type RawCommitCast,
} from "./commitments";
import type { CourtPerformance, Draw, MatrixRow } from "./performance";
import type { AgentJurorMarginals } from "./totals";

/**
 * One agent juror's slice of the court: its column, read down instead of across.
 *
 * The third model in this directory and the shallowest of them, deliberately. It reduces
 * nothing: `buildCourtPerformance` already computed every figure this view prints, and ticket
 * 06 built `marginals` for exactly this page. What is left is a *join* — which column of the
 * matrix a nickname names, and which of that column's cells hold a draw — and it lives here
 * rather than in the view for one reason, which is that the join is on an array index.
 *
 * `marginals` is one entry per agent juror in roster order and every row's `cells` is the same
 * list in the same order, so an off-by-one shows Aletheia's ten draws under Blaise's avatar with
 * every figure on the page internally consistent, no error, and nothing in the console. That is
 * the shape of defect this repository keeps below the seam and out of components, so this is
 * pure, testable and asked for by name.
 *
 * It reads no clock and no network, like the two models beside it. It joins one read the matrix
 * does not make: this agent juror's own commitments, from Arbitrum, which are the moments behind
 * the table's commit figures. Until ADR-0012 the matrix scanned every agent juror's on every page
 * and this view borrowed the result; now the view reads its own, for one agent juror.
 */

/** One dispute this agent juror was drawn in, and the draw it took there. */
export type AgentJurorDraw = {
  /** The dispute's whole row, which is where panel size and the window flag come from. */
  row: MatrixRow;
  /** This agent juror's own cell in it. Never `null` — a row with none is not in the list. */
  draw: Draw;
  /**
   * Seconds from the moment this draw's commit period opened to the moment its commitment was
   * mined, per ADR-0001 — a per-draw record and not a speed (ADR-0010). `null` where no log
   * matched this draw's round: the commitments are not read yet, the draw has not committed, or
   * the log was not found, which `AgentJurorReading.commitCoverage` counts. Never negative, and
   * never a fraction of a window (ADR-0005).
   */
  commitLatencySeconds: number | null;
};

export type AgentJurorReading = {
  agentJuror: AgentJuror;
  /** The figures this view's stat card prints, computed by the seam. See `totals.ts`. */
  marginals: AgentJurorMarginals;
  /**
   * The disputes this agent juror was drawn in, newest first.
   *
   * Newest first because the rows are, and the order is the matrix's rather than anything this
   * view chose: a list sorted by latency or by coherence would be a ranking, and nobody is
   * ranked here. Empty for an agent juror the court has not drawn yet, which is a reading and
   * not an absence of one — `canvas/JurorEmpty.dc.html` is the page that state renders.
   *
   * A dispute whose draws were never read contributes nothing here, because its cells are all
   * `null` and none of them is this agent juror's. That makes the list short by a dispute nobody
   * looked at, which is `CourtTotals.unreadDisputes` and is the view's to disclose — counting it
   * again here would be a second definition of a court-wide fact.
   */
  draws: readonly AgentJurorDraw[];
  /** Whether every commitment the subgraph reports for these draws was found on chain. */
  commitCoverage: CommitCoverage;
};

/**
 * One agent juror's reading, or `null` where the roster holds no such nickname.
 *
 * `null` and not a throw: `/agent-jurors/nope` is a real route whose path segment names nothing,
 * which is neither a 404 nor a failed read, and the view says so in its own words. The roster is
 * local, so unlike ticket 09's equivalent this is decidable with no read at all.
 *
 * Matched on the **roster** nickname, exactly — and exactly is the point, because the route
 * above this is not. `AgentJurorPage` folds case on the path segment to keep links made before
 * the nicknames were capitalised working, then hands *this* the roster entry it resolved to. So
 * the fold happens once, against the roster, before the seam sees anything. A second fold here
 * would be a second definition of which agent juror a name picks out, free to drift from the
 * first without either one being obviously wrong.
 *
 * What must never match is a resolved ENS name: that is a text record an operator can rewrite
 * from a wallet, and a lookup that accepted one would key the URL on it.
 */
export function buildAgentJurorReading(
  performance: CourtPerformance,
  nickname: string,
  /** This agent juror's commitments, or `null` where that read has not landed. Never `[]` for that. */
  commits: readonly RawCommitCast[] | null,
  /**
   * Whether `commits` answers for the draws as the court now reports them, rather than standing
   * in from an earlier read while the court has seen a commitment since (`ChainRead.answered`).
   * The moments are used either way; only an answered read can have fallen short.
   */
  answered = commits !== null,
): AgentJurorReading | null {
  const column = performance.agentJurors.findIndex((candidate) => candidate.nickname === nickname);
  const agentJuror = performance.agentJurors[column];
  const marginals = performance.marginals[column];
  // Both, and not just the index. The seam guarantees one marginal per agent juror in roster
  // order, so these are non-null together — but the guarantee is a comment somewhere else, and
  // the alternative to checking is a non-null assertion on the join this whole module exists to
  // get right.
  if (agentJuror === undefined || marginals === undefined) return null;

  const byDraw = commitsByDraw(commits ?? []);
  // The cross-check ADR-0004 requires, over the draws this view shows: every one the subgraph
  // says committed should have a log.
  let expected = 0;
  let resolved = 0;

  const draws: AgentJurorDraw[] = [];
  for (const row of performance.rows) {
    const draw = row.cells[column];
    if (draw === undefined || draw === null) continue;

    // Against the draw's own round, which is the one its commit period opened in.
    const round = row.dispute.rounds.find((candidate) => candidate.index === draw.roundIndex);
    const committedAt = commitAt(byDraw.get(commitKey(row.dispute.id, agentJuror.address)), round);
    const commitLatencySeconds =
      committedAt === null || round === undefined || round.commitOpenedAt === null
        ? null
        : committedAt - round.commitOpenedAt;

    if (draw.committed) {
      expected += 1;
      if (commitLatencySeconds !== null) resolved += 1;
    }
    draws.push({ row, draw, commitLatencySeconds });
  }

  return {
    agentJuror,
    marginals,
    draws,
    commitCoverage: { read: commits !== null && answered, expected, resolved },
  };
}

/**
 * How many of one agent juror's draws the court read says have committed, or `null` where the
 * roster holds no such nickname.
 *
 * What its commit read is keyed on (`useAgentJurorCommits`): a rise is a commitment the read has
 * not seen. Here rather than in the route because it is the same column join as the reading's,
 * on the same index, and a second copy of that join is the off-by-one this module exists to keep
 * in one place.
 */
export function committedCountOf(performance: CourtPerformance, nickname: string): number | null {
  const column = performance.agentJurors.findIndex((candidate) => candidate.nickname === nickname);
  if (column < 0) return null;

  let committed = 0;
  for (const row of performance.rows) {
    if (row.cells[column]?.committed === true) committed += 1;
  }
  return committed;
}
