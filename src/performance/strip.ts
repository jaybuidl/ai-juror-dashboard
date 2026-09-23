/**
 * Where a latency sits on the strip's axis.
 *
 * Separate from `latency.ts`'s `railFraction` because the two scales measure different things
 * and must not be merged into one: the rail inside a cell spans 1s to 1h, which is the range a
 * single draw's figures live in, while the strip has to hold the whole distribution *and* the
 * band standing for an ordinary Kleros court, which takes days. A shared scale would either
 * crush the seven-second reveals against the left edge or leave the comparison band off the end.
 * The band itself is read from another court (`reference.ts`); this module only places it.
 *
 * The axis is logarithmic for the same reason it is on the rail: the record spans three orders
 * of magnitude, and on a linear axis three quarters of these draws would be one blob at zero.
 *
 * Nothing here converts a latency into a fraction of a *window* — ADR-0005. The axis is
 * absolute time, and the band is drawn against absolute time too.
 *
 * **One scale, two plots.** `LatencyStrip` draws the court's distribution and
 * `AgentJurorLatency` draws one agent juror's against it, and both read the axis from here so
 * that the court's own marks land in the same places on both pages. Everything a plot needs to
 * say about the axis in words is here too, for the reason ticket 22 found: the agent juror view
 * printed its range as a copied string and would have gone on printing "1s to 1d" over an axis
 * that runs to a month.
 */

const SECOND = 1;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The axis: 1s to thirty days.
 *
 * A judgement, and the only free choice ticket 22 had. Where the axis ends trades the
 * comparison band's width against the distribution's. Thirty days leaves court 34's own record
 * about three quarters of the width it had at a one-day maximum, and holds a band beginning
 * anywhere from a day to about a fortnight as a region rather than as the right-hand edge.
 * Since ticket 23 the band begins at a *reading*, court 29's median time to ruling (about four
 * days, 86% of the way across), so the axis has to hold wherever that lands. `strip.test.ts`
 * pins both ends of the trade against the captured reading rather than against a constant.
 */
const AXIS_MAX_TICK = { seconds: 30 * DAY, label: "30d" } as const;

/** The far end of the axis, in seconds. */
export const STRIP_MAX_SECONDS: number = AXIS_MAX_TICK.seconds;

/**
 * The labelled ticks, at the decade-ish marks a reader actually thinks in.
 *
 * Past a day they are the marks the *comparison* is made in rather than decades: a day, a week
 * and the month the axis ends at. Until ticket 23 the middle one was the five days an ordinary
 * court was *said* to take. That tick went with the constant: the band now carries its own
 * measured value in its label, and a tick at five days under a band beginning at four would
 * look like a second claim about where it begins. The gaps are pinned in the test,
 * because two labels closer together than a twentieth of the axis overprint at the width the
 * agent juror plot is drawn at on a phone — and jsdom lays nothing out, so the arithmetic is all
 * an offline test can hold.
 */
export const STRIP_TICKS: readonly { seconds: number; label: string }[] = [
  { seconds: SECOND, label: "1s" },
  { seconds: 10 * SECOND, label: "10s" },
  { seconds: MINUTE, label: "1m" },
  { seconds: 10 * MINUTE, label: "10m" },
  { seconds: HOUR, label: "1h" },
  { seconds: 6 * HOUR, label: "6h" },
  { seconds: DAY, label: "1d" },
  { seconds: 7 * DAY, label: "7d" },
  AXIS_MAX_TICK,
];

/**
 * The axis's range in words, for a plot that states it beside the picture.
 *
 * Built from the axis's own ends rather than transcribed from them. The agent juror view carried
 * "Log scale · 1s to 1d" as a literal and would have gone on carrying it over an axis running to
 * a month — a sentence contradicting the plot directly beneath it, which is the failure ticket
 * 22 names in its own criteria.
 */
export const STRIP_RANGE_LABEL = `${STRIP_TICKS[0]?.label} to ${AXIS_MAX_TICK.label}`;

/**
 * A latency's position along the axis, as a fraction from 0 to 1.
 *
 * Anything under a second sits at the origin rather than off the axis: `log10(0)` is `-Infinity`
 * and a zero-second reveal is a real reading, not an error. Anything past the maximum is clamped
 * to the far end, where the reader can still see there is a mark.
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
