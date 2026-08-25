import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { presentationOf, revealFigureOf } from "./cell";
import type { Draw, DrawState } from "./performance";

const AGENT_JUROR = ROSTER[0] as (typeof ROSTER)[number];

function draw(overrides: Partial<Draw> = {}): Draw {
  return {
    agentJuror: AGENT_JUROR,
    state: { kind: "coherent" },
    revealLatencySeconds: 85,
    voteCount: 1,
    ...overrides,
  };
}

/** The four states a drawn cell can be in. Not drawn is the absence of one, and has none. */
const DRAWN_STATES: DrawState[] = [
  { kind: "coherent" },
  { kind: "diverged" },
  { kind: "no-vote" },
  { kind: "live", stage: "awaiting" },
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
    // Five attributes carry the five states: glyph, word, weight, fill and border. Not drawn
    // has neither a glyph nor a word, which is what tells it from the other four; these four
    // must be separable from each other without reading a colour.
    const withoutHue = DRAWN_STATES.map((state) => {
      const { glyph, word, filled } = presentationOf(state);
      return `${glyph}|${word}|${filled}`;
    });

    expect(new Set(withoutHue).size).toBe(DRAWN_STATES.length);
  });

  it("words each stage of the live family separately", () => {
    const words = (["awaiting", "committed", "revealed"] as const).map(
      (stage) => presentationOf({ kind: "live", stage }).word,
    );

    expect(words).toEqual(["Awaiting", "Committed", "Revealed"]);
    // The legend's word for the family is none of them, on purpose.
    expect(words).not.toContain("Acting");
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

describe("revealFigureOf", () => {
  it("reads a measured latency as a figure", () => {
    expect(revealFigureOf(draw())).toEqual({ text: "85s", tone: "value" });
  });

  it("reads a reveal that will not come as a miss, not as a number", () => {
    expect(
      revealFigureOf(draw({ state: { kind: "no-vote" }, revealLatencySeconds: null })),
    ).toEqual({ text: "Missed", tone: "missed" });
  });

  it("reads a reveal that has not come yet as a dash, never as blank", () => {
    for (const stage of ["awaiting", "committed"] as const) {
      expect(
        revealFigureOf(draw({ state: { kind: "live", stage }, revealLatencySeconds: null })),
      ).toEqual({ text: "—", tone: "pending" });
    }
  });

  it("reads a reveal with no moment recorded as unknown, not as missed and not as a dash", () => {
    // A draw that voted but whose justification is absent: it acted, and the record cannot say
    // when. Saying "Missed" would blame it; saying "—" would claim it has not acted yet.
    expect(revealFigureOf(draw({ revealLatencySeconds: null }))).toEqual({
      text: "Unknown",
      tone: "pending",
    });
  });
});
