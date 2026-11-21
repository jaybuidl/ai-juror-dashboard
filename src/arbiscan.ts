/**
 * Arbiscan, the explorer this dashboard sends a reader to for an account on Arbitrum One, and the
 * short form an account is drawn in on the page.
 *
 * Hard-coded and reviewed here, like `court-frontend.ts`, so none of these goes through the
 * justification interstitial: that guards URLs the agents wrote, not ones this repository did.
 */
export const ARBISCAN_URL = "https://arbiscan.io";

export function arbiscanAddressOf(address: string): string {
  return `${ARBISCAN_URL}/address/${address}`;
}

/**
 * `0x7a3f…c412`: six characters, an ellipsis, four. The link beside it carries the whole of it,
 * and every place that draws it says the whole of it to a screen reader.
 */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
