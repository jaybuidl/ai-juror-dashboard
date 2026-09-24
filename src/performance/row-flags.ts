import { isFinalised, periodOpenSeconds } from "../disputes/liveness";
import type { Tone } from "../styles/tones";
import { formatElapsedSeconds } from "./latency";
import type { MatrixRow } from "./performance";

/**
 * The one flag a dispute wears, whichever way the record is laid out.
 *
 * Lifted out of `Matrix.tsx` by ticket 16, which gave the same disputes a second rendering: a
 * phone shows one card per dispute rather than one row, and a card carries a flag pill in one
 * slot with the same precedence a row uses. Restating that order in the card would be two
 * rankings of one thing, free to disagree the day a fifth flag arrives — and the two layouts
 * would then mark the same dispute differently on two devices.
 *
 * Nothing here is a component. It is a table of predicates over `MatrixRow`, which is why it
 * can be checked rather than looked at, and why the ordering below is testable at all.
 */

/**
 * What a flag may consult beyond the row itself.
 *
 * One object rather than a positional argument, so a flag that needs something new adds a field
 * here instead of re-breaking every entry. The clock is all that is left in it since the window
 * flag, which read the court's current windows, was removed on 2026-09-24 (maintainer's ruling).
 *
 * The clock arrives here and never in the seam: `MatrixRow` is built by a pure function that
 * reads none, and `now` is threaded from the view for exactly that reason.
 */
export type RowFlagContext = {
  /** Render time, in epoch milliseconds. */
  now: number;
};

export type RowFlag = {
  key: string;
  applies: (row: MatrixRow, context: RowFlagContext) => boolean;
  glyph: string;
  /**
   * Read at render rather than held as a string: the live flag counts elapsed time. A static flag
   * ignores both arguments.
   */
  label: (row: MatrixRow, context: RowFlagContext) => string;
  /**
   * The same flag, abbreviated, for ticket 17's compact density.
   *
   * The canvas is what settles this, and it is the one place the two artboards deliberately word
   * one thing twice: `Main.dc.html:302` gives "⋯ Live · commit 3m 12s" and
   * `MatrixDense.dc.html:213` gives "⋯ Live" for the same row. Ticket 17's own criteria say the flag renders as it does at the other
   * density; where the canvas and a ticket disagree the canvas wins (`CLAUDE.md`), and here it
   * has to — a one-line row is 375px wide on this page and the live flag alone was 175 of them,
   * which left the dispute's title with nothing and made the row unreadable rather than compact.
   *
   * **Every flag still says what it is.** What goes is the qualifier a reader can get from the
   * row itself — how long the period has been open — which is still on that dispute's own view.
   */
  shortLabel: (row: MatrixRow, context: RowFlagContext) => string;
  tone: Tone;
};

/**
 * A dispute carries at most one flag, in this order.
 *
 * The precedence is the point of the list: an unread row outranks a live one. The window,
 * off-roster and lone-panel flags that sat between them were removed on 2026-09-24 (maintainer's
 * ruling). Each flag is one entry here, not a second hard-coded pill in the markup.
 */
export const ROW_FLAGS: readonly RowFlag[] = [
  // First, and above every flag any later ticket adds: a dispute whose draws were never read has
  // nothing true to flag.
  {
    key: "not-read",
    applies: (row) => !row.read,
    glyph: "?",
    label: () => "Not read",
    // Already two words, and neither is a qualifier: an unread row abbreviates to itself.
    shortLabel: () => "Not read",
    tone: "fail",
  },
  {
    key: "live",
    applies: (row) => !isFinalised(row.dispute),
    glyph: "⋯",
    // The period that is open and how long it has been open, per the artboard's
    // `⋯ Live · commit 3m 12s`. Two things rather than one: a pill saying only "Live" reads
    // the same at ten seconds and at ten hours, and this is the row a team member is watching.
    //
    // The elapsed half is dropped rather than faked when the moment cannot be trusted — the
    // dispute is still live and still says so, it simply cannot be dated. Never a fraction of
    // the period's window, at any magnitude: ADR-0005, and this is where a reader who knows
    // the window would be one division away from forming one.
    label: (row, { now }) => {
      const open = periodOpenSeconds(row.dispute, now);
      const elapsed = open === null ? "" : ` ${formatElapsedSeconds(open)}`;
      return `Live · ${row.dispute.period}${elapsed}`;
    },
    // "Live", and neither the period nor the elapsed time — 175px of a 375px row went here, and
    // the row it sat on could not show which dispute it was. The live *treatment* is untouched:
    // the tint and the rail still mark the row, and this pill still says it is live.
    shortLabel: () => "Live",
    tone: "live",
  },
];

/** The flag a dispute wears, or `undefined` where it wears none. The one door into `ROW_FLAGS`. */
export function rowFlagOf(row: MatrixRow, context: RowFlagContext): RowFlag | undefined {
  return ROW_FLAGS.find((candidate) => candidate.applies(row, context));
}
