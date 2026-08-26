/**
 * Where a latency sits on the strip's axis.
 *
 * Separate from `latency.ts`'s `railFraction` because the two scales measure different things
 * and must not be merged into one: the rail inside a cell spans 1s to 1h, which is the range a
 * single draw's figures live in, while the strip has to hold the whole distribution *and* the
 * band standing for an ordinary Kleros court, which runs its periods over hours and days. A
 * shared scale would either crush the seven-second reveals against the left edge or leave the
 * comparison band off the end.
 *
 * The axis is logarithmic for the same reason it is on the rail: the record spans three orders
 * of magnitude, and on a linear axis three quarters of these draws would be one blob at zero.
 *
 * Nothing here converts a latency into a fraction of a *window* — ADR-0005. The axis is
 * absolute time, and the band is drawn against absolute time too.
 */

const SECOND = 1;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** The axis: 1s to a full day, so the comparison band has somewhere to be. */
export const STRIP_MAX_SECONDS = DAY;

/**
 * Where an ordinary Kleros court's periods begin: an hour.
 *
 * Illustrative. It measures no court — no reading of any court produced this number — and it
 * exists because "85 seconds" means nothing to a reader with no sense of what arbitration
 * normally takes.
 *
 * Said on the page in exactly one place: the provenance footer's caveat, which names the band
 * as the only thing above it that did not come from a read. The strip used to carry a caption
 * saying it a second time and no longer does. Tickets 22 and 23 are open against this number
 * itself — an hour understates an ordinary Kleros court by about two orders of magnitude — so
 * whoever takes those is changing what the band means, not only where it is disclosed.
 */
export const ORDINARY_COURT_FROM_SECONDS = HOUR;

/** The labelled ticks, at the decade-ish marks a reader actually thinks in. */
export const STRIP_TICKS: readonly { seconds: number; label: string }[] = [
  { seconds: SECOND, label: "1s" },
  { seconds: 10 * SECOND, label: "10s" },
  { seconds: MINUTE, label: "1m" },
  { seconds: 10 * MINUTE, label: "10m" },
  { seconds: HOUR, label: "1h" },
  { seconds: 6 * HOUR, label: "6h" },
  { seconds: DAY, label: "1d" },
];

/**
 * A latency's position along the axis, as a fraction from 0 to 1.
 *
 * Anything under a second sits at the origin rather than off the axis: `log10(0)` is `-Infinity`
 * and a zero-second reveal is a real reading, not an error. Anything past a day is clamped to
 * the far end, where the reader can still see there is a mark.
 */
export function stripFraction(seconds: number): number {
  const clamped = Math.min(STRIP_MAX_SECONDS, Math.max(1, seconds));
  return Math.log10(clamped) / Math.log10(STRIP_MAX_SECONDS);
}

/**
 * The distribution as marks, with collisions stacked rather than overprinted.
 *
 * Two draws that took the same number of seconds land on the same x, and drawn flat one hides
 * the other — so the count of marks would stop matching the count of draws the heading claims.
 * Stacking is what the canvas does (`Main.dc.html:333-337`) and it keeps every draw visible.
 */
export function stripMarks(seconds: readonly number[]): readonly {
  seconds: number;
  x: number;
  stack: number;
}[] {
  const seen = new Map<number, number>();

  return seconds.map((value) => {
    const stack = seen.get(value) ?? 0;
    seen.set(value, stack + 1);
    return { seconds: value, x: stripFraction(value), stack };
  });
}
