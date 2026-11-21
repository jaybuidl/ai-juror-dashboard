import { describe, expect, it } from "vitest";
import { clockOf, dayOf, isoOf, sameDay } from "./moments";

/**
 * A moment as the timeline prints it. UTC whatever zone the test runner is in, which is the
 * whole of the rule: two readers of a cited page must see one record.
 */
describe("moments", () => {
  // Dispute 156's creation: 2026-08-21 06:56:27 UTC.
  const created = 1787295387;

  it("reads a moment as a UTC clock to the second", () => {
    expect(clockOf(created)).toBe("06:56:27");
  });

  it("names the UTC day without the year", () => {
    expect(dayOf(created)).toBe("21 Aug");
  });

  it("gives a time element the moment it shows, marked as UTC", () => {
    expect(isoOf(created)).toBe("2026-08-21T06:56:27Z");
  });

  it("tells two moments on one UTC day from two either side of midnight", () => {
    const lastSecond = Date.UTC(2026, 7, 21, 23, 59, 59) / 1000;

    expect(sameDay(created, lastSecond)).toBe(true);
    expect(sameDay(lastSecond, lastSecond + 1)).toBe(false);
    expect(dayOf(lastSecond + 1)).toBe("22 Aug");
    expect(clockOf(lastSecond + 1)).toBe("00:00:00");
  });
});
