import { vi } from "vitest";

/**
 * A `matchMedia` for a jsdom that has none.
 *
 * jsdom does not implement it at all — not a stub that answers false, but `undefined` — which is
 * why `useIsNarrow` guards the read and why every test that does *not* call this keeps rendering
 * the desktop form untouched. A test of the reduced form has to say so, and this is how it says
 * it. Undone by `vi.unstubAllGlobals()`, which the caller owns.
 *
 * It parses the `max-width` out of the query rather than answering a fixed boolean, so a test
 * asking for 390pt gets the truth about whichever breakpoint the code under test consults —
 * including the day someone changes the number in `breakpoints.ts`.
 */
export function stubViewportWidth(width: number): void {
  vi.stubGlobal("matchMedia", (query: string) => {
    const limit = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Number.NaN);
    return {
      matches: width <= limit,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as MediaQueryList;
  });
}

/** The phone artboard `Mobile.dc.html` is drawn at. */
export const PHONE_WIDTH = 390;
