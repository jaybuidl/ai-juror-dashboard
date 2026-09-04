/**
 * How tightly the matrix is drawn, and the one place the crossing point is written down.
 *
 * Ticket 17, against `canvas/MatrixDense.dc.html:45-122` and `canvas/Cell.dc.html:199-218`. Past
 * a row count the matrix compacts: the cell drops its commit line and halves in height, the row
 * drops its second line, the column header keeps three of its six figures and freezes. Nothing
 * else changes — density is a legibility change and not a licence to edit the record, so no
 * dispute leaves the page, no column moves and no caveat is dropped.
 *
 * A module rather than a boolean computed in `Matrix.tsx` for the reason `cell.ts` and
 * `row-flags.ts` are modules: this is the part of the design that has to be *checked* rather
 * than looked at. The cell, the dispute row and the column header all read one flag, so the
 * three can never come to disagree about which density the reader is in — the same failure
 * `breakpoints.ts` exists to prevent one width up.
 *
 * Nothing here is a reader-facing control, deliberately. Both artboards expose density as an
 * editor prop — an authoring control in the canvas tool — and neither draws a toggle in its own
 * chrome; `MatrixDense.dc.html:128` makes the row count the control instead. So the record is
 * what this switches on, and the matrix crosses over on its own as the court and the roster grow.
 */

import {
  COMFORTABLE_COLUMN_PX,
  ORDINARY_DESKTOP_PX,
  PAGE_CHROME_PX,
  ROW_HEADER_PX,
} from "../styles/breakpoints";

export type Density = "comfortable" | "compact";

/**
 * The row count past which the matrix compacts.
 *
 * **A heuristic about screen height, not a fact about this court.** Nothing in the record makes
 * forty special: it is a guess at how many rows a reader can hold on one screen before the
 * column headers scroll away and a two-line cell stops being worth its height. Both sources are
 * soft about it — `MatrixDense.dc.html:50` says "past forty rows" and `Cell.dc.html:201` says
 * "past roughly forty" — so the value is open and only the behaviour either side of it is
 * pinned. A bare `40` in the render path would read as a claim about the court instead.
 *
 * **The court has since crossed it.** This was written when court 34 held 31 disputes, against
 * the court arriving at forty rather than against the court as it stood — no upper bound on the
 * dispute range is written anywhere, and the matrix compacts itself as the range grows into it.
 * It grew: the court held 46 disputes on 2026-09-04, so the compact density is what a reader
 * gets, and every sentence in this repo calling it unreached was true only until then
 * (ticket 24). What is still open is the value, for the reason above; what is no longer open is
 * whether anyone sees the far side of it.
 */
export const COMPACT_FROM_ROWS = 40;

/**
 * The column count past which the matrix compacts, which is the other axis the grid has.
 *
 * **Arithmetic, not a heuristic** — and that is the one way it differs from the row threshold
 * above. How many columns fit is not a guess about a reader: the comfortable grid declares a
 * 440px row header and a 148px column per agent juror, the page takes `PAGE_CHROME_PX` either
 * side of it, and past some count that sum is wider than an ordinary desktop. This is that count,
 * so its value moves on its own if any of the three measurements it is taken over does.
 *
 * What lies past it is not a taste in density, it is a sideways scroll: the grid keeps its
 * `min-width` and its box scrolls, so a reader on a 1440px screen meets a matrix whose far
 * columns are off the edge of a page that is not otherwise scrollable. The compact column is
 * 104px against the comfortable 148, which is what buys them back — 440 plus eight compact
 * columns is 1272 where eight comfortable ones are 1624.
 *
 * It comes out at six for today's measurements, which is exactly where the roster stood for four
 * tickets, and this is the number the matrix was silently built around: `COMPACT_FROM_ROWS` was
 * the only switch, so the seventh agent juror widened the comfortable grid past the desktop it
 * was drawn on without anything on either axis noticing (ticket 25).
 */
export const COMPACT_FROM_COLUMNS = Math.floor(
  (ORDINARY_DESKTOP_PX - PAGE_CHROME_PX - ROW_HEADER_PX) / COMFORTABLE_COLUMN_PX,
);

/**
 * The density a matrix of this shape is drawn at.
 *
 * Both axes, because a grid has two and either one of them can be what stops the comfortable
 * density fitting. Either crossing is sufficient: a court of five disputes and nine agent jurors
 * is as unfittable as one of two hundred disputes and six, and the reduction each crossing asks
 * for is the same one.
 *
 * "Past forty rows", so forty rows is still comfortable and forty-one is not; the columns cross
 * the same way. `rows` is the number of disputes in the model — every dispute that was read,
 * whether or not its draws were — because density is about how tall the grid is and an unread row
 * is exactly as tall as a read one. `columns` is the roster's length, for the same reason at
 * ninety degrees: a column is exactly as wide whether or not anyone was ever drawn in it.
 */
export function densityOf(rows: number, columns: number): Density {
  return rows > COMPACT_FROM_ROWS || columns > COMPACT_FROM_COLUMNS ? "compact" : "comfortable";
}

/**
 * The comfortable cell's height, from `Cell.dc.html:206`.
 *
 * Declared rather than left to the content so that the reduction below is measurable against
 * something. Three lines and their padding come to about this on their own, which is why
 * declaring it changes nothing at the comfortable density — a `height` on a table cell is a
 * minimum, and a cell whose content is taller keeps its own height.
 */
export const CELL_HEIGHT_PX = 76;

/**
 * Half of it, which is the requirement.
 *
 * `Cell.dc.html:207` draws the compact cell at 44px and `MatrixDense.dc.html:85` draws its rows
 * at 40px, so the artboards disagree about the pixel — which is why ticket 17 asks for the
 * *ratio* and leaves the pixel open. Derived from the line above rather than typed as 38, so the
 * halving survives anyone changing what the comfortable cell stands at.
 */
export const COMPACT_CELL_HEIGHT_PX = CELL_HEIGHT_PX / 2;
