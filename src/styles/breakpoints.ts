import { useSyncExternalStore } from "react";

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
export const breakpoints = {
  /** The phone artboard is 390pt; this is the width below which the desktop chrome stops fitting. */
  narrow: "720px",
  /**
   * The width below which ticket 17's compact grid stops fitting, and scrolls sideways instead.
   *
   * A second number here and deliberately not a second `narrow`: it answers a different question
   * about a different element. `narrow` asks which layout a reader gets — grid or cards — and is
   * a fact about the chrome. This asks whether the compact grid's own measurements fit the page,
   * and is arithmetic about the grid: a 440px row header and six columns that a compact cell
   * needs about 104px each for, which is 1064px of content, which this page's gutters put at
   * roughly this viewport.
   *
   * What it costs below itself is the freeze and nothing else. The compact grid keeps its
   * `min-width` and scrolls sideways in its own box exactly as the comfortable grid always does,
   * and a `position: sticky` header inside a scroll container sticks to that box rather than to
   * the page — so between `narrow` and here, the column header scrolls away with the rows. Every
   * other reduction the density makes holds at every width.
   */
  compactGrid: "1160px",
};

/** What the compact grid's six columns and its row header come to. See `breakpoints.compactGrid`. */
export const COMPACT_GRID_MIN_PX = 1064;

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
