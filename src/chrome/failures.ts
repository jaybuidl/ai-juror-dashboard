import type { FailedRead, Source } from "../read-failure";

/**
 * What a view says could not be read, and how loudly.
 *
 * Composed per view exactly as `Provenance` is, and for the same reason: what a banner names has
 * to be what is actually on the screen behind it. The two are deliberately different channels —
 * the footer states what the figures rest on, this states what is missing from them — and
 * ticket 15's test pinning that the footer is not a second alarm is what keeps them apart.
 *
 * The rule this encodes is `Errors.dc.html`'s and ticket 13's: a failure that changes a number is
 * loud and blocking; a failure that changes only a label is quiet and local. There is exactly one
 * documented exception, and it is ENS — nicknames and avatars, on which no measurement depends.
 */

/**
 * Everything wrong with a view, in the two tiers the design draws.
 *
 * `blocking` is the rose banner. `degraded` is the amber panel. A view with neither renders
 * nothing at all, which is the common case and must stay the visually quiet one.
 */
export type Failures = {
  /** Reads that cost a figure. Any one of these makes the page uncitable. */
  blocking: readonly FailedRead[];
  /** Reads that cost only a label. Named in their own quiet panel, never in the banner. */
  degraded: readonly DegradedRead[];
  /**
   * Whether the browser reports no connection.
   *
   * Its own field because it is not an error and never arrives as one. react-query's default
   * `networkMode: "online"` *pauses* a query rather than failing it: status stays `pending`,
   * `fetchStatus` becomes `paused`, and nothing is ever thrown. A page keyed on the error channel
   * alone therefore shows "Reading the court…" forever, which is the one failure mode that looks
   * exactly like a slow success. Ticket 03 found it; this is where it surfaces.
   */
  offline: boolean;
  /**
   * When the last complete read landed, in epoch milliseconds, or `null` if none ever has.
   *
   * The banner prints how long ago it was, which is the figure that decides whether what is on
   * screen is worth quoting: a page that failed to refresh a minute ago and one that has been
   * showing an hour-old court are the same page until this is said out loud.
   */
  lastCompleteRead: number | null;
  /**
   * Read the failing sources again, without a page reload.
   *
   * `null` where nothing can be retried — a view with no reads of its own. Retrying has to clear
   * the banner on success, which it does by being the queries' own refetch: the banner is
   * computed from their state, so there is no separate thing to dismiss.
   */
  retry: (() => void) | null;
};

/**
 * A read that failed without costing a figure.
 *
 * Shaped differently from `FailedRead` on purpose: it carries no status, because the panel does
 * not print one. A status is what a reader needs to judge whether a *figure* can be trusted, and
 * the whole claim of this tier is that no figure is affected — printing "HTTP 502" beside "no
 * measurement depends on this" would invite exactly the doubt the panel exists to forestall.
 */
export type DegradedRead = {
  source: Source;
  /** The panel's headline: what has changed, in the affirmative. */
  heading: string;
  /** What that means, including the sentence saying no figure is partial. */
  what: string;
};

/** Nothing wrong: what a view with no reads of its own passes, and what a healthy one composes. */
export const NO_FAILURES: Failures = {
  blocking: [],
  degraded: [],
  offline: false,
  lastCompleteRead: null,
  retry: null,
};

/**
 * Whether a figure read from `source` is short of what it should be.
 *
 * Per source, and emphatically not per page. A page-wide "is anything wrong?" was the first cut
 * and it was wrong in a way that undermines the whole channel: the four stat tiles and the
 * latency strip are read entirely from the core subgraph, so a template shortfall — a dispute
 * whose template simply does not come back, which `CLAUDE.md` records as normal and not an error
 * — would label all five "Partial" although not one of them reads that endpoint. The Arbitrum
 * case was worse still: the matrix's own notice a few hundred pixels below says "reveal latency
 * and coherence come from the subgraph and are unaffected", so the page contradicted itself.
 *
 * A caveat that is false is worse than no caveat, because a reader who checks one and finds it
 * baseless stops checking. Ask which source feeds the figure, and label only that.
 *
 * Offline counts against every source: nothing is being read at all.
 */
export function affects(failures: Failures, source: Source): boolean {
  return failures.offline || failures.blocking.some((read) => read.source.name === source.name);
}

/**
 * The older of two read moments, or `null` if either has never landed.
 *
 * A page built from two reads was last whole when the *staler* of them landed, and `null` when
 * one of them has never landed at all — it has then never been whole, and the banner says
 * "Never" rather than dating it by the half that worked. Both halves of that rule matter: this
 * figure is what a citing reader uses to decide whether the page in front of them is worth
 * quoting, and every way of getting it wrong makes an incomplete page look fresher than it is.
 */
export function olderOf(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Math.min(a, b);
}

/** Drops the reads that did not fail, so a view can compose its list inline. */
export function present(...reads: readonly (FailedRead | null)[]): readonly FailedRead[] {
  return reads.filter((read): read is FailedRead => read !== null);
}
