import { describe, expect, it } from "vitest";
import { failureOf, formatAgo, ReadFailure, SOURCES } from "./read-failure";

/**
 * The two things a failed read has to be able to say about itself, and one it must never invent.
 *
 * Both are pure and neither reads a clock, which is the point: the banner's "4m 12s ago" is the
 * figure that decides whether a reader quotes the page, and a figure computed against
 * `Date.now()` inside the function producing it cannot be checked against a known answer.
 */

describe("failureOf", () => {
  it("says nothing about a read that did not fail", () => {
    expect(failureOf(null, SOURCES.core, "…")).toBeNull();
  });

  it("takes the source and the status from a failure that carried them", () => {
    const error = new ReadFailure("The core subgraph returned HTTP 502 Bad Gateway", {
      source: SOURCES.core,
      status: "HTTP 502",
    });

    expect(failureOf(error, SOURCES.arbitrum, "The draws are missing.")).toEqual({
      source: SOURCES.core,
      status: "HTTP 502",
      what: "The draws are missing.",
    });
  });

  it("never invents a status for an error that arrived without one", () => {
    // viem raises its own errors from inside the log scan and the ENS resolver, and a rate limit
    // on arb1 surfaces as `UnknownRpcError` with no status at all. "HTTP 0" or "Unknown error"
    // would be a fact on a public page that nothing measured.
    const opaque = new Error("Cannot read properties of undefined (reading 'error')");

    expect(failureOf(opaque, SOURCES.arbitrum, "…")).toEqual({
      source: SOURCES.arbitrum,
      status: null,
      what: "…",
    });
  });

  it("falls back to the source the call site asked, since the error may not know", () => {
    expect(failureOf(new Error("boom"), SOURCES.templates, "…")?.source.name).toBe("kleros-v2-drt");
  });
});

describe("formatAgo", () => {
  const at = 1_000_000_000_000;

  it("counts seconds inside the first minute", () => {
    expect(formatAgo(at, at + 12_000)).toBe("12s ago");
  });

  it("keeps the seconds alongside the minutes, which is where the first hour matters", () => {
    // The canvas prints "4m 12s ago". Inside the first hour this figure is deciding whether a
    // reader treats the page as current, and "4m ago" throws away the half of it that says so.
    expect(formatAgo(at, at + 252_000)).toBe("4m 12s ago");
  });

  it("drops to hours and minutes past the hour", () => {
    expect(formatAgo(at, at + 7_500_000)).toBe("2h 5m ago");
  });

  it("drops to days and hours past the day", () => {
    expect(formatAgo(at, at + 100_000_000)).toBe("1d 3h ago");
  });

  it("never counts backwards from a read that is somehow in the future", () => {
    // A clock adjusted between the read and the render would otherwise print "-3s ago", which
    // reads as a broken page rather than as a fresh one.
    expect(formatAgo(at, at - 3_000)).toBe("0s ago");
  });
});
