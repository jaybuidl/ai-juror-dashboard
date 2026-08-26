import { useEffect, useRef, useState } from "react";
import { VisuallyHidden } from "../styles/hidden";
import type { CourtPerformance } from "./performance";
import { type CourtSnapshot, snapshotOf, transitionsBetween } from "./transitions";

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
export function CourtAnnouncer({ performance }: { performance: CourtPerformance | null }) {
  const previous = useRef<CourtSnapshot | null>(null);
  const [said, setSaid] = useState<readonly string[]>([]);

  useEffect(() => {
    if (performance === null) return;

    const next = snapshotOf(performance);
    const lines = transitionsBetween(previous.current, next);
    previous.current = next;

    // Only ever replaced, never appended to, and only when there is something to say. Leaving
    // the last announcement standing costs nothing — the region is not read again until its
    // content changes — and clearing it would be a second pointless mutation of a live region.
    if (lines.length > 0) setSaid(lines);
  }, [performance]);

  /*
   * Rendered from the first paint, empty, and not conditionally mounted when there is news.
   * A live region has to be in the accessibility tree *before* its content changes for the
   * change to be announced; one that arrives already full is frequently read as nothing at all,
   * which is the quiet failure mode this whole component exists to avoid.
   */
  return <VisuallyHidden role="status">{said.join(" ")}</VisuallyHidden>;
}
