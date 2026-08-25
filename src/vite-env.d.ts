/// <reference types="vite/client" />

// Public runtime configuration is declared here as it is introduced, one `VITE_`
// entry per overridable endpoint. Every value is baked into the bundle at build
// time and is readable by anyone who loads the page — see README.md § Configuration.
interface ImportMetaEnv {
  /**
   * Ethereum mainnet endpoint used for ENS only — nicknames and avatars. Optional:
   * the roster ships with a keyless default, and a host set here must also appear in
   * `connect-src` in netlify.toml or the browser blocks the request before it is sent.
   */
  readonly VITE_MAINNET_RPC_URL?: string;

  /**
   * Kleros v2 core subgraph, read for the court's disputes and their round timelines.
   * Optional: the default is keyless, and as with the RPC above, a host set here must
   * also appear in `connect-src` in netlify.toml or the browser blocks the request.
   */
  readonly VITE_CORE_SUBGRAPH_URL?: string;

  /**
   * Kleros v2 dispute resolver template subgraph, read for what each dispute is about —
   * its title and category. Optional, keyless, and on the same host as the core
   * subgraph by default, so the stock configuration adds nothing to `connect-src`; a
   * host set here that is not on that list is blocked before the request is sent.
   */
  readonly VITE_DRT_SUBGRAPH_URL?: string;

  /**
   * Arbitrum One endpoint, read for the `CommitCast` logs that date every commitment and for
   * the court's own parameter history. Optional: the default is keyless, and a host set here
   * must also appear in `connect-src` in netlify.toml or the browser blocks the request before
   * it is sent — which is not a quiet failure, since ticket 13 put this endpoint in the
   * blocking tier.
   *
   * Undeclared until this entry, and read since ticket 07: it type-checked only through
   * `vite/client`'s index signature, so the one override in production was the one the repo
   * never described. Two constraints on what may go here:
   *
   * - **The host of this URL is rendered on screen**, under SOURCE in the failure banner, by
   *   `arbitrumSource()`. The path is not, so a key in the path (`…/v2/<key>`) stays off the
   *   page — but a provider that encodes credentials in the *hostname* would put them on it.
   * - ADR-0004: many commercial providers cap `eth_getLogs` at ~10,000 blocks, and these scans
   *   run from block 0 unchunked. Such a provider does not error. It returns fewer logs, which
   *   surfaces as a `commitCoverage` shortfall rather than as a failure.
   */
  readonly VITE_ARBITRUM_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
