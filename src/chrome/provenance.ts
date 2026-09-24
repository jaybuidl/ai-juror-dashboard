/**
 * Which disputes a view was read from, and when — printed by `ReadStamp` at the top of the view.
 *
 * This was the provenance footer's model, and it carried what was measured, a list of caveats and
 * an identity line as well. The footer was removed on 2026-09-24 by the maintainer's ruling, and
 * everything only it said went with it rather than moving; the read range and time are all that
 * survive. Failures are the banner's and the degraded panel's (`failures.ts`), not this.
 */

/** The disputes a view's figures were read from. */
export type DisputeRange = {
  /** Lowest dispute id read. */
  from: number;
  /** Highest dispute id read. */
  to: number;
  /** How many came back. Not the same as `to - from + 1`, and never a claim about the court. */
  count: number;
};

export type Provenance = {
  /** The disputes the view's figures were read from, or `null` when nothing was read. */
  read: DisputeRange | null;
  /** When that read happened, in epoch milliseconds, or `null` if it has not landed. */
  readAt: number | null;
};

/**
 * The range of a list of dispute ids, or `null` for an empty read.
 *
 * `null` and not `{from: 0, to: 0}`: a zero here would read as dispute 0, and there is no such
 * dispute in this court.
 */
export function rangeOf(ids: readonly number[]): DisputeRange | null {
  if (ids.length === 0) return null;

  let from = ids[0] as number;
  let to = ids[0] as number;
  for (const id of ids) {
    if (id < from) from = id;
    if (id > to) to = id;
  }

  return { from, to, count: ids.length };
}

/**
 * A read's moment, in UTC, to the minute.
 *
 * UTC rather than the reader's zone, and named as such: this page may be quoted somewhere that
 * has no idea which zone the screenshot was taken in, and "05:12" alone is not a fact.
 */
export function formatReadAt(readAt: number): string {
  const at = new Date(readAt);
  return `${formatDateUtc(readAt)} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`;
}

/**
 * A day, in UTC, as `2026-09-23`: the date half of `formatReadAt`, for a period stated by the
 * day. Takes epoch milliseconds, as `formatReadAt` does.
 */
export function formatDateUtc(at: number): string {
  const date = new Date(at);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
