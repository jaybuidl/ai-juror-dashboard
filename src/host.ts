/**
 * The host of a URL, or `null` if it cannot be parsed.
 *
 * Shared by the two places this dashboard names an endpoint on screen, and the rule is the same
 * in both: **the host, never the whole URL**. A URL can carry a credential — an override pointed
 * at a commercial RPC provider usually carries its key in the path — and both call sites render
 * into a public page that a reader may screenshot. `URL.host` drops the path and the userinfo,
 * which is what makes it the safe half to print.
 *
 * `null` rather than a fallback, because the two callers want different words for the same
 * absence and neither wants a guess: a URL this cannot parse is one nothing can be said about,
 * and inventing a plausible host would be the failure both callers exist to prevent.
 */
export function hostOf(href: string): string | null {
  try {
    return new URL(href).host;
  } catch {
    return null;
  }
}
