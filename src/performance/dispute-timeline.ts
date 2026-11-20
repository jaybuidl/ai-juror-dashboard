import type { AgentJuror } from "../roster/agent-jurors";
import { commitAt, commitKey, commitsByDraw } from "./commitments";
import type { RawDisputeChain, RawPeriodOpening } from "./dispute-chain";
import { type DisputeReading, hasRevealed, type PeriodRun } from "./dispute-detail";
import type { MatrixRow } from "./performance";

/**
 * One dispute's timeline: when each period opened and who opened it, and when each agent juror
 * on its panel committed and revealed (ADR-0012).
 *
 * Moments and never durations. Every entry is a point in time, shown as a clock reading, and
 * nothing here subtracts one from another: the seconds between a period opening and an agent
 * juror acting are commit and reveal latency, which ADR-0010 keeps off every surface that sets
 * agent jurors side by side, and a list of five of them under one period is such a surface.
 * The order within a period is the order things happened in, because that is what a timeline
 * is. It is not a ranking, and nothing reduces it to one.
 *
 * Pure, with no clock and no network, like every other derivation: the subgraph's half arrives
 * as the `DisputeReading`, and the chain's as `RawDisputeChain`.
 */

/**
 * Who opened a period, as far as this page may say.
 *
 * An agent juror on the roster is named, because its own account is the one public identity it
 * has here. Anyone else is an account off the roster and is never named: `passPeriod` is
 * permissionless, the caller may be anyone, and an address is the personal data this dashboard
 * does not hold. The same rule as an off-roster draw — a count, or here a kind, never who.
 */
export type Opener =
  | { kind: "agent-juror"; agentJuror: AgentJuror }
  | { kind: "off-roster" }
  /** No chain read answers for this dispute as it stands yet. Nothing is known. */
  | { kind: "pending" }
  /** The chain read answered, and has no opening for a period the subgraph says opened. */
  | { kind: "not-found" };

/** A moment, or why there is none. */
export type Moment =
  | { kind: "at"; seconds: number }
  /** No chain read answers for this dispute as it stands yet. */
  | { kind: "pending" }
  /** The chain read answered and has no commitment for a draw the subgraph says committed. */
  | { kind: "not-found" }
  /** Revealed, and the reveal carries no justification to date it: "Not dated". */
  | { kind: "undated" };

export type TimelineEntry =
  /** The evidence period of round 0 opens with the dispute. */
  | { kind: "created"; at: number }
  | { kind: "opened"; at: number; by: Opener }
  /** The appeal period closing, which is the execution period opening. */
  | { kind: "closed"; at: number; by: Opener }
  | { kind: "committed"; agentJuror: AgentJuror; at: Moment }
  | { kind: "revealed"; agentJuror: AgentJuror; at: Moment };

export type DisputeTimeline = {
  /** One list per slot of the period strip, each in the order its entries happened. */
  lanes: Readonly<Record<PeriodRun["period"], readonly TimelineEntry[]>>;
  /**
   * What the chain read should have found, and what it did not, once it has answered.
   *
   * Both zero for `missing` while no read answers for the dispute as it stands: a shortfall is
   * only a shortfall once there is a read to have fallen short. `expected` counts the draws the
   * subgraph says committed and the periods it says opened past evidence.
   */
  expected: { commits: number; openings: number };
  missing: { commits: number; openings: number };
};

/** KlerosCore's `Period` values for the four openings the chain records. */
const PERIOD_VALUE = { commit: "1", vote: "2", appeal: "3", execution: "4" } as const;

/** Same canonical-decimal guard as the rest of the model. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

/**
 * The opening of one period in one round: the round's place among that period's openings, in
 * the order they happened (the caller passes 0 for execution, which opens once per dispute).
 *
 * The read runs from the dispute's first draw of any round (`blockRangeOf`), so it holds every
 * round's openings, and a period opens once per round, in round order. Round 1's commit period
 * is the second commit opening, never "the latest": a read that has not yet caught round 1's
 * would hand back round 0's, and print the wrong opener as a finding rather than as pending.
 * Fewer openings than the round needs is an opening not found. By block and then by log index,
 * since one block can hold two openings.
 */
function openingOf(
  openings: readonly RawPeriodOpening[],
  period: string,
  roundIndex: number,
): RawPeriodOpening | undefined {
  const inOrder = openings
    .filter(
      (opening) =>
        opening.period === period &&
        CANONICAL_DECIMAL.test(opening.blockNumber) &&
        CANONICAL_DECIMAL.test(opening.logIndex),
    )
    .sort(chainOrder);
  return inOrder[roundIndex];
}

function chainOrder(a: RawPeriodOpening, b: RawPeriodOpening): number {
  const blockA = BigInt(a.blockNumber);
  const blockB = BigInt(b.blockNumber);
  if (blockA !== blockB) return blockA < blockB ? -1 : 1;
  return Number(a.logIndex) - Number(b.logIndex);
}

/**
 * Who opened a period, matched against the roster on the lowercased address — the same join, and
 * the same reason, as every other between the chain's checksummed form and the roster's.
 */
function openerOf(
  opening: RawPeriodOpening | undefined,
  roster: readonly AgentJuror[],
  answered: boolean,
): Opener {
  if (opening === undefined) return answered ? { kind: "not-found" } : { kind: "pending" };

  const from = opening.from.toLowerCase();
  const agentJuror = roster.find((candidate) => candidate.address.toLowerCase() === from);
  return agentJuror === undefined ? { kind: "off-roster" } : { kind: "agent-juror", agentJuror };
}

/** Where an entry sorts: its moment, or after every dated entry where it has none. */
function momentOf(entry: TimelineEntry): number | null {
  switch (entry.kind) {
    case "created":
    case "opened":
    case "closed":
      return entry.at;
    case "committed":
    case "revealed":
      return entry.at.kind === "at" ? entry.at.seconds : null;
  }
}

/**
 * Within one second, an opening before what was done in the period it opened, and a closing
 * after. Intendant opens a period and acts in it in the same block, and both carry one timestamp.
 */
const RANK: Record<TimelineEntry["kind"], number> = {
  created: 0,
  opened: 0,
  committed: 1,
  revealed: 1,
  closed: 2,
};

/**
 * In the order things happened. `Array.prototype.sort` is stable, so entries the comparison
 * cannot separate keep the order they arrived in, which is the roster's — never a ranking.
 */
function chronological(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.sort((a, b) => {
    const at = momentOf(a);
    const bt = momentOf(b);
    if (at === null || bt === null) return (at === null ? 1 : 0) - (bt === null ? 1 : 0);
    return at - bt || RANK[a.kind] - RANK[b.kind];
  });
}

export function buildDisputeTimeline({
  reading,
  roster,
  chain,
  answered,
}: {
  reading: DisputeReading;
  /** Every agent juror, drawn here or not: any of them may have opened a period. */
  roster: readonly AgentJuror[];
  /** The dispute's chain read, or `null` before one has landed. */
  chain: RawDisputeChain | null;
  /**
   * Whether `chain` answers for the dispute as it now stands.
   *
   * False before any read lands, and false while an earlier read stands in for one that has
   * been asked for since — the court read saw a new commitment or a new period, and this read
   * has not caught up. Its moments are still shown; what is missing from it is not yet a
   * finding, so it reads as pending rather than as not found.
   */
  answered: boolean;
}): DisputeTimeline {
  const { dispute, round } = reading;
  const settled = chain !== null && answered;
  const openings = chain?.openings ?? [];
  const commits = commitsByDraw(chain?.commits ?? []);

  const lanes: Record<PeriodRun["period"], TimelineEntry[]> = {
    evidence: [],
    commit: [],
    vote: [],
    appeal: [],
  };
  const expected = { commits: 0, openings: 0 };
  const missing = { commits: 0, openings: 0 };

  // A later round's evidence period opens on appeal, which no read here dates. Every dispute in
  // court 34 has one round, so this is the dispute's creation throughout.
  if (round === undefined || round.index === 0) {
    lanes.evidence.push({ kind: "created", at: dispute.createdAt });
  }
  if (round === undefined) return { lanes, expected, missing };

  const opener = (period: keyof typeof PERIOD_VALUE): Opener => {
    expected.openings += 1;
    // Commit, vote and appeal open once per round; execution opens once per dispute, because
    // an appeal sends the dispute back to evidence from the appeal period and a round that is
    // appealed never reaches execution. So the execution opening is the only one there is.
    const nth = period === "execution" ? 0 : round.index;
    const by = openerOf(openingOf(openings, PERIOD_VALUE[period], nth), roster, settled);
    if (by.kind === "not-found") missing.openings += 1;
    return by;
  };

  if (round.commitOpenedAt !== null) {
    lanes.commit.push({ kind: "opened", at: round.commitOpenedAt, by: opener("commit") });
  }
  if (round.voteOpenedAt !== null) {
    lanes.vote.push({ kind: "opened", at: round.voteOpenedAt, by: opener("vote") });
  }
  if (round.appealOpenedAt !== null) {
    lanes.appeal.push({ kind: "opened", at: round.appealOpenedAt, by: opener("appeal") });
  }
  if (round.executionOpenedAt !== null) {
    lanes.appeal.push({ kind: "closed", at: round.executionOpenedAt, by: opener("execution") });
  }

  for (const { draw } of reading.columns) {
    // A draw from an earlier round is the cell's, not this round's: `MatrixRow` shows an agent
    // juror's latest involvement, which need not be in the round the strip is about.
    if (draw.roundIndex !== round.index) continue;
    const agentJuror = draw.agentJuror;

    // A commitment on chain is shown whether or not the subgraph has caught up with it, and one
    // the subgraph reports is shown whether or not the chain read found it.
    const committedAt = commitAt(commits.get(commitKey(dispute.id, agentJuror.address)), round);
    if (draw.committed) {
      expected.commits += 1;
      if (committedAt === null && settled) missing.commits += 1;
    }
    if (committedAt !== null || draw.committed) {
      lanes.commit.push({
        kind: "committed",
        agentJuror,
        at:
          committedAt !== null
            ? { kind: "at", seconds: committedAt }
            : settled
              ? { kind: "not-found" }
              : { kind: "pending" },
      });
    }

    if (hasRevealed(draw.state)) {
      lanes.vote.push({
        kind: "revealed",
        agentJuror,
        at:
          draw.revealedAt === null ? { kind: "undated" } : { kind: "at", seconds: draw.revealedAt },
      });
    }
  }

  return {
    lanes: {
      evidence: lanes.evidence,
      commit: chronological(lanes.commit),
      vote: chronological(lanes.vote),
      appeal: chronological(lanes.appeal),
    },
    expected,
    missing,
  };
}

/**
 * What the court read says a dispute has reached, as far as its chain record can change: its
 * round, its period, and how many of its agent juror draws have committed. The chain read is keyed
 * on it (`useDisputeChain`), so a new opening or a new commitment is read when the subgraph
 * reports it, and not on a clock.
 *
 * The round is part of it because a period and a count recur on appeal. Without it, round 1's
 * commit period would land on a key round 0 already filled, and react-query would serve that
 * earlier read as a current answer: a commitment of round 1 counted missing, before the read that
 * could find it had run.
 *
 * `null` where the court read holds no row for the dispute, which is also what keeps the chain
 * read from running for an address that names nothing here, such as another court's dispute.
 */
export function progressOf(row: MatrixRow | undefined): string | null {
  if (row === undefined) return null;
  const committed = row.cells.filter((cell) => cell?.committed === true).length;
  return `${row.dispute.rounds.length}:${row.dispute.period}:${committed}`;
}
