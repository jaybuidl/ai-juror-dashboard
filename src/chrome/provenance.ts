/**
 * What a view says its figures rest on.
 *
 * The footer is composed per view rather than being one sentence repeated on all of them,
 * because what it names has to be what is actually on screen: a footer that described the
 * matrix under a page showing only the roster would be a caveat about something the reader
 * cannot see, which is worse than none.
 *
 * It is provenance and not an alarm. A read that failed is announced twice — where the figure
 * would have been, and once in a banner (ticket 13) — and the footer's job is the line between
 * what has been read and what has not.
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
  /** Which values on the view in front of the reader are the measured record. */
  measures: string;
  /** The disputes those values were read from, or `null` when nothing was read. */
  read: DisputeRange | null;
  /** When that read happened, in epoch milliseconds, or `null` if it has not landed. */
  readAt: number | null;
  /**
   * Anything on screen resting on less than a clean read: an ENS lookup that fell back to the
   * roster, a source that failed, a figure that came from somewhere other than a read.
   */
  caveats: readonly string[];
  /** True on a view showing an agent juror, which then has to state how they are identified. */
  identifiesAgentJurors: boolean;
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
  const pad = (value: number) => String(value).padStart(2, "0");

  const date = `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
  return `${date} ${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())} UTC`;
}
