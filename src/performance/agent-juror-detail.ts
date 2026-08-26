import type { AgentJuror } from "../roster/agent-jurors";
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
 * list in the same order, so an off-by-one shows aletheia's ten draws under blaise's avatar with
 * every figure on the page internally consistent, no error, and nothing in the console. That is
 * the shape of defect this repository keeps below the seam and out of components, so this is
 * pure, testable and asked for by name.
 *
 * It reads no clock and no network, like the two models beside it. Unlike `dispute-detail.ts` it
 * adds no read of its own at all: the agent juror view needs nothing the matrix has not already
 * fetched, which is what ticket 06 meant by "it needs no read of its own".
 */

/** One dispute this agent juror was drawn in, and the draw it took there. */
export type AgentJurorDraw = {
  /** The dispute's whole row, which is where panel size and the window flag come from. */
  row: MatrixRow;
  /** This agent juror's own cell in it. Never `null` — a row with none is not in the list. */
  draw: Draw;
};

export type AgentJurorReading = {
  agentJuror: AgentJuror;
  /** The six figures this view's stat card prints, computed by the seam. See `totals.ts`. */
  marginals: AgentJurorMarginals;
  /**
   * The disputes this agent juror was drawn in, newest first.
   *
   * Newest first because the rows are, and the order is the matrix's rather than anything this
   * view chose: a list sorted by latency or by coherence would be a ranking, and nobody is
   * ranked here. Empty for an agent juror the court has never drawn, which is a reading and not
   * an absence of one — `canvas/JurorEmpty.dc.html` is the page that state renders.
   *
   * A dispute whose draws were never read contributes nothing here, because its cells are all
   * `null` and none of them is this agent juror's. That makes the list short by a dispute nobody
   * looked at, which is `CourtTotals.unreadDisputes` and is the view's to disclose — counting it
   * again here would be a second definition of a court-wide fact.
   */
  draws: readonly AgentJurorDraw[];
};

/**
 * One agent juror's reading, or `null` where the roster holds no such nickname.
 *
 * `null` and not a throw: `/agent-jurors/nope` is a real route whose path segment names nothing,
 * which is neither a 404 nor a failed read, and the view says so in its own words. The roster is
 * local, so unlike ticket 09's equivalent this is decidable with no read at all.
 *
 * Matched on the **roster** nickname, exactly. `blaise` carries an ENS `name` record reading
 * "Blaise", and a lookup that lowercased or trimmed would make the URL keyed on something an
 * operator can change from a wallet.
 */
export function buildAgentJurorReading(
  performance: CourtPerformance,
  nickname: string,
): AgentJurorReading | null {
  const column = performance.agentJurors.findIndex((candidate) => candidate.nickname === nickname);
  const agentJuror = performance.agentJurors[column];
  const marginals = performance.marginals[column];
  // Both, and not just the index. The seam guarantees one marginal per agent juror in roster
  // order, so these are non-null together — but the guarantee is a comment somewhere else, and
  // the alternative to checking is a non-null assertion on the join this whole module exists to
  // get right.
  if (agentJuror === undefined || marginals === undefined) return null;

  const draws: AgentJurorDraw[] = [];
  for (const row of performance.rows) {
    const draw = row.cells[column];
    if (draw === undefined || draw === null) continue;
    draws.push({ row, draw });
  }

  return { agentJuror, marginals, draws };
}
