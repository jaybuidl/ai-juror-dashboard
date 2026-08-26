import type { Tone } from "../styles/tones";
import type { MatrixRow } from "./performance";

/**
 * What the panel slot says, in the one place both layouts read it from — and it now says
 * something only where the panel is *absent*.
 *
 * The matrix row and the phone's card each carry this pill, and until ticket 17 each wrote its
 * own words for it — the same two-branch expression, twice, one of which was wrong. Lifted here
 * for the reason `row-flags.ts` and `cell.ts` were lifted by ticket 16: two renderings of one
 * record must not word one fact two ways, and this fact is about the court rather than about a
 * grid or a card.
 *
 * **The size itself is gone from both layouts, because both of them draw it already.** A row is
 * six cells and a card is six slots, each either a draw or a blank, so `Panel 4` was a count of
 * something the reader is looking at — and on dispute 155 it was said twice over, as `Panel 1`
 * beside the `‡ Lone panel` flag that means the same thing more explicitly. Checked against the
 * live court before it went: all 31 rows had a panel size equal to their own drawn-cell count.
 *
 * That equality is a property of *this* court rather than of the model, which is why the figure
 * survives where it cannot be counted. `MatrixRow.panelSize` is everyone the court drew, and a
 * juror outside the roster gets no column and still counts — so if court 34 ever seats one, a
 * row's cells will undercount its panel. The agent juror view keeps the number in full for the
 * same reason: that page has no six cells to count, and the figure there is the denominator a
 * coherence mark is read against.
 *
 * **What is left is the two absences, and neither is a count.** A dispute arrives in its
 * evidence period with nobody drawn yet — 167, 168 and 169 were sitting that way on the day this
 * was written — and both layouts printed `Panel 0` over it. A zero there is a claim that the
 * court drew a panel of nobody, which is not what happened: the draw has not happened. Ticket 09
 * met the same state on the per-dispute view and omitted the pill entirely, wording it in prose
 * instead; a row has no prose, so it says it in the pill. Beside it sits ticket 13's case, a row
 * whose draws were never read at all. Both are things the blank cells cannot say about
 * themselves, which is exactly why they outlive the number that they could.
 *
 * Quiet, and neither rose nor Unknown, per ticket 13's instruction: a court that has not drawn
 * yet is not a read that failed, and ADR-0006 gives rose exactly two meanings, neither of which
 * is this. A panel that has not been selected is an ordinary stage of an ordinary dispute.
 */
export type PanelPill = {
  text: string;
  /** The state colour, where there is one. Undefined is the quiet default the pill wears. */
  tone?: Tone;
};

export function panelPillOf(row: MatrixRow): PanelPill | null {
  // First, because an unread row's panel size is 0 as well — nobody asked, rather than the court
  // drawing nobody — and the two absences must not collapse into one sentence.
  if (!row.read) return { text: "Draws not read", tone: "fail" };

  // The panel has not been selected yet. The court draws when a dispute leaves its evidence
  // period, so this is a stage rather than a shortfall, and the blank cells beside it mean the
  // draw has not happened rather than that these agent jurors were not selected.
  if (row.panelSize === 0) return { text: "No panel yet" };

  // A panel the reader can see. Nothing: the cells are the count, and a panel of one already
  // carries the ‡ flag, which says what being a majority of one means rather than merely how
  // many there were. Both callers drop an absent slot's separator with it.
  return null;
}
