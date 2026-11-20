import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { commitFigureOf, presentationOf, revealFigureOf, voteWeightOf } from "./cell";
import type { Draw, DrawState } from "./performance";

const AGENT_JUROR = ROSTER[0] as (typeof ROSTER)[number];

function draw(overrides: Partial<Draw> = {}): Draw {
  return {
    agentJuror: AGENT_JUROR,
    state: { kind: "coherent" },
    revealLatencySeconds: 85,
    commitLatencySeconds: 396,
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

  it("reads a reveal with no moment recorded as undated, not as missed and not as a dash", () => {
    // A draw that voted but whose justification is absent: it acted, and the record cannot say
    // when. Saying "Missed" would blame it; saying "—" would claim it has not acted yet.
    //
    // "Not dated" and not "Unknown": ticket 13 gave that word to the unread row, and this is a
    // different thing — the chain's record is thin, not this dashboard's read. It keeps pending
    // ink for the same reason, because nothing here failed.
    expect(revealFigureOf(draw({ revealLatencySeconds: null }))).toEqual({
      text: "Not dated",
      tone: "pending",
    });
  });
});

describe("commitFigureOf", () => {
  it("reads a measured latency as a figure, in the same unit as the reveal", () => {
    expect(commitFigureOf(draw(), true)).toEqual({ text: "6m 36s", tone: "value" });
  });

  it("reads a commitment that never came as a miss once the window has closed", () => {
    expect(
      commitFigureOf(
        draw({ state: { kind: "no-vote" }, committed: false, commitLatencySeconds: null }),
        true,
      ),
    ).toEqual({ text: "Missed", tone: "missed" });
  });

  it("reads a commitment that has not come yet as a dash, never as blank", () => {
    expect(
      commitFigureOf(
        draw({
          state: { kind: "live", stage: "awaiting" },
          committed: false,
          commitLatencySeconds: null,
        }),
        true,
      ),
    ).toEqual({ text: "—", tone: "pending" });
  });

  it("reads a commitment the log scan did not find as unread, never as a miss", () => {
    // This is the cross-check's face in the cell, and the reason ADR-0004 asks for one: a
    // truncating endpoint drops the log, not the commitment. Wording it "Missed" would blame
    // an agent juror that committed on time, which is the failure the whole check exists for.
    const states: DrawState[] = [
      { kind: "coherent" },
      { kind: "diverged" },
      { kind: "no-vote" },
      { kind: "live", stage: "committed" },
      { kind: "live", stage: "revealed" },
    ];

    for (const state of states) {
      expect(
        commitFigureOf(draw({ state, committed: true, commitLatencySeconds: null }), true),
      ).toEqual({ text: "Not read", tone: "unread" });
    }
  });

  it("says a commitment is unread only once there has been a scan to come back short", () => {
    // The trap ticket 07 found by review, one level down. Between the subgraph answering and
    // the chain answering, every committed draw has no log — so without the scanned flag all
    // 56 cells would come up rose reading "Not read" on every cold load, announcing a failure
    // that has not happened. Unscanned is a step not reached, which is what a dash means.
    const pending = draw({
      state: { kind: "coherent" },
      committed: true,
      commitLatencySeconds: null,
    });

    expect(commitFigureOf(pending, false)).toEqual({ text: "—", tone: "pending" });
    expect(commitFigureOf(pending, true)).toEqual({ text: "Not read", tone: "unread" });
  });

  it("never says Missed about a draw the subgraph reports as committed", () => {
    const missed = commitFigureOf(
      draw({ state: { kind: "no-vote" }, committed: true, commitLatencySeconds: null }),
      true,
    );

    expect(missed.text).not.toBe("Missed");
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
