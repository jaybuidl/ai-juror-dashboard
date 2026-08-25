import { describe, expect, it } from "vitest";
import { formatLatencySeconds, formatWindowSeconds, railFraction } from "./latency";

describe("formatLatencySeconds", () => {
  it("reads under two minutes in seconds", () => {
    expect(formatLatencySeconds(7)).toBe("7s");
    expect(formatLatencySeconds(85)).toBe("85s");
    expect(formatLatencySeconds(119)).toBe("119s");
  });

  it("switches to minutes at two minutes", () => {
    expect(formatLatencySeconds(120)).toBe("2m 00s");
    expect(formatLatencySeconds(396)).toBe("6m 36s");
    // The slowest commit in the record, and the reason the switch exists: 3,236s is not a
    // number anyone reads.
    expect(formatLatencySeconds(3236)).toBe("53m 56s");
  });

  it("pads the seconds so a column of figures lines up", () => {
    expect(formatLatencySeconds(121)).toBe("2m 01s");
    expect(formatLatencySeconds(600)).toBe("10m 00s");
  });

  it("says nothing about a window, at any magnitude", () => {
    // ADR-0005: no latency is ever shown as a fraction of a window, so no wording here may
    // carry a percent sign or the word it would need.
    for (const seconds of [0, 7, 85, 120, 3236, 86400]) {
      expect(formatLatencySeconds(seconds)).not.toMatch(/%|of|window/);
    }
  });
});

describe("railFraction", () => {
  it("puts an hour at the end of the rail", () => {
    expect(railFraction(3600)).toBe(1);
  });

  it("keeps a fast reveal visible rather than rendering it as nothing", () => {
    expect(railFraction(1)).toBe(0.02);
    expect(railFraction(0)).toBe(0.02);
  });

  it("is logarithmic, so a reveal in seconds and a commit in tens of minutes both read", () => {
    const sevenSeconds = railFraction(7);
    const nineMinutes = railFraction(552);

    expect(sevenSeconds).toBeGreaterThan(0.2);
    expect(nineMinutes).toBeLessThan(0.8);
    // Linearly, 7s of an hour would be under a fiftieth of the way along.
    expect(sevenSeconds).toBeGreaterThan(7 / 3600);
  });

  it("never runs past the end for a latency longer than the scale", () => {
    expect(railFraction(86400)).toBe(1);
  });
});

describe("formatWindowSeconds", () => {
  it("reads court 34's two configurations the way the court configured them", () => {
    expect(formatWindowSeconds(28_800)).toBe("8h");
    expect(formatWindowSeconds(2_700)).toBe("45m");
    expect(formatWindowSeconds(1_800)).toBe("30m");
    expect(formatWindowSeconds(129_600)).toBe("36h");
  });

  it("keeps a window coarser than a latency, so the two never read as one quantity", () => {
    // 2700 seconds printed beside a reveal of "85s" is an invitation to divide one by the
    // other, which is the whole of what ADR-0005 forbids. A window is a figure somebody typed
    // into a governance transaction; a latency is a measurement.
    expect(formatWindowSeconds(2_700)).not.toBe(formatLatencySeconds(2_700));
  });

  it("says an hour and a half rather than ninety minutes", () => {
    expect(formatWindowSeconds(5_400)).toBe("1h 30m");
    expect(formatWindowSeconds(3_660)).toBe("1h 1m");
  });

  it("falls back to seconds below a minute, because a window can be configured that short", () => {
    expect(formatWindowSeconds(30)).toBe("30s");
    expect(formatWindowSeconds(0)).toBe("0s");
  });
});
