import { describe, expect, it } from "vitest";
import fixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { hasReadableDisputes } from "./useCourtPerformance";

const raw = fixture as RawDispute[];

describe("hasReadableDisputes", () => {
  it("builds from a read that returned the court", () => {
    expect(hasReadableDisputes({ raw, isLoading: false, error: null })).toBe(true);
  });

  it("refuses to build from a first read that failed", () => {
    // The one that matters. An empty payload builds a successful model with no rows, and the
    // matrix renders that as "the subgraph returned no disputes for court 34" — a claim about
    // the court, made out of a request that never arrived.
    const failed = { raw: [], isLoading: false, error: new Error("HTTP 503") };

    expect(hasReadableDisputes(failed)).toBe(false);
  });

  it("keeps building from the rows already held when a refetch fails", () => {
    // Showing a stale court and saying so beats showing nothing; the page carries the notice.
    const stale = { raw, isLoading: false, error: new Error("HTTP 503") };

    expect(hasReadableDisputes(stale)).toBe(true);
  });

  it("builds nothing while the read is still out", () => {
    expect(hasReadableDisputes({ raw: [], isLoading: true, error: null })).toBe(false);
  });

  it("builds an empty matrix from a court that really is empty", () => {
    // A successful read of a court with no disputes is a real answer, and the matrix says so
    // in its own words rather than being suppressed.
    expect(hasReadableDisputes({ raw: [], isLoading: false, error: null })).toBe(true);
  });
});
