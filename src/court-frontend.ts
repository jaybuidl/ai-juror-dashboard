/**
 * The Kleros court frontend — "Neo Court", the production deployment on Arbitrum One — and the
 * two pages on it this dashboard links to.
 *
 * Hash-routed, so every path sits after `#/`; a link without the hash lands on the court's home
 * page and nowhere near the case. The shapes are the court's own, from `web/src/App.tsx` and the
 * links it builds in `kleros-v2`: a case is `cases/:id/overview` and a juror is
 * `profile/1/desc/all?address=` — the page, order and filter segments are required by the route,
 * and these are the values the court's own juror links use.
 *
 * The address is passed as the roster spells it. The profile page lowercases the parameter before
 * querying, so a checksummed address and a lowercase one land on the same juror.
 *
 * Hard-coded and reviewed here, which is why none of these goes through the justification
 * interstitial: that guards URLs the agents wrote, not ones this repository did.
 */
export const COURT_FRONTEND_URL = "https://v2.kleros.builders";

export function casePageOf(disputeId: string | number): string {
  return `${COURT_FRONTEND_URL}/#/cases/${disputeId}/overview`;
}

export function jurorProfileOf(address: string): string {
  return `${COURT_FRONTEND_URL}/#/profile/1/desc/all?address=${address}`;
}
