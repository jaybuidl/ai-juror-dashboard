import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { DisputeTemplate } from "../disputes/dispute-templates";
import type { Dispute, RawDispute } from "../disputes/disputes";
import { ROSTER } from "../roster/agent-jurors";
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import detailFixture from "./dispute-156-detail.fixture.json" with { type: "json" };
import {
  buildDisputeReading,
  NO_DETAIL,
  namesADispute,
  periodsOf,
  type RawDisputeDetail,
  REFUSE_TO_ARBITRATE,
  toDisputeDetail,
} from "./dispute-detail";
import { buildCourtPerformance, type CourtPerformance, type RawDraw } from "./performance";
import type { RawCourtParameters } from "./windows";

/**
 * One dispute read whole, against the same captured court every other test in this folder uses.
 *
 * Dispute 156 is the case worth capturing: five vote IDs across four jurors, one of whom holds
 * two; one justification published *empty*; a vote for choice 0; and choice 1 with no votes at
 * all. Every absence this model has to keep apart from every other is in one payload.
 */

const court = ((): CourtPerformance => {
  const result = buildCourtPerformance({
    disputes: disputeFixture as RawDispute[],
    draws: drawFixture as RawDraw[],
    commits: null,
    parameters: parameterFixture as RawCourtParameters[],
    roster: ROSTER,
    drawsReadAt: null,
  });
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
})();

function rowFor(id: number) {
  const row = court.rows.find((candidate) => candidate.dispute.id === id);
  if (row === undefined) throw new Error(`The captured court holds no dispute ${id}`);
  return row;
}

const raw156 = detailFixture as RawDisputeDetail;

/** A template that names two choices, as every live one in this court does. */
const TEMPLATE: DisputeTemplate = {
  title: "A dispute",
  category: "Agentic Commerce",
  question: "Did the seller comply?",
  answers: [
    { choice: 1, title: "Refund the buyer" },
    { choice: 2, title: "Pay the seller" },
  ],
};

describe("toDisputeDetail", () => {
  describe("the ballot", () => {
    it("lists every choice a juror could have picked, not only the ones that drew votes", () => {
      // The live shape from dispute 156: `answers` carries choices 0 and 2 and says nothing
      // about choice 1, because nobody voted for it. "Choice 1 received no votes" is a fact
      // about the panel and the card is required to state it.
      const detail = toDisputeDetail(raw156);

      expect(detail.ballot).toEqual([
        { choice: 0, votes: 1 },
        { choice: 1, votes: 0 },
        { choice: 2, votes: 4 },
      ]);
    });

    it("counts vote IDs, which is what the court itself aggregated", () => {
      // Four draws, five vote IDs, and the tally sums to five. The draw is this dashboard's
      // unit for measuring an agent juror; the vote ID is the unit the ruling was decided in,
      // and the card reports the court's own arithmetic rather than re-deriving it.
      const votes = toDisputeDetail(raw156).ballot.reduce((sum, entry) => sum + entry.votes, 0);

      expect(votes).toBe(5);
      expect(raw156.draws).toHaveLength(5);
    });

    it("includes choice 0, which is a decision and never an absence", () => {
      expect(toDisputeDetail(raw156).ballot[0]).toEqual({ choice: 0, votes: 1 });
    });

    it("reports what was counted when the number of choices could not be read", () => {
      // Not an empty ballot: the votes that came back are still true. What is lost is the
      // claim to be listing *every* choice, which is what `numberOfChoices` supplies.
      const detail = toDisputeDetail({
        dispute: {
          id: "156",
          disputeID: "156",
          externalDisputeId: "156",
          disputeKitDispute: [
            { localRounds: [{ id: "1-156-0", answers: [{ answerId: "2", count: "4" }] }] },
          ],
        },
      });

      expect(detail.ballot).toEqual([{ choice: 2, votes: 4 }]);
    });

    it("has no ballot at all when nothing was read", () => {
      expect(toDisputeDetail({ dispute: null }).ballot).toEqual([]);
    });

    it("refuses to draw out a ballot larger than a panel could ever be asked to choose from", () => {
      // `numberOfChoices` is a `BigInt` on the schema and comes from the arbitrable, so an
      // eighty-digit decimal is a *well-formed* value. Filling a ballot up to it builds that
      // many entries and hangs the tab, with no error and nothing on screen. Reachable rather
      // than theoretical: `dispute(id:)` is global across every court, so this view models
      // whatever comes back before anything checks the dispute belongs to court 34.
      const detail = toDisputeDetail({
        dispute: {
          id: "1",
          disputeID: "1",
          externalDisputeId: "1",
          disputeKitDispute: [
            {
              numberOfChoices: "99999999999999999999999999999999999999999999999999",
              localRounds: [{ id: "1-1-0", answers: [{ answerId: "2", count: "3" }] }],
            },
          ],
        },
      });

      // Degrades exactly as an unread ballot does: what was counted is still reported, and the
      // card no longer claims to be listing every choice.
      expect(detail.ballot).toEqual([{ choice: 2, votes: 3 }]);
    });

    it("returns from a huge ballot promptly rather than building it", () => {
      const started = performance.now();
      toDisputeDetail({
        dispute: {
          id: "1",
          disputeID: "1",
          externalDisputeId: "1",
          disputeKitDispute: [{ numberOfChoices: "1000000000" }],
        },
      });

      expect(performance.now() - started).toBeLessThan(100);
    });

    it("reads the current round's tally rather than whichever id sorted first", () => {
      // Round ids are `<kit>-<dispute>-<n>` and The Graph orders them lexicographically, so
      // `1-151-10` arrives above `1-151-9`. Costless while every dispute has one round, and
      // silently wrong the first time one does not.
      const detail = toDisputeDetail({
        dispute: {
          id: "151",
          disputeID: "151",
          externalDisputeId: "151",
          disputeKitDispute: [
            {
              numberOfChoices: "2",
              localRounds: [
                { id: "1-151-10", answers: [{ answerId: "2", count: "7" }] },
                { id: "1-151-9", answers: [{ answerId: "1", count: "3" }] },
              ],
            },
          ],
        },
      });

      expect(detail.ballot).toEqual([
        { choice: 0, votes: 0 },
        { choice: 1, votes: 0 },
        { choice: 2, votes: 7 },
      ]);
    });

    it("keeps a choice that drew votes from beyond the ballot rather than dropping it", () => {
      const detail = toDisputeDetail({
        dispute: {
          id: "1",
          disputeID: "1",
          externalDisputeId: "1",
          disputeKitDispute: [
            {
              numberOfChoices: "1",
              localRounds: [{ id: "1-1-0", answers: [{ answerId: "5", count: "2" }] }],
            },
          ],
        },
      });

      // The totals must add up. A card quietly missing two votes is worse than one showing a
      // choice number the arbitrable says it did not offer.
      expect(detail.ballot).toContainEqual({ choice: 5, votes: 2 });
    });
  });

  describe("the evidence count", () => {
    it("counts the submissions the evidence group holds", () => {
      expect(toDisputeDetail(raw156).evidenceCount).toBe(1);
    });

    it("refuses the count when the arbitrable does not agree that is its dispute", () => {
      // The join is an assumption — the deployed subgraph carries no link from a dispute to
      // its evidence — and this is the guard on it. A count belonging to somebody else's
      // dispute would be a fact about a dispute nobody read, on a page that may be cited.
      const detail = toDisputeDetail({
        ...raw156,
        dispute: { ...raw156.dispute, externalDisputeId: "999" } as never,
      });

      expect(detail.evidenceCount).toBeNull();
    });

    it("refuses the count when the group returned is not the one asked for", () => {
      const detail = toDisputeDetail({
        ...raw156,
        evidenceGroup: { id: "157", nextEvidenceIndex: "9" },
      });

      expect(detail.evidenceCount).toBeNull();
    });

    it("reads no count where the group does not exist", () => {
      // Not zero. A dispute with no evidence group and a dispute with an empty one are
      // different, and only the second is the claim "nobody submitted anything".
      expect(toDisputeDetail({ ...raw156, evidenceGroup: null }).evidenceCount).toBeNull();
    });
  });

  describe("the justifications", () => {
    it("collapses one agent juror's vote IDs into the one thing it published", () => {
      // `156-0-0` and `156-0-3` are the same juror holding two vote IDs. A
      // `ClassicJustification` is one per draw, so the prose arrives twice and is one piece.
      const detail = toDisputeDetail(raw156);

      expect(raw156.draws).toHaveLength(5);
      expect(detail.justifications).toHaveLength(4);
    });

    it("keeps prose published empty, which is not the same as none", () => {
      const detail = toDisputeDetail(raw156);
      const empty = detail.justifications.filter(
        (published) => published.justification.length === 0,
      );

      expect(empty).toHaveLength(1);
      expect(empty[0]?.justification.text).toBe("");
    });

    it("leaves a draw with no justification out of the list entirely", () => {
      const detail = toDisputeDetail({
        dispute: null,
        draws: [
          { id: "156-0-9", juror: { id: "0xabc" }, round: { id: "156-0" }, vote: { choice: "2" } },
        ],
      });

      expect(detail.justifications).toEqual([]);
    });

    it("takes the current round's prose, not whichever draw came back first", () => {
      // `toBallot` reads the last round and the columns are joined against that same round, so
      // prose from an earlier one would be printed under a column that did not write it. The
      // query asks for every draw in the dispute with no ordering, so on the first appealed
      // dispute a juror drawn in both rounds would silently show round 0's reasoning.
      const detail = toDisputeDetail({
        dispute: null,
        draws: [
          {
            id: "151-0-0",
            juror: { id: "0xABC" },
            round: { id: "151-0" },
            vote: { justification: { reference: "The first round's reasoning." } },
          },
          {
            id: "151-1-0",
            juror: { id: "0xabc" },
            round: { id: "151-1" },
            vote: { justification: { reference: "The second round's reasoning." } },
          },
        ],
      });

      expect(detail.justifications).toHaveLength(1);
      expect(detail.justifications[0]?.justification.text).toBe("The second round's reasoning.");
    });

    it("reads the round from the id suffix rather than the order it arrived in", () => {
      // The Graph orders `id` lexicographically, so `151-10` arrives above `151-9`.
      const detail = toDisputeDetail({
        dispute: null,
        draws: [
          {
            id: "151-10-0",
            juror: { id: "0xabc" },
            round: { id: "151-10" },
            vote: { justification: { reference: "Round ten." } },
          },
          {
            id: "151-9-0",
            juror: { id: "0xabc" },
            round: { id: "151-9" },
            vote: { justification: { reference: "Round nine." } },
          },
        ],
      });

      expect(detail.justifications[0]?.justification.text).toBe("Round ten.");
    });

    it("keys on the lowercased address The Graph returns", () => {
      const detail = toDisputeDetail(raw156);

      for (const published of detail.justifications) {
        expect(published.juror).toBe(published.juror.toLowerCase());
      }
    });
  });
});

describe("namesADispute", () => {
  it("is false for a read that has not landed", () => {
    expect(namesADispute(undefined)).toBe(false);
  });

  it("is false for a read that landed and found nothing", () => {
    // `/disputes/9999` is a real route with an id that names nothing. The 404 cannot catch it:
    // Netlify answers every path with the app shell at HTTP 200.
    expect(namesADispute({ dispute: null })).toBe(false);
  });

  it("is true for a dispute the court holds", () => {
    expect(namesADispute(raw156)).toBe(true);
  });
});

describe("periodsOf", () => {
  const dispute: Dispute = {
    id: 152,
    period: "execution",
    ruling: { state: "ruled", choice: 1 },
    createdAt: 1000,
    lastPeriodChange: 9000,
    templateId: 163,
    rounds: [
      {
        index: 0,
        commitOpenedAt: 2000,
        voteOpenedAt: 3000,
        appealOpenedAt: 3600,
        executionOpenedAt: 9000,
      },
    ],
  };
  const windows = {
    evidenceSeconds: 2700,
    commitSeconds: 2700,
    voteSeconds: 1800,
    appealSeconds: 129600,
  };

  it("measures each period from when it opened to when the next did", () => {
    const periods = periodsOf(dispute, dispute.rounds[0], windows);

    expect(periods.map((run) => run.elapsedSeconds)).toEqual([1000, 1000, 600, 5400]);
  });

  it("carries the configured window beside it, never divided into it", () => {
    // ADR-0005. Two absolute durations, side by side; the reader is free to form the ratio and
    // the page does not form it for them.
    const periods = periodsOf(dispute, dispute.rounds[0], windows);

    expect(periods.map((run) => run.windowSeconds)).toEqual([2700, 2700, 1800, 129600]);
  });

  it("has no window at all until the parameter history is read", () => {
    // An unread window is not the court's current one. That substitution is the whole thing
    // ticket 08 exists to prevent.
    const periods = periodsOf(dispute, dispute.rounds[0], null);

    expect(periods.every((run) => run.windowSeconds === null)).toBe(true);
  });

  it("leaves a period that has not closed unmeasured rather than open-ended", () => {
    // Every dispute in `appeal` has a null execution moment, and `Round.timeline` writes `0`
    // there — one subtraction away from a duration of fifty-six years.
    const [round] = dispute.rounds;
    if (round === undefined) throw new Error("The fixture dispute has no round");

    const inAppeal: Dispute = {
      ...dispute,
      period: "appeal",
      ruling: { state: "pending" },
      rounds: [{ ...round, executionOpenedAt: null }],
    };

    const periods = periodsOf(inAppeal, inAppeal.rounds[0], windows);

    expect(periods[3]?.elapsedSeconds).toBeNull();
  });

  it("measures the evidence period from the dispute's own creation", () => {
    // Nothing else marks it: `Round.timeline` starts at the commit period.
    expect(periodsOf(dispute, dispute.rounds[0], windows)[0]?.elapsedSeconds).toBe(1000);
  });

  it("measures nothing for a dispute with no round yet", () => {
    // Disputes 167, 168 and 169 arrived exactly like this: in `evidence`, no panel, and an
    // all-zero timeline that parses to null.
    const periods = periodsOf({ ...dispute, rounds: [] }, undefined, windows);

    expect(periods.every((run) => run.elapsedSeconds === null)).toBe(true);
  });
});

describe("buildDisputeReading", () => {
  const reading = buildDisputeReading({
    row: rowFor(156),
    detail: toDisputeDetail(raw156),
    template: TEMPLATE,
  });

  it("puts the columns in roster order, wherever coherence fell", () => {
    // Coherence never reorders the band: a diverged reading keeps its roster position and is
    // never sorted last. The order is `agent-jurors.ts`'s and nothing sorts at render time.
    const drawn = reading.columns.map((column) => column.draw.agentJuror.nickname);
    const inRoster = ROSTER.map((agentJuror) => agentJuror.nickname).filter((nickname) =>
      drawn.includes(nickname),
    );

    expect(drawn).toEqual(inRoster);
  });

  it("carries a diverged column in its roster position rather than at the end", () => {
    const diverged = reading.columns.findIndex((column) => column.draw.state.kind === "diverged");

    expect(diverged).toBeGreaterThanOrEqual(0);
    expect(diverged).toBeLessThan(reading.columns.length - 1);
  });

  it("attaches each agent juror's prose to its own column", () => {
    const withProse = reading.columns.filter((column) => column.justification !== null);

    expect(withProse.length).toBe(reading.columns.length);
  });

  it("names choice 0 without asking the template, because no template names it", () => {
    expect(reading.tally[0]?.title).toBe(REFUSE_TO_ARBITRATE);
  });

  it("names the other choices from the template", () => {
    expect(reading.tally.map((entry) => entry.title)).toEqual([
      REFUSE_TO_ARBITRATE,
      "Refund the buyer",
      "Pay the seller",
    ]);
  });

  it("leaves a choice the template does not name unnamed rather than blank-labelled", () => {
    const unnamed = buildDisputeReading({
      row: rowFor(156),
      detail: toDisputeDetail(raw156),
      template: undefined,
    });

    expect(unnamed.tally.map((entry) => entry.title)).toEqual([REFUSE_TO_ARBITRATE, null, null]);
  });

  it("marks exactly the choice the court ruled", () => {
    const ruling = reading.tally.filter((entry) => entry.isRuling);

    expect(ruling).toHaveLength(1);
    expect(ruling[0]?.choice).toBe(2);
  });

  it("marks nothing while the court has not ruled", () => {
    // A dispute in `appeal` has every vote in and no ruling. A round majority before then is a
    // prediction, and marking it would state a result the court has not reached.
    const inAppeal = court.rows.find((row) => row.dispute.ruling.state === "pending");
    if (inAppeal === undefined) throw new Error("The captured court holds no unruled dispute");

    const pending = buildDisputeReading({
      row: inAppeal,
      detail: toDisputeDetail(raw156),
      template: TEMPLATE,
    });

    expect(pending.tally.every((entry) => !entry.isRuling)).toBe(true);
  });

  it("marks choice 0 as the ruling for a dispute the court refused", () => {
    // Choice 0 is a ruling. Anything testing it for truthiness would leave a refused dispute's
    // card with nothing marked at all.
    const refused = rowFor(156);
    const reading = buildDisputeReading({
      row: { ...refused, dispute: { ...refused.dispute, ruling: { state: "refused" } } },
      detail: toDisputeDetail(raw156),
      template: TEMPLATE,
    });

    expect(reading.tally.find((entry) => entry.isRuling)?.choice).toBe(0);
  });

  it("carries the panel size the court drew, not the number of columns", () => {
    // A juror outside the roster gets no column and still counts. Conflating the two would let
    // one non-agent juror turn a panel of two into the claim of "a panel of one".
    expect(reading.panelSize).toBe(rowFor(156).panelSize);
  });

  it("renders nothing measured from a detail that was never read", () => {
    const unread = buildDisputeReading({
      row: rowFor(156),
      detail: NO_DETAIL,
      template: TEMPLATE,
    });

    expect(unread.tally).toEqual([]);
    expect(unread.evidenceCount).toBeNull();
    expect(unread.columns.every((column) => column.justification === null)).toBe(true);
  });
});
