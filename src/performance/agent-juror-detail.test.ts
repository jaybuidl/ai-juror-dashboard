import { describe, expect, it } from "vitest";
import fixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import { buildAgentJurorReading } from "./agent-juror-detail";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCommitCast,
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

function court(): CourtPerformance {
  const built = buildCourtPerformance({
    disputes: fixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    commits: commitFixture as RawCommitCast[],
    parameters: parameterFixture as RawCourtParameters[],
    rewards: rewardFixture as RawRewardShift[],
    roster: ROSTER,
    drawsReadAt: null,
  });
  if (!built.success) throw new Error(`${built.code}: ${built.message}`);
  return built.data;
}

describe("buildAgentJurorReading", () => {
  it("names nothing for a nickname the roster does not hold", () => {
    // The whole reason this returns null rather than throwing: `/agent-jurors/nope` is a real
    // route with an id that names nothing, and the view has to say so in its own words.
    expect(buildAgentJurorReading(court(), "nope")).toBeNull();
  });

  it("keys on the roster nickname and not on a resolved one", () => {
    // `blaise` carries an ENS `name` record reading "Blaise". The route, the join and this
    // lookup are all on the roster's own label; a match that lowercased or trimmed would be a
    // second definition of which agent juror a URL names.
    expect(buildAgentJurorReading(court(), "blaise")?.agentJuror.nickname).toBe("blaise");
    expect(buildAgentJurorReading(court(), "Blaise")).toBeNull();
  });

  it("gives each agent juror its own draws, its own marginal and its own identity", () => {
    const performance = court();

    for (const agentJuror of ROSTER) {
      const reading = buildAgentJurorReading(performance, agentJuror.nickname);
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
      const reading = buildAgentJurorReading(performance, agentJuror.nickname);
      expect(reading?.draws.length, agentJuror.nickname).toBe(reading?.marginals.draws);
    }
  });

  it("lists an agent juror's disputes newest first, as the rows arrive", () => {
    const reading = buildAgentJurorReading(court(), "aletheia");
    const ids = reading?.draws.map(({ row }) => row.dispute.id) ?? [];

    expect(ids.length).toBeGreaterThan(1);
    expect([...ids].sort((a, b) => b - a)).toEqual(ids);
  });

  it("gives an agent juror the court has not drawn a reading rather than nothing", () => {
    // This fixture's baskerville was captured before the court first drew it, so it has no
    // draws to read and this page exists to say so honestly rather than as an error. A reading
    // built by walking the draws would have no entry for it and the route would 404 on the one
    // agent juror whose record is "never asked".
    const reading = buildAgentJurorReading(court(), "baskerville");

    expect(reading?.draws).toEqual([]);
    expect(reading?.marginals.draws).toBe(0);
    expect(reading?.marginals.revealLatency).toBeNull();
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

    const before = buildAgentJurorReading(performance, drawn);
    const after = buildAgentJurorReading(unread, drawn);

    expect(before?.draws.some(({ row }) => row.dispute.id === first.dispute.id)).toBe(true);
    expect(after?.draws.some(({ row }) => row.dispute.id === first.dispute.id)).toBe(false);
  });
});
