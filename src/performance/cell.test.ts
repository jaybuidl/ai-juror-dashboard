import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { presentationOf, timeToAppealFigureOf, voteWeightOf } from "./cell";
import type { Draw, DrawState } from "./performance";

const AGENT_JUROR = ROSTER[0] as (typeof ROSTER)[number];

function draw(overrides: Partial<Draw> = {}): Draw {
  return {
    agentJuror: AGENT_JUROR,
    state: { kind: "coherent" },
    revealLatencySeconds: 85,
    revealedAt: 1787343483,
    roundIndex: 0,
    committed: true,
    voteCount: 1,
    roundVoteCount: 3,
    choices: [1],
    // Nothing in this suite is about a payout — the cell does not show one. `null` is what a
    // draw in a dispute the court has not executed carries, which is the commoner state.
    reward: null,
    ...overrides,
  };
}

/** Every state a drawn cell can be in. Not drawn is the absence of one, and has none. */
const DRAWN_STATES: DrawState[] = [
  { kind: "coherent" },
  { kind: "tied" },
  { kind: "diverged" },
  { kind: "no-vote" },
  { kind: "live", stage: "awaiting" },
  { kind: "live", stage: "committed" },
  { kind: "live", stage: "revealed" },
];

describe("presentationOf", () => {
  it("gives every state a glyph and a word before it gives it a colour", () => {
    for (const state of DRAWN_STATES) {
      const presentation = presentationOf(state);

      expect(presentation.glyph).not.toBe("");
      expect(presentation.word).not.toBe("");
    }
  });

  it("keeps the states apart with hue removed", () => {
    // Glyph, word, fill and border carry the states. Not drawn has neither a glyph nor a word,
    // which is what tells it from the rest; these must be separable from each other without
    // reading a colour.
    const withoutHue = DRAWN_STATES.map((state) => {
      const { glyph, word, filled, dashed } = presentationOf(state);
      return `${glyph}|${word}|${filled}|${dashed}`;
    });

    expect(new Set(withoutHue).size).toBe(DRAWN_STATES.length);
  });

  it("tells every state apart by its glyph alone, which is all the compact cell draws", () => {
    // ADR-0011. The compact cell drops the word, and until then the three live stages shared
    // one glyph and were told apart only by the latency beside it. With the times gone, two
    // states sharing a glyph would be two states a compact reader cannot separate.
    const glyphs = DRAWN_STATES.map((state) => presentationOf(state).glyph);

    expect(new Set(glyphs).size).toBe(DRAWN_STATES.length);
  });

  it("dashes the border of an awaiting draw, and of nothing else", () => {
    const dashed = DRAWN_STATES.filter((state) => presentationOf(state).dashed);

    expect(dashed).toEqual([{ kind: "live", stage: "awaiting" }]);
  });

  it("words each stage of the live family separately", () => {
    const words = (["awaiting", "committed", "revealed"] as const).map(
      (stage) => presentationOf({ kind: "live", stage }).word,
    );

    expect(words).toEqual(["Awaiting", "Committed", "Revealed"]);
  });

  it("marks each live stage with its own glyph", () => {
    const glyphs = (["awaiting", "committed", "revealed"] as const).map(
      (stage) => presentationOf({ kind: "live", stage }).glyph,
    );

    expect(glyphs).toEqual(["⋯", "◐", "●"]);
  });

  it("gives a missed vote the loudest treatment and the coherent cell the quietest", () => {
    // The one confusion the design exists to prevent is between a missed vote and a cell with
    // no draw in it — the loudest thing on the page against the emptiest.
    const missed = presentationOf({ kind: "no-vote" });

    expect(missed.glyph).toBe("∅");
    expect(missed.word).toBe("No vote");
    expect(missed.filled).toBe(true);
    expect(presentationOf({ kind: "coherent" }).filled).toBe(false);
  });
});

describe("timeToAppealFigureOf", () => {
  it("reads a dispute's time to appeal in whole minutes, as the matrix's headline does", () => {
    // Dispute 151, under the court's first windows, reached its appeal period 48,050s after it
    // was created; dispute 156, under the second, 4,588s after.
    expect(timeToAppealFigureOf(48_050)).toEqual({ text: "801m", tone: "value" });
    expect(timeToAppealFigureOf(4_588)).toEqual({ text: "76m", tone: "value" });
  });

  it("reads a dispute not yet at its appeal period as a dash, never a zero", () => {
    expect(timeToAppealFigureOf(null)).toEqual({ text: "—", tone: "pending" });
  });
});

describe("voteWeightOf", () => {
  it("says nothing for a draw that holds one vote", () => {
    // The common case, and an annotation that is almost always the same number is noise.
    expect(voteWeightOf(draw())).toBeNull();
  });

  it("annotates a draw that holds more than one vote", () => {
    expect(voteWeightOf(draw({ voteCount: 2 }))).toBe("×2");
  });
});
