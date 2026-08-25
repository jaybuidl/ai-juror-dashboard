import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { breakpoints, narrow, useIsNarrow } from "./breakpoints";

/**
 * The breakpoint, and the one thing that could quietly split it in two.
 *
 * `narrow` is read by every styled template and `useIsNarrow` by the three places CSS cannot
 * answer. They ask the same question of the same number, and a page whose chrome reduced at one
 * width while its matrix gave way at another would be broken only in the band between them —
 * with nothing in the console to say so.
 */

/** A `matchMedia` that answers for one viewport width and reports changes to it. */
function stubMatchMedia(width: number) {
  const listeners = new Set<() => void>();
  let current = width;

  const matchMedia = vi.fn((query: string) => {
    const limit = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Number.NaN);
    return {
      get matches() {
        return current <= limit;
      },
      media: query,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    } as unknown as MediaQueryList;
  });

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    resize(to: number) {
      current = to;
      act(() => {
        for (const listener of listeners) listener();
      });
    },
    /** Whether the subscription was torn down: a resize listener outliving its page is a leak. */
    get listeners() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the breakpoint", () => {
  it("asks one question of one number", () => {
    expect(narrow).toBe(`@media (max-width: ${breakpoints.narrow})`);
  });
});

describe("useIsNarrow", () => {
  it("is false where there is no matchMedia to ask", () => {
    // jsdom has none, which is why every existing test renders the desktop form untouched. An
    // absent `matchMedia` is not evidence of a narrow screen, and an unguarded read of it here
    // would throw inside the render of most of the chrome.
    expect(window.matchMedia).toBeUndefined();
    expect(renderHook(() => useIsNarrow()).result.current).toBe(false);
  });

  it("is true at the phone artboard's width and false at the desktop one", () => {
    stubMatchMedia(390);
    const phone = renderHook(() => useIsNarrow());
    expect(phone.result.current).toBe(true);
    phone.unmount();

    stubMatchMedia(1280);
    expect(renderHook(() => useIsNarrow()).result.current).toBe(false);
  });

  it("is true exactly at the breakpoint and false one pixel above it", () => {
    // `max-width` is inclusive, so 720 is the reduced form and 721 is not. The band this pins
    // is the only place the two forms could both be wrong at once.
    stubMatchMedia(720);
    const at = renderHook(() => useIsNarrow());
    expect(at.result.current).toBe(true);
    at.unmount();

    stubMatchMedia(721);
    expect(renderHook(() => useIsNarrow()).result.current).toBe(false);
  });

  it("follows the viewport across the breakpoint without a remount", () => {
    const media = stubMatchMedia(1280);
    const { result } = renderHook(() => useIsNarrow());
    expect(result.current).toBe(false);

    media.resize(390);
    expect(result.current).toBe(true);

    media.resize(1280);
    expect(result.current).toBe(false);
  });

  it("lets go of the listener when the component does", () => {
    const media = stubMatchMedia(390);
    const { unmount } = renderHook(() => useIsNarrow());
    expect(media.listeners).toBe(1);

    unmount();
    expect(media.listeners).toBe(0);
  });
});
