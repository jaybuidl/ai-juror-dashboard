/**
 * How a moment reads on the dispute's timeline (ADR-0012): a clock reading in UTC.
 *
 * UTC and never the reader's own zone. The page is public and may be cited, and a timeline that
 * printed 14:02 for one reader and 16:02 for another would be two different records of one
 * dispute — the same reason the seam reads no clock (`performance.ts`). The strip says "UTC"
 * once, beside the dispute's creation.
 *
 * Seconds in, words out, and nothing subtracted: this module formats a moment and never the
 * distance between two of them, which is a latency and `latency.ts`'s to word.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateOf(seconds: number): Date {
  return new Date(seconds * 1000);
}

/** `"14:02:11"`. To the second, because Intendant opens a period and acts in it in one block. */
export function clockOf(seconds: number): string {
  return dateOf(seconds).toISOString().slice(11, 19);
}

/** `"20 Aug"`. The year is left out: a dispute runs for a day or two. */
export function dayOf(seconds: number): string {
  const date = dateOf(seconds);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** `"2026-08-20T14:02:11Z"`, for a `<time>` element's `dateTime`. */
export function isoOf(seconds: number): string {
  return `${dateOf(seconds).toISOString().slice(0, 19)}Z`;
}

/** Whether two moments fall on the same UTC day. */
export function sameDay(a: number, b: number): boolean {
  return isoOf(a).slice(0, 10) === isoOf(b).slice(0, 10);
}
