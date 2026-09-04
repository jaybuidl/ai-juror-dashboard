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
  /**
   * The same flag, abbreviated, for ticket 17's compact density.
   *
   * The canvas is what settles this, and it is the one place the two artboards deliberately word
   * one thing twice: `Main.dc.html:302` gives "† 8h window", "‡ Lone panel" and
   * "⋯ Live · commit 3m 12s", and `MatrixDense.dc.html:213` gives "† 8h", "‡ Lone" and "⋯ Live"
   * for the same rows. Ticket 17's own criteria say the flag renders as it does at the other
   * density; where the canvas and a ticket disagree the canvas wins (`CLAUDE.md`), and here it
   * has to — a one-line row is 375px wide on this page and the live flag alone was 175 of them,
   * which left the dispute's title with nothing and made the row unreadable rather than compact.
   *
   * **Every flag still says what it is.** What goes is the qualifier a reader can get from the
   * row itself: which window, and how long the period has been open. Both are still on that
   * dispute's own view, and the window footnote below the grid names the durations in full.
   */
  shortLabel: (row: MatrixRow, context: RowFlagContext) => string;
  tone: Tone;
};

/**
 * A dispute carries at most one flag, in this order.
 *
 * The precedence is the point of the list. The changed-window flag sits above the lone panel
 * because the window is what makes a dispute's figures incomparable with the ones around it,
 * where a lone panel only makes one of them uninformative; ticket 12 adds the live flag below
 * them, and ticket 25 the off-roster flag between. Each is one entry here, not a second
 * hard-coded pill in the markup.
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
    // Already two words, and neither is a qualifier: an unread row abbreviates to itself.
    shortLabel: () => "Not read",
    tone: "fail",
  },
  {
    key: "window",
    applies: (row) => row.underEarlierWindows,
    glyph: "†",
    label: (row, { current }) => windowFlagLabel(row, current),
    // The duration without the word for which period it governs — "8h" against "8h window".
    // Which window changed is the footnote's, and the footnote is on the page at both densities.
    //
    // Built from the same value the long label is rather than cut out of the finished string:
    // `formatWindowSeconds` returns two words whenever the minutes do not divide by 60, so
    // trimming at the first space would abbreviate a court's "1h 30m window" to "1h" — a
    // duration it never had, on the marker whose whole job is to name the one that differs.
    shortLabel: (row, { current }) => markedWindow(row, current)?.duration ?? "Earlier",
    tone: "work",
  },
  // Third, and the ranking is the whole of the decision: `rowFlagOf` returns exactly one flag.
  //
  // Below the window, because a mis-dated latency is worse than an unattributed panel member — the
  // one makes every figure on the row incomparable with the rows around it, the other says a
  // figure is short. Above the lone panel and above live, because both of those describe the
  // *court's* shape, where this one says something is missing from what the grid shows. A lone
  // panel drawn entirely off the roster is both, and the reader needs to know the row is empty
  // for a reason before being told the panel was one.
  {
    key: "off-roster",
    applies: (row) => row.offRosterDraws > 0,
    // The traditional third footnote mark, after the dagger and the double dagger this grid
    // already wears — so the order a reader meets them in is the order the marks come in.
    glyph: "§",
    label: (row) => `${offRosterCount(row)} ${row.offRosterDraws === 1 ? "draw" : "draws"}`,
    // The noun is the qualifier, and it is the only thing that goes: what the compact row keeps is
    // the count and the word that makes it mean something. Both forms are composed from the same
    // reduction rather than one being cut out of the other, for the reason `markedWindow` is —
    // an abbreviation built by trimming a finished string is free to say something the long form
    // does not.
    shortLabel: (row) => offRosterCount(row),
    tone: "work",
  },
  {
    key: "lone-panel",
    applies: (row) => row.panelSize === 1,
    glyph: "‡",
    label: () => "Lone panel",
    shortLabel: () => "Lone",
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

/**
 * The count both off-roster labels are built from — a number and never a name.
 *
 * `CLAUDE.md`'s no-personal-data invariant is why this is a reduction and not a list: an address
 * outside the roster belongs to whoever the court drew, and this dashboard has no business saying
 * who. The count is the whole of the claim, and it is enough for the one thing the flag is for —
 * a row whose figures are short, and a reader who can go and find out why.
 */
function offRosterCount(row: MatrixRow): string {
  return `${row.offRosterDraws} off-roster`;
}

/**
 * Which of this row's two windows the marker is actually about, and how long it was.
 *
 * Naming the commit window unconditionally would be right for the one reconfiguration of court
 * 34 that this marker is about — 2026-08-20, which moved both measured windows — and wrong for
 * a reconfiguration that moved one of them. A court that changed only its vote window would put
 * `† 45m window` on every older row: a duration identical to the one the court holds now, so
 * the marker would read as if it had been placed in error. The court's *other* reconfiguration
 * shows how narrow that escape is — 2026-08-26 moved the evidence period alone and this marker
 * never hears about it.
 *
 * `null` where the parameter history cannot place the row at all. `windows` is non-null wherever
 * `underEarlierWindows` is true, the seam setting one from the other; the fallback is here rather
 * than a non-null assertion.
 *
 * One reduction, two labels: both forms below are composed from this rather than one being cut
 * out of the other, so the abbreviation can never name a duration the long form does not.
 */
function markedWindow(
  row: MatrixRow,
  current: PeriodWindows | null,
): { duration: string; period: "commit" | "vote" } | null {
  if (row.windows === null) return null;

  const commitChanged = current === null || row.windows.commitSeconds !== current.commitSeconds;
  return commitChanged
    ? { duration: formatWindowSeconds(row.windows.commitSeconds), period: "commit" }
    : { duration: formatWindowSeconds(row.windows.voteSeconds), period: "vote" };
}

/** The window flag's label: the one that actually differs, and which period it governs. */
function windowFlagLabel(row: MatrixRow, current: PeriodWindows | null): string {
  const marked = markedWindow(row, current);
  if (marked === null) return "Earlier window";

  return marked.period === "commit"
    ? `${marked.duration} window`
    : `${marked.duration} vote window`;
}
