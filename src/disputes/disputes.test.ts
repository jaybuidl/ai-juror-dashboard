import { describe, expect, it } from "vitest";
import fixture from "./court-34.fixture.json" with { type: "json" };
import { type RawDispute, rulingOf, toDisputes } from "./disputes";

/**
 * The real court, read from Goldsky on 2026-08-25: disputes 151–166, of which 151–163 are
 * in `execution` and 164–166 were still in `appeal`. Captured rather than invented, so the
 * cases below are the ones the dashboard actually meets — including dispute 154, whose
 * ruling is choice 0.
 *
 * It is a snapshot and will fall behind the chain, which is the point: these tests describe
 * what the model does with a payload, not what the court currently holds.
 */
const realDisputes = fixture as RawDispute[];

/** The subgraph's shape, with only the fields under test spelled out per case. */
function rawDispute(overrides: Partial<RawDispute> = {}): RawDispute {
  return {
    id: "151",
    disputeID: "151",
    period: "execution",
    ruled: true,
    currentRuling: "1",
    createdAt: "1787340123",
    lastPeriodChange: "1787409015",
    currentRoundIndex: "0",
    templateId: "161",
    rounds: [{ id: "151-0", timeline: ["1787342856", "1787343398", "1787344095", "1787409015"] }],
    ...overrides,
  };
}

describe("toDisputes", () => {
  it("reads every dispute the subgraph returned", () => {
    expect(toDisputes(realDisputes)).toHaveLength(16);
  });

  it("orders newest core dispute ID first", () => {
    const ids = toDisputes(realDisputes).map((dispute) => dispute.id);

    expect(ids).toEqual([
      166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154, 153, 152, 151,
    ]);
  });

  it("orders by dispute ID whatever order the rows arrived in", () => {
    const shuffled = [...realDisputes].reverse();

    expect(toDisputes(shuffled).map((dispute) => dispute.id)).toEqual(
      toDisputes(realDisputes).map((dispute) => dispute.id),
    );
  });

  it("orders numerically, not as strings, so 99 sorts below 100", () => {
    const raw = [
      rawDispute({ id: "99", disputeID: "99" }),
      rawDispute({ id: "100", disputeID: "100" }),
    ];

    expect(toDisputes(raw).map((dispute) => dispute.id)).toEqual([100, 99]);
  });

  it("carries each dispute's period", () => {
    const byId = new Map(toDisputes(realDisputes).map((dispute) => [dispute.id, dispute]));

    expect(byId.get(166)?.period).toBe("appeal");
    expect(byId.get(163)?.period).toBe("execution");
  });

  it("carries the round timeline as the observed moments each period opened", () => {
    const [round] = toDisputes([rawDispute()])[0]?.rounds ?? [];

    expect(round).toEqual({
      index: 0,
      commitOpenedAt: 1787342856,
      voteOpenedAt: 1787343398,
      appealOpenedAt: 1787344095,
      executionOpenedAt: 1787409015,
    });
  });

  it("reads a period that has not opened yet as unknown rather than as the epoch", () => {
    const raw = rawDispute({
      period: "appeal",
      ruled: false,
      rounds: [{ id: "166-0", timeline: ["1787601846", "1787604313", "1787604932", "0"] }],
    });

    expect(toDisputes([raw])[0]?.rounds[0]?.executionOpenedAt).toBeNull();
  });

  it("carries the template id each dispute joins its title on", () => {
    const byId = new Map(toDisputes(realDisputes).map((dispute) => [dispute.id, dispute]));

    // Not the dispute id, and not a constant offset from it — which is the whole reason
    // the join cannot be computed and has to be read.
    expect(byId.get(151)?.templateId).toBe(161);
    expect(byId.get(152)?.templateId).toBe(163);
  });

  it("reads a dispute with no template as having none, rather than as template zero", () => {
    // `templateId` is nullable on the subgraph's own type. Court 34 has no such dispute
    // today, and a dashboard that rendered one as template 0 would show a stranger's
    // title against it.
    expect(toDisputes([rawDispute({ templateId: null })])[0]?.templateId).toBeNull();
    expect(toDisputes([rawDispute({ templateId: undefined })])[0]?.templateId).toBeNull();
  });

  it("reads a malformed template id as no template, rather than throwing", () => {
    // The one field here that degrades instead of failing: it becomes a title, so the
    // worst case is a row without one. Every other field becomes a timestamp or a
    // ruling, where a garbled value would be read as a figure.
    expect(toDisputes([rawDispute({ templateId: "16 1" })])[0]?.templateId).toBeNull();
    expect(toDisputes([rawDispute({ templateId: "" })])[0]?.templateId).toBeNull();
  });

  it("orders rounds by index rather than by the lexicographic id the subgraph sorts on", () => {
    const raw = rawDispute({
      currentRoundIndex: "10",
      rounds: [
        { id: "151-10", timeline: ["10", "0", "0", "0"] },
        { id: "151-9", timeline: ["9", "0", "0", "0"] },
        { id: "151-0", timeline: ["1", "0", "0", "0"] },
      ],
    });

    expect(toDisputes([raw])[0]?.rounds.map((round) => round.index)).toEqual([0, 9, 10]);
  });
});

describe("rulingOf", () => {
  it("reports a ruled dispute's winning choice", () => {
    expect(rulingOf(rawDispute({ ruled: true, currentRuling: "2" }))).toEqual({
      state: "ruled",
      choice: 2,
    });
  });

  it("reports choice 0 as a refusal to arbitrate, not as an absent ruling", () => {
    // Dispute 154 really is ruled 0. Choice 0 is always valid, so a truthiness test on
    // currentRuling would report a decided dispute as still pending.
    const dispute154 = realDisputes.find((raw) => raw.disputeID === "154");

    expect(dispute154).toBeDefined();
    expect(rulingOf(dispute154 as RawDispute)).toEqual({ state: "refused" });
  });

  it("reports an unruled dispute as pending even though the subgraph offers a current ruling", () => {
    // A majority before the appeal period closes is a prediction, not a ruling.
    const dispute166 = realDisputes.find((raw) => raw.disputeID === "166");

    expect(dispute166?.currentRuling).toBe("1");
    expect(rulingOf(dispute166 as RawDispute)).toEqual({ state: "pending" });
  });

  it("reports every dispute still in appeal as pending", () => {
    const pending = toDisputes(realDisputes).filter(
      (dispute) => dispute.ruling.state === "pending",
    );

    expect(pending.map((dispute) => dispute.id)).toEqual([166, 165, 164]);
  });
});
