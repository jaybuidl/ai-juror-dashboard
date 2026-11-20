import type { DisputeRound } from "../disputes/disputes";

/**
 * When a commitment was published, joined to the draw that published it.
 *
 * `ClassicVote.commited` is a boolean and nothing in the core subgraph records *when* a
 * commitment was published, so the moment is the timestamp of the block its `CommitCast` log
 * sits in (ADR-0004). That read is Arbitrum's, and since ADR-0012 it is scoped to the view that
 * shows the moment: one dispute on its own page, one agent juror on its own. The court model
 * reads none of it, so nothing here is in `buildCourtPerformance`. What is here is the join both
 * views share, pure and below the seam like every other derivation.
 *
 * Tolerant where the court seam is strict, and deliberately: a commitment that cannot be read
 * costs one moment, never a page. An entry this cannot believe is dropped, and the draw it
 * belonged to then counts as unresolved in `CommitCoverage`, which is how a view says so.
 */

/**
 * One `CommitCast` log, reduced to the three things a moment needs.
 *
 * Strings, like every other raw shape here, so the join validates them itself and a captured
 * payload stays plain JSON. There is no round on the event: an agent juror drawn again on appeal
 * commits again under the same dispute-and-juror key, which is why `commitAt` selects by round.
 */
export type RawCommitCast = {
  disputeID: string;
  /** Checksummed, as the chain returns it — never as The Graph lowercases it. */
  juror: string;
  /** Unix seconds, from the block the commitment was mined in. */
  timestamp: string;
};

/**
 * Whether the commitments a view shows were read whole.
 *
 * A count and not an error, because the failure it exists for throws nothing: an endpoint that
 * caps `eth_getLogs` answers with fewer logs and no complaint, and every draw it dropped then
 * renders as a commitment that never happened (ADR-0004). Comparing what came back against the
 * known set — every draw the subgraph reports as committed, in the view's scope — turns that
 * silence into a number.
 */
export type CommitCoverage = {
  /**
   * Whether the log read has happened at all.
   *
   * False means the answer is not in yet, and nothing may be concluded from `resolved` — least
   * of all out loud. A shortfall is only a shortfall once there is a read to have fallen short.
   */
  read: boolean;
  /** Draws the subgraph reports as committed — what a whole read would account for. */
  expected: number;
  /** How many of those a log was found for. Equal to `expected` when the scan was whole. */
  resolved: number;
};

/** Same canonical-decimal guard as the rest of the model, and for the same reason. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

/** The join key: a dispute and an address, lowercased because The Graph lowercases and the chain checksums. */
export function commitKey(disputeId: number, address: string): string {
  return `${disputeId}/${address.toLowerCase()}`;
}

/**
 * Every commitment read, keyed by dispute and lowercased address, each key's moments ascending.
 *
 * Several moments can share a key: the event carries no round, and an agent juror drawn again on
 * appeal commits again. They are sorted so `commitAt` can pick the one belonging to a round.
 */
export function commitsByDraw(commits: readonly RawCommitCast[]): Map<string, number[]> {
  const byDraw = new Map<string, number[]>();

  for (const commit of commits) {
    if (!CANONICAL_DECIMAL.test(commit.disputeID) || !CANONICAL_DECIMAL.test(commit.timestamp)) {
      continue;
    }
    const key = commitKey(Number(commit.disputeID), commit.juror);
    const timestamp = Number(commit.timestamp);

    const moments = byDraw.get(key);
    if (moments === undefined) byDraw.set(key, [timestamp]);
    else moments.push(timestamp);
  }

  for (const moments of byDraw.values()) moments.sort((a, b) => a - b);
  return byDraw;
}

/**
 * When a draw committed, out of every commitment its agent juror published in the dispute.
 *
 * The earliest one at or after this round's commit period opened. A juror commits at most once
 * per round and a later round opens later, so that is this round's commitment and no other —
 * and choosing this way makes a negative latency structurally impossible rather than something
 * to detect afterwards. A commitment that predates the round is an earlier round's, which is
 * why this returns null rather than failing.
 */
export function commitAt(
  moments: readonly number[] | undefined,
  round: DisputeRound | undefined,
): number | null {
  if (moments === undefined || round === undefined || round.commitOpenedAt === null) return null;

  const opened = round.commitOpenedAt;
  return moments.find((moment) => moment >= opened) ?? null;
}
