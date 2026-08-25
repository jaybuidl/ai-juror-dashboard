import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import { buildCourtPerformance, type CourtPerformance, type RawDraw } from "./performance";
import { courtTotalsOf } from "./totals";

/**
 * The same captured court every other test in this folder reads, and the same reason: the
 * figures asserted here — 44 draws from 61 votes, five of six agent jurors drawn, reveal
 * latency from 7s to 552s with a median of 85s — were established in `spec.md` § Further
 * Notes before this code existed. A drift in the aggregate stops reproducing them.
 *
 * The fixture holds disputes 151–166, of which 164–166 sat in `appeal` with every draw
 * revealed, so its counts are larger than the thirteen-dispute range those figures name.
 */
const built = ((): CourtPerformance => {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    // The totals are reveal-only by design, so the commitments are deliberately not read here:
    // every figure this suite pins must be the same whether or not the log scan came back.
    commits: null,
    roster: ROSTER,
    drawsReadAt: null,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
})();

/** The finalised range the independently-established figures are quoted over. */
const finalised = built.rows.filter((row) => row.dispute.id <= 163);

describe("courtTotalsOf", () => {
  it("counts one draw per agent juror per dispute, and the vote IDs separately", () => {
    const totals = courtTotalsOf(finalised, ROSTER);

    expect(totals.draws).toBe(44);
    expect(totals.votes).toBe(61);
  });

  it("counts the agent jurors ever drawn against the whole roster", () => {
    const totals = courtTotalsOf(built.rows, ROSTER);

    expect(totals.agentJurors).toBe(6);
    expect(totals.agentJurorsDrawn).toBe(5);
  });

  it("counts the disputes read and never more", () => {
    expect(courtTotalsOf(built.rows, ROSTER).disputes).toBe(built.rows.length);
  });

  it("reads the latency range and median off the draws the matrix shows", () => {
    const totals = courtTotalsOf(finalised, ROSTER);

    expect(totals.revealLatency).not.toBeNull();
    expect(totals.revealLatency?.fastest).toBe(7);
    expect(totals.revealLatency?.median).toBe(85);
    expect(totals.revealLatency?.slowest).toBe(552);
  });

  it("plots exactly the draws it summarises, in ascending order", () => {
    const summary = courtTotalsOf(finalised, ROSTER).revealLatency;
    if (summary === null) throw new Error("The captured court has revealed draws");

    const cells = finalised.flatMap((row) => row.cells);
    const revealed = cells.filter((cell) => cell !== null && cell.revealLatencySeconds !== null);

    expect(summary.seconds).toHaveLength(revealed.length);
    expect([...summary.seconds]).toEqual([...summary.seconds].sort((a, b) => a - b));
    expect(summary.seconds[0]).toBe(summary.fastest);
    expect(summary.seconds[summary.seconds.length - 1]).toBe(summary.slowest);
  });

  it("takes the lower of the two middles, so the median is a latency something took", () => {
    // Averaging these would print 85.5s — half a second no draw recorded.
    const distribution = [7, 85, 86, 552];
    expect(medianOfSeconds(distribution)).toBe(85);
  });

  it("has no latency to report when nothing has revealed", () => {
    const unrevealed = built.rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) =>
        cell === null ? null : { ...cell, revealLatencySeconds: null },
      ),
    }));

    // Null, not zero: a `0` here would be a claim about the court that nobody measured.
    expect(courtTotalsOf(unrevealed, ROSTER).revealLatency).toBeNull();
  });

  it("has nothing to report at all when the court held no disputes", () => {
    const totals = courtTotalsOf([], ROSTER);

    expect(totals).toMatchObject({ disputes: 0, draws: 0, votes: 0, agentJurorsDrawn: 0 });
    expect(totals.revealLatency).toBeNull();
    expect(totals.lonePanelDisputes).toEqual([]);
  });

  it("names the disputes decided by a panel of one, so any coherence figure can disclose them", () => {
    expect(courtTotalsOf(built.rows, ROSTER).lonePanelDisputes).toEqual([155]);
  });

  it("is the same model the matrix is built from", () => {
    // The tiles read `performance.totals` rather than reducing the rows themselves, and this
    // is the assertion that the seam actually hands them one.
    expect(built.totals.draws).toBe(courtTotalsOf(built.rows, ROSTER).draws);
  });
});

/** The median as `courtTotalsOf` computes it, reached through the only door it has. */
function medianOfSeconds(seconds: readonly number[]): number | undefined {
  const rows = seconds.map((value, index) => ({
    dispute: { id: index } as never,
    panelSize: 2,
    cells: [
      {
        agentJuror: ROSTER[index % ROSTER.length] as never,
        state: { kind: "coherent" } as const,
        revealLatencySeconds: value,
        // Present and non-null on purpose: a commit latency must not reach the reveal median.
        commitLatencySeconds: value * 2,
        committed: true,
        voteCount: 1,
      },
    ],
    read: true,
  }));

  return courtTotalsOf(rows, ROSTER).revealLatency?.median;
}
