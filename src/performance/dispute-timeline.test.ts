import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import chainFixture from "./dispute-156-chain.fixture.json" with { type: "json" };
import detailFixture from "./dispute-156-detail.fixture.json" with { type: "json" };
import type { RawDisputeChain } from "./dispute-chain";
import {
  buildDisputeReading,
  type DisputeReading,
  type RawDisputeDetail,
  toDisputeDetail,
} from "./dispute-detail";
import {
  buildDisputeTimeline,
  type DisputeTimeline,
  KLEROS_BOT,
  progressOf,
  type TimelineEntry,
} from "./dispute-timeline";
import { buildCourtPerformance, type MatrixRow, type RawDraw } from "./performance";
import type { RawCourtParameters } from "./windows";

/**
 * One dispute's timeline, against dispute 156 as the court read and the chain read both
 * captured it: four openings by one account off the roster, four commitments, four reveals.
 */

const court = (() => {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    parameters: parameterFixture as RawCourtParameters[],
    rewards: null,
    roster: ROSTER,
    drawsReadAt: null,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
})();

const row156 = court.rows.find((row) => row.dispute.id === 156) as MatrixRow;
const chain156 = chainFixture as RawDisputeChain;

function reading(row: MatrixRow = row156): DisputeReading {
  return buildDisputeReading({
    row,
    detail: toDisputeDetail(detailFixture as RawDisputeDetail),
    template: undefined,
  });
}

function timeline(
  chain: RawDisputeChain | null = chain156,
  answered = chain !== null,
  of: DisputeReading = reading(),
): DisputeTimeline {
  return buildDisputeTimeline({ reading: of, roster: ROSTER, chain, answered });
}

/** An entry as a short line, so a lane's order reads as a list in the assertion. */
function line(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "created":
      return `${entry.at} created`;
    case "opened":
    case "closed":
      return `${entry.at} ${entry.kind} by ${entry.by.kind === "agent-juror" ? entry.by.agentJuror.nickname : entry.by.kind}`;
    case "committed":
    case "revealed":
      return `${entry.at.kind === "at" ? entry.at.seconds : entry.at.kind} ${entry.agentJuror.nickname} ${entry.kind}`;
  }
}

const BLAISE = "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea";

/** An account that is neither an agent juror nor the Kleros bot. Synthetic: see `test/court.tsx`. */
const OFF_ROSTER = "0x1111111111111111111111111111111111111111";

/**
 * Dispute 156 as if appealed into round `index`, with that round's commit period open and its
 * panel the same agent jurors. No dispute in court 34 has been appealed; this is the shape the
 * first one will have.
 */
function rowOfRound(index: number): MatrixRow {
  const [first] = row156.dispute.rounds;
  if (first === undefined) throw new Error("dispute 156 has no round");
  const later = {
    ...first,
    index,
    voteOpenedAt: null,
    appealOpenedAt: null,
    executionOpenedAt: null,
  };
  return {
    ...row156,
    dispute: { ...row156.dispute, rounds: [first, later] },
    cells: row156.cells.map((cell) => (cell === null ? null : { ...cell, roundIndex: index })),
  };
}

function appealedTo(index: number): DisputeReading {
  return reading(rowOfRound(index));
}

describe("buildDisputeTimeline", () => {
  it("puts each moment in the lane of the period it happened in, in the order it happened", () => {
    const { lanes } = timeline();

    expect(lanes.evidence.map(line)).toEqual(["1787295387 created"]);
    expect(lanes.commit.map(line)).toEqual([
      "1787298120 opened by kleros-bot",
      "1787298223 Daemonhill committed",
      "1787298252 007 committed",
      "1787298443 Blaise committed",
      "1787298857 Columbo committed",
    ]);
    expect(lanes.vote.map(line)).toEqual([
      "1787299355 opened by kleros-bot",
      "1787299386 Blaise revealed",
      "1787299395 Daemonhill revealed",
      "1787299438 007 revealed",
      "1787299472 Columbo revealed",
    ]);
    expect(lanes.appeal.map(line)).toEqual([
      "1787299975 opened by kleros-bot",
      "1787365125 closed by kleros-bot",
    ]);
  });

  it("finds nothing missing from a whole read", () => {
    const { expected, missing } = timeline();

    expect(expected).toEqual({ commits: 4, openings: 4 });
    expect(missing).toEqual({ commits: 0, openings: 0 });
  });

  it("names an opener on the roster, whatever case the chain sends its address in", () => {
    const chain = {
      ...chain156,
      openings: chain156.openings.map((opening) =>
        opening.period === "2"
          ? { ...opening, from: BLAISE.toUpperCase().replace("0X", "0x") }
          : opening,
      ),
    };

    expect(timeline(chain).lanes.vote[0]).toMatchObject({
      kind: "opened",
      by: { kind: "agent-juror", agentJuror: { nickname: "Blaise" } },
    });
  });

  it("names the Kleros bot, the court's own keeper, and carries no address for it", () => {
    const opened = timeline().lanes.commit[0];

    expect(opened).toEqual({ kind: "opened", at: 1787298120, by: { kind: "kleros-bot" } });
  });

  it("recognises the Kleros bot whatever case the chain sends its address in", () => {
    const shouted = {
      ...chain156,
      openings: chain156.openings.map((opening) => ({
        ...opening,
        from: `0x${KLEROS_BOT.slice(2).toUpperCase()}`,
      })),
    };

    expect(timeline(shouted).lanes.commit[0]).toMatchObject({ by: { kind: "kleros-bot" } });
  });

  it("calls any other opener off the roster an off-roster account, and carries no address", () => {
    const unknown = {
      ...chain156,
      openings: chain156.openings.map((opening) => ({ ...opening, from: OFF_ROSTER })),
    };
    const opened = timeline(unknown).lanes.commit[0];

    expect(opened).toEqual({ kind: "opened", at: 1787298120, by: { kind: "off-roster" } });
  });

  it("puts an opening before what was done in the same second, then the roster's order", () => {
    // Intendant opens a period and commits in the same block, so both carry one timestamp. The
    // opening comes first because it came first; ties between agent jurors keep roster order,
    // which is the one order here that ranks nobody.
    const opened = 1787298120;
    const chain = {
      ...chain156,
      commits: chain156.commits.map((commit) => ({ ...commit, timestamp: String(opened) })),
    };

    expect(timeline(chain).lanes.commit.map(line)).toEqual([
      `${opened} opened by kleros-bot`,
      `${opened} 007 committed`,
      `${opened} Blaise committed`,
      `${opened} Columbo committed`,
      `${opened} Daemonhill committed`,
    ]);
  });

  it("has every opener and commitment pending before the chain answers, and nothing missing", () => {
    const { lanes, missing } = timeline(null);

    expect(lanes.commit[0]).toMatchObject({ kind: "opened", by: { kind: "pending" } });
    for (const entry of lanes.commit.slice(1)) {
      expect(entry).toMatchObject({ kind: "committed", at: { kind: "pending" } });
    }
    // Reveals are the subgraph's, so they are dated whatever the chain has said.
    expect(lanes.vote[1]).toMatchObject({ kind: "revealed", at: { kind: "at" } });
    expect(missing).toEqual({ commits: 0, openings: 0 });
  });

  it("counts what an answered read lacks, and marks each such entry not found", () => {
    const short = {
      openings: chain156.openings.filter((opening) => opening.period !== "3"),
      commits: chain156.commits.slice(1),
    };
    const { lanes, missing } = timeline(short);

    expect(missing).toEqual({ commits: 1, openings: 1 });
    expect(lanes.appeal[0]).toMatchObject({ kind: "opened", by: { kind: "not-found" } });
    expect(lanes.commit.at(-1)).toMatchObject({
      kind: "committed",
      agentJuror: { nickname: "Daemonhill" },
      at: { kind: "not-found" },
    });
  });

  it("finds nothing missing from a read standing in while the court has moved past it", () => {
    // The court saw a commitment this read predates; a re-read is in flight. Its moments are
    // used, and what it lacks is pending rather than a finding.
    const short = { ...chain156, commits: chain156.commits.slice(1) };
    const { lanes, missing } = timeline(short, false);

    expect(missing).toEqual({ commits: 0, openings: 0 });
    expect(lanes.commit.at(-1)).toMatchObject({ at: { kind: "pending" } });
    expect(lanes.commit[1]).toMatchObject({ at: { kind: "at", seconds: 1787298252 } });
  });

  it("takes round 0's opening of a period in round 0, whatever later rounds opened", () => {
    const later = { period: "1", from: BLAISE, blockNumber: "497100000", logIndex: "3" };
    const { lanes } = timeline({ ...chain156, openings: [...chain156.openings, later] });

    expect(lanes.commit[0]).toMatchObject({ by: { kind: "kleros-bot" } });
  });

  it("orders two openings in one block by log index", () => {
    // Two commit openings in one block, the later one Blaise's: round 1's is the second.
    const [commit] = chain156.openings;
    if (commit === undefined) throw new Error("no opening in the fixture");
    const later = { ...commit, from: BLAISE, logIndex: String(Number(commit.logIndex) + 1) };
    const appealed = appealedTo(1);

    expect(
      timeline({ ...chain156, openings: [later, ...chain156.openings] }, true, appealed).lanes
        .commit[0],
    ).toMatchObject({ by: { kind: "agent-juror", agentJuror: { nickname: "Blaise" } } });
  });

  it("finds the one execution opening for an appealed dispute that reached it", () => {
    // Execution opens once per dispute: round 0 was appealed from its appeal period and never
    // executed. A whole read of a two-round dispute holds round 0's commit, vote and appeal
    // openings, round 1's, and a single execution opening — all found, nothing missing.
    const [commit, vote, appeal, execution] = chain156.openings;
    if (
      commit === undefined ||
      vote === undefined ||
      appeal === undefined ||
      execution === undefined
    ) {
      throw new Error("the fixture holds four openings");
    }
    const later = (opening: typeof commit, blockNumber: string) => ({ ...opening, blockNumber });
    const twoRounds = {
      ...chain156,
      openings: [
        commit,
        vote,
        appeal,
        later(commit, "497100000"),
        later(vote, "497100100"),
        later(appeal, "497100200"),
        later(execution, "497200000"),
      ],
    };
    const [first] = row156.dispute.rounds;
    if (first === undefined) throw new Error("dispute 156 has no round");
    const executed: MatrixRow = {
      ...rowOfRound(1),
      dispute: {
        ...row156.dispute,
        rounds: [
          { ...first, executionOpenedAt: null },
          { ...first, index: 1 },
        ],
      },
    };
    const { lanes, missing } = timeline(twoRounds, true, reading(executed));

    expect(missing.openings).toBe(0);
    expect(lanes.appeal.at(-1)).toMatchObject({ kind: "closed", by: { kind: "kleros-bot" } });
  });

  it("never names an earlier round's opener for a round whose opening has not been read", () => {
    // Round 1's commit period has opened by the subgraph's account and the read holds only
    // round 0's opening. That opening is not round 1's, so the opener is not found — and counted.
    const { lanes, missing } = timeline(chain156, true, appealedTo(1));

    expect(lanes.commit[0]).toMatchObject({ kind: "opened", by: { kind: "not-found" } });
    expect(missing.openings).toBeGreaterThan(0);
  });

  it("shows a commitment on chain the subgraph has not caught up with", () => {
    // A commitment mined and not yet indexed is a moment this page can state; it is not counted
    // as expected, because the subgraph does not report it yet.
    const lagging: MatrixRow = {
      ...row156,
      cells: row156.cells.map((cell) =>
        cell?.agentJuror.nickname === "Blaise" ? { ...cell, committed: false } : cell,
      ),
    };
    const { lanes, expected } = timeline(chain156, true, reading(lagging));

    expect(lanes.commit.map(line)).toContain("1787298443 Blaise committed");
    expect(expected.commits).toBe(3);
  });

  it("leaves out a draw from another round than the one the strip is about", () => {
    const earlier: MatrixRow = {
      ...row156,
      cells: row156.cells.map((cell) =>
        cell?.agentJuror.nickname === "Blaise" ? { ...cell, roundIndex: 1 } : cell,
      ),
    };
    const { lanes } = timeline(chain156, true, reading(earlier));

    expect(lanes.commit.map(line).join()).not.toContain("Blaise");
    expect(lanes.vote.map(line).join()).not.toContain("Blaise");
  });

  it("says a reveal with nothing to date it is undated, not when it happened", () => {
    const undated: MatrixRow = {
      ...row156,
      cells: row156.cells.map((cell) =>
        cell?.agentJuror.nickname === "Columbo" ? { ...cell, revealedAt: null } : cell,
      ),
    };

    expect(timeline(chain156, true, reading(undated)).lanes.vote.at(-1)).toMatchObject({
      kind: "revealed",
      agentJuror: { nickname: "Columbo" },
      at: { kind: "undated" },
    });
  });

  it("lists only the creation for a dispute nobody has been drawn in", () => {
    const waiting: MatrixRow = {
      ...row156,
      dispute: {
        ...row156.dispute,
        rounds: row156.dispute.rounds.map((round) => ({
          ...round,
          commitOpenedAt: null,
          voteOpenedAt: null,
          appealOpenedAt: null,
          executionOpenedAt: null,
        })),
      },
      cells: row156.cells.map(() => null),
    };
    const { lanes, expected } = timeline(null, false, reading(waiting));

    expect(lanes.evidence.map(line)).toEqual(["1787295387 created"]);
    expect([...lanes.commit, ...lanes.vote, ...lanes.appeal]).toEqual([]);
    expect(expected).toEqual({ commits: 0, openings: 0 });
  });
});

describe("progressOf", () => {
  it("is the round, the period and how many agent jurors have committed", () => {
    expect(progressOf(row156)).toBe("1:execution:4");
  });

  it("differs between two rounds that reach the same period with the same count", () => {
    expect(progressOf(appealedTo(1).dispute === undefined ? row156 : rowOfRound(1))).not.toBe(
      progressOf(row156),
    );
  });

  it("is nothing for a dispute the court read holds no row for", () => {
    expect(progressOf(undefined)).toBeNull();
  });
});
