import { isFinalised } from "../disputes/liveness";
import type { CourtPerformance, DrawState } from "./performance";

/**
 * What changed in the court between one read and the next, in words.
 *
 * Ticket 12 gave this dashboard a five-second poll, and with it the problem this file answers:
 * the page changes under a reader who cannot see it, in silence. The obvious fix is the wrong
 * one — putting the matrix in a live region announces every cell in it on every poll, which is
 * a hundred and sixty-eight readings of an unchanged grid every five seconds, and the criterion
 * that forbids it says so directly: *never re-announces the matrix*.
 *
 * What a reader wants is the difference. So this is a diff between two reads, and a diff is a
 * derivation like any other: it belongs below the seam, pure, with no clock and no network, and
 * the component upstairs only prints what it returns. Keeping it here is also what makes the
 * editorial decisions testable — which transitions are worth hearing is a judgement, and the
 * cases below are where it is written down rather than buried in a component.
 *
 * Three judgements, each with a test naming it:
 *
 * - **A ruling is one event, not seven.** Every revealed draw in a dispute resolves to coherent
 *   or diverged the instant the ruling lands. Announcing each one turns a single fact into a
 *   panel-sized list, so the ruling is announced and the draws under it are not.
 * - **A burst becomes a count.** Polite regions interrupt themselves, so a dozen sentences
 *   arriving together is a dozen fragments. Past a handful, the number is the honest summary.
 * - **Growth is not motion.** A dispute that appears between two reads has not transitioned, and
 *   a row whose draws were never read is an absence rather than an event. Both are silent here;
 *   the sparsity note and ticket 13's Unknown cell are where those belong.
 */

/**
 * The court reduced to the things a transition can happen to.
 *
 * A snapshot rather than the model itself, because the comparison has to survive react-query
 * replacing the object wholesale on every poll: two `CourtPerformance` values are never
 * reference-equal and almost always mean the same thing.
 */
export type CourtSnapshot = {
  /** Dispute id to whether the court has ruled it. Unread rows are absent. */
  readonly ruled: ReadonlyMap<number, boolean>;
  /** `<disputeId>:<nickname>` to the stage that draw had reached. */
  readonly stages: ReadonlyMap<string, string>;
};

function stageOf(state: DrawState): string {
  return state.kind === "live" ? state.stage : state.kind;
}

/**
 * The stages worth saying, and what to say about each.
 *
 * `no-vote` is here and it is not a live stage: a draw resolves to it when the vote period
 * closes with nothing revealed, which is an agent juror failing to act — the loudest thing that
 * can happen to a cell and, before review caught it, the one transition that fell through this
 * map in silence. `coherent` and `diverged` are deliberately absent: they resolve from the
 * ruling and are announced as the ruling, once, rather than once per draw.
 */
const TRANSITION_VERBS: Record<string, string> = {
  committed: "committed",
  revealed: "revealed",
  "no-vote": "did not vote",
};

export function snapshotOf(performance: CourtPerformance): CourtSnapshot {
  const ruled = new Map<number, boolean>();
  const stages = new Map<string, string>();

  for (const row of performance.rows) {
    // An unread row is left out entirely rather than recorded as empty. Recording it would make
    // the read that finally lands look like six draws arriving at once — the "not read" against
    // "not drawn" confusion this dashboard keeps having to draw a line under, in a third place.
    if (!row.read) continue;

    // Through `isFinalised` and never off `dispute.ruled`, because ADR-0007 settled that the
    // court having ruled is the definition and `ruled` is one reading of it. Two predicates for
    // one question is how the caption and the row flag would come to disagree about a dispute.
    ruled.set(row.dispute.id, isFinalised(row.dispute));
    for (const cell of row.cells) {
      if (cell === null) continue;
      stages.set(`${row.dispute.id}:${cell.agentJuror.nickname}`, stageOf(cell.state));
    }
  }

  return { ruled, stages };
}

/** Above this many draw movements in one poll, the list becomes a count. */
const BURST = 4;

export function transitionsBetween(
  previous: CourtSnapshot | null,
  next: CourtSnapshot,
): readonly string[] {
  // Nothing to have moved from. A page announcing its own arrival as news is the same mistake
  // as a standing explanation wrapped in `role="status"`.
  if (previous === null) return [];

  const said: string[] = [];

  const newlyRuled: number[] = [];
  for (const [id, isRuled] of next.ruled) {
    if (isRuled && previous.ruled.get(id) === false) newlyRuled.push(id);
  }
  newlyRuled.sort((a, b) => a - b);
  for (const id of newlyRuled) said.push(`Dispute ${id} has been ruled.`);

  const ruledNow = new Set(newlyRuled);
  const moved: Array<{ disputeId: number; nickname: string; verb: string }> = [];

  for (const [key, stage] of next.stages) {
    const before = previous.stages.get(key);
    // Absent before means the draw itself is new to this read — the court grew, or a row that
    // had not been read was read. Neither is a draw that did something.
    if (before === undefined || before === stage) continue;

    const [rawId = "", nickname = ""] = key.split(":");
    const disputeId = Number(rawId);
    // The consequence of a ruling, not an event of its own: see the docblock.
    if (ruledNow.has(disputeId)) continue;

    const verb = TRANSITION_VERBS[stage];
    if (verb === undefined) continue;
    moved.push({ disputeId, nickname, verb });
  }

  if (moved.length > BURST) {
    const disputes = new Set(moved.map((one) => one.disputeId)).size;
    said.push(
      `${moved.length} draws advanced across ${disputes} ${disputes === 1 ? "dispute" : "disputes"}.`,
    );
    return said;
  }

  for (const { disputeId, nickname, verb } of moved) {
    said.push(`${nickname} ${verb} in dispute ${disputeId}.`);
  }

  return said;
}
