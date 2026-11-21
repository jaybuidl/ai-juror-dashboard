import { describe, expect, it } from "vitest";
import type { DisputeRound } from "../disputes/disputes";
import { commitAt, commitKey, commitsByDraw, type RawCommitCast } from "./commitments";

/**
 * The join between a commitment's log and the draw that published it, which the dispute timeline
 * uses (ADR-0012). The chain checksums an address and The Graph lowercases it; the log carries no
 * round; and a malformed log must cost one moment rather than a page.
 */

const BLAISE = "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea";

function rawCommit(overrides: Partial<RawCommitCast> = {}): RawCommitCast {
  return { disputeID: "163", juror: BLAISE, timestamp: "1787342880", ...overrides };
}

function round(index: number, commitOpenedAt: number | null): DisputeRound {
  return {
    index,
    commitOpenedAt,
    voteOpenedAt: null,
    appealOpenedAt: null,
    executionOpenedAt: null,
  } as DisputeRound;
}

describe("commitsByDraw", () => {
  it("joins the chain's checksummed address to the subgraph's lowercased one", () => {
    const byDraw = commitsByDraw([rawCommit({ juror: BLAISE.toUpperCase().replace("0X", "0x") })]);

    expect(byDraw.get(commitKey(163, BLAISE.toLowerCase()))).toEqual([1787342880]);
  });

  it("orders several commitments under one key, oldest first", () => {
    const byDraw = commitsByDraw([
      rawCommit({ timestamp: "1030" }),
      rawCommit({ timestamp: "40" }),
    ]);

    expect(byDraw.get(commitKey(163, BLAISE))).toEqual([40, 1030]);
  });

  it("drops a commitment it cannot read rather than guessing at it", () => {
    const byDraw = commitsByDraw([rawCommit({ timestamp: "1e9" }), rawCommit({ disputeID: "01" })]);

    expect(byDraw.size).toBe(0);
  });
});

describe("commitAt", () => {
  it("takes the earliest commitment at or after the round's commit period opened", () => {
    // The log carries a dispute and a juror and no round, so an agent juror drawn twice has two
    // commitments under one key. Taking the wrong one dates a round-1 draw against round 0.
    expect(commitAt([40, 1030], round(1, 1000))).toBe(1030);
    expect(commitAt([40, 1030], round(0, 1))).toBe(40);
  });

  it("never selects a commitment that predates the round, so nothing is ever negative", () => {
    expect(commitAt([1787342000], round(0, 1787342856))).toBeNull();
  });

  it("has nothing to say about a round whose commit period has not opened", () => {
    expect(commitAt([1787342880], round(0, null))).toBeNull();
    expect(commitAt([1787342880], undefined)).toBeNull();
    expect(commitAt(undefined, round(0, 1))).toBeNull();
  });
});
