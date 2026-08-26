import type { Tone } from "../styles/tones";
import type { MatrixRow } from "./performance";

/**
 * What the panel slot says, in the one place both layouts read it from.
 *
 * The matrix row and the phone's card each carry this pill, and until ticket 17 each wrote its
 * own words for it — the same two-branch expression, twice, one of which was wrong. Lifted here
 * for the reason `row-flags.ts` and `cell.ts` were lifted by ticket 16: two renderings of one
 * record must not word one fact two ways, and this fact is about the court rather than about a
 * grid or a card.
 *
 * **Three states, and the third is the one this ticket exists to fix.** A dispute arrives in its
 * evidence period with nobody drawn yet — 167, 168 and 169 were sitting that way on the day this
 * was written — and both layouts printed `Panel 0` over it. A zero there is a claim that the
 * court drew a panel of nobody, which is not what happened: the draw has not happened. Ticket 09
 * met the same state on the per-dispute view and omitted the pill entirely, wording it in prose
 * instead; a row has no prose, so it says it in the pill.
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

export function panelPillOf(row: MatrixRow): PanelPill {
  // First, because an unread row's panel size is 0 as well — nobody asked, rather than the court
  // drawing nobody — and the two absences must not collapse into one sentence.
  if (!row.read) return { text: "Draws not read", tone: "fail" };

  // The panel has not been selected yet. The court draws when a dispute leaves its evidence
  // period, so this is a stage rather than a shortfall, and the blank cells beside it mean the
  // draw has not happened rather than that these agent jurors were not selected.
  if (row.panelSize === 0) return { text: "No panel yet" };

  // Amber on a panel of one, where being the majority took no agreement — the same amber the ‡
  // carries wherever that dispute's coherence is counted.
  return { text: `Panel ${row.panelSize}`, tone: row.panelSize === 1 ? "work" : undefined };
}
