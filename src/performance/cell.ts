import { formatLatencySeconds } from "./latency";
import type { Draw, DrawState, LiveStage } from "./performance";

/**
 * One measurement as a cell states it: a duration, or a word saying why there is not one.
 *
 * `value` is a figure; `missed` is an agent juror that did not act while it could; `pending` is
 * a step not yet reached; `unread` is a moment this dashboard could not read. The two measures
 * share the type because they share the rail and the column, and a reader comparing them down a
 * column is comparing like with like.
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
 * The sixth state, and the only one that belongs to no draw.
 *
 * Ticket 13 and `canvas/Errors.dc.html:100-112`. A dispute whose draws were never read has six
 * cells that look exactly like six cells nobody was drawn for, and the difference between those
 * two is the difference between a gap in this dashboard and a fact about the court. It is drawn
 * as far from "not drawn" as the vocabulary allows — a fill, a border, a glyph, a word and rose,
 * against the emptiest thing on the page.
 *
 * It shares rose with `no-vote` and is told apart from it by glyph and word alone, which is what
 * ADR-0006 says rose costs: `?` against `∅`, "Unknown" against "No vote". The words in the slots
 * carry the rest, so a reader can name which rows are evidence and which are a gap without
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
};

/** What every slot of an unread cell reads. The words are the signal; the rose is the second one. */
export const UNREAD_FIGURE: Figure = { text: "Not read", tone: "unread" };

/**
 * What the reveal slot reads, and why it never goes blank.
 *
 * Three absences that must not be confused: a reveal that will not come (`Missed`), one that
 * has not come yet (`—`), and one that came without leaving a moment behind (`Not dated` — the
 * timestamp lives only on the justification, so a reveal with none cannot be dated). Blank is
 * reserved for a cell with no draw in it at all.
 *
 * `Not dated` was `Unknown` until ticket 13, and the rename is the substantive half of that
 * ticket's instruction to decide which of three Unknowns keeps the word. This one is the record
 * being thin, not the read failing: the reveal happened, the dashboard saw it happen, and the
 * subgraph carries no moment for it. Wording that as unread would report a defect in this
 * dashboard where the truth is a gap in the chain's own record, so it keeps pending ink and
 * gives up the word.
 */
export function revealFigureOf(draw: Draw): Figure {
  if (draw.revealLatencySeconds !== null) {
    return { text: formatLatencySeconds(draw.revealLatencySeconds), tone: "value" };
  }
  if (draw.state.kind === "no-vote") return { text: "Missed", tone: "missed" };
  if (draw.state.kind === "live" && draw.state.stage !== "revealed") {
    return { text: "—", tone: "pending" };
  }
  return { text: "Not dated", tone: "pending" };
}

/**
 * What the commit slot reads, and the one place a missing log must not become an accusation.
 *
 * The three absences again, told apart by the subgraph's boolean rather than by the state
 * alone: a commitment that will not come now (`Missed`), one that has not come yet (`—`), and
 * one that happened and whose log this dashboard did not find (`Not read`).
 *
 * That last case is the whole reason ADR-0004 asks for a cross-check. A provider that caps
 * `eth_getLogs` returns fewer logs and no error, so the draw arrives committed with no moment —
 * and wording it `Missed` would blame an agent juror that committed on time. `commitCoverage`
 * counts these; this is what one of them looks like in the cell it lands in.
 *
 * Ticket 07 wrote it `Unknown` in pending ink and flagged it as the strongest candidate to
 * convert, which ticket 13 did: this *is* a read that came back short, so it takes the same
 * words and the same rose as the unread row — `Not read`, ADR-0006's second meaning for rose.
 * Nothing is lost by the ink being loud here. The cross-check counts exactly these cells, and
 * the notice above the grid explains them; a reader who spots one has somewhere to go.
 *
 * `scanned` is what keeps that loudness honest, and it is the same distinction `commitCoverage.read`
 * exists for one level up. The chain answers slower than the subgraph and this page deliberately
 * does not wait for it, so between the two answers *every* committed draw has no log yet. Without
 * this argument all 56 of them would come up rose reading "Not read" on every cold load — a
 * failure announced before it has happened, which is precisely the mistake ticket 07 found by
 * review and the reason `null` commits are not `[]`. Unscanned is a step not reached: an em dash,
 * in pending ink, exactly like a commitment that has not been made yet.
 */
export function commitFigureOf(draw: Draw, scanned: boolean): Figure {
  if (draw.commitLatencySeconds !== null) {
    return { text: formatLatencySeconds(draw.commitLatencySeconds), tone: "value" };
  }
  if (draw.committed) {
    return scanned ? { text: "Not read", tone: "unread" } : { text: "—", tone: "pending" };
  }
  if (draw.state.kind === "no-vote") return { text: "Missed", tone: "missed" };
  return { text: "—", tone: "pending" };
}

/**
 * The same three absences, for a commit *median* rather than for one draw's commitment.
 *
 * One implementation because there are now two figures that are a median commit latency over a
 * set of draws — each column's, in the header, and each row's, which ticket 17 moves onto the
 * dispute row at the compact density — and they are absent for exactly the same three reasons.
 * Two copies would be two wordings of one gap, and the column header and the row beneath it
 * would then explain one Arbitrum outage in different words.
 *
 * `commitments` is the subgraph's count of draws that committed, whatever the log scan found, and
 * it is what tells "nothing to measure" from "read short". `scanned` is `commitCoverage.read` and
 * keeps the rose honest: it is false while Arbitrum is being asked as well as after it refused,
 * so without it every figure here would read "Not read" for the length of every cold load.
 */
export function commitMedianFigureOf(
  median: number | undefined,
  commitments: number,
  scanned: boolean,
): Figure {
  if (median !== undefined) return { text: formatLatencySeconds(median), tone: "value" };
  if (scanned && commitments > 0) return { text: "Not read", tone: "unread" };
  return { text: "—", tone: "pending" };
}

/**
 * The one figure a phone's slot has room for: the latency of the most recent thing the draw did.
 *
 * A desktop cell shows both measures, one above the other. A 52pt slot shows one, so ticket 16
 * has to choose which — and the choice is not "the reveal, falling back to the commit". It is
 * the *last* thing that happened, which is the reveal wherever there is one and the commit only
 * while the reveal is still ahead. On a finalised card the reveal always wins, including where
 * it is a word rather than a duration: `Missed` is what a draw that never revealed did, and
 * showing its commit latency instead would report an agent juror that failed to vote as one
 * that acted in 41 seconds.
 *
 * Commit latency is not lost, only off the face: the card opens that dispute's own view, where
 * ticket 09 prints both. ADR-0005 records the same move being made once already, on the agent
 * juror's latency profile, and for the same reason — dispute 151's 8-hour commit window makes
 * the commit the least comparable figure on the page.
 *
 * `scanned` is `commitCoverage.read`, and it matters here for the same reason it matters in the
 * cell: between the subgraph's answer and Arbitrum's, every committed draw has no log yet, and
 * a slot that read "Not read" on every cold load would announce a failure before it happened.
 */
export function slotFigureOf(draw: Draw, scanned: boolean): Figure {
  const awaitingReveal = draw.state.kind === "live" && draw.state.stage !== "revealed";
  return awaitingReveal ? commitFigureOf(draw, scanned) : revealFigureOf(draw);
}
