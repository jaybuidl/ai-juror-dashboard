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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
