import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import { ROSTER } from "../roster/agent-jurors";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type Draw,
  type MatrixRow,
  type RawCommitCast,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import { agentJurorMarginalsOf, courtTotalsOf, markedWindows, rowCommitLatencyOf } from "./totals";
import type { RawCourtParameters } from "./windows";

/**
 * The same captured court every other test in this folder reads, and the same reason: the
 * figures asserted here — 44 draws from 61 votes, five agent jurors drawn out of the roster the
 * capture was taken against, reveal latency from 7s to 552s with a median of 85s — were
 * established in `spec.md` § Further Notes before this code existed. A drift in the aggregate
 * stops reproducing them. They are facts about **this fixture**, not about the court today: the
 * court has grown and the roster has too, and neither is what these assertions measure.
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
    parameters: parameterFixture as RawCourtParameters[],
    // The payouts *are* read: they are the two figures ticket 10 added to each column, and
    // pinning them needs the real 44 shifts rather than a hand-written pair of amounts.
    rewards: rewardFixture as RawRewardShift[],
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

    // The first is the roster's own size and is read off it. The second is a fact about this
    // fixture and not about the court: the capture predates both baskerville's first draw and
    // grokleros joining, so two of the roster's columns are empty in it. That is the point of
    // the test — the denominator follows the roster, the numerator follows the record.
    expect(totals.agentJurors).toBe(ROSTER.length);
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

  it("names the disputes that ran under windows the court has since changed", () => {
    // The other half of the same obligation: a coherence figure has to disclose a panel of
    // one, and a latency figure has to disclose a window change. Ticket 06's marginals are the
    // first figures that will carry both markers.
    const { changedWindows } = courtTotalsOf(built.rows, ROSTER);

    expect(changedWindows).toHaveLength(1);
    expect(changedWindows[0]?.disputes).toEqual([151]);
    expect(changedWindows[0]?.windows.commitSeconds).toBe(28_800);
  });

  it("counts how many draws behind the median ran under the changed window", () => {
    // What makes a dagger on a median mean something: the reader is told how much of the
    // distribution is not comparable with the rest. Dispute 151's panel was two, both revealed.
    const { changedWindows, revealLatency } = courtTotalsOf(built.rows, ROSTER);

    expect(changedWindows[0]?.revealedDraws).toBe(2);
    expect(revealLatency?.seconds.length).toBeGreaterThan(2);
  });

  it("gathers them by the windows they ran under rather than listing them flat", () => {
    // A flat list could not say what the difference was, which is the whole content of the
    // footnote. Two supersededconfigurations are two sentences, not one list of ids.
    const rows = [
      row(151, { commitSeconds: 28_800, voteSeconds: 28_800 }),
      row(152, { commitSeconds: 28_800, voteSeconds: 28_800 }),
      row(153, { commitSeconds: 600, voteSeconds: 600 }),
    ];

    // Ordered oldest group first, whatever order the rows arrive in — and rows arrive newest
    // first, so insertion order would print the court's history backwards.
    expect(courtTotalsOf([...rows].reverse(), ROSTER).changedWindows).toEqual([
      {
        disputes: [151, 152],
        windows: { commitSeconds: 28_800, voteSeconds: 28_800 },
        revealedDraws: 0,
        committedDraws: 0,
      },
      {
        disputes: [153],
        windows: { commitSeconds: 600, voteSeconds: 600 },
        revealedDraws: 0,
        committedDraws: 0,
      },
    ]);
  });

  it("reports none of them while the parameter history has not been read", () => {
    expect(courtTotalsOf([row(151, null)], ROSTER).changedWindows).toEqual([]);
  });

  it("counts a dispute the history could not place, separately from one that matched", () => {
    // The difference between "nothing ran under earlier windows" and "the history is too short
    // to say" — which nothing else on the model can tell apart, and which a page reading
    // `changedWindows` alone would render as a clean bill of health.
    const totals = courtTotalsOf(
      [row(151, null), row(152, { commitSeconds: 28_800, voteSeconds: 28_800 })],
      ROSTER,
    );

    expect(totals.unplacedDisputes).toEqual([151]);
    expect(totals.changedWindows).toHaveLength(1);
    expect(totals.changedWindows[0]?.disputes).toEqual([152]);
  });

  it("places every dispute in the captured court, because the history reaches back far enough", () => {
    expect(courtTotalsOf(built.rows, ROSTER).unplacedDisputes).toEqual([]);
  });

  it("is the same model the matrix is built from", () => {
    // The tiles read `performance.totals` rather than reducing the rows themselves, and this
    // is the assertion that the seam actually hands them one.
    expect(built.totals.draws).toBe(courtTotalsOf(built.rows, ROSTER).draws);
  });
});

/**
 * Ticket 16's aggregate: the sparsity note is quoted by two layouts now, so its figures come
 * from the model rather than from whichever of them is on screen.
 */
describe("sparsity", () => {
  it("counts one position per agent juror per read dispute, and the draws against them", () => {
    const { sparsity } = courtTotalsOf(built.rows, ROSTER);
    const totals = courtTotalsOf(built.rows, ROSTER);

    expect(sparsity.disputes).toBe(built.rows.length);
    expect(sparsity.positions).toBe(built.rows.length * ROSTER.length);
    // The complement of the draws the same pass counted: every position holds a draw or is
    // blank, and nothing is both. This is the arithmetic the note rests on.
    expect(sparsity.blank).toBe(sparsity.positions - totals.draws);
  });

  it("names the agent jurors no read dispute drew", () => {
    // Two of them in this fixture, and the number is a fact about the capture rather than about
    // the court: it was taken before the court first drew baskerville and before grokleros
    // joined the roster, so both columns are blank end to end in it against five that carry
    // draws. Stating that is the record this dashboard exists partly to keep — an empty column
    // is something the court did, not a read that came up short.
    expect(courtTotalsOf(built.rows, ROSTER).sparsity.emptyColumns).toBe(2);
  });

  it("counts an unread row out of every figure rather than as a blank per agent juror", () => {
    const unread: MatrixRow = {
      ...(built.rows[0] as MatrixRow),
      read: false,
      cells: ROSTER.map(() => null),
    };
    const { sparsity } = courtTotalsOf([...built.rows.slice(1), unread], ROSTER);

    // One fewer dispute in every figure, not a blank per column: a row nobody asked about is a
    // gap in this dashboard, and the note's whole claim is that a blank is a fact about the
    // court.
    expect(sparsity.disputes).toBe(built.rows.length - 1);
    expect(sparsity.positions).toBe((built.rows.length - 1) * ROSTER.length);
  });

  it("claims no empty column at all when nothing was read", () => {
    const rows = built.rows.map((row) => ({ ...row, read: false, cells: ROSTER.map(() => null) }));
    const { sparsity } = courtTotalsOf(rows, ROSTER);

    // The roster's length would be the vacuous answer — `every` on no rows is true for every
    // column — and it
    // would report the whole roster as never drawn on no evidence whatsoever.
    expect(sparsity.emptyColumns).toBe(0);
    expect(sparsity.positions).toBe(0);
    expect(sparsity.blank).toBe(0);
  });

  it("counts the blanks that mean the court has not drawn yet, separately", () => {
    // Ticket 17's distinction, and the state a live court produces continually: a dispute in
    // its evidence period was read and has no panel, so its six blanks mean the draw has not
    // happened rather than that these agent jurors were not selected.
    const waiting: MatrixRow = {
      ...(built.rows[0] as MatrixRow),
      dispute: { ...(built.rows[0] as MatrixRow).dispute, id: 167 },
      panelSize: 0,
      cells: ROSTER.map(() => null),
    };
    const { sparsity } = courtTotalsOf([waiting, ...built.rows], ROSTER);

    expect(sparsity.undrawnDisputes).toEqual([167]);
    expect(sparsity.undrawnPositions).toBe(ROSTER.length);
    // Counted *in* the record, unlike an unread row: this is a fact about the court, so the
    // dispute is one of the disputes and its positions are among the positions.
    expect(sparsity.disputes).toBe(built.rows.length + 1);
    expect(sparsity.blank).toBeGreaterThanOrEqual(sparsity.undrawnPositions);
  });

  it("says nothing about undrawn panels on a court where every dispute has one", () => {
    const { sparsity } = courtTotalsOf(built.rows, ROSTER);

    expect(sparsity.undrawnDisputes).toEqual([]);
    expect(sparsity.undrawnPositions).toBe(0);
  });

  it("claims no empty column over a court that has drawn no panel at all", () => {
    // The degenerate case review found: every read dispute still in its evidence period. Six
    // agent jurors "blank end to end" there is a claim about a draw that has not happened, which
    // is the misreading `undrawnDisputes` exists to close — and `emptyColumns` was the one figure
    // not gated on it. The guard is the same one an all-unread court already had.
    const waiting = built.rows.slice(0, 3).map((row) => ({
      ...row,
      panelSize: 0,
      cells: ROSTER.map(() => null),
    }));
    const { sparsity } = courtTotalsOf(waiting, ROSTER);

    expect(sparsity.emptyColumns).toBe(0);
    // The blanks themselves are still counted, and still explained: they are a fact about a
    // court that has not drawn yet rather than about the agent jurors.
    expect(sparsity.blank).toBe(waiting.length * ROSTER.length);
    expect(sparsity.undrawnDisputes).toHaveLength(waiting.length);
  });

  it("still names the agent jurors no drawn dispute picked, beside disputes with no panel", () => {
    // The other direction: an undrawn row among drawn ones must not suppress the claim, or a
    // court in its ordinary state would stop saying the one thing this dashboard was built to
    // record. Two of the fixture's columns are blank across every dispute that has a panel.
    const waiting = {
      ...(built.rows[0] as MatrixRow),
      dispute: { ...(built.rows[0] as MatrixRow).dispute, id: 167 },
      panelSize: 0,
      cells: ROSTER.map(() => null),
    };

    expect(courtTotalsOf([waiting, ...built.rows], ROSTER).sparsity.emptyColumns).toBe(2);
  });

  it("never counts an unread row as a dispute with no panel", () => {
    // Its panel size is 0 too, because nobody asked. Both are blank and only one of them is a
    // fact about the court, which is the whole reason there are two counts.
    const unread: MatrixRow = {
      ...(built.rows[0] as MatrixRow),
      read: false,
      panelSize: 0,
      cells: ROSTER.map(() => null),
    };
    const { sparsity } = courtTotalsOf([...built.rows.slice(1), unread], ROSTER);

    expect(sparsity.undrawnDisputes).toEqual([]);
  });
});

describe("rowCommitLatencyOf", () => {
  /**
   * The same court with the commitments read, which the suite-wide `built` deliberately omits.
   *
   * Every other figure here is reveal-only and must hold whether or not the log scan came back;
   * this one is the commit half, so it needs the scan.
   */
  const scanned = ((): CourtPerformance => {
    const result = buildCourtPerformance({
      disputes: disputeFixture as RawDispute[],
      draws: drawFixture as RawDraw[],
      commits: commitFixture as RawCommitCast[],
      parameters: parameterFixture as RawCourtParameters[],
      rewards: rewardFixture as RawRewardShift[],
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!result.success) throw new Error(`${result.code}: ${result.message}`);
    return result.data;
  })();

  /** The row the compact grid puts a commit figure on, and the draws behind it. */
  function rowFor(id: number): MatrixRow {
    const row = scanned.rows.find((candidate) => candidate.dispute.id === id);
    if (row === undefined) throw new Error(`no row for dispute ${id}`);
    return row;
  }

  it("summarises one dispute's own commitments", () => {
    const { latency, commitments } = rowCommitLatencyOf(rowFor(156));
    const cells = rowFor(156).cells.filter((cell) => cell !== null);

    expect(commitments).toBe(cells.filter((cell) => cell.committed).length);
    expect(latency?.seconds).toEqual(
      cells
        .map((cell) => cell.commitLatencySeconds)
        .filter((seconds) => seconds !== null)
        .sort((a, b) => a - b),
    );
    // The lower of the two middle values, as every median in this file is taken.
    expect(latency?.median).toBe(
      latency?.seconds[Math.ceil((latency?.seconds.length ?? 0) / 2) - 1],
    );
  });

  it("returns nothing to measure rather than a zero", () => {
    // A dispute nobody was drawn in has no commitment and no median, and a `0` here would be a
    // latency nobody measured — the same rule every summary in this file follows.
    const empty: MatrixRow = { ...rowFor(156), cells: ROSTER.map(() => null) };
    const { latency, commitments } = rowCommitLatencyOf(empty);

    expect(latency).toBeNull();
    expect(commitments).toBe(0);
  });

  it("counts a commitment the scan could not date, so the view can tell the two absences apart", () => {
    // The distinction the whole commit half of this page rests on: a draw the subgraph records
    // as committed and Arbitrum could not date is a read that came back short, and one that
    // never committed is an agent juror that did not act. Counted here; worded in `cell.ts`.
    const row = rowFor(156);
    const undated: MatrixRow = {
      ...row,
      cells: row.cells.map((cell) =>
        cell === null ? null : { ...cell, commitLatencySeconds: null },
      ),
    };
    const { latency, commitments } = rowCommitLatencyOf(undated);

    expect(latency).toBeNull();
    expect(commitments).toBeGreaterThan(0);
  });
});

/**
 * One row with nothing in it but the windows it ran under.
 *
 * Hand-built rather than captured: the court has been reconfigured once, so no fixture can
 * hold two superseded configurations at the same time, and grouping is the thing being tested.
 */
function row(id: number, measured: { commitSeconds: number; voteSeconds: number } | null) {
  return {
    // Ruled, so `courtTotalsOf`'s finalised count has a ruling to read. It was `{ id }` alone
    // until the caption's count moved onto the totals, and a dispute with no ruling at all is
    // a shape the seam cannot produce.
    dispute: { id, ruling: { state: "ruled", choice: 1 } } as never,
    panelSize: 2,
    offRosterDraws: 0,
    cells: [],
    windows: measured === null ? null : { evidenceSeconds: 1, appealSeconds: 129_600, ...measured },
    underEarlierWindows: measured !== null,
    // Read, so these rows reach every aggregate. What an *unread* row does to each of them is
    // ticket 13's own suite; this one is about grouping windows.
    read: true,
  };
}

/** The median as `courtTotalsOf` computes it, reached through the only door it has. */
function medianOfSeconds(seconds: readonly number[]): number | undefined {
  const rows = seconds.map((value, index) => ({
    dispute: { id: index, ruling: { state: "ruled", choice: 1 } } as never,
    panelSize: 2,
    offRosterDraws: 0,
    // No window resolved and nothing marked: the median must be the same figure whether or not
    // the court's parameter history came back.
    windows: null,
    underEarlierWindows: false,
    cells: [
      {
        agentJuror: ROSTER[index % ROSTER.length] as never,
        state: { kind: "coherent" } as const,
        revealLatencySeconds: value,
        // Present and non-null on purpose: a commit latency must not reach the reveal median.
        commitLatencySeconds: value * 2,
        committed: true,
        voteCount: 1,
        choices: [1],
        reward: null,
      },
    ],
    read: true,
  }));

  return courtTotalsOf(rows, ROSTER).revealLatency?.median;
}

describe("the court's own live and finalised counts", () => {
  it("counts the disputes the court has ruled on, and the ones it is still deciding", () => {
    // Moved out of `Matrix.tsx`, which derived both from the rows while rendering the caption
    // above them. A court-wide number belongs to the model the matrix is one reading of.
    const totals = courtTotalsOf(built.rows, ROSTER);

    expect(totals.finalised).toBe(built.rows.filter((r) => isFinalised(r.dispute)).length);
    expect(totals.finalised + totals.live).toBe(built.rows.length);
    // The captured court holds both, which is what makes the caption worth printing at all.
    expect(totals.finalised).toBeGreaterThan(0);
    expect(totals.live).toBeGreaterThan(0);
  });

  it("keyed on the ruling and never on the period, like every other layer that asks", () => {
    // ADR-0007. Disputes 164–166 sat in `appeal` with every draw revealed and no ruling, and
    // every one of them is live: `execution` names neither end of the court's involvement.
    const appealing = built.rows.filter((row) => row.dispute.period === "appeal");

    expect(appealing.length).toBeGreaterThan(0);
    expect(appealing.every((row) => !isFinalised(row.dispute))).toBe(true);
  });
});

describe("agentJurorMarginalsOf", () => {
  it("gives one entry per agent juror in roster order, including any never drawn", () => {
    const marginals = agentJurorMarginalsOf(built.rows, ROSTER);

    expect(marginals.map((m) => m.agentJuror.nickname)).toEqual(ROSTER.map((a) => a.nickname));
    // This fixture predates the court's first draw of baskerville, so it is in the roster there
    // only because this repository says so. Marginals built from the draws rather than from the
    // roster would show five columns — which is the failure this asserts against, and the same
    // one that dropped grokleros from every figure until ticket 24.
    expect(marginals.find((m) => m.agentJuror.nickname === "Baskerville")?.draws).toBe(0);
  });

  it("slices the court's own totals down each column", () => {
    // The whole claim a marginal makes: the same draws, counted a second way. If these ever
    // disagree then one of the two is reducing the rows on terms of its own.
    const totals = courtTotalsOf(built.rows, ROSTER);
    const marginals = agentJurorMarginalsOf(built.rows, ROSTER);

    expect(marginals.reduce((n, m) => n + m.draws, 0)).toBe(totals.draws);
    expect(marginals.reduce((n, m) => n + m.votes, 0)).toBe(totals.votes);
    expect(marginals.filter((m) => m.draws > 0)).toHaveLength(totals.agentJurorsDrawn);
    expect(marginals.reduce((n, m) => n + (m.revealLatency?.seconds.length ?? 0), 0)).toBe(
      totals.revealLatency?.seconds.length,
    );
  });

  it("has nothing to measure for an agent juror never drawn, and a real zero for its draws", () => {
    // `canvas/JurorEmpty.dc.html:66-76`. Every figure it cannot have is null so the view draws
    // an em dash; the draw count is `0` because zero draws is a measurement and not an absence.
    const never = agentJurorMarginalsOf(built.rows, ROSTER).find(
      (m) => m.agentJuror.nickname === "Baskerville",
    );

    expect(never?.draws).toBe(0);
    expect(never?.votes).toBe(0);
    expect(never?.revealLatency).toBeNull();
    expect(never?.commitLatency).toBeNull();
    expect(never?.coherence).toMatchObject({ coherent: 0, resolved: 0 });
    // And the two ticket 10 added, on the same terms: an agent juror the court has not drawn
    // has not earned zero, it has not been in a position to earn. `{ethWei: 0n}` here would be
    // a figure, which is exactly what the view would then print.
    expect(never?.rewards).toBeNull();
  });

  describe("the payouts", () => {
    it("sums what each column was actually paid, in wei and never in a number", () => {
      // The real 44 shifts, summed down each column. These are the figures the column headers
      // print, and they are pinned as exact wei rather than as formatted strings so that a
      // change to the *display* precision cannot quietly change what is being displayed.
      //
      // 007 and aletheia are both net **negative** on PNK: they lost more to penalties than
      // they won. That is a real outcome for an agent juror that diverged or failed to reveal,
      // and it is why every one of these is a signed `bigint` — `-561000000000000000000` in a
      // `number` is already wrong before anything is rounded.
      const paid = (nickname: string) =>
        agentJurorMarginalsOf(built.rows, ROSTER).find((m) => m.agentJuror.nickname === nickname)
          ?.rewards;

      expect(paid("007")).toMatchObject({
        ethWei: 2565000000000000n,
        pnkWei: -93500000000000000000n,
      });
      expect(paid("Aletheia")).toMatchObject({ pnkWei: -561000000000000000000n });
      expect(paid("Blaise")).toMatchObject({ pnkWei: 218166666666666666666n });
      expect(paid("Columbo")).toMatchObject({ pnkWei: 171416666666666666666n });
      expect(paid("Daemonhill")).toMatchObject({ pnkWei: 264916666666666666666n });
    });

    it("accounts for one juror fee per vote ID the court executed, and not one per draw", () => {
      // The cross-check that makes these figures believable without trusting the subgraph's
      // arithmetic — and the assumption it corrected. Court 34's `feeForJuror` is
      // 270000000000000 wei, and the obvious reading is that a coherent draw earns exactly one.
      // It does not: **the fee is per vote ID**, and a draw holding two of a dispute's three
      // coherent vote IDs earns two thirds of that dispute's pot. Nine of the 44 shifts are
      // therefore fractions of a fee — 1.25, 1.67 and 2.5 of one — which is why nothing here
      // may assume a payout divides evenly.
      //
      // What *is* exact is the court-wide total, and it lands on a figure `spec.md` § Further
      // Notes established before any of this code existed: 61 vote IDs across the thirteen
      // executed disputes, 61 juror fees paid. That ties the payout read to the draw read
      // through the court's own configured fee, so a reward read that came back short — the
      // silent failure `CLAUDE.md` records for every subgraph read — moves this by a whole fee
      // and fails here rather than rendering as an agent juror that earned less.
      const FEE_FOR_JUROR = 270000000000000n;
      const marginals = agentJurorMarginalsOf(built.rows, ROSTER);
      const paid = marginals.reduce((total, m) => total + (m.rewards?.ethWei ?? 0n), 0n);

      expect(paid).toBe(FEE_FOR_JUROR * BigInt(courtTotalsOf(finalised, ROSTER).votes));
      expect(paid).toBe(16_470_000_000_000_000n);
    });

    it("redistributes PNK rather than creating it, to within integer-division dust", () => {
      // The other half of the same argument, and the stronger one for a *sum*. A penalty is
      // taken from the incoherent and handed to the coherent, so the court's net PNK across a
      // finished dispute is zero — the money moves between columns and none enters or leaves.
      //
      // "To within dust" is not a hedge: the court divides a penalty pot by the number of
      // coherent vote IDs in integer arithmetic, so a three-way split leaves a wei or two
      // behind. The captured court is 2 wei short of zero across 44 shifts. A missing shift
      // would move this by 1e20, so the tolerance is fifteen orders of magnitude smaller than
      // the failure it is there to catch.
      const marginals = agentJurorMarginalsOf(built.rows, ROSTER);
      const net = marginals.reduce((total, m) => total + (m.rewards?.pnkWei ?? 0n), 0n);

      expect(net > -1000n && net < 1000n).toBe(true);
      // And it is genuinely a redistribution rather than a court that paid nobody: two columns
      // are down and three are up.
      expect(marginals.filter((m) => (m.rewards?.pnkWei ?? 0n) < 0n)).toHaveLength(2);
      expect(marginals.filter((m) => (m.rewards?.pnkWei ?? 0n) > 0n)).toHaveLength(3);
    });

    it("sums the columns back to what the court paid out in total", () => {
      // The same claim every other marginal makes: a column and the court are two readings of
      // one set of draws. `paidDraws` on the coverage is counted in `buildCourtPerformance`
      // over the cells; these are counted again in `agentJurorMarginalsOf`. Two counts of one
      // thing is one chance for them to disagree, and this is what would catch it.
      const marginals = agentJurorMarginalsOf(built.rows, ROSTER);

      expect(marginals.reduce((n, m) => n + (m.rewards?.paidDraws ?? 0), 0)).toBe(
        built.rewards.paidDraws,
      );
      // The captured court had executed thirteen of its sixteen disputes, which is 44 of the
      // 56 draws. The other twelve are disputes 164–166, still in `appeal`.
      expect(built.rewards.paidDraws).toBe(44);
    });

    it("carries nothing for a column drawn only in disputes the court has not executed", () => {
      // The state the ticket calls "drawn and earned nothing", and the one the view has to
      // render as a real zero rather than as a dash. It is not a failed read and not an empty
      // column: the court simply has not paid yet, which is where every live dispute sits.
      const unexecuted = agentJurorMarginalsOf([column({ id: 170, ruled: false })], ROSTER);

      expect(unexecuted[0]?.draws).toBe(1);
      expect(unexecuted[0]?.rewards).toBeNull();
    });

    it("sums a dispute's rounds into one figure rather than reading the cell's own round", () => {
      // Court 34 is single-round throughout, so nothing in the captured payload exercises this
      // — and an appeal writes one shift per round for the same agent juror while the matrix
      // shows one cell. The seam sums them before they reach here; what this pins is that a
      // marginal adds whatever the cell carries rather than counting rounds itself.
      const appealed = agentJurorMarginalsOf(
        [
          column({
            id: 170,
            ruled: true,
            reward: {
              ethWei: 540000000000000n,
              pnkWei: -374000000000000000000n,
              inFeeToken: false,
            },
          }),
        ],
        ROSTER,
      );

      expect(appealed[0]?.rewards).toMatchObject({
        ethWei: 540000000000000n,
        pnkWei: -374000000000000000000n,
        paidDraws: 1,
      });
    });
  });

  it("counts coherence only over the draws the court has ruled on", () => {
    // ADR-0007 and `CONTEXT.md`: a dispute in `appeal` has every vote in and no ruling, and a
    // marginal counting those draws as incoherent would make a result out of a prediction.
    const marginals = agentJurorMarginalsOf(built.rows, ROSTER);
    const unruled = built.rows
      .filter((row) => !isFinalised(row.dispute))
      .flatMap((row) => row.cells)
      .filter((cell) => cell !== null).length;

    expect(unruled).toBeGreaterThan(0);
    expect(marginals.reduce((n, m) => n + m.coherence.resolved, 0)).toBe(
      marginals.reduce((n, m) => n + m.draws, 0) - unruled,
    );
  });

  it("keeps a missed vote in the denominator, where it cost the agent juror its coherence", () => {
    // A draw that let the vote period close is a draw that did not vote with the ruling. Taking
    // it out of `resolved` would hand an agent juror that never voted a perfect figure.
    const marginals = agentJurorMarginalsOf(
      [
        column({ id: 1, ruled: true, state: { kind: "coherent" } }),
        column({ id: 2, ruled: true, state: { kind: "no-vote" }, revealLatencySeconds: null }),
      ],
      ROSTER,
    );

    expect(marginals[0]?.coherence).toMatchObject({ coherent: 1, resolved: 2 });
  });

  it("takes the median as the lower of two middles, exactly as every other figure here does", () => {
    const rows = [10, 12, 14, 16].map((seconds, index) =>
      column({ id: index, ruled: true, revealLatencySeconds: seconds }),
    );

    // 13 would be a latency no draw recorded, on a page that may be cited.
    expect(agentJurorMarginalsOf(rows, ROSTER)[0]?.revealLatency?.median).toBe(12);
  });

  it("is not dragged by the dispute that ran under different court parameters", () => {
    // Dispute 151 ran under an 8-hour commit window against 45 minutes now, and this court's
    // commit latencies run to 3,236s because of it. A mean would report ~818s — a duration
    // describing no draw and no window. The median names one the agent juror actually recorded,
    // and the outlier is disclosed by the marker rather than dropped out of the count.
    const rows = [
      column({ id: 151, ruled: true, commitLatencySeconds: 3236, windows: EARLIER }),
      column({ id: 152, ruled: true, commitLatencySeconds: 10 }),
      column({ id: 153, ruled: true, commitLatencySeconds: 12 }),
      column({ id: 154, ruled: true, commitLatencySeconds: 14 }),
    ];
    const marginal = agentJurorMarginalsOf(rows, ROSTER)[0];

    expect(marginal?.commitLatency?.median).toBe(12);
    expect(marginal?.commitLatency?.seconds).toHaveLength(4);
    expect(marginal?.changedWindows).toHaveLength(1);
    expect(marginal?.changedWindows[0]?.committedDraws).toBe(1);
    expect(marginal?.changedWindows[0]?.revealedDraws).toBe(1);
  });

  it("marks a column only where that agent juror was itself drawn under the earlier windows", () => {
    // The marker is a fact about the draws behind *this* number. A column never drawn in
    // dispute 151 is comparable with the court as it stands and must not say otherwise.
    const marginals = agentJurorMarginalsOf(
      [column({ id: 151, ruled: true, windows: EARLIER, at: 0 })],
      ROSTER,
    );

    expect(marginals[0]?.changedWindows).toHaveLength(1);
    expect(marginals[1]?.changedWindows).toEqual([]);
  });

  it("names the lone panels behind a column's coherence, and only the ruled ones", () => {
    // Dispute 155 was decided by a panel of one, where coherence is tautological — the ‡. A
    // lone panel still being decided has no coherence figure to qualify yet.
    const marginals = agentJurorMarginalsOf(
      [
        column({ id: 155, ruled: true, panelSize: 1 }),
        column({ id: 156, ruled: false, panelSize: 1 }),
        column({ id: 157, ruled: true, panelSize: 3 }),
      ],
      ROSTER,
    );

    expect(marginals[0]?.coherence.lonePanelDisputes).toEqual([155]);
    expect(marginals[0]?.coherence.resolved).toBe(2);
  });

  it("finds the lone panel the captured court actually holds", () => {
    const marked = agentJurorMarginalsOf(built.rows, ROSTER).filter(
      (m) => m.coherence.lonePanelDisputes.length > 0,
    );

    // Exactly one agent juror sat on it, by the definition of a panel of one.
    expect(marked).toHaveLength(1);
    expect(marked[0]?.coherence.lonePanelDisputes).toEqual([155]);
  });

  it("counts a column's commit latencies separately from its reveal latencies", () => {
    // Two measures on one page, measured from two different periods. An aggregate that pooled
    // them would be ADR-0005's mistake in another form.
    const marginal = agentJurorMarginalsOf(
      [column({ id: 1, ruled: true, revealLatencySeconds: 90, commitLatencySeconds: 5 })],
      ROSTER,
    )[0];

    expect(marginal?.revealLatency?.median).toBe(90);
    expect(marginal?.commitLatency?.median).toBe(5);
  });

  it("has no commit latency to report when no commitment was dated", () => {
    // Null and never 0: while the log scan is out every commit latency is null, and a `0` here
    // would be an agent juror that committed the instant the period opened.
    const rows = [column({ id: 1, ruled: true, commitLatencySeconds: null })];

    expect(agentJurorMarginalsOf(rows, ROSTER)[0]?.commitLatency).toBeNull();
  });

  it("counts nothing from a row whose draws were never read", () => {
    // Its cells are null because nobody asked, and ticket 13's rule is that what could not be
    // read counts as unknown rather than as zero. A marginal has no way to say "unknown", so it
    // stays the count that was taken — and `CourtTotals.unreadDisputes` is what discloses it.
    const rows = [
      { ...column({ id: 1, ruled: true }), read: false, cells: ROSTER.map(() => null) },
    ];

    expect(agentJurorMarginalsOf(rows, ROSTER)[0]?.draws).toBe(0);
  });
});

describe("markedWindows", () => {
  const CURRENT = {
    evidenceSeconds: 2700,
    commitSeconds: 2700,
    voteSeconds: 1800,
    appealSeconds: 129_600,
  };

  /** One superseded group, with both counts under the caller's control. */
  function change(windows: { commitSeconds: number; voteSeconds: number }, drawn = 2) {
    return { disputes: [151], windows, revealedDraws: drawn, committedDraws: drawn };
  }

  it("qualifies a median only through the window that median is measured from", () => {
    // A court that moved its commit window and left its vote window alone. The reveal median is
    // measured from the vote period, so nothing here says anything about it — and marking it
    // would name a duration the court holds right now, which reads as a marker placed in error.
    const superseded = [change({ commitSeconds: 28_800, voteSeconds: CURRENT.voteSeconds })];

    expect(markedWindows(superseded, CURRENT, "commit").draws).toBe(2);
    expect(markedWindows(superseded, CURRENT, "reveal").draws).toBe(0);
    expect(markedWindows(superseded, CURRENT, "reveal").changes).toEqual([]);
  });

  it("qualifies both where the court changed both, which is court 34 today", () => {
    const superseded = [change(EARLIER)];

    expect(markedWindows(superseded, CURRENT, "commit").draws).toBe(2);
    expect(markedWindows(superseded, CURRENT, "reveal").draws).toBe(2);
  });

  it("counts the draws of the measure asked for, not of the other one", () => {
    // A draw that committed and never revealed is in one distribution and not the other, so a
    // marker quoting the wrong count would say "2 of 1".
    const superseded = [{ disputes: [151], windows: EARLIER, revealedDraws: 1, committedDraws: 2 }];

    expect(markedWindows(superseded, CURRENT, "reveal").draws).toBe(1);
    expect(markedWindows(superseded, CURRENT, "commit").draws).toBe(2);
  });

  it("drops a group that cost this median no draw at all", () => {
    const superseded = [{ disputes: [151], windows: EARLIER, revealedDraws: 0, committedDraws: 2 }];

    expect(markedWindows(superseded, CURRENT, "reveal").changes).toEqual([]);
  });

  it("qualifies everything while the parameter history is unread", () => {
    // Nothing is known to compare against, so nothing may be declared comparable. The view says
    // the history is unread in its own words; this must not quietly say the opposite.
    expect(markedWindows([change(EARLIER)], null, "reveal").draws).toBe(2);
  });
});

/** The windows court 34 ran under before it was reconfigured, as `windows.ts` resolves them. */
const EARLIER = { commitSeconds: 28_800, voteSeconds: 28_800 };

/**
 * One row with one draw in one column, for the cases the captured court cannot produce.
 *
 * Hand-built for the reason `CLAUDE.md` gives: every fixture here is one successful read of a
 * working court, so none of them holds a lone panel that is still live, a court reconfigured
 * twice, or one column drawn under earlier windows while the column beside it was not.
 */
function column({
  id,
  ruled,
  state = { kind: "coherent" },
  revealLatencySeconds = 30,
  commitLatencySeconds = 10,
  panelSize = 2,
  windows = null,
  at = 0,
  reward = null,
}: {
  id: number;
  ruled: boolean;
  state?: Draw["state"];
  revealLatencySeconds?: number | null;
  commitLatencySeconds?: number | null;
  panelSize?: number;
  windows?: { commitSeconds: number; voteSeconds: number } | null;
  at?: number;
  /** What the court paid this one draw, or `null` for a dispute it has not executed. */
  reward?: Draw["reward"];
}): MatrixRow {
  return {
    dispute: {
      id,
      period: ruled ? "execution" : "appeal",
      ruling: ruled ? { state: "ruled", choice: 1 } : { state: "pending" },
    } as never,
    panelSize,
    offRosterDraws: 0,
    cells: ROSTER.map((agentJuror, column) =>
      column === at
        ? {
            agentJuror,
            state,
            revealLatencySeconds,
            commitLatencySeconds,
            committed: commitLatencySeconds !== null,
            voteCount: 1,
            // Ticket 09 put `choices` on `Draw`, and the seam never produces a revealed draw
            // with an empty one — `stateOf` throws on exactly that. So the list follows the
            // state rather than being a constant: everything but `no-vote` and an unrevealed
            // live stage has revealed something.
            choices: revealed(state) ? [1] : [],
            reward,
          }
        : null,
    ),
    windows: windows === null ? null : { evidenceSeconds: 1, appealSeconds: 129_600, ...windows },
    underEarlierWindows: windows !== null,
    read: true,
  };
}

/** Whether a state is one the seam only reaches after a reveal. */
function revealed(state: Draw["state"]): boolean {
  return state.kind === "coherent" || state.kind === "diverged"
    ? true
    : state.kind === "live" && state.stage === "revealed";
}
