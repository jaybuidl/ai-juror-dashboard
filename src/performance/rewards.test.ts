import { describe, expect, it } from "vitest";
import { formatEthWei, formatPnkWei } from "./rewards";

/**
 * The formatters, pinned against exact wei rather than against numbers.
 *
 * Every case here is an integer this dashboard could actually be handed: court 34 pays
 * `feeForJuror` of 270000000000000 wei per coherent draw, and a penalty is `minStake * alpha`,
 * which is 187 whole PNK — 1.87e20, an order of magnitude past `Number.MAX_SAFE_INTEGER`. That
 * is the whole reason these take `bigint`: the same arithmetic in a `number` is wrong before it
 * is rounded, and wrong quietly.
 */

describe("formatEthWei", () => {
  it("reads a whole fee at four decimal places", () => {
    // One coherent draw in court 34: `feeForJuror`, exactly.
    expect(formatEthWei(270000000000000n)).toBe("0.0003");
  });

  it("reads a cumulative fee the same way", () => {
    // 007's eight paid draws in the captured court.
    expect(formatEthWei(2565000000000000n)).toBe("0.0026");
  });

  it("rounds the half away from zero rather than towards it", () => {
    // 0.00035 exactly: the boundary, where round-half-even would answer 0.0004 and
    // round-half-down would answer 0.0003.
    expect(formatEthWei(350000000000000n)).toBe("0.0004");
  });

  it("keeps the trailing zeros a column has to line up on", () => {
    expect(formatEthWei(10n ** 18n)).toBe("1.0000");
    expect(formatEthWei(0n)).toBe("0.0000");
  });

  it("does not round a real amount away to nothing without saying so", () => {
    // Smaller than the fourth decimal place can hold. It is not zero, and printing "0.0000"
    // would state that nothing was earned — so the figure says it is below what it can show.
    expect(formatEthWei(1n)).toBe("<0.0001");
  });
});

describe("formatPnkWei", () => {
  it("carries a gain's sign in the value itself", () => {
    // blaise's nine paid draws: 218.16666… PNK, which is what a third of a penalty pool does.
    expect(formatPnkWei(218166666666666666666n)).toBe("+218.17");
  });

  it("carries a loss's sign the same way", () => {
    // aletheia's, and the reason the sign is a character rather than a colour — ADR-0006.
    expect(formatPnkWei(-561000000000000000000n)).toBe("-561.00");
  });

  it("gives a zero no sign at all", () => {
    // Neither a gain nor a loss. "+0.00" would read as a gain of nothing, which is a claim
    // about direction that the figure does not make.
    expect(formatPnkWei(0n)).toBe("0.00");
  });

  it("rounds a loss away from zero, exactly as it rounds a gain", () => {
    expect(formatPnkWei(5000000000000000n)).toBe("+0.01");
    expect(formatPnkWei(-5000000000000000n)).toBe("-0.01");
  });

  it("never prints a signed zero for an amount too small to show", () => {
    // The case that would otherwise produce "-0.00": a loss smaller than the second decimal
    // place. The sign still leads, because that is the half ADR-0006 requires to be a
    // character; the `<` qualifies the magnitude behind it.
    expect(formatPnkWei(-1n)).toBe("-<0.01");
    expect(formatPnkWei(1n)).toBe("+<0.01");
  });
});
