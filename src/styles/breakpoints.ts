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
  return useSyncExternalStore(subscribeToNarrow, isNarrowNow, serverIsNotNarrow);
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
let cachedList: MediaQueryList | null = null;
let cachedFrom: unknown;

function narrowList(): MediaQueryList | null {
  const accessor = typeof window === "undefined" ? undefined : window.matchMedia;
  // Keyed on the accessor it was built from, which is what makes the cache honest rather than
  // merely convenient: a test that stubs `window.matchMedia` installs a different function, and a
  // cache that ignored that would hand back the previous viewport's answer for the rest of the
  // file. Nothing replaces `matchMedia` in a browser, so this compares equal there for ever.
  if (accessor !== cachedFrom) {
    cachedFrom = accessor;
    cachedList = typeof accessor === "function" ? accessor.call(window, NARROW_QUERY) : null;
  }
  return cachedList;
}

function subscribeToNarrow(onChange: () => void): () => void {
  const list = narrowList();
  if (list === null) return () => {};

  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function isNarrowNow(): boolean {
  return narrowList()?.matches ?? false;
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
