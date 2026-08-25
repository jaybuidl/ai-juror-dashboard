import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCommitCast,
  type RawCourtData,
  type RawDraw,
} from "./performance";
import type { RawCourtParameters } from "./windows";

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
 *
 * The commitments beside them came from Arbitrum the same day, through `fetchCommitCasts` and
 * not by hand: 56 `CommitCast` logs, one per committed draw, addresses checksummed as the chain
 * returns them rather than lowercased as The Graph does.
 */
const rawDisputes = disputeFixture as RawDispute[];
const rawDraws = drawFixture as RawDraw[];
const rawCommits = commitFixture as RawCommitCast[];
const rawParameters = parameterFixture as RawCourtParameters[];

function courtData(overrides: Partial<RawCourtData> = {}): RawCourtData {
  return {
    disputes: rawDisputes,
    draws: rawDraws,
    commits: rawCommits,
    parameters: rawParameters,
    roster: ROSTER,
    ...overrides,
  };
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

/**
 * One `CommitCast` log, as `fetchCommitCasts` hands it over: the dispute, the juror and the
 * moment the block carrying the commitment was mined. Checksummed, because the chain is.
 */
function rawCommit(overrides: Partial<RawCommitCast> = {}): RawCommitCast {
  return {
    disputeID: "163",
    juror: "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea",
    timestamp: "1787342880",
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

    // `baskerville` last is deliberate, not an alphabetisation that slipped: its column is empty
    // end to end and sits at the edge rather than through the middle. See `ROSTER`.
    expect(performance.agentJurors.map((agentJuror) => agentJuror.nickname)).toEqual([
      "007",
      "aletheia",
      "blaise",
      "columbo",
      "daemonhill",
      "baskerville",
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

  describe("commit latency", () => {
    it("measures from the moment the commit period opened to the moment the block was mined", () => {
      // Dispute 163's commit period opened at 1787342856; blaise's CommitCast landed in a
      // block stamped 1787342880. Measured against the period that actually opened, never
      // against a deadline and never as a fraction of the window (ADR-0005).
      expect(cellFor(163, "blaise")?.commitLatencySeconds).toBe(24);
    });

    it("reproduces the range the design was drawn against", () => {
      // The canvas quotes commit latency running 2m 06s to 53m 56s, and dispute 151 holds
      // both ends of it. Those two figures were established before any of this code existed.
      expect(cellFor(151, "columbo")?.commitLatencySeconds).toBe(126);
      expect(cellFor(151, "daemonhill")?.commitLatencySeconds).toBe(3236);
    });

    it("reproduces the measured spread across the finalised disputes", () => {
      const latencies = built()
        .rows.filter((row) => row.dispute.id <= 163)
        .flatMap((row) => row.cells)
        .map((cell) => cell?.commitLatencySeconds ?? null)
        .filter((seconds): seconds is number => seconds !== null)
        .sort((a, b) => a - b);
      const median = ((latencies[21] ?? 0) + (latencies[22] ?? 0)) / 2;

      expect(latencies).toHaveLength(44);
      expect(latencies[0]).toBe(24);
      expect(latencies[latencies.length - 1]).toBe(3236);
      expect(median).toBe(256);
    });

    it("joins the chain's checksummed address to the subgraph's lowercased one", () => {
      // The Graph lowercases; `eth_getLogs` does not. Joining on the raw strings would match
      // nothing at all and render every commit slot as Unknown, with nothing in the console.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit({ juror: "0x57EB05D4DFFAC43A0C52B42C47A4E7D1838725EA" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(24);
    });

    it("measures against the round the draw belongs to, not the dispute's first round", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["1000", "1100", "1500", "1900"] },
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
              justification: { timestamp: "1142", choice: "2" },
            },
          }),
        ],
        commits: [rawCommit({ timestamp: "1030" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(30);
    });

    it("reports an unknown latency rather than a wrong one when no log matched the draw", () => {
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw()], commits: [] });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.commitLatencySeconds).toBeNull();
      // The draw still committed, still revealed, and still voted with the ruling. Only the
      // moment is missing — a truncated scan must never cost a draw its verdict.
      expect(cell?.state).toEqual({ kind: "coherent" });
      expect(cell?.revealLatencySeconds).toBe(46);
    });

    it("reports an unknown latency for a commit period that has not opened", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "evidence",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["0", "0", "0", "0"] }],
          }),
        ],
        draws: [rawDraw({ vote: null })],
        commits: [rawCommit()],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBeNull();
    });

    it("never reports a negative latency from a commitment that predates the round", () => {
      // Unlike a reveal, a commitment has a round to belong to and the log does not say which:
      // one that predates this round's commit period is an earlier round's, not a corrupt
      // payload. So it is not selected, and the draw counts as a shortfall instead — which
      // says the same thing without ever putting a negative duration on the page.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit({ timestamp: "1787342000" })],
      });
      const performance = built(raw);

      expect(cellFor(163, "blaise", performance)?.commitLatencySeconds).toBeNull();
      expect(performance.commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("takes the commitment belonging to the round the cell reports, not an earlier one", () => {
      // The log carries a dispute and a juror and no round at all, so an agent juror drawn
      // twice has two commitments under one key. Taking the wrong one dates a round-1 cell
      // against round 0 and reports a latency wrong by the length of a whole dispute.
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["1000", "1100", "1500", "1900"] },
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
              justification: { timestamp: "1142", choice: "2" },
            },
          }),
        ],
        commits: [rawCommit({ timestamp: "40" }), rawCommit({ timestamp: "1030" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(30);
    });
  });

  describe("the commit cross-check", () => {
    it("finds a log for every draw the subgraph reports as committed", () => {
      // 56 committed draws, 56 CommitCast logs, on the day both were captured. The whole
      // point of the count is that this is the number a truncating endpoint would change.
      expect(built().commitCoverage).toEqual({ read: true, expected: 56, resolved: 56 });
    });

    it("tells a read that has not come back from one that came back empty", () => {
      // The difference between the two is a sentence on a public page. `[]` is a read that
      // found nothing, and the matrix says every commitment went unread; `null` is a read
      // still in flight, and saying that would announce a failure that has not happened — on
      // every cold load, because the chain is slower than the subgraph and the matrix does
      // not wait for it. The resolved count is identical in both, which is the trap.
      const pending = built(courtData({ commits: null }));
      const empty = built(courtData({ commits: [] }));

      expect(pending.commitCoverage).toEqual({ read: false, expected: 56, resolved: 0 });
      expect(empty.commitCoverage).toEqual({ read: true, expected: 56, resolved: 0 });
    });

    it("still builds every other measurement while the commitments are unread", () => {
      const pending = built(courtData({ commits: null }));

      expect(cellFor(163, "blaise", pending)?.revealLatencySeconds).toBe(46);
      expect(cellFor(163, "blaise", pending)?.state).toEqual({ kind: "coherent" });
      expect(cellFor(163, "blaise", pending)?.commitLatencySeconds).toBeNull();
    });

    it("carries the subgraph's own boolean beside the moment, not in place of it", () => {
      // The cell's wording needs both: committed with no moment is a log this dashboard
      // failed to read, and not committed with the window closed is an agent juror that
      // failed to act. One flag cannot say both.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: false, voted: false, choice: null, justification: null } }),
        ],
        commits: [],
      });

      expect(cellFor(163, "blaise")?.committed).toBe(true);
      expect(cellFor(163, "blaise", built(raw))?.committed).toBe(false);
    });

    it("counts a committed draw with no log as a shortfall rather than absorbing it", () => {
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw()], commits: [] });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("never lets a missing log become a missed vote", () => {
      // The failure ADR-0004 exists for: a provider that caps `eth_getLogs` returns fewer
      // logs rather than an error, and blaming an agent juror that committed on time is the
      // one outcome that must be impossible.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
        commits: [],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.state).toEqual({ kind: "no-vote" });
      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("expects nothing of a draw that never committed", () => {
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
        commits: [],
      });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 0, resolved: 0 });
    });

    it("ignores a log for a dispute the payload does not carry", () => {
      // The roster commits in whatever court it is drawn in, and the filter is on the juror
      // rather than on the court. A log with no row is dropped exactly as a draw with no row is.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit(), rawCommit({ disputeID: "999" })],
      });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 1 });
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

  describe("the windows each dispute ran under", () => {
    it("resolves dispute 151 to the eight-hour commit window and 152 onward to 45 minutes", () => {
      // The court's whole parameter history, against the court's own captured disputes. This
      // is the trap `CLAUDE.md` names first, in the one place it could still be made: reading
      // the current 45 minutes back over dispute 151 would be wrong by a factor of ten.
      expect(rowFor(151).windows).toEqual({
        evidenceSeconds: 43_200,
        commitSeconds: 28_800,
        voteSeconds: 28_800,
        appealSeconds: 129_600,
      });

      expect(rowFor(152).windows).toEqual({
        evidenceSeconds: 2_700,
        commitSeconds: 2_700,
        voteSeconds: 1_800,
        appealSeconds: 129_600,
      });
    });

    it("marks dispute 151 and nothing else", () => {
      const marked = built()
        .rows.filter((row) => row.underEarlierWindows)
        .map((row) => row.dispute.id);

      expect(marked).toEqual([151]);
    });

    it("carries the court's history and what it holds now", () => {
      const { parameters } = built();

      expect(parameters.read).toBe(true);
      expect(parameters.regimes).toHaveLength(2);
      expect(parameters.current?.commitSeconds).toBe(2_700);
    });

    it("marks nothing at all while the history has not been read", () => {
      // Every cold load, and the distinction that matters: not knowing which disputes ran
      // under different rules is not the same as knowing that none did. An unread history
      // resolves no window and marks no row, and `read` is what says which of those it is.
      const unread = built(courtData({ parameters: null }));

      expect(unread.parameters.read).toBe(false);
      expect(unread.parameters.current).toBeNull();
      expect(unread.rows.every((row) => row.windows === null)).toBe(true);
      expect(unread.rows.some((row) => row.underEarlierWindows)).toBe(false);
    });

    it("marks nothing when a read comes back empty, and says the read happened", () => {
      // `[]` and `null` are different states with the same consequence for the marker, and
      // only `read` tells them apart. A court that has plainly been configured at least once
      // returning no history is a read that came back short, which ticket 13's banner needs.
      const empty = built(courtData({ parameters: [] }));

      expect(empty.parameters.read).toBe(true);
      expect(empty.parameters.regimes).toEqual([]);
      expect(empty.rows.every((row) => !row.underEarlierWindows)).toBe(true);
    });

    it("refuses a history it cannot read rather than measuring against a fabricated window", () => {
      const result = buildCourtPerformance(
        courtData({ parameters: [{ at: "not-a-moment", timesPerPeriod: ["1", "2", "3", "4"] }] }),
      );

      expect(result.success).toBe(false);
    });

    it("marks a dispute whose commit window changed, and not one whose evidence window did", () => {
      // The marker is about comparability: nothing on this page is measured from the evidence
      // period, so a court that changed only that would mark every older dispute for a
      // difference no figure reflects. A marker with no visible cause teaches a reader to
      // ignore markers.
      const evidenceOnly = built(
        courtData({
          disputes: [rawDispute()],
          draws: [rawDraw()],
          parameters: [
            { at: "1000", timesPerPeriod: ["43200", "2700", "1800", "129600"] },
            { at: "1787342000", timesPerPeriod: ["600", "2700", "1800", "129600"] },
          ],
        }),
      );

      expect(evidenceOnly.rows[0]?.underEarlierWindows).toBe(false);
    });
  });
});
