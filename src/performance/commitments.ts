import type { DisputeRound } from "../disputes/disputes";

/**
 * When a commitment was published, joined to the draw that published it.
 *
 * `ClassicVote.commited` is a boolean and nothing in the core subgraph records *when* a
 * commitment was published, so the moment is the timestamp of the block its `CommitCast` log
 * sits in (ADR-0004). That read is Arbitrum's, and since ADR-0012 it is made for one dispute, by
 * the page that shows its timeline; the court model reads none of it, so nothing here is in
 * `buildCourtPerformance`. What is here is the join, pure and below the seam like every other
 * derivation, apart from the timeline that uses it so it can be tested on its own.
 *
 * Tolerant where the court seam is strict, and deliberately: a commitment that cannot be read
 * costs one moment, never a page. An entry this cannot believe is dropped, and the draw it
 * belonged to then counts as not found in the timeline's shortfall, which is how the page says so.
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
 * The earliest one at or after this round's commit period opened. A later round opens later, so
 * that is this round's first commitment and no earlier round's — and choosing this way makes a
 * negative latency structurally impossible rather than something to detect afterwards. A
 * commitment that predates the round is an earlier round's, which is why this returns null
 * rather than failing.
 *
 * The *first*, which is the moment the cell's `◐` stage begins. The deployed kit does not stop a
 * juror committing again in the same period (`_castCommit` overwrites), nor committing two vote
 * IDs in two transactions; either would leave a later log this does not show. Neither has
 * happened in court 34, and the subgraph's own `commited` flag turns on at the first.
 */
export function commitAt(
  moments: readonly number[] | undefined,
  round: DisputeRound | undefined,
): number | null {
  if (moments === undefined || round === undefined || round.commitOpenedAt === null) return null;

  const opened = round.commitOpenedAt;
  return moments.find((moment) => moment >= opened) ?? null;
}
