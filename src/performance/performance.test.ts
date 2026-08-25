import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCourtData,
  type RawDraw,
} from "./performance";

/**
 * The real court, read from Goldsky on 2026-08-25 and captured beside the dispute payload
 * ticket 03 took the same day: 76 vote IDs across disputes 151–166, held by five of the six
 * agent jurors.
 *
 * Everything asserted below about the finalised range — 61 votes collapsing to 44 draws, a
 * reveal latency of 7s to 552s with a median of 85s, dispute 155's panel of one — is the
 * measured record as `spec.md` § Further Notes states it. That is the point of capturing
 * rather than inventing: if a derivation drifts, it stops reproducing figures that were
 * established independently of this code.
 */
const rawDisputes = disputeFixture as RawDispute[];
const rawDraws = drawFixture as RawDraw[];

function courtData(overrides: Partial<RawCourtData> = {}): RawCourtData {
  return { disputes: rawDisputes, draws: rawDraws, roster: ROSTER, ...overrides };
}

/** The model, or a failure loud enough to read in the test output. */
function built(raw: RawCourtData = courtData()): CourtPerformance {
  const result = buildCourtPerformance(raw);
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

function rowFor(id: number, performance = built()) {
  const row = performance.rows.find((candidate) => candidate.dispute.id === id);
  if (row === undefined) throw new Error(`No row for dispute ${id}`);
  return row;
}

function cellFor(disputeId: number, nickname: string, performance = built()) {
  const column = performance.agentJurors.findIndex(
    (agentJuror) => agentJuror.nickname === nickname,
  );
  return rowFor(disputeId, performance).cells[column] ?? null;
}

/** One agent juror's draw in one dispute, as the subgraph reports each of its vote IDs. */
function rawDraw(overrides: Partial<RawDraw> = {}): RawDraw {
  return {
    id: "163-0-0",
    juror: { id: "0x57eb05d4dffac43a0c52b42c47a4e7d1838725ea" },
    dispute: { disputeID: "163" },
    round: { id: "163-0" },
    vote: {
      commited: true,
      voted: true,
      choice: "2",
      justification: { timestamp: "1787343444", choice: "2" },
    },
    ...overrides,
  };
}

/** A dispute in each of the states the cell has to tell apart, with one round. */
function rawDispute(overrides: Partial<RawDispute> = {}): RawDispute {
  return {
    id: "163",
    disputeID: "163",
    period: "execution",
    ruled: true,
    currentRuling: "2",
    createdAt: "1787340123",
    lastPeriodChange: "1787409015",
    currentRoundIndex: "0",
    rounds: [{ id: "163-0", timeline: ["1787342856", "1787343398", "1787344095", "1787409015"] }],
    ...overrides,
  };
}

describe("buildCourtPerformance", () => {
  it("reads the captured court without a network or a clock", () => {
    expect(buildCourtPerformance(courtData()).success).toBe(true);
  });

  it("puts one row on the matrix per dispute, newest first", () => {
    const performance = built();

    expect(performance.rows.map((row) => row.dispute.id)).toEqual([
      166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154, 153, 152, 151,
    ]);
  });

  it("puts one column on the matrix per agent juror, in roster order", () => {
    const performance = built();

    expect(performance.agentJurors.map((agentJuror) => agentJuror.nickname)).toEqual([
      "007",
      "aletheia",
      "baskerville",
      "blaise",
      "columbo",
      "daemonhill",
    ]);
    for (const row of performance.rows) {
      expect(row.cells).toHaveLength(6);
    }
  });

  it("collapses the 61 votes of the finalised disputes into 44 draws", () => {
    const finalised = built().rows.filter((row) => row.dispute.id <= 163);
    const drawn = finalised.flatMap((row) => row.cells.filter((cell) => cell !== null));

    expect(drawn).toHaveLength(44);
    expect(drawn.reduce((total, draw) => total + draw.voteCount, 0)).toBe(61);
  });

  it("collapses several vote IDs held by one agent juror into a single draw", () => {
    // Dispute 155's whole panel was columbo, holding all three vote IDs.
    const row = rowFor(155);

    expect(row.cells.filter((cell) => cell !== null)).toHaveLength(1);
    expect(cellFor(155, "columbo")?.voteCount).toBe(3);
  });

  it("counts panel size in agent jurors drawn, never in vote IDs", () => {
    expect(rowFor(155).panelSize).toBe(1);
    expect(rowFor(163).panelSize).toBe(5);
    expect(rowFor(151).panelSize).toBe(2);
  });

  it("leaves the column of an agent juror that has never been drawn empty end to end", () => {
    const performance = built();
    const column = performance.agentJurors.findIndex(
      (agentJuror) => agentJuror.nickname === "baskerville",
    );

    expect(performance.rows.every((row) => row.cells[column] === null)).toBe(true);
  });

  describe("reveal latency", () => {
    it("measures from the moment the vote period opened to the moment the reveal was recorded", () => {
      // Dispute 163's vote period opened at 1787343398; blaise's justification landed at
      // 1787343444. Not from `createdAt`, not from a deadline, and not from a clock.
      expect(cellFor(163, "blaise")?.revealLatencySeconds).toBe(46);
    });

    it("reproduces the measured range across the finalised disputes", () => {
      const latencies = built()
        .rows.filter((row) => row.dispute.id <= 163)
        .flatMap((row) => row.cells)
        .map((cell) => cell?.revealLatencySeconds ?? null)
        .filter((seconds): seconds is number => seconds !== null)
        .sort((a, b) => a - b);
      const median = ((latencies[21] ?? 0) + (latencies[22] ?? 0)) / 2;

      expect(latencies).toHaveLength(44);
      expect(latencies[0]).toBe(7);
      expect(latencies[latencies.length - 1]).toBe(552);
      expect(median).toBe(85);
    });

    it("measures against the round the draw belongs to, not the dispute's first round", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["500", "1000", "1500", "1900"] },
            ],
          }),
        ],
        draws: [
          rawDraw({
            round: { id: "163-1" },
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1042", choice: "2" },
            },
          }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.revealLatencySeconds).toBe(42);
    });

    it("never measures one round's reveal against another round's clock", () => {
      // Appeal rounds are out of scope, and one cell per agent juror per dispute is the whole
      // shape of the matrix, so an appealed dispute has to pick a round. Picking wrongly is not
      // cosmetic: merging two rounds' vote IDs into one group dates a round-0 reveal against
      // round 1's vote period — negative by hundreds of seconds, which fails the entire matrix —
      // and judges a juror still committing in round 1 against round 0's closed vote period,
      // which renders as `NO VOTE`, the one state that attributes a failure.
      const disputes = [
        rawDispute({
          period: "vote",
          ruled: false,
          currentRuling: "0",
          rounds: [
            { id: "163-0", timeline: ["1", "100", "500", "900"] },
            { id: "163-1", timeline: ["1000", "1100", "0", "0"] },
          ],
        }),
      ];
      const firstRound = rawDraw({
        vote: {
          commited: true,
          voted: true,
          choice: "2",
          justification: { timestamp: "142", choice: "2" },
        },
      });
      const secondRound = rawDraw({
        id: "163-1-0",
        round: { id: "163-1" },
        vote: { commited: true, voted: false, choice: null, justification: null },
      });

      for (const draws of [
        [firstRound, secondRound],
        [secondRound, firstRound],
      ]) {
        const cell = cellFor(163, "blaise", built(courtData({ disputes, draws })));

        // The round still running is the one the cell reports, whatever order it arrived in.
        expect(cell?.state).toEqual({ kind: "live", stage: "committed" });
        expect(cell?.revealLatencySeconds).toBeNull();
        expect(cell?.voteCount).toBe(1);
      }
    });

    it("reports an unknown latency rather than a wrong one when the reveal was not recorded", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({
            vote: { commited: true, voted: true, choice: "2", justification: null },
          }),
        ],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.revealLatencySeconds).toBeNull();
      // The draw still voted, and still voted with the ruling. Only the moment is missing.
      expect(cell?.state).toEqual({ kind: "coherent" });
    });
  });

  describe("coherence", () => {
    it("is computed against the dispute's own final ruling", () => {
      // Dispute 154 refused to arbitrate. Three of its four agent jurors voted 0 with it;
      // aletheia voted 1 across both of its vote IDs and is the diverged one.
      expect(cellFor(154, "blaise")?.state).toEqual({ kind: "coherent" });
      expect(cellFor(154, "aletheia")?.state).toEqual({ kind: "diverged" });
      expect(cellFor(154, "aletheia")?.voteCount).toBe(2);
    });

    it("treats a refusal to arbitrate as a ruling an agent juror can be coherent with", () => {
      // Dispute 154 is genuinely currentRuling 0 with ruled true, so a draw that voted 0 is
      // coherent. Testing the ruling for truthiness would mark the whole panel incoherent.
      expect(rowFor(154).dispute.ruling).toEqual({ state: "refused" });
      expect(cellFor(154, "columbo")?.state).toEqual({ kind: "coherent" });
      expect(cellFor(154, "daemonhill")?.state).toEqual({ kind: "coherent" });
    });

    it("asserts nothing about a dispute the court has not ruled on", () => {
      // 164–166 were still in their appeal period: every vote is in, and the ruling is not.
      for (const id of [164, 165, 166]) {
        const drawn = rowFor(id).cells.filter((cell) => cell !== null);

        expect(drawn.length).toBeGreaterThan(0);
        for (const draw of drawn) {
          expect(draw.state).toEqual({ kind: "live", stage: "revealed" });
        }
      }
    });

    it("reads a majority the subgraph reports before the appeal closes as no ruling at all", () => {
      const raw = courtData({
        disputes: [rawDispute({ period: "appeal", ruled: false, currentRuling: "1" })],
        draws: [rawDraw()],
      });

      // The vote says 2 and the subgraph's current ruling says 1, which would read as
      // diverged if the prediction were taken for a ruling.
      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "revealed",
      });
    });
  });

  describe("the states a draw can be in", () => {
    it("reports a draw whose vote period closed with nothing revealed as a missed vote", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.state).toEqual({ kind: "no-vote" });
      expect(cell?.revealLatencySeconds).toBeNull();
    });

    it("reports a draw that has committed inside an open vote period as still acting", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "vote",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "1787343398", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "committed",
      });
    });

    it("reports a draw that has done nothing yet as awaiting, not as a missed vote", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({ vote: { commited: false, voted: false, choice: null, justification: null } }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "awaiting",
      });
    });

    it("reports a draw the subgraph has no vote entity for as awaiting", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [rawDraw({ vote: null })],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "awaiting",
      });
    });
  });

  describe("a payload it cannot believe", () => {
    it("fails rather than reporting a reveal that predates the vote period", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1787342000", choice: "2" },
            },
          }),
        ],
      });
      const result = buildCourtPerformance(raw);

      expect(result.success).toBe(false);
    });

    it("fails rather than guessing the choice of a draw that revealed without one", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: true, choice: null, justification: null } }),
        ],
      });

      expect(buildCourtPerformance(raw).success).toBe(false);
    });

    it("fails rather than dropping a draw whose round the dispute does not hold", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw({ round: { id: "163-3" } })],
      });

      expect(buildCourtPerformance(raw).success).toBe(false);
    });

    it("names what it could not read, so the failure can be reported rather than absorbed", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw({ round: { id: "163-3" } })],
      });
      const result = buildCourtPerformance(raw);

      if (result.success) throw new Error("expected a failure");
      expect(result.code).toBe("MALFORMED_COURT_DATA");
      expect(result.message).toContain("163-0-0");
    });
  });

  describe("what it leaves out", () => {
    it("ignores a draw for a dispute the payload does not carry", () => {
      // The two reads are separate requests: a dispute created between them arrives with
      // draws and no row. Dropping it shows one dispute late, which the next read fixes;
      // failing would blank a matrix that is otherwise entirely readable.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw(), rawDraw({ id: "999-0-0", dispute: { disputeID: "999" } })],
      });

      expect(built(raw).rows).toHaveLength(1);
    });

    it("gives a drawn address outside the roster no column, and still counts it in the panel", () => {
      // The roster is the only place agent jurors are enumerated and it is the column set, so
      // an address outside it gets no cell. It was still on the panel, and panel size is a fact
      // about the court: counting it in roster matches would let one non-agent juror turn a
      // panel of two into this page's claim that the dispute was "decided by a panel of one".
      const stranger: RawDraw = rawDraw({
        id: "163-0-9",
        juror: { id: "0x1111111111111111111111111111111111111111" },
      });
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw(), stranger] });
      const row = rowFor(163, built(raw));

      expect(row.panelSize).toBe(2);
      expect(row.cells.filter((cell) => cell !== null)).toHaveLength(1);
    });

    it("keys the roster on address rather than on the case the subgraph returns", () => {
      const shouting: AgentJuror[] = ROSTER.map((agentJuror) => ({
        ...agentJuror,
        address: agentJuror.address.toUpperCase() as AgentJuror["address"],
      }));

      expect(rowFor(163, built(courtData({ roster: shouting }))).panelSize).toBe(5);
    });
  });
});
