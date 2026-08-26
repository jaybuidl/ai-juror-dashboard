import { useEffect, useRef, useState } from "react";
import { LIVE_REFETCH_MS } from "../disputes/liveness";
import { VisuallyHidden } from "../styles/hidden";
import type { CourtPerformance } from "./performance";
import { type CourtSnapshot, snapshotOf, transitionsBetween } from "./transitions";

/**
 * How far apart two reads may be and still count as one poll following another.
 *
 * Four intervals: enough that a slow or retried poll is still heard, short enough that a
 * restored cache or a backgrounded tab is not.
 */
const STALE_AFTER_MS = LIVE_REFETCH_MS * 4;

/**
 * The court's movement, said out loud, once per thing that moved.
 *
 * Ticket 12 re-reads the disputes and the draws every five seconds for as long as anything in
 * the court is unruled, and redraws whatever changed. On screen that is a cell picking up a
 * glyph and a row losing its rail — small, and visible. To a reader using a screen reader it was
 * nothing: figures changed under them with no signal that a change had happened, which is the
 * one thing a polling page must not do.
 *
 * What it must also not do is announce the grid. `role="status"` carries `aria-atomic`, so a
 * live region wrapped around the matrix would read a hundred and sixty-eight cells every five
 * seconds and be switched off inside a minute. This region therefore never contains the matrix,
 * or a figure, or a count of anything standing — only sentences naming what became true since
 * the last read, and it is empty the rest of the time, which is almost always.
 *
 * The judgement about which movements are worth hearing is not here. It is in `transitions.ts`,
 * below the seam with every other derivation, where it can be read and tested as prose rules
 * rather than inferred from a component. This part is only the speaking.
 *
 * Mounted on the matrix, which is the view whose figures the poll actually moves. The dispute
 * and agent juror views hold live data too and say nothing here yet; that is a scope line rather
 * than an oversight, and it is recorded in `docs/accessibility.md`.
 */
export function CourtAnnouncer({
  performance,
  readAt,
}: {
  performance: CourtPerformance | null;
  /** When the draws on screen were read, from `CourtPerformanceView`. */
  readAt: number | null;
}) {
  const previous = useRef<{ snapshot: CourtSnapshot; readAt: number | null } | null>(null);
  const [said, setSaid] = useState<{ lines: readonly string[]; serial: number }>({
    lines: [],
    serial: 0,
  });

  useEffect(() => {
    if (performance === null) return;

    const next = snapshotOf(performance);
    const before = previous.current;
    previous.current = { snapshot: next, readAt };

    if (before === null) return;

    /*
     * Only between two reads close enough together to be one poll following another.
     *
     * Ticket 12 persists the dispute and draw payloads to `localStorage`, so a return visit
     * renders from cache before either endpoint answers — which means the first diff on such a
     * visit is *restored* against *fresh*, and everything that happened while the reader was
     * away gets announced as though it had just happened. "Dispute 170 has been ruled," on
     * arrival, about a ruling from yesterday.
     *
     * The gap between the two reads is what tells them apart, and it is data rather than a
     * clock: a poll is `LIVE_REFETCH_MS` apart and a restore is however long the reader was
     * gone. The allowance is generous because a slow poll is still a poll; anything beyond it
     * is history, and history is not news. A backgrounded tab is not polled at all, so coming
     * back to one after ten minutes is correctly silent rather than a burst about ten minutes
     * nobody watched.
     */
    const gap = readAt !== null && before.readAt !== null ? readAt - before.readAt : null;
    if (gap === null || gap > STALE_AFTER_MS) return;

    const lines = transitionsBetween(before.snapshot, next);
    if (lines.length === 0) return;

    /*
     * The serial is not decoration. A live region is announced when its text *changes*, and two
     * consecutive polls can produce the same sentence — "5 draws advanced across 1 dispute."
     * twice running is entirely ordinary while a panel is committing. Writing the same string
     * back leaves the DOM text identical and the second one is never spoken. The zero-width
     * space appended below changes the node without changing what is read aloud.
     */
    setSaid((was) => ({ lines, serial: was.serial + 1 }));
  }, [performance, readAt]);

  /*
   * Rendered from the first paint, empty, and not conditionally mounted when there is news.
   * A live region has to be in the accessibility tree *before* its content changes for the
   * change to be announced; one that arrives already full is frequently read as nothing at all,
   * which is the quiet failure mode this whole component exists to avoid.
   */
  return (
    <VisuallyHidden role="status">
      {said.lines.join(" ")}
      {"\u200b".repeat(said.serial % 2)}
    </VisuallyHidden>
  );
}
