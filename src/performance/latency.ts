/**
 * How a latency held in seconds is read.
 *
 * Seconds are the stored unit and the only one anything computes in (ADR-0001). This module is
 * the sole place they become words, and it is deliberately separate from the model: no cell,
 * aggregate or detail view may invent its own wording, and none of them may divide a latency by
 * a window to get a percentage — court 34's period durations changed between dispute 151 and
 * dispute 152, so the same fraction means different things either side of that line (ADR-0005).
 */

/** Under two minutes reads in seconds; past that the seconds stop being a number anyone reads. */
const MINUTES_FROM = 120;

/**
 * The rail spans 1s to 1h on a log scale, because the record spans three orders of magnitude:
 * a 7-second reveal and a 54-minute commit both have to be visible on the same bar, and on a
 * linear one the fastest three quarters of the draws would all render as nothing.
 */
const RAIL_MAX_SECONDS = 3600;

/** Enough of the rail to be visible at all. The number beside it is what actually carries the value. */
const RAIL_MINIMUM = 0.02;

/**
 * A latency in words: `"85s"`, `"6m 36s"`.
 *
 * Padded to two digits past the minute mark so a column of them lines up — which only holds if
 * whatever renders it also re-declares `font-feature-settings`, because every `--type-*` token
 * is a `font` shorthand and the shorthand resets it.
 */
export function formatLatencySeconds(seconds: number): string {
  if (seconds < MINUTES_FROM) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** Past an hour the minutes stop being a number anyone reads, and past a day the hours do. */
const HOURS_FROM = 3600;
const DAYS_FROM = 86400;

/**
 * How long something has been going on, in words: `"45s"`, `"3m 12s"`, `"4h 12m"`, `"2d 04h"`.
 *
 * Separate from `formatLatencySeconds` because it measures a different kind of thing. A latency
 * is a measurement of an agent juror, read down a column against its neighbours, and the record
 * spans seven seconds to fifty-four minutes. This is how long a period has been open, read once
 * in a pill, and it has no upper bound at all: every appeal period in this court ran about
 * eighteen hours, and a dispute nobody executes stays open indefinitely. `formatLatencySeconds`
 * would render those as `"1080m 00s"`.
 *
 * It delegates below the hour rather than restating the rule, so the pill and the cells beside
 * it word the same magnitude the same way.
 *
 * Still absolute, and still never a fraction of anything (ADR-0005). That matters more here
 * than in a cell: this figure sits beside a period whose configured window a reader may well
 * know, and dividing the two for them is exactly what the decision forbids.
 */
export function formatElapsedSeconds(seconds: number): string {
  if (seconds < HOURS_FROM) return formatLatencySeconds(seconds);

  if (seconds < DAYS_FROM) {
    const hours = Math.floor(seconds / HOURS_FROM);
    return `${hours}h ${String(Math.floor((seconds % HOURS_FROM) / 60)).padStart(2, "0")}m`;
  }

  const days = Math.floor(seconds / DAYS_FROM);
  return `${days}d ${String(Math.floor((seconds % DAYS_FROM) / HOURS_FROM)).padStart(2, "0")}h`;
}

/**
 * Where a latency sits on the shared rail, as a fraction of its width.
 *
 * Decoration only: every value it carries is printed as a number beside it, so removing the
 * rail loses nothing. Ticket 07 hangs commit latency on the same scale so the two can be
 * compared by eye.
 */
export function railFraction(seconds: number): number {
  const clamped = Math.max(1, seconds);
  const fraction = Math.log10(clamped) / Math.log10(RAIL_MAX_SECONDS);

  return Math.min(1, Math.max(RAIL_MINIMUM, fraction));
}
