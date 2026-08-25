import { isFinalised, periodOpenSeconds } from "../disputes/liveness";
import type { Tone } from "../styles/tones";
import { formatElapsedSeconds, formatWindowSeconds } from "./latency";
import type { MatrixRow } from "./performance";
import type { PeriodWindows } from "./windows";

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
 * One object rather than a positional argument per flag, because tickets 08 and 12 each made
 * `label` a function and each needed a *different* second argument — the court's current
 * windows, to say which of them changed, and the clock, to count how long a period has been
 * open. Both were right and neither could hold the slot. A fourth flag adds a field here
 * instead of re-breaking every entry.
 *
 * The clock arrives here and never in the seam: `MatrixRow` is built by a pure function that
 * reads none, and `now` is threaded from the view for exactly that reason.
 */
export type RowFlagContext = {
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
  /** Render time, in epoch milliseconds. */
  now: number;
};

export type RowFlag = {
  key: string;
  applies: (row: MatrixRow, context: RowFlagContext) => boolean;
  glyph: string;
  /**
   * Read at render rather than held as a string: the window flag names a duration read from
   * the chain and the live flag counts elapsed time. A static flag ignores both arguments.
   */
  label: (row: MatrixRow, context: RowFlagContext) => string;
  tone: Tone;
};

/**
 * A dispute carries at most one flag, in this order.
 *
 * The precedence is the point of the list. The changed-window flag sits above the lone panel
 * because the window is what makes a dispute's figures incomparable with the ones around it,
 * where a lone panel only makes one of them uninformative; ticket 12 adds the live flag below
 * them. Each is one entry here, not a second hard-coded pill in the markup.
 *
 * No dispute is both today — 151 is the marked one and 155 the lone panel — and one that was
 * would still be marked as a lone panel, because `Panel 1` carries its own amber tone
 * independently of this slot. The flag is the second mark on such a row, not the only one.
 *
 * `label` and `applies` take the court's current windows as well as the row, because the window
 * flag names *which* window changed: `† 8h window` on dispute 151, read from what the court was
 * configured with rather than typed in.
 */
export const ROW_FLAGS: readonly RowFlag[] = [
  // First, and above every flag any later ticket adds: a dispute whose draws were never read has
  // nothing true to flag. Its panel size is 0 rather than 1, so the lone-panel flag below would
  // not fire on it today — but ticket 08's window flag reads the dispute, which *was* read, and
  // would happily label a row the matrix is about to draw as entirely unknown. That is not a
  // hypothetical any more: the two tickets are on the same branch, and this entry is what keeps
  // an unread row from being labelled "8h window" over six cells reading "not read".
  {
    key: "not-read",
    applies: (row) => !row.read,
    glyph: "?",
    label: () => "Not read",
    tone: "fail",
  },
  {
    key: "window",
    applies: (row) => row.underEarlierWindows,
    glyph: "†",
    label: (row, { current }) => windowFlagLabel(row, current),
    tone: "work",
  },
  {
    key: "lone-panel",
    applies: (row) => row.panelSize === 1,
    glyph: "‡",
    label: () => "Lone panel",
    tone: "work",
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
    tone: "live",
  },
];

/** The flag a dispute wears, or `undefined` where it wears none. The one door into `ROW_FLAGS`. */
export function rowFlagOf(row: MatrixRow, context: RowFlagContext): RowFlag | undefined {
  return ROW_FLAGS.find((candidate) => candidate.applies(row, context));
}

/**
 * The window flag's label: the one that actually differs.
 *
 * Naming the commit window unconditionally would be right for court 34's one reconfiguration
 * and wrong for the next one. A court that changed only its vote window would put `† 45m
 * window` on every older row — a duration identical to the one the court holds now, so the
 * marker would read as if it had been placed in error.
 *
 * `windows` is non-null wherever `underEarlierWindows` is true, the seam setting one from the
 * other; the fallback is here rather than a non-null assertion.
 */
function windowFlagLabel(row: MatrixRow, current: PeriodWindows | null): string {
  if (row.windows === null) return "Earlier window";

  const commitChanged = current === null || row.windows.commitSeconds !== current.commitSeconds;
  return commitChanged
    ? `${formatWindowSeconds(row.windows.commitSeconds)} window`
    : `${formatWindowSeconds(row.windows.voteSeconds)} vote window`;
}
