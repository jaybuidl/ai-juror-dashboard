import { describe, expect, it } from "vitest";
import fixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import {
  type AgentJurorReading,
  buildAgentJurorReading,
  committedCountOf,
} from "./agent-juror-detail";
import type { RawCommitCast } from "./commitments";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCourtData,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import type { RawCourtParameters } from "./windows";

/**
 * One agent juror's slice of the court, and the one thing that can silently go wrong in it.
 *
 * The slice is by *column position*: `marginals` is one entry per agent juror in roster order and
 * every row's `cells` is the same, so the reading joins two arrays on an index it derives from a
 * nickname. Get that index wrong by one and the page shows aletheia's draws under blaise's name,
 * with every figure internally consistent and nothing to see. So what these pin is not that the
 * numbers are right — `totals.test.ts` owns that — but that the draws, the marginal and the
 * identity on one reading are the same agent juror's.
 */

function court(overrides: Partial<RawCourtData> = {}): CourtPerformance {
  const built = buildCourtPerformance({
    disputes: fixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    parameters: parameterFixture as RawCourtParameters[],
    rewards: rewardFixture as RawRewardShift[],
    roster: ROSTER,
    drawsReadAt: null,
    ...overrides,
  });
  if (!built.success) throw new Error(`${built.code}: ${built.message}`);
  return built.data;
}

/**
 * The 56 `CommitCast` logs captured from Arbitrum beside the draws, one per committed draw,
 * addresses checksummed as the chain returns them rather than lowercased as The Graph does.
 * Each agent juror's page reads only its own (ADR-0012), so each reading here is handed only
 * its own, filtered on the address exactly as the chain filters the topic.
 */
const rawCommits = commitFixture as RawCommitCast[];

function commitsOf(nickname: string): RawCommitCast[] {
  const address = ROSTER.find((agentJuror) => agentJuror.nickname === nickname)?.address;
  return rawCommits.filter((commit) => commit.juror.toLowerCase() === address?.toLowerCase());
}

/** One agent juror's reading with its own commitments read, or a failure loud enough to see. */
function readingOf(
  nickname: string,
  commits: readonly RawCommitCast[] | null = commitsOf(nickname),
  performance = court(),
): AgentJurorReading {
  const reading = buildAgentJurorReading(performance, nickname, commits);
  if (reading === null) throw new Error(`No reading for ${nickname}`);
  return reading;
}

function commitLatencyOf(reading: AgentJurorReading, disputeId: number): number | null | undefined {
  return reading.draws.find(({ row }) => row.dispute.id === disputeId)?.commitLatencySeconds;
}

/** Blaise's one draw in dispute 163, as the subgraph reports it, for the hand-built cases. */
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

function rawDispute(overrides: Partial<RawDispute> = {}): RawDispute {
  return {
    id: "163",
    disputeID: "163",
    period: "execution",
    ruled: true,
    currentRuling: "2",
    tied: false,
    createdAt: "1787340123",
    lastPeriodChange: "1787409015",
    currentRoundIndex: "0",
    rounds: [{ id: "163-0", timeline: ["1787342856", "1787343398", "1787344095", "1787409015"] }],
    templateId: null,
    ...overrides,
  } as RawDispute;
}

/** Blaise's commitment, as `fetchCommitCasts` hands it over. Checksummed, because the chain is. */
function rawCommit(overrides: Partial<RawCommitCast> = {}): RawCommitCast {
  return {
    disputeID: "163",
    juror: "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea",
    timestamp: "1787342880",
    ...overrides,
  };
}

describe("buildAgentJurorReading", () => {
  it("names nothing for a nickname the roster does not hold", () => {
    // The whole reason this returns null rather than throwing: `/agent-jurors/nope` is a real
    // route with an id that names nothing, and the view has to say so in its own words.
    expect(buildAgentJurorReading(court(), "nope", null)).toBeNull();
  });

  it("keys on the roster nickname and not on a resolved one", () => {
    // Exactly, and unlike the route above the seam: `AgentJurorPage` folds case to keep links
    // made before the nicknames were capitalised working, but it hands *this* the roster's own
    // spelling and never the path segment. A second place folding case would be a second
    // definition of which agent juror a name picks out, drifting from the first in silence.
    //
    // "Blaise of Kleros" stands for a resolved ENS name — a `name` text record an operator can
    // rewrite from a wallet — which must never pick anything out here.
    expect(buildAgentJurorReading(court(), "Blaise", null)?.agentJuror.nickname).toBe("Blaise");
    expect(buildAgentJurorReading(court(), "Blaise of Kleros", null)).toBeNull();
    expect(buildAgentJurorReading(court(), "blaise", null)).toBeNull();
  });

  it("gives each agent juror its own draws, its own marginal and its own identity", () => {
    const performance = court();

    for (const agentJuror of ROSTER) {
      const reading = buildAgentJurorReading(performance, agentJuror.nickname, null);
      if (reading === null) throw new Error(`no reading for ${agentJuror.nickname}`);

      expect(reading.agentJuror).toBe(agentJuror);
      expect(reading.marginals.agentJuror).toBe(agentJuror);
      // Every draw carries the agent juror whose page it is on. An off-by-one in the column
      // index is invisible in every figure and visible here.
      for (const { draw } of reading.draws) expect(draw.agentJuror).toBe(agentJuror);
    }
  });

  it("counts the same draws the column marginal counts", () => {
    const performance = court();

    for (const agentJuror of ROSTER) {
      const reading = buildAgentJurorReading(performance, agentJuror.nickname, null);
      expect(reading?.draws.length, agentJuror.nickname).toBe(reading?.marginals.draws);
    }
  });

  it("lists an agent juror's disputes newest first, as the rows arrive", () => {
    const reading = buildAgentJurorReading(court(), "Aletheia", null);
    const ids = reading?.draws.map(({ row }) => row.dispute.id) ?? [];

    expect(ids.length).toBeGreaterThan(1);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("gives an agent juror the court has not drawn a reading rather than nothing", () => {
    // This fixture's Baskerville was captured before the court first drew it, so it has no
    // draws to read and this page exists to say so honestly rather than as an error. A reading
    // built by walking the draws would have no entry for it and the route would 404 on the one
    // agent juror whose record is "never asked".
    const reading = buildAgentJurorReading(court(), "Baskerville", null);

    expect(reading?.draws).toEqual([]);
    expect(reading?.marginals.draws).toBe(0);
    expect(reading?.marginals.rewards).toBeNull();
  });

  it("leaves a dispute whose draws were never read out of the list entirely", () => {
    const performance = court();
    // A row that was never read has six null cells, so it contributes no draw to anybody — and
    // a list of "the disputes this agent juror was drawn in" is then short by a dispute nobody
    // looked at. It must not appear as a dispute this agent juror was *not* drawn in either,
    // which is why the list is built from filled cells rather than from the rows.
    // How many are missing is `totals.unreadDisputes`, which the view discloses; recomputing it
    // here would be a second definition of the same court-wide fact.
    const unread: CourtPerformance = {
      ...performance,
      rows: performance.rows.map((row, index) =>
        index === 0 ? { ...row, read: false, cells: row.cells.map(() => null) } : row,
      ),
    };

    const first = performance.rows[0];
    // Whoever was actually drawn in it, rather than a nickname chosen in advance: the newest
    // dispute's panel is whatever the court drew, and hard-coding one makes this test expire
    // the next time the fixture is recaptured.
    const drawn = first?.cells.find((cell) => cell !== null)?.agentJuror.nickname;
    if (first === undefined || drawn === undefined) throw new Error("no draw in the newest row");

    const before = buildAgentJurorReading(performance, drawn, null);
    const after = buildAgentJurorReading(unread, drawn, null);

    expect(before?.draws.some(({ row }) => row.dispute.id === first.dispute.id)).toBe(true);
    expect(after?.draws.some(({ row }) => row.dispute.id === first.dispute.id)).toBe(false);
  });
});

describe("commit latency, from this agent juror's own commitments", () => {
  it("measures from the moment the commit period opened to the moment the block was mined", () => {
    // Dispute 163's commit period opened at 1787342856; Blaise's CommitCast landed in a block
    // stamped 1787342880. Measured against the period that actually opened, never against a
    // deadline and never as a fraction of the window (ADR-0005).
    expect(commitLatencyOf(readingOf("Blaise"), 163)).toBe(24);
  });

  it("reproduces the range the design was drawn against", () => {
    // The canvas quotes commit latency running 2m 06s to 53m 56s, and dispute 151 holds both
    // ends of it. Those two figures were established before any of this code existed.
    expect(commitLatencyOf(readingOf("Columbo"), 151)).toBe(126);
    expect(commitLatencyOf(readingOf("Daemonhill"), 151)).toBe(3236);
  });

  it("reproduces the measured spread across the finalised disputes, each from its own read", () => {
    // A regression pin on the captured record, read agent juror by agent juror exactly as the
    // pages read it — not a figure anything shows (ADR-0010 summarises none).
    const latencies = ROSTER.flatMap((agentJuror) =>
      readingOf(agentJuror.nickname)
        .draws.filter(({ row }) => row.dispute.id <= 163)
        .map(({ commitLatencySeconds }) => commitLatencySeconds),
    )
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
    // nothing at all and render every commit slot as unread, with nothing in the console.
    const performance = court({ disputes: [rawDispute()], draws: [rawDraw()] });
    const reading = readingOf(
      "Blaise",
      [rawCommit({ juror: "0x57EB05D4DFFAC43A0C52B42C47A4E7D1838725EA" })],
      performance,
    );

    expect(commitLatencyOf(reading, 163)).toBe(24);
  });

  it("takes the commitment belonging to the draw's own round, not an earlier one", () => {
    // The log carries a dispute and a juror and no round, so an agent juror drawn twice has two
    // commitments under one key. Taking the wrong one dates a round-1 draw against round 0 and
    // reports a latency wrong by the length of a whole dispute.
    const performance = court({
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
    });
    const reading = readingOf(
      "Blaise",
      [rawCommit({ timestamp: "40" }), rawCommit({ timestamp: "1030" })],
      performance,
    );

    expect(commitLatencyOf(reading, 163)).toBe(30);
  });

  it("reports an unknown latency for a commit period that has not opened", () => {
    const performance = court({
      disputes: [
        rawDispute({
          period: "evidence",
          ruled: false,
          currentRuling: "0",
          rounds: [{ id: "163-0", timeline: ["0", "0", "0", "0"] }],
        }),
      ],
      draws: [rawDraw({ vote: null })],
    });

    expect(commitLatencyOf(readingOf("Blaise", [rawCommit()], performance), 163)).toBeNull();
  });

  it("never reports a negative latency from a commitment that predates the round", () => {
    // Unlike a reveal, a commitment has a round to belong to and the log does not say which: one
    // that predates this round's commit period is an earlier round's, not a corrupt payload. So
    // it is not selected, and the draw counts as a shortfall instead.
    const performance = court({ disputes: [rawDispute()], draws: [rawDraw()] });
    const reading = readingOf("Blaise", [rawCommit({ timestamp: "1787342000" })], performance);

    expect(commitLatencyOf(reading, 163)).toBeNull();
    expect(reading.commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
  });

  it("drops a commitment it cannot read and counts the draw as a shortfall", () => {
    // Tolerant where the court seam is strict: a garbled log costs one moment, never the page,
    // and the count is how the page says so.
    const performance = court({ disputes: [rawDispute()], draws: [rawDraw()] });
    const reading = readingOf("Blaise", [rawCommit({ timestamp: "1e9" })], performance);

    expect(commitLatencyOf(reading, 163)).toBeNull();
    expect(reading.commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
  });
});

describe("the commit cross-check, per agent juror", () => {
  it("finds a log for every draw the subgraph reports as committed", () => {
    // 56 committed draws and 56 CommitCast logs on the day both were captured, now counted one
    // agent juror at a time as each page reads them. The count is the number a truncating
    // endpoint would change.
    const coverages = ROSTER.map((agentJuror) => readingOf(agentJuror.nickname).commitCoverage);

    expect(coverages.reduce((sum, coverage) => sum + coverage.expected, 0)).toBe(56);
    for (const coverage of coverages) {
      expect(coverage.resolved).toBe(coverage.expected);
      expect(coverage.read).toBe(true);
    }
  });

  it("tells a read that has not come back from one that came back empty", () => {
    // The difference is a sentence on a public page. `[]` is a read that found nothing; `null`
    // is a read still in flight, and treating it as `[]` would announce a failure that has not
    // happened on every cold load. The resolved count is identical in both, which is the trap.
    expect(readingOf("Columbo", null).commitCoverage).toEqual({
      read: false,
      expected: readingOf("Columbo").commitCoverage.expected,
      resolved: 0,
    });
    expect(readingOf("Columbo", []).commitCoverage.read).toBe(true);
    expect(readingOf("Columbo", []).commitCoverage.resolved).toBe(0);
  });

  it("does not count a shortfall from a read standing in for one still in flight", () => {
    // The court saw a commitment the earlier read predates; the moments it has are still shown,
    // and what it lacks is not yet a finding.
    const reading = buildAgentJurorReading(court(), "Columbo", [], false);

    expect(reading?.commitCoverage.read).toBe(false);
  });

  it("still builds every other figure while the commitments are unread", () => {
    const draw = readingOf("Blaise", null).draws.find(({ row }) => row.dispute.id === 163);

    expect(draw?.commitLatencySeconds).toBeNull();
    expect(draw?.draw.revealLatencySeconds).toBe(46);
    expect(draw?.draw.state).toEqual({ kind: "coherent" });
  });

  it("never lets a missing log become a missed vote", () => {
    // The failure ADR-0004 exists for: a provider that caps `eth_getLogs` returns fewer logs
    // rather than an error, and blaming an agent juror that committed on time is the one
    // outcome that must be impossible. The state comes from the subgraph alone.
    const performance = court({
      disputes: [rawDispute()],
      draws: [
        rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
      ],
    });
    const reading = readingOf("Blaise", [], performance);

    expect(reading.draws[0]?.draw.state).toEqual({ kind: "no-vote" });
    expect(reading.commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
  });

  it("expects nothing of a draw that never committed", () => {
    const performance = court({
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

    expect(readingOf("Blaise", [], performance).commitCoverage).toEqual({
      read: true,
      expected: 0,
      resolved: 0,
    });
  });

  it("ignores a log for a dispute the court does not carry", () => {
    // The agent juror commits in whatever court it is drawn in, and the filter is on the juror
    // rather than on the court. A log with no row is dropped exactly as a draw with no row is.
    const performance = court({ disputes: [rawDispute()], draws: [rawDraw()] });
    const reading = readingOf(
      "Blaise",
      [rawCommit(), rawCommit({ disputeID: "999" })],
      performance,
    );

    expect(reading.commitCoverage).toEqual({ read: true, expected: 1, resolved: 1 });
  });

  it("counts what its own read is keyed on", () => {
    // `useAgentJurorCommits` re-reads when this rises, so it has to be the same count the
    // cross-check expects, taken over the same column.
    for (const agentJuror of ROSTER) {
      expect(committedCountOf(court(), agentJuror.nickname)).toBe(
        readingOf(agentJuror.nickname).commitCoverage.expected,
      );
    }
    expect(committedCountOf(court(), "nope")).toBeNull();
  });
});
