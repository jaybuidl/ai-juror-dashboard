import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import { ROSTER } from "../roster/agent-jurors";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type Draw,
  type MatrixRow,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import { agentJurorMarginalsOf, courtTotalsOf, medianOf, timeToAppealOf } from "./totals";
import type { PeriodWindows, RawCourtParameters } from "./windows";

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

  it("takes the lower of the two middles, so the median is a latency something took", () => {
    // Averaging these would print 85.5s — half a second no draw recorded.
    const distribution = [7, 85, 86, 552];
    expect(medianOf(distribution)).toBe(85);
  });

  it("summarises no commit or reveal latency court-wide (ADR-0010)", () => {
    // Per-draw latency is not a measure of speed, so the court is not reduced to a median of it
    // either. Time to appeal is the one duration summarised here.
    const totals = courtTotalsOf(built.rows, ROSTER);

    expect(totals).not.toHaveProperty("revealLatency");
    expect(totals).not.toHaveProperty("commitLatency");
    expect(totals.timeToAppeal.summary).not.toBeNull();
  });

  it("has nothing to report at all when the court held no disputes", () => {
    const totals = courtTotalsOf([], ROSTER);

    expect(totals).toMatchObject({ disputes: 0, draws: 0, votes: 0, agentJurorsDrawn: 0 });
    expect(totals.timeToAppeal.summary).toBeNull();
    expect(totals.lonePanelDisputes).toEqual([]);
  });

  it("names the disputes decided by a panel of one, so any coherence figure can disclose them", () => {
    expect(courtTotalsOf(built.rows, ROSTER).lonePanelDisputes).toEqual([155]);
  });

  it("places every dispute in the captured court, because the history reaches back far enough", () => {
    // The dispute view's configured windows depend on it: a row the history cannot place has
    // none, and its timeline can show only how long each period ran.
    expect(built.rows.filter((row) => row.windows === null)).toEqual([]);
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
    // Six of them in this fixture, and the number is a fact about the capture rather than about
    // the court: it was taken before the court first drew baskerville and before grokleros,
    // jonesy, intendant, 0xd66b and 0x518f joined the roster, so all six columns are blank end to
    // end in it against five that carry draws. Stating that is the record this dashboard exists partly to keep — an empty column
    // is something the court did, not a read that came up short.
    expect(courtTotalsOf(built.rows, ROSTER).sparsity.emptyColumns).toBe(6);
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
    // record. Six of the fixture's columns are blank across every dispute that has a panel.
    const waiting = {
      ...(built.rows[0] as MatrixRow),
      dispute: { ...(built.rows[0] as MatrixRow).dispute, id: 167 },
      panelSize: 0,
      cells: ROSTER.map(() => null),
    };

    expect(courtTotalsOf([waiting, ...built.rows], ROSTER).sparsity.emptyColumns).toBe(6);
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

  it("breaks every column's draws down by outcome, and the outcomes sum to the draws", () => {
    // ADR-0009: coherent + tied + diverged + missed + acting === draws, each counted by name.
    // The fixture holds no tie, so tied is zero and acting is disputes 164–166.
    for (const m of agentJurorMarginalsOf(built.rows, ROSTER)) {
      const { coherent, tied, diverged, missed, acting } = m.coherence;
      expect(coherent + tied + diverged + missed + acting).toBe(m.draws);
      expect(tied).toBe(0);
    }
  });

  it("slices the court's own totals down each column", () => {
    // The whole claim a marginal makes: the same draws, counted a second way. If these ever
    // disagree then one of the two is reducing the rows on terms of its own.
    const totals = courtTotalsOf(built.rows, ROSTER);
    const marginals = agentJurorMarginalsOf(built.rows, ROSTER);

    expect(marginals.reduce((n, m) => n + m.draws, 0)).toBe(totals.draws);
    expect(marginals.reduce((n, m) => n + m.votes, 0)).toBe(totals.votes);
    expect(marginals.filter((m) => m.draws > 0)).toHaveLength(totals.agentJurorsDrawn);
  });

  it("has nothing to measure for an agent juror never drawn, and a real zero for its draws", () => {
    // `canvas/JurorEmpty.dc.html:66-76`. Every figure it cannot have is null so the view draws
    // an em dash; the draw count is `0` because zero draws is a measurement and not an absence.
    const never = agentJurorMarginalsOf(built.rows, ROSTER).find(
      (m) => m.agentJuror.nickname === "Baskerville",
    );

    expect(never?.draws).toBe(0);
    expect(never?.votes).toBe(0);
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

  it("summarises no commit or reveal latency per agent juror (ADR-0010)", () => {
    // A median of either per column ranked agent jurors on a figure that measures how often
    // they poll the court, not how fast they judge. Each draw keeps its own figures; no column
    // reduces them.
    const marginal = agentJurorMarginalsOf(
      [column({ id: 1, ruled: true, revealLatencySeconds: 90 })],
      ROSTER,
    )[0];

    expect(marginal).not.toHaveProperty("revealLatency");
    expect(marginal).not.toHaveProperty("commitLatency");
    expect(marginal).not.toHaveProperty("changedWindows");
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

describe("timeToAppealOf", () => {
  /** A dispute with no draws, only the record time to appeal is read from. */
  function disputeRow(
    id: number,
    createdAt: number,
    rounds: readonly { index: number; appealOpenedAt: number | null }[],
    windows: PeriodWindows | null = null,
  ): MatrixRow {
    return {
      dispute: {
        id,
        period: "appeal",
        ruling: { state: "pending" },
        tied: false,
        createdAt,
        lastPeriodChange: createdAt,
        templateId: null,
        rounds: rounds.map((round) => ({
          index: round.index,
          commitOpenedAt: createdAt + 1,
          voteOpenedAt: createdAt + 2,
          appealOpenedAt: round.appealOpenedAt,
          executionOpenedAt: null,
        })),
      },
      panelSize: 0,
      offRosterDraws: 0,
      cells: ROSTER.map(() => null),
      windows,
      underEarlierWindows: false,
      read: true,
    };
  }

  it("is one value per dispute, from creation to the first round's appeal period", () => {
    const appeal = timeToAppealOf([
      disputeRow(3, 1000, [{ index: 0, appealOpenedAt: 1300 }]),
      disputeRow(1, 1000, [{ index: 0, appealOpenedAt: 1100 }]),
      disputeRow(2, 1000, [{ index: 0, appealOpenedAt: 1200 }]),
      disputeRow(4, 1000, [{ index: 0, appealOpenedAt: 1400 }]),
    ]);

    expect(appeal.summary?.seconds).toEqual([100, 200, 300, 400]);
    // The lower middle, as every median here: 200 and not an invented 250.
    expect(appeal.summary?.median).toBe(200);
    expect(appeal.summary?.fastest).toBe(100);
    expect(appeal.summary?.slowest).toBe(400);
    expect(appeal.disputes.map((entry) => entry.dispute)).toEqual([1, 2, 3, 4]);
  });

  it("counts a dispute not yet at appeal rather than plotting or dropping it", () => {
    const appeal = timeToAppealOf([
      disputeRow(2, 1000, [{ index: 0, appealOpenedAt: null }]),
      disputeRow(1, 1000, [{ index: 0, appealOpenedAt: 1600 }]),
      // No round at all: a dispute whose timeline the subgraph has not written.
      disputeRow(3, 1000, []),
    ]);

    expect(appeal.summary?.seconds).toEqual([600]);
    expect(appeal.notYetAtAppeal).toEqual([2, 3]);
  });

  it("reads round 0 only, even where an appeal round follows", () => {
    // The second round's appeal period opened much later, after the appeal itself. Reading the
    // latest round would fold the time the parties took to appeal into the court's figure.
    const appeal = timeToAppealOf([
      disputeRow(1, 1000, [
        { index: 1, appealOpenedAt: 90_000 },
        { index: 0, appealOpenedAt: 5000 },
      ]),
    ]);

    expect(appeal.summary?.seconds).toEqual([4000]);
  });

  it("has nothing to report, not a zero, when no dispute has reached appeal", () => {
    const appeal = timeToAppealOf([disputeRow(1, 1000, [{ index: 0, appealOpenedAt: null }])]);

    expect(appeal.summary).toBeNull();
    expect(appeal.notYetAtAppeal).toEqual([1]);
  });

  it("is the figure the court's totals carry, over every dispute in the captured court", () => {
    const totals = courtTotalsOf(built.rows, ROSTER);

    // All sixteen captured disputes had reached appeal: 164–166 were sitting in it.
    expect(totals.timeToAppeal.summary?.seconds).toHaveLength(built.rows.length);
    expect(totals.timeToAppeal.notYetAtAppeal).toEqual([]);
    // Dispute 166: created 1787598714, appeal opened 1787604932.
    expect(totals.timeToAppeal.disputes.find((entry) => entry.dispute === 166)?.seconds).toBe(6218);
  });
});

/**
 * One row with one draw in one column, for the cases the captured court cannot produce.
 *
 * Hand-built for the reason `CLAUDE.md` gives: every fixture here is one successful read of a
 * working court, so none of them holds a lone panel that is still live.
 */
function column({
  id,
  ruled,
  state = { kind: "coherent" },
  revealLatencySeconds = 30,
  committed = true,
  panelSize = 2,
  windows = null,
  at = 0,
  reward = null,
}: {
  id: number;
  ruled: boolean;
  state?: Draw["state"];
  revealLatencySeconds?: number | null;
  committed?: boolean;
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
      // No timeline: these rows are about draws, and a time to appeal is not asked of them.
      createdAt: 0,
      rounds: [],
    } as never,
    panelSize,
    offRosterDraws: 0,
    cells: ROSTER.map((agentJuror, column) =>
      column === at
        ? {
            agentJuror,
            state,
            revealLatencySeconds,
            revealedAt: revealLatencySeconds,
            roundIndex: 0,
            committed,
            voteCount: 1,
            roundVoteCount: 3,
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
