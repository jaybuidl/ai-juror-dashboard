import { formatLatencySeconds } from "./latency";
import type { Draw, DrawState, LiveStage } from "./performance";

/**
 * What a cell says, before any of it is drawn.
 *
 * Separate from `Matrix.tsx` because it is the part of the design that has to be checked rather
 * than looked at: ADR-0006 requires the five states to stay apart with hue removed, which is a
 * property of this table and not of the stylesheet. Keeping it out of the component module also
 * keeps that module exporting components only, which is what React Fast Refresh needs.
 */

/** The ink a cell is drawn in. Never the only carrier of its meaning — ADR-0006. */
export type Tone = "pass" | "work" | "fail" | "live";

export type Presentation = {
  /** Decorative beside the word, and never alone. */
  glyph: string;
  word: string;
  tone: Tone;
  /** Whether the cell carries a tint and a border of its own. */
  filled: boolean;
};

/**
 * The live family, worded for the point a draw has reached.
 *
 * The legend names this family once, as `Acting`; the cell is what says which stage. `Revealed`
 * is a draw whose vote is in and whose dispute has no ruling yet — every draw in disputes
 * 164–166 on the day this was built. Its latency is real and shown; its coherence is not
 * knowable, and the cell says which.
 */
const LIVE_WORDS: Record<LiveStage, string> = {
  awaiting: "Awaiting",
  committed: "Committed",
  revealed: "Revealed",
};

/**
 * What a draw's state looks like: a glyph, a word, and only then a colour.
 *
 * Not drawn is absent here on purpose: it has no glyph and no word, and is the absence of a
 * draw rather than one of its states. Conflating the two is the one confusion the design exists
 * to prevent, and a table that held both would invite it.
 */
export function presentationOf(state: DrawState): Presentation {
  switch (state.kind) {
    // The common case, and the quiet one: no fill, no border, so the exceptions are what the
    // eye lands on across a page of forty-odd cells.
    case "coherent":
      return { glyph: "✓", word: "Coherent", tone: "pass", filled: false };
    // Amber and not rose. Voting in the minority is a legitimate outcome that costs the agent
    // juror PNK; it is not a malfunction and must not look like one.
    case "diverged":
      return { glyph: "✕", word: "Diverged", tone: "work", filled: true };
    // The loudest state on the page: drawn, the period closed, and nothing arrived.
    case "no-vote":
      return { glyph: "∅", word: "No vote", tone: "fail", filled: true };
    case "live":
      return { glyph: "⋯", word: LIVE_WORDS[state.stage], tone: "live", filled: true };
  }
}

/**
 * What the reveal slot reads, and why it never goes blank.
 *
 * Three absences that must not be confused: a reveal that will not come (`Missed`), one that
 * has not come yet (`—`), and one that came without leaving a moment behind (`Unknown` — the
 * timestamp lives only on the justification, so a reveal with none cannot be dated). Blank is
 * reserved for a cell with no draw in it at all.
 */
export function revealFigureOf(draw: Draw): {
  text: string;
  tone: "value" | "missed" | "pending";
} {
  if (draw.revealLatencySeconds !== null) {
    return { text: formatLatencySeconds(draw.revealLatencySeconds), tone: "value" };
  }
  if (draw.state.kind === "no-vote") return { text: "Missed", tone: "missed" };
  if (draw.state.kind === "live" && draw.state.stage !== "revealed") {
    return { text: "—", tone: "pending" };
  }
  return { text: "Unknown", tone: "pending" };
}
