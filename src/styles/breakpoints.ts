import { useSyncExternalStore } from "react";
import { ROSTER } from "../roster/agent-jurors";

/**
 * The one place a width at which the layout changes is written down.
 *
 * The chrome reduces below `narrow`: the lockup loses its diamond, the nav folds behind a menu,
 * and the stat tiles drop from four to three. Below the same width the matrix is replaced
 * outright by one card per dispute (ticket 16). Declaring it here rather than at each `@media`
 * is what ticket 15 means by "declares the breakpoint it reduces at in one place" — a second
 * literal somewhere else is a second breakpoint the day one of them moves.
 *
 * Ticket 16 kept the number and reconciled what was left beside it: the `600px` in
 * `MatrixPage.tsx` and the `760px` in `DisputePage.tsx` both became this. The phone artboard is
 * 390pt, well inside it, and the matrix was already scrolling sideways in its own box at 720 —
 * so the card list takes over exactly where the desktop grid stopped fitting.
 */
/**
 * The grid's own arithmetic, and why a styles module knows about the roster.
 *
 * How wide the matrix has to be is a question about how many agent jurors there are, so this
 * imports `ROSTER` rather than restating its length. It was a literal six for four tickets and
 * the day the court drew a seventh it became three wrong numbers at once — a `min-width` short
 * of what the columns declare, a breakpoint below where the grid stops fitting, and column
 * shares summing to 110%. None of the three throws (ticket 24).
 *
 * The two per-column figures are measurements, not preferences: `COMPACT_COLUMN_PX` is about
 * what a compact cell needs before its durations spill into the column beside them, and
 * `COMFORTABLE_COLUMN_PX` is what `canvas/Main.dc.html` draws.
 */
export const ROW_HEADER_PX = 440;
export const COMPACT_COLUMN_PX = 104;
const COMFORTABLE_COLUMN_PX = 148;

/** What the compact grid's columns and its row header come to. See `breakpoints.compactGrid`. */
export const COMPACT_GRID_MIN_PX = ROW_HEADER_PX + ROSTER.length * COMPACT_COLUMN_PX;

/**
 * The same widths as shares of the table, because the compact grid is declared in percentages and
 * two arithmetics for one layout will disagree.
 *
 * `Matrix.tsx` sizes the compact grid in `%` so that it fits its container rather than overflowing
 * it — that is what lets the header freeze against the page instead of inside a scrolling box. The
 * shares used to be a literal `40%` and a literal `10%`, which is a *second* model of the same
 * grid, and the two models did not agree even at six: the floor promised the row header 440px and
 * 40% of 1064 handed it 425.
 *
 * Normalising the pixel model removes the second model rather than correcting it. These sum to
 * exactly 1 by construction — they are the same numerator over the same total — so at the floor
 * every column gets exactly `COMPACT_COLUMN_PX` and the row header exactly `ROW_HEADER_PX`, which
 * is what the floor was always claiming to buy, and above the floor everything scales together.
 * There is nowhere left for a share and a width to drift apart.
 */
export const COMPACT_ROW_HEADER_SHARE = ROW_HEADER_PX / COMPACT_GRID_MIN_PX;
export const COMPACT_COLUMN_SHARE = COMPACT_COLUMN_PX / COMPACT_GRID_MIN_PX;

/**
 * The same arithmetic for the comfortable grid, which is what `canvas/Main.dc.html` draws and
 * what `Matrix.tsx` has declared since ticket 15.
 *
 * It is here because for three tickets it was declared and not held. The comfortable table was
 * laid out `auto`, so those widths were a suggestion: the page container is 1104px, the grid
 * asks for more, and an auto table resolves that shortfall by shrinking whatever *can* shrink.
 * Columns of identity and figures cannot, so the row header took all 224px of it and rendered
 * at 239 — 54% of what it declared — with the dispute title inside it clipped to 180px of its
 * natural 836. On a 1440px screen the desktop was showing a fifth of a question the 390pt phone
 * showed whole. Nothing reported it: `text-overflow: ellipsis` is what a title is *supposed* to
 * do, and jsdom lays nothing out, so no test could see a width at all.
 *
 * The note on `compactGrid` below already described the fix as the status quo — the compact grid
 * "keeps its min-width and scrolls sideways in its own box exactly as the comfortable grid always
 * does". The comfortable grid never did. With this and `table-layout: fixed` beside it, it now
 * does, and that sentence is true for the first time.
 *
 * **Ticket 25 owns the rest of this density**, and this line is not it: the page that contains
 * the grid, the switch between the two densities and the comfortable column shares are still
 * sized for six. This is here only so that adding the seventh agent juror does not leave a
 * `min-width` below the sum of the widths the columns declare, which is the crush described
 * above, silently reintroduced.
 */
export const COMFORTABLE_GRID_MIN_PX = ROW_HEADER_PX + ROSTER.length * COMFORTABLE_COLUMN_PX;

/**
 * What the page's chrome takes either side of the grid, measured rather than derived.
 *
 * The compact grid's floor was 1064px of content when the roster held six, and the viewport at
 * which it stopped fitting was measured in a browser at 1160 — so the gutters, the page's own
 * max-width and the scrollbar come to this between them. It is a property of the page and not
 * of the roster, which is why it is a literal here and the two widths above are not.
 */
const PAGE_CHROME_PX = 96;

export const breakpoints = {
  /** The phone artboard is 390pt; this is the width below which the desktop chrome stops fitting. */
  narrow: "720px",
  /**
   * The width below which ticket 17's compact grid stops fitting, and scrolls sideways instead.
   *
   * A second number here and deliberately not a second `narrow`: it answers a different question
   * about a different element. `narrow` asks which layout a reader gets — grid or cards — and is
   * a fact about the chrome. This asks whether the compact grid's own measurements fit the page,
   * and is arithmetic about the grid: a row header and one column per agent juror, which is
   * `COMPACT_GRID_MIN_PX` of content, which this page's gutters put at roughly this viewport.
   *
   * It moves when the roster grows, and it has to. Held at a fixed width while the grid widened
   * underneath it, this would name a band of viewports where the grid is above the breakpoint —
   * so its scroll container is gone — and still wider than the room it has. Nothing scrolls and
   * nothing warns; the columns are simply crushed below what a compact cell needs.
   *
   * What it costs below itself is the freeze and nothing else. The compact grid keeps its
   * `min-width` and scrolls sideways in its own box exactly as the comfortable grid always does,
   * and a `position: sticky` header inside a scroll container sticks to that box rather than to
   * the page — so between `narrow` and here, the column header scrolls away with the rows. Every
   * other reduction the density makes holds at every width.
   */
  compactGrid: `${COMPACT_GRID_MIN_PX + PAGE_CHROME_PX}px`,
};

/**
 * The condition itself, so the media query and the hook below cannot come to disagree.
 *
 * Two ways of asking one question is how a page ends up rendering the phone's card list under
 * the desktop's chrome — a bug with no error and nothing in the console, visible only at the
 * few pixels between two numbers.
 */
const NARROW_QUERY = `(max-width: ${breakpoints.narrow})`;

/** `@media` prelude for the reduced form. Used as `${narrow} { … }` inside a styled template. */
export const narrow = `@media ${NARROW_QUERY}`;

const COMPACT_GRID_QUERY = `(max-width: ${breakpoints.compactGrid})`;

/** `@media` prelude for a page too narrow to hold the compact grid at its own measurements. */
export const belowCompactGrid = `@media ${COMPACT_GRID_QUERY}`;

/**
 * Whether the viewport is below the breakpoint, as a value a component can branch on.
 *
 * CSS answers most of this file's questions, and where it can it should: a rule inside
 * `${narrow}` costs nothing and never disagrees with itself. Three of ticket 16's requirements
 * are not CSS questions at all, and this is for those.
 *
 * - The matrix must not be *rendered* below the breakpoint, rather than rendered and hidden.
 *   A `display: none` table is still built, still 168 cells of DOM on the device least able to
 *   afford them, and still there in a page a reader can print or save.
 * - An `<svg>` viewBox is an attribute. The lockup drops its diamond and keeps only the
 *   official wordmark paths, and no stylesheet can crop a viewBox.
 * - The nav's destinations fold behind a disclosure button that has to exist, take focus and
 *   carry `aria-expanded`. A CSS-only menu is a checkbox pretending to be a button.
 *
 * **`matchMedia` is absent under jsdom**, exactly as `ResizeObserver` is, so this returns false
 * there and every existing test keeps rendering the desktop form. A test of the reduced form
 * stubs `window.matchMedia`; see `breakpoints.test.ts`. That is deliberate rather than
 * incidental: an unguarded read of `window.matchMedia(…)` here would throw inside the render of
 * every component that consumes it, which is most of the chrome.
 */
export function useIsNarrow(): boolean {
  return useMediaQuery(NARROW_QUERY);
}

/**
 * Whether the page is too narrow to hold the compact grid at its own measurements, which is the
 * condition under which that grid scrolls sideways.
 *
 * A hook and not only a media query for one reason, and it is the reason `useIsNarrow` gives for
 * itself: whether an element is *focusable* is not a CSS question. The compact grid drops its
 * `overflow` box above this width — ticket 17 had to, because a scroll container breaks the
 * `position: sticky` header inside it — so above it there is nothing to scroll, and a scroll
 * region that keeps its tab stop there is a stop that goes nowhere with a name that says
 * otherwise. Below it the box is back and the tab stop is the only way a keyboard reaches the
 * far columns.
 */
export function useFitsCompactGrid(): boolean {
  return !useMediaQuery(COMPACT_GRID_QUERY);
}

/**
 * The list, made once and only where there is a `matchMedia` to make it with.
 *
 * Once matters here: `isNarrowNow` is `useSyncExternalStore`'s `getSnapshot`, which React calls on
 * every render and every store check, so building a fresh `MediaQueryList` inside it allocates one
 * per call — and subscribes the listener to a different object from the one `matches` is read
 * from. Browsers keep every list for one query in agreement so nothing misbehaved, but the two
 * halves of this hook should be looking at the same thing.
 *
 * Cached lazily rather than at module load: a module that called `window.matchMedia` on import
 * would throw under jsdom before any guard could run.
 */
let cachedLists = new Map<string, MediaQueryList | null>();
let cachedFrom: unknown;

function listFor(query: string): MediaQueryList | null {
  const accessor = typeof window === "undefined" ? undefined : window.matchMedia;
  // Keyed on the accessor the lists were built from, which is what makes the cache honest rather
  // than merely convenient: a test that stubs `window.matchMedia` installs a different function,
  // and a cache that ignored that would hand back the previous viewport's answer for the rest of
  // the file. Nothing replaces `matchMedia` in a browser, so this compares equal there for ever.
  if (accessor !== cachedFrom) {
    cachedFrom = accessor;
    cachedLists = new Map();
  }

  const held = cachedLists.get(query);
  if (held !== undefined) return held;

  const made = typeof accessor === "function" ? accessor.call(window, query) : null;
  cachedLists.set(query, made);
  return made;
}

/**
 * The `useSyncExternalStore` triple for one query, made once per query.
 *
 * Once matters: `getSnapshot` is called on every render and every store check, so a fresh
 * `MediaQueryList` built inside it would allocate one per call and subscribe the listener to a
 * different object from the one `matches` is read from. The store functions are cached for the
 * same reason React requires them to be stable.
 */
const stores = new Map<string, { subscribe: (fn: () => void) => () => void; get: () => boolean }>();

function storeFor(query: string) {
  const held = stores.get(query);
  if (held !== undefined) return held;

  const made = {
    subscribe(onChange: () => void): () => void {
      const list = listFor(query);
      if (list === null) return () => {};
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    get: (): boolean => listFor(query)?.matches ?? false,
  };
  stores.set(query, made);
  return made;
}

/**
 * Whether a media query matches, as a value a component can branch on.
 *
 * One implementation behind every such question in this file, so a hook and the `@media` prelude
 * beside it are two readings of one string rather than two strings that have to be kept equal.
 */
function useMediaQuery(query: string): boolean {
  const store = storeFor(query);
  return useSyncExternalStore(store.subscribe, store.get, serverIsNotNarrow);
}

/**
 * Wide, wherever there is no viewport to ask.
 *
 * This dashboard is a static bundle with no server render, so nothing calls this today. It is
 * the third argument `useSyncExternalStore` requires, and the honest answer is the same one the
 * guard above gives: an absent `matchMedia` is not evidence of a narrow screen.
 */
function serverIsNotNarrow(): boolean {
  return false;
}
