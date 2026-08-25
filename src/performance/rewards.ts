/**
 * How a reward held in wei is read.
 *
 * Wei is the stored unit and the only one anything sums in, for the same reason seconds are for
 * a latency (ADR-0001): it is what the chain recorded, and every rounding this file performs is
 * performed once, at the edge, on a figure nothing downstream reads back.
 *
 * The unit is `bigint` throughout and that is a correctness requirement rather than a
 * preference. A PNK penalty in court 34 is `minStake * alpha`, which is 187 whole tokens —
 * 1.87e20 wei, four orders of magnitude past `Number.MAX_SAFE_INTEGER`. Summing those in a
 * `number` loses the low digits before anything is rounded for display, and loses them
 * silently: the total still renders, and it is simply not the total.
 *
 * Separate from `latency.ts` for the reason that file is separate from the model. This is the
 * sole place wei becomes words, and nothing else may divide, scale or re-round one.
 */

/** Wei per whole token. The same for ETH and for PNK, which is an ERC-20 with 18 decimals. */
const WEI = 18;

/**
 * Four places for ETH and two for PNK, from the ticket and from `canvas/Main.dc.html:150-151`.
 *
 * They differ because the quantities differ by five orders of magnitude: a coherent draw in
 * court 34 pays 0.00027 ETH and risks 187 whole PNK, so two places would render every ETH
 * figure as `0.00` and four would spend two columns of a 148px header on zeros nobody reads.
 * Fixed rather than significant, because a column of them has to line up — which only holds if
 * whatever renders it re-declares `font-feature-settings` (`CLAUDE.md` § Traps).
 */
export const ETH_PLACES = 4;
export const PNK_PLACES = 2;

/**
 * An amount in wei at a fixed number of decimal places, rounded half away from zero.
 *
 * Half **away from zero** rather than half-even or half-up, so that a gain and a loss of the
 * same size round to the same magnitude. Half-up would round -0.005 to -0.00 and +0.005 to
 * +0.01, which makes the display asymmetric between an agent juror that earned and one that
 * lost — a bias in favour of the penalised, on the one figure of this dashboard that is about
 * money.
 *
 * All-integer: the magnitude is rounded by adding half a place before the division, so nothing
 * here ever becomes a float. A `Number(wei) / 1e18` would be wrong for every PNK figure this
 * court produces before it was ever rounded.
 */
function fixed(wei: bigint, places: number): { text: string; rounded: bigint } {
  const magnitude = wei < 0n ? -wei : wei;
  const perPlace = 10n ** BigInt(WEI - places);

  // `+ half` then truncating division is round-half-away-from-zero, because the sign was taken
  // off above and put back by the caller.
  const rounded = (magnitude + perPlace / 2n) / perPlace;
  const unit = 10n ** BigInt(places);

  return {
    text: `${rounded / unit}.${String(rounded % unit).padStart(places, "0")}`,
    rounded,
  };
}

/**
 * Cumulative ETH, as a column header prints it: `"0.0026"`.
 *
 * Unsigned, because this figure has never been negative and could not be: the court
 * distributes arbitration fees to jurors and takes its penalty in PNK, so the ETH side of a
 * shift is a payment or nothing. A negative would still print its own `-` rather than being
 * hidden, which is the honest failure if that ever stops being true.
 */
export function formatEthWei(wei: bigint): string {
  const { text, rounded } = fixed(wei, ETH_PLACES);

  // A real amount smaller than the fourth decimal place. Printing "0.0000" would say the agent
  // juror earned nothing, which is a claim about the court and not about this figure's
  // precision. Reachable whenever a reward is scaled by a partial degree of coherency.
  if (rounded === 0n && wei !== 0n)
    return `${wei < 0n ? "-" : ""}<0.${"0".repeat(ETH_PLACES - 1)}1`;

  return wei < 0n ? `-${text}` : text;
}

/**
 * Net PNK, as a column header prints it: `"+218.17"`, `"-561.00"`, `"0.00"`.
 *
 * **The sign is a character in the value and never a colour** — ADR-0006, which the ticket
 * cites directly. `canvas/Main.dc.html:259` inks a loss amber on top of that, and the amber is
 * the second signal: the figure reads the same in greyscale, at 60% zoom, and to a reader who
 * cannot separate amber from body ink.
 *
 * A zero carries no sign, because it is neither a gain nor a loss and `"+0.00"` would assert a
 * direction this figure does not have. An amount too small for the second decimal place keeps
 * its sign and qualifies the magnitude instead, which is the one case where rounding would
 * otherwise erase the direction along with the value.
 */
export function formatPnkWei(wei: bigint): string {
  if (wei === 0n) return fixed(0n, PNK_PLACES).text;

  const sign = wei < 0n ? "-" : "+";
  const { text, rounded } = fixed(wei, PNK_PLACES);

  if (rounded === 0n) return `${sign}<0.${"0".repeat(PNK_PLACES - 1)}1`;

  return `${sign}${text}`;
}
