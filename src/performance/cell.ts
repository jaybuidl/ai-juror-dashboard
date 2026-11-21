import { formatMinutes } from "./latency";
import type { Draw, DrawState, LiveStage } from "./performance";

/**
 * One measurement as a row states it: a figure, or a word saying why there is not one.
 *
 * The matrix cell carried a draw's commit and reveal latency as two of these until ADR-0011, and
 * the agent juror page's table until ADR-0012, which put each dispute's time to appeal there
 * instead. The reward figures on the stat card are the others (`marginal-figures.ts`).
 *
 * `value` is a figure; `missed` is an agent juror that did not act while it could; `pending` is
 * a step not yet reached; `unread` is something this dashboard could not read.
 *
 * `unread` was carved out of `pending` by ticket 13. They had been one tone, and the collapse
 * put "has not happened yet" and "we failed to read it" in the same ink — the exact pair that
 * ticket's whole channel exists to keep apart. It is rose, per ADR-0006's second meaning for
 * rose, and it is never the only carrier: the word beside it says "Not read".
 */
export type Figure = {
  text: string;
  tone: "value" | "missed" | "pending" | "unread";
};

/**
 * What a cell says, before any of it is drawn.
 *
 * Separate from `Matrix.tsx` because it is the part of the design that has to be checked rather
 * than looked at: ADR-0006 requires every state to stay apart from every other with hue removed, which is a
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
  /**
   * Whether that border is dashed: a draw the court is still waiting on, which has done nothing
   * yet. The one live stage drawn as an outline of what is to come rather than a mark of what
   * happened, so it stays apart from the other two with hue and glyph both removed.
   */
  dashed: boolean;
};

/**
 * The live family, one glyph and one word per point a draw has reached (ADR-0011).
 *
 * The glyph is what tells the three apart, because the compact cell draws nothing else: until
 * ADR-0011 all three shared `⋯` and the only thing separating them there was the latency beside
 * it — a dash or a time. With the times gone each stage needs its own mark. `Revealed` is a draw
 * whose vote is in and whose dispute has no ruling yet; its coherence is not knowable, and the
 * glyph says how far it got rather than guessing which way it went (ADR-0007).
 */
const LIVE: Record<LiveStage, { glyph: string; word: string }> = {
  awaiting: { glyph: "⋯", word: "Awaiting" },
  committed: { glyph: "◐", word: "Committed" },
  revealed: { glyph: "●", word: "Revealed" },
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
      return { glyph: "✓", word: "Coherent", tone: "pass", filled: false, dashed: false };
    // Paid like a coherent vote, so in its ink — but outlined, where coherent is bare, and with
    // a glyph and a word of its own (ADR-0009). Six disputes in 166 tied, and a reader has to be
    // able to find them: a tie is how the court decided, and every voter in one was paid for it.
    case "tied":
      return { glyph: "=", word: "Tied", tone: "pass", filled: true, dashed: false };
    // Amber and not rose. Voting in the minority is a legitimate outcome that costs the agent
    // juror PNK; it is not a malfunction and must not look like one.
    case "diverged":
      return { glyph: "✕", word: "Diverged", tone: "work", filled: true, dashed: false };
    // The loudest state on the page: drawn, the period closed, and nothing arrived.
    case "no-vote":
      return { glyph: "∅", word: "No vote", tone: "fail", filled: true, dashed: false };
    case "live":
      return {
        ...LIVE[state.stage],
        tone: "live",
        filled: true,
        dashed: state.stage === "awaiting",
      };
  }
}

/**
 * The sixth state, and the only one that belongs to no draw.
 *
 * Ticket 13 and `canvas/Errors.dc.html:100-112`, less the R and C lines that artboard still prints
 * in each cell (ADR-0011). A dispute whose draws were never read has six cells that look exactly
 * like six cells nobody was drawn for, and the difference between those two is the difference
 * between a gap in this dashboard and a fact about the court. It is drawn as far from "not drawn"
 * as the vocabulary allows — a fill, a border, a glyph, a word and rose, against the emptiest
 * thing on the page.
 *
 * It shares rose with `no-vote` and is told apart from it by glyph and word alone, which is what
 * ADR-0006 says rose costs: `?` against `∅`, "Unknown" against "No vote". The row's own "Not read"
 * pill carries the rest, so a reader can name which rows are evidence and which are a gap without
 * consulting the legend.
 *
 * Not a member of `DrawState` on purpose. That union describes a draw, and the whole point of
 * this state is that there is no draw to describe — the same reason "not drawn" is not in it.
 */
export const UNREAD_PRESENTATION: Presentation = {
  glyph: "?",
  word: "Unknown",
  tone: "fail",
  filled: true,
  dashed: false,
};

/**
 * What a figure reads where its read came back short. The words are the signal; the rose is the
 * second one. The cell no longer carries a figure (ADR-0011); the column header's payouts and the
 * agent juror page's draws table still do.
 */
export const UNREAD_FIGURE: Figure = { text: "Not read", tone: "unread" };

/**
 * The draw's share of its round's votes, as the cell annotates it: `×2`, or nothing at all.
 *
 * Absent whenever it would say ×1, which most draws are: an annotation that is almost always the
 * same number is noise on a page of cells. Kept at every density since ADR-0011, because a draw
 * holding two of a round's five votes decides more of it than one holding one, and with the
 * times gone it is the one piece of context the cell has room for.
 */
export function voteWeightOf(draw: Draw): string | null {
  return draw.voteCount > 1 ? `×${draw.voteCount}` : null;
}

/**
 * What the agent juror page's time-to-appeal column reads for one dispute (ADR-0012).
 *
 * Whole minutes, the unit the matrix's headline uses for the same figure, so the column and the
 * median above the matrix read as one measure. A dispute that has not reached its appeal period
 * has no time to appeal yet: a dash in pending ink, a step not reached, never a zero.
 *
 * The dispute's figure and not the draw's: every agent juror on the panel shows the same number.
 */
export function timeToAppealFigureOf(seconds: number | null): Figure {
  if (seconds === null) return { text: "—", tone: "pending" };
  return { text: formatMinutes(seconds), tone: "value" };
}
